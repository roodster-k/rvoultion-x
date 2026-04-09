# PostOp Tracker — Project Context

## Stack
- React 18 + React Router v6 + Vite + Tailwind v4 (CSS variables: `--color-primary`, not `--primary`)
- Supabase JS v2 (auth, RLS, storage, realtime)
- Cloudflare Pages (static SPA deployment)
- html2pdf.js + html2canvas (PDF export)

---

## Architecture

### Auth Roles
- `super_admin` / `clinic_admin` — manage clinic, staff, patients
- `nurse` / `doctor` — view/update patient records
- `patient` — access own record via magic link (PatientPortal)

### Key Files
| File | Purpose |
|------|---------|
| `src/lib/supabase.js` | Single Supabase client with auth config |
| `src/context/AuthContext.jsx` | Session management, profile load, clinic branding |
| `src/hooks/usePatients.js` | All patient CRUD via Supabase (used by PatientContext) |
| `src/context/PatientContext.jsx` | Staff-side patient data (requires auth session) |
| `src/context/DataContext.jsx` | Backward-compat bridge → PatientContext + AlertContext |
| `src/pages/NurseDashboard.jsx` | Main staff dashboard |
| `src/pages/Settings.jsx` | Admin: clinic settings, staff invitation |
| `src/pages/SignupClinic.jsx` | Self-service clinic onboarding |
| `src/pages/StaffActivation.jsx` | Staff magic link → set password flow |
| `src/pages/PatientActivation.jsx` | Patient magic link → link auth_user_id |
| `src/pages/PatientPortal.jsx` | Patient-facing portal (anon/token access) |
| `src/components/AddPatientModal.jsx` | Patient record creation form |
| `src/components/PatientDetail.jsx` | Patient detail view + PDF export |
| `supabase/migrations/` | All RLS policies (latest applied: 020) |

---

## Migrations — Apply Order

All migrations must be applied in Supabase SQL Editor in order.
**Migrations 019 and 020 are the most recent and must be applied.**

| Migration | Purpose |
|-----------|---------|
| 001 | Schema tables |
| 002 | Initial RLS (has restrictive superadmin_insert_clinic) |
| 009 | Supreme RLS consolidation (replaces 002 policies) |
| 016 | Consolidated fixes (appointments, medications, etc.) |
| 017 | Realtime + admin insert for users |
| 018 | Storage + appointments/medications for patients |
| **019** | clinics UPDATE for admins + patients SELECT by email |
| **020** | Fix signup RLS + patients UPDATE for staff |
| **021** | **CRITICAL**: GRANT ALL on all tables + recreate SECURITY DEFINER functions |

---

## Bugs Fixed

### Session 1 (Previous)

#### 1. Session crash every ~1-3 minutes
**Root cause:** Navigator.locks deadlock in Supabase JS v2 (issues #1594, #2013).  
**Fix (`src/lib/supabase.js`):** `lock: noOpLock` bypasses Web Locks API entirely. Safe for single-tab SPA.

#### 2. Staff invitation crashes admin session
**Root cause:** `tmpClient.auth.signUp()` fired BroadcastChannel `SIGNED_IN` event → replaced admin session.  
**Fix (`src/pages/Settings.jsx`):** Replaced with `supabase.auth.signInWithOtp()` — sends email only, no auth side effects.

#### 3. Patient activation "Aucun dossier trouvé"
**Root cause:** `v9_patients_select_own` blocked email-lookup (auth_user_id IS NULL at activation).  
**Fix (`src/pages/PatientActivation.jsx` + migration 019):** Check existingPatient first, then `.ilike()` email lookup. Added `v19_patients_select_by_email_activation` RLS policy.

#### 4. Patient portal simulation "Lien expiré"
**Root cause:** `PatientPortal.jsx` used `usePatientContext()` which requires staff auth session.  
**Fix (`src/pages/PatientPortal.jsx`):** Direct Supabase query by token (anon access).

#### 5. PDF export shows wrong content
**Root cause:** `<PrintReport>` rendered inline; html2canvas captured visible viewport.  
**Fix (`src/components/PatientDetail.jsx`):** Wrapped in `position: absolute; left: -9999px` div.

#### 6. Color/logo not persisting
**Root cause:** No UPDATE RLS policy on `clinics` table.  
**Fix (migration 019 → now 020):** Added `v20_clinics_admin_update` policy.

---

### Session 2 (Current)

#### 7. Signup blocked by RLS
**Root cause:** Migration 002 created `superadmin_insert_clinic` — only `super_admin` can create clinics. If migration 009 was not applied, this restrictive policy blocks all new clinic signups. Also, `admin_insert_user` required an existing role → new users can't create their own profile (chicken-and-egg).  
**Fix (migration 020):**
- Dropped `superadmin_insert_clinic`, recreated as `v20_clinics_insert_onboarding` with `WITH CHECK (true)`
- Dropped `admin_insert_user`, added `v20_users_insert_self` (`WITH CHECK (auth_user_id = auth.uid())`) and kept separate `v20_users_admin_insert` for admins creating staff

#### 8. Staff invitation button stuck at "Invitation..."
**Root cause:** `supabase.functions.invoke('create-staff')` makes HTTP request to an Edge Function that doesn't exist. The request times out (no fast 404) → `setInviting(false)` is never called → button stays disabled forever.  
**Fix (`src/pages/Settings.jsx`):** Removed Edge Function call entirely. Now uses `supabase.auth.signInWithOtp()` directly, wrapped in try-finally to guarantee `setInviting(false)` is always called.

#### 9. Patient record creation silent failure
**Root cause:** `AddPatientModal.handleSubmit` was non-async and called `addPatient()` without await. If the insert failed (RLS, schema error, etc.), the modal closed silently with no feedback. Also, `usePatients.addPatient()` returned `undefined` on error instead of `{ error }`.  
**Fix (`src/components/AddPatientModal.jsx` + `src/hooks/usePatients.js`):**
- `handleSubmit` is now async, awaits `addPatient()`
- Added `submitting` state (spinner + disabled button during insert)
- Added `submitError` state shown inline in modal
- `addPatient()` now returns `{ error: patientError }` on failure

#### 10. Patient UPDATE silently blocked (notes, status, invited_at)
**Root cause:** Migration 009 only created SELECT + INSERT policies for patients. No UPDATE policy for staff → `updatePatientStatus()`, `addNote()`, `invitePatient()` all silently failed (Supabase returns `{count: 0}` with no error when RLS blocks UPDATE).  
**Fix (migration 020):** Added `v20_patients_update_staff` policy: `USING (clinic_id = get_my_clinic_id()) WITH CHECK (clinic_id = get_my_clinic_id())`.

---

## Staff Onboarding Flow (Current)
1. Admin fills invite form in Settings → `supabase.auth.signInWithOtp()` sends email with metadata
2. Staff clicks magic link → `/staff/activate`
3. `StaffActivation.jsx` reads `user_metadata` (set via `options.data` in signInWithOtp)
4. Inserts row into `users` table using new session (allowed by `v20_users_insert_self`)
5. Staff sets permanent password via `supabase.auth.updateUser({ password })`
6. Redirect to `/dashboard`

## Patient Access Flow (Current)
1. Admin creates patient record (with email) via `AddPatientModal`
2. Admin sends magic link → `invitePatient()` → `supabase.auth.signInWithOtp({ email })`
3. Patient clicks link → `/patient/activate`
4. `PatientActivation.jsx`: check existing link, find by email (`.ilike()`), UPDATE `auth_user_id`
5. Redirect to `/patient/portal`

## Signup Flow (Current)
1. `/signup` → `SignupClinic.jsx`
2. `supabase.auth.signUp()` → if email confirm disabled, session returned immediately
3. Insert into `clinics` (allowed by `v20_clinics_insert_onboarding`: `WITH CHECK (true)`)
4. Insert into `users` (allowed by `v20_users_insert_self`: `WITH CHECK (auth_user_id = auth.uid())`)
5. Seed protocol template (non-blocking, try-catch)
6. `refreshProfile()` → redirect to `/dashboard`

---

### RÉSUMÉ DES TRAVAUX RÉCENTS

*   **Correction Bug Paramètres (Settings.jsx) :** Résolution d'un `ReferenceError: user is not defined` dans la fonction `handleInvite`. Utilisation désormais de `profile.clinic_id`.
*   **Audit RLS (Migration 021) :** Identification des verrous restants sur la table `users`. Migration 021 nécessaire pour accorder les `GRANT SELECT` indispensables à la création de patients.
*   **Verification Portail Patient :** L'accès anonyme par token est fonctionnel.
*   **Fix Export PDF :** Méthode de rendu hors-écran validée.

### ACTIONS À RÉALISER (PROCHAIN AGENT)

#### 1. Portail & Authentification Patient
*   **Problème :** Le lien magique Supabase redirige vers la Landing Page (`/`) au lieu de la page d'activation.
*   **Cause probable :** L'URL de redirection n'est pas configurée dans la "Redirect Allowlist" du dashboard Supabase.
*   **Tâche :** 
    *   Ajouter `http://localhost:5173/patient/activate` et `http://localhost:5173/staff/activate` dans Supabase Auth > Redirect URLs.
    *   Créer une interface de connexion distincte (ou un sélecteur) sur `/login` pour différencier l'accès "Équipe Médicale" et "Espace Patient".
    *   Finaliser la page `PatientPortalAuth.jsx` pour que les patients puissent lier leur compte via leur email.

#### 2. Personnalisation des Emails (Supabase Dashboard)
*   **Tâche :** Personnaliser les templates "Magic Link" et "Invite" dans Supabase pour inclure : 
    *   Le nom de la clinique (via les métadonnées ou variables).
    *   Des instructions claires pour le patient.
    *   Un design aux couleurs de PostOp.

#### 3. Finalisation Migration 021
*   **Tâche :** Appliquer `supabase/migrations/021_grants_and_security_definer_fix.sql` pour débloquer la création de patients par le staff.
for SPA; re-enable by removing `lock: noOpLock` if multi-tab support needed
- **PDF export** captures off-screen PrintReport — images from private storage URLs may not render (CORS)
