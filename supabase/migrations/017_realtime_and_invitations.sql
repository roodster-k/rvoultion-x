-- 017_realtime_and_invitations.sql
-- Fix realtime delivery for patient→staff messages + allow admin to insert staff users.
-- EXÉCUTER dans Supabase SQL Editor > New Query > Run
-- Sûr à ré-exécuter plusieurs fois.

BEGIN;

-- ════════════════════════════════════════════════════════════════
-- 1. MESSAGES — REPLICA IDENTITY FULL
--    Required so Supabase Realtime row-level filters (clinic_id=eq.xxx)
--    work correctly. Without this, WAL events may not carry the column
--    values needed to evaluate the filter.
-- ════════════════════════════════════════════════════════════════
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE alerts   REPLICA IDENTITY FULL;

-- ════════════════════════════════════════════════════════════════
-- 2. USERS — Allow clinic admins to INSERT new staff records
--    The existing v9_users_insert_onboarding only allows self-insert
--    (auth_user_id = auth.uid()). We need an additional policy so
--    that clinic_admin/super_admin can create staff via client-side
--    fallback when the Edge Function is unavailable.
-- ════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "v17_users_admin_insert" ON users;

CREATE POLICY "v17_users_admin_insert" ON users FOR INSERT TO authenticated
  WITH CHECK (
    clinic_id = get_my_clinic_id()
    AND get_my_role() IN ('clinic_admin', 'super_admin')
  );

-- ════════════════════════════════════════════════════════════════
-- 3. PATIENTS — Allow staff to update auth_user_id for email-based
--    patient linking (when patient logs in for first time via OTP).
-- ════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "v17_patients_link_auth" ON patients;

CREATE POLICY "v17_patients_link_auth" ON patients FOR UPDATE TO authenticated
  USING (auth_user_id IS NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1))
  WITH CHECK (auth_user_id = auth.uid());

COMMIT;
