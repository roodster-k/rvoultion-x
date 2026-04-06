-- 013_appointments.sql
-- Post-op follow-up appointment scheduling.

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

CREATE INDEX idx_appt_patient  ON appointments(patient_id);
CREATE INDEX idx_appt_clinic   ON appointments(clinic_id);
CREATE INDEX idx_appt_date     ON appointments(clinic_id, scheduled_at);
CREATE INDEX idx_appt_pending  ON appointments(clinic_id, done) WHERE done = false;

-- RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage clinic appointments"
  ON appointments FOR ALL
  USING (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Patients can view their own appointments (read-only)
CREATE POLICY "Patient can view own appointments"
  ON appointments FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE auth_user_id = auth.uid()
    )
  );

COMMENT ON TABLE appointments IS 'Rendez-vous de suivi post-opératoire planifiés par l''équipe soignante.';
