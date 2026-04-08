-- 018_storage_and_fixes.sql
-- 1. Create clinic-logos storage bucket (public)
-- 2. Add RLS policies for logo upload
-- 3. Fix appointments RLS so patients can SELECT their own appointments
-- SAFE to re-execute (idempotent).

BEGIN;

-- ════════════════════════════════════════════════════════════════
-- 1. STORAGE — clinic-logos bucket
--    Public bucket so logo URLs work without signed URLs.
-- ════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clinic-logos',
  'clinic-logos',
  true,
  2097152,  -- 2 MB
  ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/svg+xml'];

-- Allow authenticated staff (admin) to upload their clinic logo
DROP POLICY IF EXISTS "clinic_logo_upload" ON storage.objects;
CREATE POLICY "clinic_logo_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'clinic-logos'
    AND get_my_role() IN ('clinic_admin', 'super_admin')
    AND (storage.foldername(name))[1] = get_my_clinic_id()::text
  );

DROP POLICY IF EXISTS "clinic_logo_update" ON storage.objects;
CREATE POLICY "clinic_logo_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'clinic-logos'
    AND get_my_role() IN ('clinic_admin', 'super_admin')
    AND (storage.foldername(name))[1] = get_my_clinic_id()::text
  );

-- Public read for logos (bucket is public anyway, but explicit policy is good practice)
DROP POLICY IF EXISTS "clinic_logo_read" ON storage.objects;
CREATE POLICY "clinic_logo_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'clinic-logos');

-- ════════════════════════════════════════════════════════════════
-- 2. APPOINTMENTS — Allow patients to SELECT their own appointments
--    (so the Rappels tab in the patient portal works)
-- ════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "v18_appointments_patient_select" ON appointments;

CREATE POLICY "v18_appointments_patient_select" ON appointments
  FOR SELECT TO authenticated
  USING (
    patient_id = get_my_patient_id()
    OR clinic_id = get_my_clinic_id()
  );

-- ════════════════════════════════════════════════════════════════
-- 3. MEDICATIONS — Allow patients to SELECT their own medications
--    (so the Traitements tab works in patient portal)
-- ════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "v18_medications_patient_select" ON medications;

CREATE POLICY "v18_medications_patient_select" ON medications
  FOR SELECT TO authenticated
  USING (
    patient_id = get_my_patient_id()
    OR clinic_id = get_my_clinic_id()
  );

COMMIT;
