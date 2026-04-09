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
| `src/context/PatientContext.jsx` | Staff-side patient data (requires auth session) |
| `src/pages/NurseDashboard.jsx` | Main staff dashboard |
| `src/pages/Settings.jsx` | Admin: clinic settings, staff invitation |
| `src/pages/StaffActivation.jsx` | Staff magic link → set password flow |
| `src/pages/PatientActivation.jsx` | Patient magic link → link auth_user_id |
| `src/pages/PatientPortal.jsx` | Patient-facing portal (anon/token access) |
| `src/components/PatientDetail.jsx` | Patient detail view + PDF export |
| `supabase/migrations/` | All RLS policies (latest: 019) |

---

## Bugs Fixed (this session)

### 1. Session crash every ~1-3 minutes
**Root cause:** Navigator.locks deadlock in Supabase JS v2 (issues #1594, #2013). `_saveSession()` acquires the navigator lock then re-enters it during storage write — hangs indefinitely, then the session is invalidated.

**Fix (`src/lib/supabase.js`):** Added `lock: noOpLock` to bypass the Web Locks API entirely. Safe for single-tab SPA.
```js
const noOpLock = async (_name, _acquireTimeout, fn) => fn();
```

### 2. Staff invitation crashes admin session
**Root cause:** `handleInvite` in `Settings.jsx` previously created a `tmpClient = createClient(...)` and called `tmpClient.auth.signUp()`. Supabase v2 uses BroadcastChannel to sync auth events — `signUp()` fires `SIGNED_IN` with the new user's session, which the main client's `onAuthStateChange` picks up, replacing the admin session.

**Fix (`src/pages/Settings.jsx`):** Replaced `tmpClient.auth.signUp()` with `supabase.auth.signInWithOtp()`. OTP just sends an email — zero auth state side effects on the caller.

### 3. Patient activation: "Aucun dossier patient trouvé"
**Root cause:** Two issues:
- `v9_patients_select_own` requires `auth_user_id = auth.uid()` but new patients have `auth_user_id IS NULL` at activation time — RLS blocks the email-lookup query.
- No SELECT-by-email policy for authenticated users.

**Fix (`src/pages/PatientActivation.jsx`):** Reordered queries — check `existingPatient` (by `auth_user_id`) first, then query by email with `.ilike()`.

**Fix (`supabase/migrations/019_rls_clinics_update_and_patient_activation.sql`):** Added `v19_patients_select_by_email_activation` policy allowing authenticated users to find their patient record by email when `auth_user_id IS NULL`.

### 4. Patient portal simulation: "Lien expiré ou invalide"
**Root cause:** `PatientPortal.jsx` previously used `usePatientContext()` which requires a staff auth session. In a private window or without staff login, `patients = []`, so the patient was never found.

**Fix (`src/pages/PatientPortal.jsx`):** Removed context dependency entirely. Direct Supabase query by `token` using anon access (`v9_patients_select_anon` policy allows it). Added `handleToggleTask` and `handleSendMessage` handlers for real interactivity.

### 5. PDF export shows wrong content
**Root cause:** `<PrintReport>` was rendered inline in the DOM with no off-screen positioning. `html2pdf` / `html2canvas` captured the visible viewport area instead of the report component.

**Fix (`src/components/PatientDetail.jsx`):** Wrapped `<PrintReport>` in an off-screen `div`:
```jsx
<div style={{ position: 'absolute', left: '-9999px', top: 0, width: '794px', pointerEvents: 'none', zIndex: -1 }}>
  <PrintReport patient={currentPatient} ref={printReportRef} />
</div>
```

### 6. Color / Logo not persisting after reload
**Root cause:** The `clinics` table had NO UPDATE RLS policy in any migration (009 only creates INSERT + SELECT). Supabase silently returns `{error: null, count: 0}` for blocked UPDATEs. The UI showed a "success" toast but nothing was saved.

**Fix (`supabase/migrations/019_rls_clinics_update_and_patient_activation.sql`):** Added `v19_clinics_admin_update` policy:
```sql
CREATE POLICY "v19_clinics_admin_update" ON clinics FOR UPDATE TO authenticated
  USING (id = get_my_clinic_id() AND get_my_role() IN ('clinic_admin', 'super_admin'))
  WITH CHECK (id = get_my_clinic_id() AND get_my_role() IN ('clinic_admin', 'super_admin'));
```

### CSS Variable Fix (Tailwind v4)
**Fix (`src/context/AuthContext.jsx`):** All `setProperty('--primary', ...)` changed to `setProperty('--color-primary', ...)`. Tailwind v4 uses `--color-*` prefix for theme tokens.

---

## Migration 019 — Apply Required
**File:** `supabase/migrations/019_rls_clinics_update_and_patient_activation.sql`

**Must be run in Supabase SQL Editor** to activate:
1. `v19_clinics_admin_update` — enables clinic color/logo/name persistence
2. `v19_patients_select_by_email_activation` — enables patient activation flow

---

## Staff Onboarding Flow (Updated)
1. Admin fills invite form in Settings → `supabase.auth.signInWithOtp()` sends email
2. Staff clicks magic link → lands on `/staff/activate`
3. `StaffActivation.jsx` reads `user_metadata` (set via `options.data` in signInWithOtp)
4. Inserts row into `users` table using the new session
5. Staff sets permanent password via `supabase.auth.updateUser({ password })`
6. Redirect to `/dashboard`

## Patient Access Flow (Updated)
1. Admin creates patient record (with email)
2. Admin sends magic link → `supabase.auth.signInWithOtp({ email })`
3. Patient clicks link → `/patient/activate`
4. `PatientActivation.jsx`: checks existing link by `auth_user_id`, then finds by email (`.ilike()`), then UPDATEs `auth_user_id`
5. Redirect to `/patient/portal`

---

## Known Limitations / Next Steps
- **Migration 019 must be applied manually** in Supabase dashboard SQL Editor
- **Logo upload** uses Supabase Storage — ensure bucket `clinic-assets` exists with correct policies
- **Realtime** (messages, alerts) enabled via migration 017; ensure Realtime is enabled on `messages` and `alerts` tables in the Supabase dashboard
- **PDF export** captures the off-screen PrintReport — if patient data has images from private storage URLs, they may not render (CORS). Use signed URLs if needed.
- **Cross-tab session sync** disabled (noOpLock) — acceptable for this SPA use case; re-enable by removing `lock: noOpLock` if multi-tab support is needed later.
