-- ============================================================
-- POSTOP TRACKER — ROBUST RLS & PERMISSIONS
-- Migration 006 : Final RLS Fixes
-- ============================================================

-- 1. Grants explicites (évite les erreurs 42501)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 2. Refaire les policies 'users' pour être plus robustes
-- Un utilisateur AUTHENTICATED doit TOUJOURS pouvoir voir son propre profil
-- Ceci évite la récursion infinie avec get_my_clinic_id().
DROP POLICY IF EXISTS "staff_select_clinic_users" ON users;
CREATE POLICY "staff_select_own_profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "staff_select_clinic_users"
  ON users FOR SELECT
  TO authenticated
  USING (clinic_id = (SELECT u.clinic_id FROM users u WHERE u.auth_user_id = auth.uid()));

-- Pareil pour patients
DROP POLICY IF EXISTS "patient_select_own" ON patients;
CREATE POLICY "patient_select_own_profile"
  ON patients FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- 3. Autoriser l'insertion de clinique (Onboarding)
-- Le premier utilisateur d'une clinique a besoin d'insérer son profil users.
-- L'Edge function utilise généralement le service_role, mais si on utilise le client :
CREATE POLICY "authenticated_insert_own_user"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

-- 4. Correction constraints alertes (Bug insert)
-- La migration 002 avait peut-être des trous. On s'assure que INSERT est couvert partout.
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_insert_alerts" ON alerts;
CREATE POLICY "staff_insert_alerts"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN ('nurse', 'surgeon', 'clinic_admin')));
