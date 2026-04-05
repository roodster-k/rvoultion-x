-- ============================================================
-- POSTOP TRACKER — SCHÉMA SUPABASE
-- Phase 1 : Fondations Backend
-- Migration 001 : Tables, types, index, triggers
-- Timezone : Europe/Brussels | Langue : fr-BE
-- ============================================================

-- ────────────────────────────────────────────
-- 0. EXTENSIONS
-- ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────
-- 1. TYPES ENUM
-- ────────────────────────────────────────────

CREATE TYPE user_role AS ENUM (
  'super_admin',
  'clinic_admin',
  'surgeon',
  'nurse'
);

CREATE TYPE patient_status AS ENUM (
  'normal',
  'attention',
  'complication'
);

CREATE TYPE sender_type AS ENUM (
  'nurse',
  'patient',
  'surgeon',
  'system'
);

CREATE TYPE alert_type AS ENUM (
  'delay',
  'message',
  'photo',
  'action'
);

CREATE TYPE photo_uploader AS ENUM (
  'patient',
  'nurse'
);

-- ────────────────────────────────────────────
-- 2. TABLE : clinics (tenants)
-- ────────────────────────────────────────────
CREATE TABLE clinics (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  logo_url      text,
  primary_color text DEFAULT '#0f5f54',
  phone         text,
  email         text,
  address       text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

COMMENT ON TABLE clinics IS 'Tenant principal — chaque clinique est un espace isolé';

-- ────────────────────────────────────────────
-- 3. TABLE : users (soignants & admins)
-- ────────────────────────────────────────────
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id     uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  full_name     text NOT NULL,
  role          user_role NOT NULL DEFAULT 'nurse',
  email         text NOT NULL,
  phone         text,
  avatar_url    text,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_users_clinic ON users(clinic_id);
CREATE INDEX idx_users_auth ON users(auth_user_id);
CREATE INDEX idx_users_role ON users(clinic_id, role);

COMMENT ON TABLE users IS 'Soignants et administrateurs — liés à auth.users via auth_user_id';

-- ────────────────────────────────────────────
-- 4. TABLE : patients
-- ────────────────────────────────────────────
CREATE TABLE patients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  clinic_id     uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  assigned_to   uuid REFERENCES users(id) ON DELETE SET NULL,
  surgeon_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  full_name     text NOT NULL,
  email         text,
  phone         text,
  whatsapp      text,
  intervention  text NOT NULL,
  surgery_date  date NOT NULL,
  status        patient_status DEFAULT 'normal',
  notes         text DEFAULT '',
  token         text UNIQUE DEFAULT gen_random_uuid()::text,
  invited_at    timestamptz,
  activated_at  timestamptz,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_patients_clinic ON patients(clinic_id);
CREATE INDEX idx_patients_assigned ON patients(assigned_to);
CREATE INDEX idx_patients_surgeon ON patients(surgeon_id);
CREATE INDEX idx_patients_status ON patients(clinic_id, status);
CREATE INDEX idx_patients_auth ON patients(auth_user_id);

COMMENT ON TABLE patients IS 'Dossiers patients — auth_user_id lié au compte Supabase Auth (magic link)';

-- ────────────────────────────────────────────
-- 5. TABLE : protocol_templates
-- ────────────────────────────────────────────
CREATE TABLE protocol_templates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         uuid REFERENCES clinics(id) ON DELETE CASCADE,
  intervention_type text NOT NULL,
  name              text NOT NULL,
  description       text,
  is_global         boolean DEFAULT false,
  tasks             jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX idx_templates_clinic ON protocol_templates(clinic_id);
CREATE INDEX idx_templates_intervention ON protocol_templates(intervention_type);

COMMENT ON TABLE protocol_templates IS 'Templates de protocole par type d''intervention';

-- ────────────────────────────────────────────
-- 6. TABLE : tasks (instances par patient)
-- ────────────────────────────────────────────
CREATE TABLE tasks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id         uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  template_id       uuid REFERENCES protocol_templates(id) ON DELETE SET NULL,
  label             text NOT NULL,
  description       text,
  jour_post_op_ref  int,
  due_date          date,
  patient_can_check boolean DEFAULT false,
  done              boolean DEFAULT false,
  done_at           timestamptz,
  done_by           uuid REFERENCES users(id) ON DELETE SET NULL,
  sort_order        int DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX idx_tasks_patient ON tasks(patient_id);
CREATE INDEX idx_tasks_clinic ON tasks(clinic_id);
CREATE INDEX idx_tasks_done ON tasks(patient_id, done);
CREATE INDEX idx_tasks_due ON tasks(due_date) WHERE done = false;

COMMENT ON TABLE tasks IS 'Instances de tâches protocole par patient';

-- ────────────────────────────────────────────
-- 7. TABLE : messages
-- ────────────────────────────────────────────
CREATE TABLE messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id     uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  sender_type   sender_type NOT NULL,
  sender_id     uuid,
  content       text NOT NULL,
  is_read       boolean DEFAULT false,
  read_at       timestamptz,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_messages_patient ON messages(patient_id);
CREATE INDEX idx_messages_clinic ON messages(clinic_id);
CREATE INDEX idx_messages_unread ON messages(patient_id, is_read) WHERE is_read = false;

COMMENT ON TABLE messages IS 'Messagerie bidirectionnelle patient ↔ soignant';

-- ────────────────────────────────────────────
-- 8. TABLE : photos
-- ────────────────────────────────────────────
CREATE TABLE photos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id     uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id      uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  storage_path   text NOT NULL,
  thumbnail_path text,
  label          text,
  jour_post_op   int,
  uploaded_by    photo_uploader NOT NULL DEFAULT 'patient',
  uploader_id    uuid,
  metadata       jsonb DEFAULT '{}'::jsonb,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX idx_photos_patient ON photos(patient_id);
CREATE INDEX idx_photos_clinic ON photos(clinic_id);
CREATE INDEX idx_photos_jour ON photos(patient_id, jour_post_op);

COMMENT ON TABLE photos IS 'Photos de suivi post-opératoire stockées sur Supabase Storage';

-- ────────────────────────────────────────────
-- 9. TABLE : alerts
-- ────────────────────────────────────────────
CREATE TABLE alerts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id    uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type          alert_type NOT NULL,
  title         text NOT NULL,
  message       text,
  is_read       boolean DEFAULT false,
  read_at       timestamptz,
  read_by       uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_alerts_clinic ON alerts(clinic_id);
CREATE INDEX idx_alerts_patient ON alerts(patient_id);
CREATE INDEX idx_alerts_unread ON alerts(clinic_id, is_read) WHERE is_read = false;
CREATE INDEX idx_alerts_type ON alerts(clinic_id, type);

COMMENT ON TABLE alerts IS 'Alertes pour les soignants';

-- ────────────────────────────────────────────
-- 10. TABLE : pain_scores
-- ────────────────────────────────────────────
CREATE TABLE pain_scores (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id     uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  score         int NOT NULL CHECK (score >= 0 AND score <= 10),
  jour_post_op  int NOT NULL,
  notes         text,
  created_at    timestamptz DEFAULT now(),

  UNIQUE(patient_id, jour_post_op)
);

CREATE INDEX idx_pain_patient ON pain_scores(patient_id);
CREATE INDEX idx_pain_clinic ON pain_scores(clinic_id);

COMMENT ON TABLE pain_scores IS 'Échelle de douleur VAS/NRS (0-10)';

-- ────────────────────────────────────────────
-- 11. TRIGGERS : updated_at automatique
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clinics_updated_at
  BEFORE UPDATE ON clinics FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_patients_updated_at
  BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_templates_updated_at
  BEFORE UPDATE ON protocol_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
