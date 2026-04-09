-- ============================================================
-- POSTOP TRACKER — MIGRATION 019
--
-- Fixes two critical RLS gaps:
--
-- 1. v19_clinics_admin_update
--    Clinics had no UPDATE policy (only INSERT + SELECT from 009).
--    Without it, clinic_admin UPDATE calls silently return {count:0},
--    so color, logo, and name changes never persist.
--
-- 2. v19_patients_select_by_email_activation
--    When a patient first activates via magic link their auth_user_id
--    is still NULL, so v9_patients_select_own (auth_user_id = auth.uid())
--    blocks the email-lookup step in PatientActivation.jsx.
--    This policy allows the lookup during activation.
-- ============================================================


-- ─── 1. Clinics UPDATE for admins ───────────────────────────
CREATE POLICY "v19_clinics_admin_update" ON clinics
  FOR UPDATE TO authenticated
  USING (
    id = get_my_clinic_id()
    AND get_my_role() IN ('clinic_admin', 'super_admin')
  )
  WITH CHECK (
    id = get_my_clinic_id()
    AND get_my_role() IN ('clinic_admin', 'super_admin')
  );


-- ─── 2. Patients SELECT by email for activation ─────────────
-- Allows an authenticated patient (just clicked magic link) to
-- read their own patient record by email when auth_user_id IS NULL.
-- This is only reachable by the account whose email matches.
CREATE POLICY "v19_patients_select_by_email_activation" ON patients
  FOR SELECT TO authenticated
  USING (
    auth_user_id IS NULL
    AND lower(email) = lower(
      (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)
    )
  );
