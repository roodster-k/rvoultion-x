-- ============================================================
-- MIGRATION 022 — Fix patients RLS policies that reference auth.users
--
-- Root cause: v17_patients_link_auth, v19_patients_select_by_email_activation,
-- and v20_patients_select_by_email_activation all do:
--   SELECT users.email FROM auth.users WHERE users.id = auth.uid()
-- The `authenticated` role has no access to auth.users, so this
-- causes "permission denied for table users" on EVERY patients query
-- (including INSERT ... RETURNING *).
--
-- Fix: replace the auth.users subquery with auth.email() which reads
-- directly from the JWT claims and requires no table access.
-- ============================================================

BEGIN;

-- Drop the broken policies
DROP POLICY IF EXISTS v19_patients_select_by_email_activation ON public.patients;
DROP POLICY IF EXISTS v20_patients_select_by_email_activation ON public.patients;
DROP POLICY IF EXISTS v17_patients_link_auth ON public.patients;

-- Recreate SELECT policy using auth.email() instead of auth.users subquery
CREATE POLICY v22_patients_select_by_email_activation
  ON public.patients
  FOR SELECT
  TO authenticated
  USING (
    auth_user_id IS NULL
    AND lower(email) = lower(auth.email())
  );

-- Recreate UPDATE policy using auth.email() instead of auth.users subquery
CREATE POLICY v22_patients_link_auth
  ON public.patients
  FOR UPDATE
  TO authenticated
  USING (
    auth_user_id IS NULL
    AND lower(email) = lower(auth.email())
  );

COMMIT;
