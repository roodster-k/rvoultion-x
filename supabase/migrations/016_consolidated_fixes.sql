-- 016_consolidated_fixes.sql
-- Applique toutes les corrections manquantes en une seule passe idempotente.
-- EXÉCUTER dans Supabase SQL Editor > New Query > Run
-- Sûr à ré-exécuter plusieurs fois (IF NOT EXISTS / DROP IF EXISTS partout).

BEGIN;

-- ════════════════════════════════════════════════════════════════
-- 1. TABLE APPOINTMENTS (si 013 non appliqué)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS appointments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
  clinic_id     uuid NOT NULL REFERENCES clinics(id)   ON DELETE CASCADE,
  created_by    uuid             REFERENCES users(id)   ON DELETE SET NULL,
  title         text NOT NULL,
  scheduled_at  timestamptz NOT NULL,
  location      text,
  notes         text,
  done          boolean NOT NULL DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appt_patient  ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appt_clinic   ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appt_date     ON appointments(clinic_id, scheduled_at);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Drop avant de recréer pour éviter les doublons
DROP POLICY IF EXISTS "Staff can manage clinic appointments"  ON appointments;
DROP POLICY IF EXISTS "Patient can view own appointments"     ON appointments;
DROP POLICY IF EXISTS "v16_appointments_staff"               ON appointments;
DROP POLICY IF EXISTS "v16_appointments_patient"             ON appointments;

CREATE POLICY "v16_appointments_staff" ON appointments FOR ALL TO authenticated
  USING (clinic_id = get_my_clinic_id())
  WITH CHECK (clinic_id = get_my_clinic_id());

CREATE POLICY "v16_appointments_patient" ON appointments FOR SELECT TO authenticated
  USING (patient_id = get_my_patient_id());

GRANT ALL ON appointments TO authenticated, service_role;
GRANT SELECT ON appointments TO anon;

-- ════════════════════════════════════════════════════════════════
-- 2. MESSAGES — Fix policies patient (si 014 non appliqué)
-- ════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "v9_messages_patient"        ON messages;
DROP POLICY IF EXISTS "v9_messages_patient_insert" ON messages;
DROP POLICY IF EXISTS "v10_messages_patient_select" ON messages;
DROP POLICY IF EXISTS "v10_messages_patient_insert" ON messages;

CREATE POLICY "v16_messages_patient_select" ON messages FOR SELECT TO authenticated
  USING (patient_id = get_my_patient_id());

CREATE POLICY "v16_messages_patient_insert" ON messages FOR INSERT TO authenticated
  WITH CHECK (
    patient_id    = get_my_patient_id()
    AND clinic_id = get_my_patient_clinic_id()
    AND sender_type = 'patient'
  );

-- ════════════════════════════════════════════════════════════════
-- 3. ALERTS — Fix policies patient (si 014 non appliqué)
-- ════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "v9_alerts_patient"         ON alerts;
DROP POLICY IF EXISTS "v10_alerts_patient_insert" ON alerts;
DROP POLICY IF EXISTS "v10_alerts_patient_select" ON alerts;
DROP POLICY IF EXISTS "v16_alerts_patient_insert" ON alerts;
DROP POLICY IF EXISTS "v16_alerts_patient_select" ON alerts;

CREATE POLICY "v16_alerts_patient_select" ON alerts FOR SELECT TO authenticated
  USING (patient_id = get_my_patient_id());

CREATE POLICY "v16_alerts_patient_insert" ON alerts FOR INSERT TO authenticated
  WITH CHECK (
    patient_id    = get_my_patient_id()
    AND clinic_id = get_my_patient_clinic_id()
  );

-- ════════════════════════════════════════════════════════════════
-- 4. TASKS — Colonne assigned_by (si 015 non appliqué)
-- ════════════════════════════════════════════════════════════════
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES users(id) ON DELETE SET NULL;

-- ════════════════════════════════════════════════════════════════
-- 5. MEDICATIONS (si 015 non appliqué)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS medications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id     uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  prescribed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  name          text NOT NULL,
  dosage        text,
  frequency     text,
  start_day     integer DEFAULT 0,
  end_day       integer,
  notes         text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medications_patient ON medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_clinic  ON medications(clinic_id);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "v15_medications_staff"          ON medications;
DROP POLICY IF EXISTS "v15_medications_patient_select" ON medications;
DROP POLICY IF EXISTS "v15_medications_anon"           ON medications;

CREATE POLICY "v16_medications_staff" ON medications FOR ALL TO authenticated
  USING (clinic_id = get_my_clinic_id()) WITH CHECK (clinic_id = get_my_clinic_id());
CREATE POLICY "v16_medications_patient_select" ON medications FOR SELECT TO authenticated
  USING (patient_id = get_my_patient_id());
CREATE POLICY "v16_medications_anon" ON medications FOR SELECT TO anon USING (true);

GRANT ALL ON medications TO authenticated, service_role;
GRANT SELECT ON medications TO anon;

CREATE TABLE IF NOT EXISTS medication_templates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         uuid REFERENCES clinics(id) ON DELETE CASCADE,
  intervention_type text NOT NULL,
  name              text NOT NULL,
  dosage            text,
  frequency         text,
  duration_days     integer,
  notes             text,
  is_global         boolean NOT NULL DEFAULT false,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE medication_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "v15_med_templates_staff"   ON medication_templates;
DROP POLICY IF EXISTS "v15_med_templates_patient" ON medication_templates;
DROP POLICY IF EXISTS "v15_med_templates_anon"    ON medication_templates;

CREATE POLICY "v16_med_templates_staff" ON medication_templates FOR ALL TO authenticated
  USING (clinic_id = get_my_clinic_id() OR is_global = true)
  WITH CHECK (clinic_id = get_my_clinic_id());
CREATE POLICY "v16_med_templates_patient" ON medication_templates FOR SELECT TO authenticated
  USING (is_global = true OR clinic_id = get_my_patient_clinic_id());
CREATE POLICY "v16_med_templates_anon" ON medication_templates FOR SELECT TO anon USING (true);

GRANT ALL ON medication_templates TO authenticated, service_role;
GRANT SELECT ON medication_templates TO anon;

-- ════════════════════════════════════════════════════════════════
-- 6. PAIN_SCORES — colonnes symptômes (si 011 non appliqué)
-- ════════════════════════════════════════════════════════════════
ALTER TABLE pain_scores ADD COLUMN IF NOT EXISTS temperature    numeric(4,1);
ALTER TABLE pain_scores ADD COLUMN IF NOT EXISTS swelling_level integer;
ALTER TABLE pain_scores ADD COLUMN IF NOT EXISTS has_fever      boolean DEFAULT false;
ALTER TABLE pain_scores ADD COLUMN IF NOT EXISTS other_symptoms text;

-- Contrainte unique pour upsert quotidien
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pain_scores_patient_jour_unique'
  ) THEN
    ALTER TABLE pain_scores
      ADD CONSTRAINT pain_scores_patient_jour_unique
      UNIQUE (patient_id, jour_post_op);
  END IF;
END $$;

COMMIT;
