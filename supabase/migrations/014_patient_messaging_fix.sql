-- 014_patient_messaging_fix.sql
-- Fix: les patients authentifiés ne pouvaient pas envoyer de messages.
--
-- CAUSE : La policy v9_messages_staff (FOR ALL) couvre implicitement
-- les INSERT et son USING clause échoue pour les patients (get_my_clinic_id()
-- retourne NULL pour les patients non-staff). Même si les policies permissives
-- sont OR'd en PostgreSQL, ce patch crée une policy INSERT dédiée avec
-- une contrainte clinic_id explicite via get_my_patient_clinic_id().
--
-- APPLIQUER : SQL Editor > New Query > Run

-- ─── Messages : patient INSERT ────────────────────────────────────────────────
-- Supprime les anciennes policies patient sur messages
DROP POLICY IF EXISTS "v9_messages_patient" ON messages;
DROP POLICY IF EXISTS "v9_messages_patient_insert" ON messages;

-- Patient peut voir ses propres messages
CREATE POLICY "v10_messages_patient_select" ON messages
  FOR SELECT TO authenticated
  USING (patient_id = get_my_patient_id());

-- Patient peut envoyer un message avec son patient_id + clinic_id
CREATE POLICY "v10_messages_patient_insert" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    patient_id    = get_my_patient_id()
    AND clinic_id = get_my_patient_clinic_id()
    AND sender_type = 'patient'
  );

-- ─── Alerts : patient INSERT ──────────────────────────────────────────────────
-- Supprime l'ancienne policy
DROP POLICY IF EXISTS "v9_alerts_patient" ON alerts;

-- Patient peut créer une alerte pour son propre dossier
CREATE POLICY "v10_alerts_patient_insert" ON alerts
  FOR INSERT TO authenticated
  WITH CHECK (
    patient_id    = get_my_patient_id()
    AND clinic_id = get_my_patient_clinic_id()
  );

-- Patient peut lire ses propres alertes (read-only)
CREATE POLICY "v10_alerts_patient_select" ON alerts
  FOR SELECT TO authenticated
  USING (patient_id = get_my_patient_id());
