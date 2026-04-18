-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 024 — Fix v22_patients_link_auth WITH CHECK clause
--
-- Bug: v22_patients_link_auth had no WITH CHECK.
-- PostgreSQL defaults WITH CHECK = USING for UPDATE policies.
-- After UPDATE SET auth_user_id = <uuid>, the new row fails USING
-- (auth_user_id IS NULL is now FALSE) → UPDATE silently blocked.
-- Consequence: auth_user_id never persisted → patient sees "Dossier introuvable"
-- on every reload + photo uploads fail (get_my_patient_id() returns NULL).
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS v22_patients_link_auth ON public.patients;

CREATE POLICY v24_patients_link_auth
  ON public.patients FOR UPDATE TO authenticated
  USING (
    auth_user_id IS NULL
    AND lower(email) = lower(auth.email())
  )
  WITH CHECK (
    auth_user_id = auth.uid()
  );
