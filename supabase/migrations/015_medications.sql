-- 015_medications.sql
-- Suivi des médicaments post-opératoires + templates par intervention.
--
-- APPLIQUER : SQL Editor > New Query > Run (après 014_patient_messaging_fix.sql)

-- ─── 1. Colonne assigned_by dans tasks ────────────────────────────────────────
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES users(id) ON DELETE SET NULL;
COMMENT ON COLUMN tasks.assigned_by IS 'Soignant qui a prescrit/assigné cette tâche';

-- ─── 2. Table medications ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id     uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  prescribed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  name          text NOT NULL,
  dosage        text,                -- ex : '500mg', '1 comprimé'
  frequency     text,                -- ex : '3x/jour', 'Matin et soir'
  start_day     integer DEFAULT 0,   -- J+N depuis opération
  end_day       integer,             -- NULL = jusqu'à nouvel ordre
  notes         text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_medications_patient ON medications(patient_id);
CREATE INDEX idx_medications_clinic  ON medications(clinic_id);
CREATE INDEX idx_medications_active  ON medications(patient_id, is_active) WHERE is_active = true;

COMMENT ON TABLE medications IS 'Médicaments prescrits pour le suivi post-opératoire';

-- ─── 3. Table medication_templates ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medication_templates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         uuid REFERENCES clinics(id) ON DELETE CASCADE,
  intervention_type text NOT NULL,   -- ex : 'Rhinoplastie', 'Abdominoplastie'
  name              text NOT NULL,   -- ex : 'Amoxicilline'
  dosage            text,
  frequency         text,
  duration_days     integer,         -- durée typique en jours post-op
  notes             text,
  is_global         boolean NOT NULL DEFAULT false,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX idx_med_templates_clinic       ON medication_templates(clinic_id);
CREATE INDEX idx_med_templates_intervention ON medication_templates(intervention_type);

COMMENT ON TABLE medication_templates IS 'Traitements pré-définis par type d''intervention';

-- ─── 4. RLS : medications ──────────────────────────────────────────────────────
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

-- Staff gère les médicaments de sa clinique
CREATE POLICY "v15_medications_staff" ON medications FOR ALL TO authenticated
  USING (clinic_id = get_my_clinic_id())
  WITH CHECK (clinic_id = get_my_clinic_id());

-- Patient voit ses propres médicaments actifs
CREATE POLICY "v15_medications_patient_select" ON medications FOR SELECT TO authenticated
  USING (patient_id = get_my_patient_id());

-- Legacy anon portal
CREATE POLICY "v15_medications_anon" ON medications FOR SELECT TO anon USING (true);

-- ─── 5. RLS : medication_templates ────────────────────────────────────────────
ALTER TABLE medication_templates ENABLE ROW LEVEL SECURITY;

-- Staff voit ses templates + les globaux
CREATE POLICY "v15_med_templates_staff" ON medication_templates FOR ALL TO authenticated
  USING (clinic_id = get_my_clinic_id() OR is_global = true)
  WITH CHECK (clinic_id = get_my_clinic_id());

-- Patients peuvent lire les templates (pour affichage)
CREATE POLICY "v15_med_templates_patient" ON medication_templates FOR SELECT TO authenticated
  USING (
    is_global = true
    OR clinic_id = get_my_patient_clinic_id()
  );

CREATE POLICY "v15_med_templates_anon" ON medication_templates FOR SELECT TO anon USING (true);

-- ─── 6. GRANTS ────────────────────────────────────────────────────────────────
GRANT ALL ON medications, medication_templates TO authenticated, service_role;
GRANT SELECT ON medications, medication_templates TO anon;
