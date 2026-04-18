# PostOp Tracker — Project Context

## Stack

* React 18 + React Router v6 + Vite + Tailwind v4 (CSS variables: `--color-primary`, not `--primary`)
* Supabase JS v2 (auth, RLS, storage, realtime)
* Netlify (static SPA deployment)
* html2pdf.js + html2canvas (PDF export)

---

## Architecture

### Auth Roles

* `super_admin` — toi uniquement, accès au panneau admin multi-cliniques (`/admin`)
* `clinic_admin` — gère la clinique, le staff, les patients, les protocoles
* `nurse` / `doctor` — consulte et met à jour les dossiers patients
* `patient` — accès à son propre dossier via magic link / OTP (`/patient/portal`)

### Key Files

| File | Purpose |
| --- | --- |
| `src/lib/supabase.js` | Single Supabase client with auth config |
| `src/context/AuthContext.jsx` | Session management, profile load, clinic branding, redirection par rôle |
| `src/hooks/usePatients.js` | All patient CRUD via Supabase (used by PatientContext) |
| `src/context/PatientContext.jsx` | Staff-side patient data (requires auth session) |
| `src/context/DataContext.jsx` | Backward-compat bridge → PatientContext + AlertContext |
| `src/pages/LoginPage.jsx` | Page de connexion principale — sélecteur Équipe / Patient — **FAIT** |
| `src/pages/NurseDashboard.jsx` | Main staff dashboard |
| `src/pages/Settings.jsx` | Admin: clinic settings, staff invitation |
| `src/pages/SignupClinic.jsx` | Self-service clinic onboarding — **ROUTE DÉSACTIVÉE en Option B** (logique réutilisée dans AdminPanel) |
| `src/pages/StaffActivation.jsx` | Staff magic link → set password flow |
| `src/pages/PatientActivation.jsx` | Patient magic link → link auth\_user\_id |
| `src/pages/PatientPortal.jsx` | Patient-facing portal (anon/token access) |
| `src/pages/PatientPortalAuth.jsx` | Portail patient complet (auth + données) — redirect vers `/login` corrigé — **FAIT** |
| `src/pages/AdminPanel.jsx` | Super admin : gestion multi-cliniques + CreateClinicModal intégré — **FAIT (v2)** |
| `src/pages/ProtocolTemplates.jsx` | Gestion des templates de protocoles par clinique — **FAIT** |
| `src/components/AddPatientModal.jsx` | Patient record creation form |
| `src/components/PatientDetail.jsx` | Patient detail view + PDF export |
| `src/components/admin/CreateClinicModal.jsx` | Formulaire création clinique (super_admin only) — **FAIT** |
| `src/components/protocols/ProtocolEditor.jsx` | Éditeur d'étapes de protocole — **FAIT** |
| `src/components/NotificationBell.jsx` | Cloche notifications Realtime → **À CRÉER** |
| `supabase/migrations/` | All RLS policies (latest in repo: 021 — **à appliquer via SQL Editor si pas encore fait**) |

---

## Migrations — Apply Order

All migrations must be applied in Supabase SQL Editor in order.

| Migration | Purpose |
| --- | --- |
| 001 | Schema tables |
| 002 | Initial RLS (has restrictive superadmin\_insert\_clinic) |
| 009 | Supreme RLS consolidation (replaces 002 policies) |
| 016 | Consolidated fixes (appointments, medications, etc.) |
| 017 | Realtime + admin insert for users |
| 018 | Storage + appointments/medications for patients |
| 019 | clinics UPDATE for admins + patients SELECT by email |
| 020 | Fix signup RLS + patients UPDATE for staff |
| **021** | **CRITIQUE** : GRANT ALL on all tables + recreate SECURITY DEFINER functions — **APPLIQUER EN PRIORITÉ** |
| **022** | protocol\_templates + protocol\_steps + patient\_protocols — **À CRÉER** |
| **023** | Table notifications + Realtime — **À CRÉER** |

---

## Option B — Plan de modifications

> **Contexte** : PostOp Tracker est déployé en mode "opéré". Pas d'inscription publique, pas de Stripe.
> Les cliniques sont créées manuellement par le super_admin. Les clients sont démarchés en direct.
> Ce plan amène l'application à un MVP utilisable et stable en 6–8 semaines.

---

### 🔴 À supprimer / désactiver

#### Route `/signup` dans `App.jsx`
- Désactiver la route publique `/signup` dans le router React.
- Le fichier `SignupClinic.jsx` **n'est pas supprimé** — sa logique est réutilisée dans `CreateClinicModal.jsx`.
- Si besoin en dev, conditionner la route sur `import.meta.env.DEV` uniquement.

#### Route `/` vers landing page marketing
- Si `/` affiche une landing avec CTA "S'inscrire", remplacer par un redirect vers `/login`.
- Aucune page marketing publique n'est nécessaire en Option B.

#### `netlify/functions/create-staff` (si présent)
- Cette fonction était appelée depuis `Settings.jsx` pour créer le staff (bug #8 — timeout infini).
- Elle a été bypassée dans le code mais le fichier traîne probablement dans `netlify/functions/`.
- Supprimer le dossier ou tout fichier non appelé pour nettoyer le repo.

---

### 🟡 À corriger (bugs bloquants)

#### 1. Migration 021 non appliquée — **CRITIQUE**
- Sans migration 021 : le staff ne peut pas créer de patients (GRANT SELECT manquant sur `users`).
- Action : Supabase Dashboard → SQL Editor → exécuter `supabase/migrations/021_grants_and_security_definer_fix.sql`.

#### 2. `netlify.toml` — SPA redirect manquant — **CRITIQUE**
- Tout refresh de page sur `/dashboard`, `/patient/portal`, etc. retourne une 404 en production.
- Ajouter après les headers existants :
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### 3. Supabase Redirect URLs non configurées — **CRITIQUE**
- Les magic links redirigent vers `/` au lieu de `/patient/activate` et `/staff/activate`.
- Action : Supabase Dashboard → Authentication → URL Configuration → Redirect URLs. Ajouter :
  - `https://[domaine-prod]/patient/activate`
  - `https://[domaine-prod]/staff/activate`
  - `http://localhost:5173/patient/activate`
  - `http://localhost:5173/staff/activate`

#### 4. `AuthContext.jsx` — redirection post-login par rôle absente
- Après connexion, tous les rôles arrivent sur le même dashboard.
- Ajouter une logique de redirection selon `profile.role` :
  - `super_admin` → `/admin`
  - `clinic_admin` / `nurse` / `doctor` → `/dashboard`
  - `patient` → `/patient/portal`
- Si un utilisateur non-authentifié tente d'accéder à une route protégée → redirect vers `/login`.

---

### 🟢 À créer

#### Semaine 1–2 : Auth & Navigation

**`src/pages/Login.jsx`**
- Page de connexion principale sur route `/login` (remplace la landing sur `/`).
- Deux modes : "Espace médical" (email + mot de passe) et "Espace patient" (email → OTP magic link).
- Un seul formulaire avec toggle entre les deux modes.
- Gère la redirection post-login selon le rôle via `AuthContext`.

**`src/pages/PatientPortalAuth.jsx`**
- Les patients entrent leur email → reçoivent un OTP Supabase → saisissent le code → redirect vers `/patient/portal`.
- Distinct de `PatientActivation.jsx` qui gère uniquement la première activation via magic link d'invite.

#### Semaine 2–3 : Super Admin Panel

**`src/pages/AdminPanel.jsx`**
- Route `/admin` protégée par rôle `super_admin`.
- Vue principale : liste de toutes les cliniques (statut, nb patients, date création).
- Actions : créer une clinique, suspendre un accès.

**`src/components/admin/CreateClinicModal.jsx`**
- Modal appelé depuis `AdminPanel`.
- Reprend la logique de `SignupClinic.jsx` : insert `clinics` + `users`, envoi magic link admin.
- Champs : nom de la clinique, email admin, couleur branding, logo.

#### Semaine 3–5 : Protocoles paramétrables

**`supabase/migrations/022_protocol_templates.sql`**
- Table `protocol_templates` : `(id, clinic_id, name, procedure_type, created_at)`
- Table `protocol_steps` : `(id, template_id, day_offset, title, instructions, type: info|alert|task)`
- Table `patient_protocols` : `(id, patient_id, template_id, start_date, status)`
- RLS : chaque clinique voit et gère uniquement ses propres templates.

**`src/pages/ProtocolTemplates.jsx`**
- Accessible depuis le dashboard (rôle `clinic_admin`).
- Liste des templates par type d'intervention.
- Bouton "Nouveau template" → ouvre `ProtocolEditor`.

**`src/components/protocols/ProtocolEditor.jsx`**
- Éditeur d'étapes de protocole par "Jour J+X".
- Ajout / suppression / réordonnancement d'étapes.
- Chaque étape : titre, description, type (information / alerte / tâche patient).

#### Semaine 5–6 : Notifications in-app

**`supabase/migrations/023_notifications.sql`**
- Table `notifications` : `(id, user_id, clinic_id, type, title, body, read, created_at, link)`
- Activer Supabase Realtime sur cette table.
- Types : `protocol_step_due`, `patient_alert`, `staff_invite`.

**`src/components/NotificationBell.jsx`**
- Cloche dans le header avec badge rouge (non-lus).
- Panel déroulant avec liste chronologique.
- Subscription Supabase Realtime au mount, unsubscribe au unmount.
- Marquer comme lu au clic.

---

### 🔵 À modifier (fichiers existants)

**`netlify.toml`**
- Ajouter le bloc `[[redirects]]` SPA (voir section "À corriger" ci-dessus).

**`src/App.jsx`**
- Remplacer route `/` par `Login.jsx` ou redirect vers `/login`.
- Supprimer route `/signup` (ou conditionner sur `import.meta.env.DEV`).
- Ajouter route `/login` → `Login.jsx`.
- Ajouter route `/admin` protégée rôle `super_admin` → `AdminPanel.jsx`.
- Ajouter route `/protocols` protégée rôle `clinic_admin` → `ProtocolTemplates.jsx`.
- Vérifier que `/patient/activate` et `/staff/activate` sont bien déclarées.

**`src/context/AuthContext.jsx`**
- Ajouter redirection post-login selon `profile.role` (voir section "À corriger").
- Rediriger les non-authentifiés vers `/login` au lieu de `/`.

**`src/pages/NurseDashboard.jsx`**
- Ajouter colonne ou indicateur sur chaque patient : protocole actif + jour J+X en cours.
- Bouton d'assignation de protocole depuis la fiche patient.
- Indicateur visuel si une étape est en retard.

**`src/pages/Settings.jsx`**
- Ajouter section "Protocoles post-op" avec lien vers `/protocols`.
- Cleanup : supprimer tout code mort lié à l'Edge Function `create-staff`.

**`src/components/PatientDetail.jsx`**
- Ajouter onglet/section "Protocole" : nom du protocole, étapes passées (cochées), étape en cours, étapes futures.
- Bouton pour changer ou réinitialiser le protocole.
- Inclure cette section dans le PDF export.

---

### 🟣 Infra Supabase (Dashboard — pas du code)

| Action | Priorité | Où |
| --- | --- | --- |
| Appliquer migration 021 | **P1 — critique** | SQL Editor |
| Configurer Redirect URLs | **P1 — critique** | Auth → URL Configuration |
| Personnaliser Email Templates (magic link + invite) | P2 — semaine 1 | Auth → Email Templates |
| Vérifier variables env Netlify (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) | P2 — semaine 1 | Netlify → Site settings → Env vars |
| Activer Realtime sur table `notifications` | P3 — semaine 5 | Database → Replication |

---

## Flux utilisateurs cibles (Option B)

### Flux 1 — super_admin : créer une clinique
1. Connexion sur `/login` avec credentials super_admin
2. Redirect automatique vers `/admin` (AdminPanel)
3. Clic "Nouvelle clinique" → remplir nom, email admin, branding
4. Supabase crée clinic + envoie magic link à l'admin clinique
5. La clinique apparaît dans la liste avec statut "En attente d'activation"

### Flux 2 — Admin clinique : s'activer et configurer
1. Reçoit l'email magic link → clic → redirect vers `/staff/activate`
2. `StaffActivation.jsx` → choisit son mot de passe permanent
3. Redirect vers `/dashboard` (NurseDashboard)
4. Settings → invite son équipe (nurse/doctor) via email → même flux magic link
5. Settings → configure branding + crée ses protocoles post-op dans `/protocols`

### Flux 3 — Patient : accès à son portail
1. Staff crée le dossier patient (AddPatientModal) + clique "Inviter"
2. Patient reçoit email magic link → clic → `/patient/activate`
3. `PatientActivation.jsx` → lie son `auth_user_id` au dossier
4. Redirect vers `/patient/portal` — accès à son suivi post-op
5. Reconnexions suivantes : `/login` → mode "Espace patient" → OTP email → `/patient/portal`

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
**Root cause:** `v9_patients_select_own` blocked email-lookup (auth\_user\_id IS NULL at activation).
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

### Session 2

#### 7. Signup blocked by RLS
**Root cause:** Migration 002 created `superadmin_insert_clinic` — only `super_admin` can create clinics.
**Fix (migration 020):**
* Dropped `superadmin_insert_clinic`, recreated as `v20_clinics_insert_onboarding` with `WITH CHECK (true)`
* Added `v20_users_insert_self` and `v20_users_admin_insert`

#### 8. Staff invitation button stuck at "Invitation..."
**Root cause:** `supabase.functions.invoke('create-staff')` → Edge Function inexistante → timeout infini.
**Fix (`src/pages/Settings.jsx`):** Supprimé. Utilise désormais `supabase.auth.signInWithOtp()` directement, avec try-finally pour garantir `setInviting(false)`.

#### 9. Patient record creation silent failure
**Root cause:** `AddPatientModal.handleSubmit` non-async, `addPatient()` sans await, pas de feedback d'erreur.
**Fix (`src/components/AddPatientModal.jsx` + `src/hooks/usePatients.js`):**
* `handleSubmit` est maintenant async avec await
* États `submitting` (spinner) et `submitError` (inline) ajoutés
* `addPatient()` retourne `{ error }` en cas d'échec

#### 10. Patient UPDATE silently blocked
**Root cause:** Migration 009 n'avait pas de policy UPDATE pour le staff.
**Fix (migration 020):** Ajout `v20_patients_update_staff`.

---

### Session 3 — Semaine 1 (Code — COMPLÉTÉ)

#### ✅ Appliqué en Session 3
- **`netlify.toml`** : `[[redirects]]` SPA ajouté — plus de 404 sur refresh en prod
- **`App.jsx`** : routing restructuré — `/` → redirect `/login`, `/signup` désactivé, route `/admin` protégée `super_admin`, guard de rôle complet
- **`LoginPage.jsx`** : refactorisé — sélecteur "Espace médical" / "Espace patient", mode patient envoie un magic link via `signInWithOtp`, lien signup supprimé
- **`PatientPortalAuth.jsx`** : redirect non-authentifié corrigé (`/` → `/login`)
- **`AdminPanel.jsx`** : créé (stub v1) — liste des cliniques avec stats, routing `/admin` opérationnel

#### ⏳ À faire manuellement (Supabase Dashboard)
- **Migration 021** : appliquer via SQL Editor (`supabase/migrations/021_grants_and_security_definer_fix.sql`)
- **Supabase Redirect URLs** : configurer `/patient/activate` et `/staff/activate` dans Auth → URL Configuration
- **Email Templates** : personnaliser magic link + invite dans Auth → Email Templates
- **Variables Netlify** : vérifier `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`

#### 🔜 Prochaines étapes (Session 4)
- **`AdminPanel.jsx` v2** : `CreateClinicModal.jsx` — créer une clinique + envoyer magic link admin
- **Migration 022** : tables `protocol_templates`, `protocol_steps`, `patient_protocols`
- **`ProtocolTemplates.jsx`** + **`ProtocolEditor.jsx`** : interface de gestion des protocoles post-op

---

### Session 4 — Semaine 2–3 (Code — COMPLÉTÉ)

#### ✅ Appliqué en Session 4
- **DB cleanup** : doublons de templates globaux supprimés (conservé le plus ancien par `intervention_type`)
- **`CreateClinicModal.jsx`** : créé — INSERT clinics + signInWithOtp avec metadata (full_name, role, clinic_id) + rollback sur erreur OTP + color picker 8 couleurs + step succès
- **`AdminPanel.jsx` v2** : `fetchClinics` en `useCallback`, bouton "Nouvelle clinique" actif, intégration `CreateClinicModal` avec `AnimatePresence`
- **`ProtocolEditor.jsx`** : créé — CRUD d'étapes (label, description, J+ day, type info/task/alert), move up/down, INSERT/UPDATE `protocol_templates` JSONB
- **`ProtocolTemplates.jsx`** : créé — liste globaux + clinique, édition inline via `ProtocolEditor`, suppression avec confirmation
- **`App.jsx`** : route `/protocols` ajoutée, protégée `clinic_admin | surgeon | super_admin`

#### 📌 Note technique
- `protocol_templates` utilise déjà un champ JSONB `tasks` (migration 001) — pas besoin de migration 022
- `patient_can_check = type === 'task'` (convention `ProtocolEditor`)

#### 🔜 Prochaines étapes (Session 5)
- **`Settings.jsx`** : ajouter section "Protocoles post-op" avec lien vers `/protocols`
- **`NurseDashboard.jsx`** : indicateur protocole actif par patient (Semaine 4)
- **`PatientDetail.jsx`** : onglet "Protocole" — assigner / visualiser les étapes (Semaine 5)
- **Migration 023** : table `notifications` + Realtime
- **`NotificationBell.jsx`** : cloche temps réel dans le header (Semaine 5–6)

---

### Session 5 — Semaine 3–5 (Code — COMPLÉTÉ)

#### ✅ Appliqué en Session 5
- **`Settings.jsx`** : onglet "Protocoles" remplacé par une carte redirect vers `/protocols` — supprime la duplication avec `ProtocolTemplates.jsx`
- **`PatientList.jsx`** : indicateur de complétion des tâches `X/Y` sur chaque ligne patient (vert si 100%, bleu sinon)
- **`PatientDetail.jsx`** : bouton "Assigner un protocole" dans l'onglet Protocole — charge les templates filtrés par `intervention_type`, bulk INSERT dans `tasks`, reload
- **`supabase/migrations/023_notifications.sql`** : table `notifications` avec RLS + index + Realtime — **à appliquer via SQL Editor**
- **`NotificationBell.jsx`** : créé — cloche fixe top-right dans NurseDashboard, Realtime via `postgres_changes`, badge unread, "Tout lire", clic marque comme lu
- **`NurseDashboard.jsx`** : `NotificationBell` intégré en position fixe top-right

#### ⏳ À faire manuellement (Supabase Dashboard)
- **Migration 023** : appliquer `supabase/migrations/023_notifications.sql` via SQL Editor

#### 🔜 Prochaines étapes (Session 6)
- Tester le flux complet : login → création clinique → invitation staff → assignation protocole → portail patient
- Déploiement Cloudflare Pages + vérification variables env (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- Envoi de notifications programmatiques depuis les triggers Supabase (ex: étape J+ arrivée à échéance)

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

## Signup Flow — DÉSACTIVÉ en Option B

> En Option B, la création de cliniques est gérée uniquement par le super_admin via `/admin`.
> La route `/signup` est retirée du router public. `SignupClinic.jsx` reste sur le disque
> et sa logique est réutilisée dans `CreateClinicModal.jsx`.

---

## Known Limitations

* `lock: noOpLock` in `src/lib/supabase.js` is a workaround for single-tab SPA; re-enable by removing if multi-tab support needed
* PDF export captures off-screen PrintReport — images from private storage URLs may not render (CORS)
