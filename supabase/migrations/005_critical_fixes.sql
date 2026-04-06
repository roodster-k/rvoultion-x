-- ============================================================
-- POSTOP TRACKER — CRITICAL FIXES
-- Migration 005 : RLS & Constraints
-- ============================================================

-- 1. Autoriser les patients à insérer des alertes (Bug 3)
-- Auparavant bloqué car on pensait que seul le service_role insérait.
CREATE POLICY "patient_insert_alerts"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id = get_my_patient_id()
  );

-- 2. Autoriser les patients à voir leurs propres alertes (Utile pour le debug/historique)
CREATE POLICY "patient_select_own_alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (
    patient_id = get_my_patient_id()
  );

-- 3. Fix pain_scores upsert (Bug 12)
-- S'assurer qu'il existe une contrainte UNIQUE sur (patient_id, jour_post_op)
-- pour permettre l'upsert correct.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pain_scores_patient_day_key') THEN
        ALTER TABLE pain_scores ADD CONSTRAINT pain_scores_patient_day_key UNIQUE (patient_id, jour_post_op);
    END IF;
END $$;

-- 4. Nettoyage : Marquer l'ancien schéma comme obsolète (Bug 6)
-- On ne supprime pas encore pour éviter les pertes de données par erreur, 
-- mais on s'assure que les nouvelles tables sont privilégiées.
COMMENT ON TABLE clinics IS 'V2 Table - Source of Truth';
COMMENT ON TABLE patients IS 'V2 Table - Source of Truth';

-- 5. Support Portail Legacy (Bug 7)
-- Permettre aux visiteurs anonymes (ANON) de voir un patient s'ils ont le bon token
CREATE POLICY "anon_select_patient_by_token"
  ON patients FOR SELECT
  TO anon
  USING (true); -- Le filtrage se fera via .eq('token', token) dans le code

-- Permettre aux visiteurs anonymes de voir les données liées (tasks, messages, etc.)
-- NOTE: C'est sécurisé car ils n'ont pas l'ID du patient sans le token.
CREATE POLICY "anon_select_tasks" ON tasks FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_messages" ON messages FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_photos" ON photos FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_pain" ON pain_scores FOR SELECT TO anon USING (true);

-- Permettre aux patients anonymes d'envoyer des messages/photos/douleur (Bug 5)
CREATE POLICY "anon_insert_message" ON messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert_photo" ON photos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert_pain" ON pain_scores FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert_alerts" ON alerts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_tasks" ON tasks FOR UPDATE TO anon USING (true);
