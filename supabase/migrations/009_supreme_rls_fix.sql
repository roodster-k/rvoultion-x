-- ============================================================
-- POSTOP TRACKER — SUPREME RLS CONSOLIDATION (009)
-- Resolves ALL recursion issues and fragmented 002-008 history.
--
-- TARGET: Fix `infinite recursion` on `users` table and enable 
-- client-side onboarding (as requested in 008).
--
-- EXECUTE: SQL Editor > New Query > Run
-- ============================================================

-- ════════════════════════════════════════════
-- 1. DROP ALL EXISTING POLICIES (Full reset)
-- ════════════════════════════════════════════

DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename); 
    END LOOP; 
END $$;


-- ════════════════════════════════════════════
-- 2. RECONSTRUCTION DES HELPER FUNCTIONS
-- (SECURITY DEFINER + explicit search_path prevents recursion)
-- ════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_my_clinic_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT clinic_id FROM users WHERE auth_user_id = (SELECT auth.uid()) LIMIT 1
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM users WHERE auth_user_id = (SELECT auth.uid()) LIMIT 1
$$;

CREATE OR REPLACE FUNCTION get_my_patient_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM patients WHERE auth_user_id = (SELECT auth.uid()) LIMIT 1
$$;

CREATE OR REPLACE FUNCTION get_my_patient_clinic_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT clinic_id FROM patients WHERE auth_user_id = (SELECT auth.uid()) LIMIT 1
$$;

CREATE OR REPLACE FUNCTION is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM users WHERE auth_user_id = (SELECT auth.uid()) AND is_active = true)
$$;


-- ════════════════════════════════════════════
-- 3. POLITIQUES : USERS (TABLE CRITIQUE — RÉCURSION FIXÉE)
-- ════════════════════════════════════════════

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Un utilisateur doit voir son propre profil (Condition simple, sans fonction)
CREATE POLICY "v9_users_select_own" ON users FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- Le Staff voit ses collègues (Appel de fonction SECURITY DEFINER isolée)
CREATE POLICY "v9_users_select_staff" ON users FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id());

-- Patient voit le staff de sa clinique
CREATE POLICY "v9_users_select_patient" ON users FOR SELECT TO authenticated
  USING (clinic_id = get_my_patient_clinic_id());

-- Onboarding : Autoriser l'insertion initiale lors du signup
CREATE POLICY "v9_users_insert_onboarding" ON users FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

-- Admin/Staff update own and clinic colleagues
CREATE POLICY "v9_users_update" ON users FOR UPDATE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND (auth_user_id = auth.uid() OR get_my_role() IN ('clinic_admin', 'super_admin')))
  WITH CHECK (clinic_id = get_my_clinic_id());


-- ════════════════════════════════════════════
-- 4. POLITIQUES : CLINICS (ONBOARDING FIXÉ)
-- ════════════════════════════════════════════

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

-- Autoriser l'insertion d'une nouvelle clinique (Self-onboarding)
CREATE POLICY "v9_clinics_insert_onboarding" ON clinics FOR INSERT TO authenticated
  WITH CHECK (true);

-- Lecture pour staff/patient
CREATE POLICY "v9_clinics_select" ON clinics FOR SELECT TO authenticated
  USING (id = get_my_clinic_id() OR id = get_my_patient_clinic_id());

-- Lecture pour l'anon (Legacy token portal)
CREATE POLICY "v9_clinics_select_anon" ON clinics FOR SELECT TO anon USING (true);


-- ════════════════════════════════════════════
-- 5. POLITIQUES : PATIENTS
-- ════════════════════════════════════════════

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "v9_patients_select_staff" ON patients FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id());

CREATE POLICY "v9_patients_select_own" ON patients FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "v9_patients_select_anon" ON patients FOR SELECT TO anon USING (true);

CREATE POLICY "v9_patients_insert" ON patients FOR INSERT TO authenticated
  WITH CHECK (clinic_id = get_my_clinic_id() AND is_staff());


-- ════════════════════════════════════════════
-- 6. AUTRES TABLES (TASKS, MESSAGES, PHOTOS, ALERTS, PAIN)
-- ════════════════════════════════════════════

-- Appliqué globalement pour simplifier : Staff clinic_id Match OR Patient id Match
-- Photos : storage_path peut être NULL (Fix migration 008)
ALTER TABLE photos ALTER COLUMN storage_path DROP NOT NULL;

-- Tables list
-- tasks, messages, photos, alerts, pain_scores, protocol_templates

-- Staff access (Select/Insert/Update)
DO $$ 
DECLARE 
    t text;
BEGIN 
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
    AND tablename IN ('tasks', 'messages', 'photos', 'alerts', 'pain_scores', 'protocol_templates')
    LOOP 
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('CREATE POLICY "v9_%I_staff" ON %I FOR ALL TO authenticated USING (clinic_id = get_my_clinic_id())', t, t);
    END LOOP; 
END $$;

-- Patient specific access (SELECT/INSERT OWN)
CREATE POLICY "v9_tasks_patient" ON tasks FOR SELECT TO authenticated USING (patient_id = get_my_patient_id());
CREATE POLICY "v9_tasks_patient_update" ON tasks FOR UPDATE TO authenticated USING (patient_id = get_my_patient_id());

CREATE POLICY "v9_messages_patient" ON messages FOR SELECT TO authenticated USING (patient_id = get_my_patient_id());
CREATE POLICY "v9_messages_patient_insert" ON messages FOR INSERT TO authenticated WITH CHECK (patient_id = get_my_patient_id());

CREATE POLICY "v9_photos_patient" ON photos FOR ALL TO authenticated USING (patient_id = get_my_patient_id());
CREATE POLICY "v9_pain_patient" ON pain_scores FOR ALL TO authenticated USING (patient_id = get_my_patient_id());
CREATE POLICY "v9_alerts_patient" ON alerts FOR ALL TO authenticated USING (patient_id = get_my_patient_id());

-- Anon access for Legacy Portal
CREATE POLICY "v9_tasks_anon" ON tasks FOR ALL TO anon USING (true);
CREATE POLICY "v9_messages_anon" ON messages FOR ALL TO anon USING (true);
CREATE POLICY "v9_photos_anon" ON photos FOR ALL TO anon USING (true);
CREATE POLICY "v9_pain_anon" ON pain_scores FOR ALL TO anon USING (true);


-- ════════════════════════════════════════════
-- 7. PERMISSIONS (GRANTS)
-- ════════════════════════════════════════════

GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT INSERT, UPDATE ON tasks, messages, photos, pain_scores, alerts TO anon;

COMMIT;
