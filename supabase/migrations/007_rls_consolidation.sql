-- ============================================================
-- POSTOP TRACKER — RLS CONSOLIDATION
-- Migration 007 : Replace fragmented policies (002-006) with 
-- a single, coherent, auditable set.
--
-- CONTEXT: Migrations 002 through 006 accumulated overlapping,
-- sometimes contradictory policies (e.g., anon USING(true) on 
-- nearly all tables). This migration drops ALL existing policies
-- and recreates them cleanly.
--
-- EXECUTE: Supabase Dashboard > SQL Editor > New Query > Run
-- ============================================================

-- ════════════════════════════════════════════
-- STEP 1: DROP ALL EXISTING POLICIES
-- ════════════════════════════════════════════

-- clinics
DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='clinics'
LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON clinics', r.policyname); END LOOP; END $$;

-- users
DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='users'
LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON users', r.policyname); END LOOP; END $$;

-- patients
DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='patients'
LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON patients', r.policyname); END LOOP; END $$;

-- tasks
DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='tasks'
LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON tasks', r.policyname); END LOOP; END $$;

-- messages
DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='messages'
LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON messages', r.policyname); END LOOP; END $$;

-- photos
DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='photos'
LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON photos', r.policyname); END LOOP; END $$;

-- alerts
DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='alerts'
LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON alerts', r.policyname); END LOOP; END $$;

-- pain_scores
DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='pain_scores'
LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON pain_scores', r.policyname); END LOOP; END $$;

-- protocol_templates
DO $$ DECLARE r RECORD;
BEGIN FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='protocol_templates'
LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON protocol_templates', r.policyname); END LOOP; END $$;


-- ════════════════════════════════════════════
-- STEP 2: ENSURE RLS IS ENABLED ON ALL TABLES
-- ════════════════════════════════════════════

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pain_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_templates ENABLE ROW LEVEL SECURITY;


-- ════════════════════════════════════════════
-- STEP 3: ENSURE HELPER FUNCTIONS EXIST
-- (Recreate with OR REPLACE to be safe)
-- ════════════════════════════════════════════

-- These use SECURITY DEFINER to avoid infinite recursion when
-- a policy on `users` needs to query `users` itself.

CREATE OR REPLACE FUNCTION get_my_clinic_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT clinic_id FROM users WHERE auth_user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_my_patient_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM patients WHERE auth_user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_my_patient_clinic_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT clinic_id FROM patients WHERE auth_user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND is_active = true)
$$;

CREATE OR REPLACE FUNCTION is_patient()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM patients WHERE auth_user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM users WHERE auth_user_id = auth.uid()
$$;


-- ════════════════════════════════════════════
-- STEP 4: GRANTS
-- ════════════════════════════════════════════

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
-- Anon gets MINIMAL access (only what's needed for legacy token portal)
GRANT SELECT ON patients TO anon;
GRANT SELECT, UPDATE ON tasks TO anon;
GRANT SELECT, INSERT ON messages TO anon;
GRANT SELECT, INSERT ON photos TO anon;
GRANT SELECT, INSERT ON pain_scores TO anon;
GRANT SELECT, INSERT ON alerts TO anon;


-- ════════════════════════════════════════════
-- STEP 5: RECREATE ALL POLICIES — CLEAN SET
-- ════════════════════════════════════════════

-- ────────────── CLINICS ──────────────

-- Staff sees own clinic
CREATE POLICY "v7_staff_select_clinic" ON clinics FOR SELECT TO authenticated
  USING (id = get_my_clinic_id());

-- Patient sees own clinic (for branding)
CREATE POLICY "v7_patient_select_clinic" ON clinics FOR SELECT TO authenticated
  USING (id = get_my_patient_clinic_id());

-- Admin can update clinic settings
CREATE POLICY "v7_admin_update_clinic" ON clinics FOR UPDATE TO authenticated
  USING (id = get_my_clinic_id() AND get_my_role() IN ('clinic_admin', 'super_admin'))
  WITH CHECK (id = get_my_clinic_id());

-- Insert clinics: only via service_role (Edge Functions) — no policy needed


-- ────────────── USERS ──────────────

-- CRITICAL: A user must ALWAYS be able to read their own row (avoids recursion)
CREATE POLICY "v7_user_select_own" ON users FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- Staff sees colleagues in same clinic
CREATE POLICY "v7_staff_select_colleagues" ON users FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id());

-- Patient sees staff of their clinic (for messaging context)
CREATE POLICY "v7_patient_select_clinic_staff" ON users FOR SELECT TO authenticated
  USING (clinic_id = get_my_patient_clinic_id());

-- Admin can insert staff
CREATE POLICY "v7_admin_insert_user" ON users FOR INSERT TO authenticated
  WITH CHECK (
    clinic_id = get_my_clinic_id() 
    AND get_my_role() IN ('clinic_admin', 'super_admin')
  );

-- Self-insert (needed during signup Edge Function flow)
CREATE POLICY "v7_self_insert_user" ON users FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

-- Staff can update own profile; admin can update anyone in clinic
CREATE POLICY "v7_staff_update_user" ON users FOR UPDATE TO authenticated
  USING (
    clinic_id = get_my_clinic_id() 
    AND (auth_user_id = auth.uid() OR get_my_role() IN ('clinic_admin', 'super_admin'))
  )
  WITH CHECK (clinic_id = get_my_clinic_id());

-- Admin can deactivate users
CREATE POLICY "v7_admin_delete_user" ON users FOR DELETE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() IN ('clinic_admin', 'super_admin'));


-- ────────────── PATIENTS ──────────────

-- Staff sees all patients in their clinic
CREATE POLICY "v7_staff_select_patients" ON patients FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id());

-- Patient sees own record
CREATE POLICY "v7_patient_select_own" ON patients FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- Anon can read patients (legacy token portal — filtered by .eq('token', x) in app)
-- SECURITY NOTE: This is necessary for the legacy portal but should be removed
-- once all patients are migrated to authenticated access.
CREATE POLICY "v7_anon_select_patient" ON patients FOR SELECT TO anon
  USING (true);

-- Staff can create patients
CREATE POLICY "v7_staff_insert_patient" ON patients FOR INSERT TO authenticated
  WITH CHECK (clinic_id = get_my_clinic_id() AND is_staff());

-- Staff can update patients
CREATE POLICY "v7_staff_update_patient" ON patients FOR UPDATE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND is_staff())
  WITH CHECK (clinic_id = get_my_clinic_id());

-- Patient can update limited fields on own record (activation link)
CREATE POLICY "v7_patient_update_own" ON patients FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Admin can delete patients
CREATE POLICY "v7_admin_delete_patient" ON patients FOR DELETE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() IN ('clinic_admin', 'super_admin'));


-- ────────────── TASKS ──────────────

-- Staff sees all tasks in clinic
CREATE POLICY "v7_staff_select_tasks" ON tasks FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id());

-- Patient sees own tasks
CREATE POLICY "v7_patient_select_tasks" ON tasks FOR SELECT TO authenticated
  USING (patient_id = get_my_patient_id());

-- Anon sees tasks (legacy portal)
CREATE POLICY "v7_anon_select_tasks" ON tasks FOR SELECT TO anon
  USING (true);

-- Staff can create tasks
CREATE POLICY "v7_staff_insert_task" ON tasks FOR INSERT TO authenticated
  WITH CHECK (clinic_id = get_my_clinic_id() AND is_staff());

-- Staff can update any task
CREATE POLICY "v7_staff_update_task" ON tasks FOR UPDATE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND is_staff())
  WITH CHECK (clinic_id = get_my_clinic_id());

-- Patient can check their own patient_can_check tasks
CREATE POLICY "v7_patient_check_task" ON tasks FOR UPDATE TO authenticated
  USING (patient_id = get_my_patient_id() AND patient_can_check = true)
  WITH CHECK (patient_id = get_my_patient_id() AND patient_can_check = true);

-- Anon can check tasks (legacy portal)
CREATE POLICY "v7_anon_update_tasks" ON tasks FOR UPDATE TO anon
  USING (true);

-- Staff can delete tasks
CREATE POLICY "v7_staff_delete_task" ON tasks FOR DELETE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND is_staff());


-- ────────────── MESSAGES ──────────────

-- Staff sees clinic messages
CREATE POLICY "v7_staff_select_messages" ON messages FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id());

-- Patient sees own messages
CREATE POLICY "v7_patient_select_messages" ON messages FOR SELECT TO authenticated
  USING (patient_id = get_my_patient_id());

-- Anon sees messages (legacy portal)
CREATE POLICY "v7_anon_select_messages" ON messages FOR SELECT TO anon
  USING (true);

-- Staff can send messages
CREATE POLICY "v7_staff_insert_message" ON messages FOR INSERT TO authenticated
  WITH CHECK (clinic_id = get_my_clinic_id() AND is_staff());

-- Patient can send messages
CREATE POLICY "v7_patient_insert_message" ON messages FOR INSERT TO authenticated
  WITH CHECK (patient_id = get_my_patient_id() AND sender_type = 'patient');

-- Anon can send messages (legacy portal)
CREATE POLICY "v7_anon_insert_message" ON messages FOR INSERT TO anon
  WITH CHECK (true);

-- Staff can mark messages as read
CREATE POLICY "v7_staff_update_message" ON messages FOR UPDATE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND is_staff())
  WITH CHECK (clinic_id = get_my_clinic_id());


-- ────────────── PHOTOS ──────────────

-- Staff sees clinic photos
CREATE POLICY "v7_staff_select_photos" ON photos FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id());

-- Patient sees own photos
CREATE POLICY "v7_patient_select_photos" ON photos FOR SELECT TO authenticated
  USING (patient_id = get_my_patient_id());

-- Anon sees photos (legacy portal)
CREATE POLICY "v7_anon_select_photos" ON photos FOR SELECT TO anon
  USING (true);

-- Staff can upload photos
CREATE POLICY "v7_staff_insert_photo" ON photos FOR INSERT TO authenticated
  WITH CHECK (clinic_id = get_my_clinic_id() AND is_staff());

-- Patient can upload own photos
CREATE POLICY "v7_patient_insert_photo" ON photos FOR INSERT TO authenticated
  WITH CHECK (patient_id = get_my_patient_id() AND uploaded_by = 'patient');

-- Anon can upload photos (legacy portal)
CREATE POLICY "v7_anon_insert_photo" ON photos FOR INSERT TO anon
  WITH CHECK (true);

-- Admin can delete photos
CREATE POLICY "v7_admin_delete_photo" ON photos FOR DELETE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() IN ('clinic_admin', 'super_admin'));


-- ────────────── ALERTS ──────────────

-- Staff sees clinic alerts
CREATE POLICY "v7_staff_select_alerts" ON alerts FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id());

-- Patient sees own alerts (history/debug)
CREATE POLICY "v7_patient_select_alerts" ON alerts FOR SELECT TO authenticated
  USING (patient_id = get_my_patient_id());

-- Staff can insert alerts (from nurse dashboard actions)
CREATE POLICY "v7_staff_insert_alert" ON alerts FOR INSERT TO authenticated
  WITH CHECK (clinic_id = get_my_clinic_id());

-- Patient can insert alerts (pain score threshold, task completion)
CREATE POLICY "v7_patient_insert_alert" ON alerts FOR INSERT TO authenticated
  WITH CHECK (patient_id = get_my_patient_id());

-- Anon can insert alerts (legacy portal)
CREATE POLICY "v7_anon_insert_alert" ON alerts FOR INSERT TO anon
  WITH CHECK (true);

-- Staff can mark alerts as read
CREATE POLICY "v7_staff_update_alert" ON alerts FOR UPDATE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND is_staff())
  WITH CHECK (clinic_id = get_my_clinic_id());

-- Admin can delete/archive alerts
CREATE POLICY "v7_admin_delete_alert" ON alerts FOR DELETE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() IN ('clinic_admin', 'super_admin'));


-- ────────────── PAIN_SCORES ──────────────

-- Staff sees clinic pain scores
CREATE POLICY "v7_staff_select_pain" ON pain_scores FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id());

-- Patient sees own pain scores
CREATE POLICY "v7_patient_select_pain" ON pain_scores FOR SELECT TO authenticated
  USING (patient_id = get_my_patient_id());

-- Anon sees pain scores (legacy portal)
CREATE POLICY "v7_anon_select_pain" ON pain_scores FOR SELECT TO anon
  USING (true);

-- Staff can insert pain scores (consultation)
CREATE POLICY "v7_staff_insert_pain" ON pain_scores FOR INSERT TO authenticated
  WITH CHECK (clinic_id = get_my_clinic_id() AND is_staff());

-- Patient can insert own pain scores
CREATE POLICY "v7_patient_insert_pain" ON pain_scores FOR INSERT TO authenticated
  WITH CHECK (patient_id = get_my_patient_id());

-- Anon can insert pain scores (legacy portal)
CREATE POLICY "v7_anon_insert_pain" ON pain_scores FOR INSERT TO anon
  WITH CHECK (true);

-- Patient can update own pain score (correction)
CREATE POLICY "v7_patient_update_pain" ON pain_scores FOR UPDATE TO authenticated
  USING (patient_id = get_my_patient_id())
  WITH CHECK (patient_id = get_my_patient_id());


-- ────────────── PROTOCOL_TEMPLATES ──────────────

-- Staff sees own clinic templates + globals
CREATE POLICY "v7_staff_select_templates" ON protocol_templates FOR SELECT TO authenticated
  USING (clinic_id = get_my_clinic_id() OR is_global = true);

-- Admin/surgeon can create templates
CREATE POLICY "v7_staff_insert_template" ON protocol_templates FOR INSERT TO authenticated
  WITH CHECK (
    clinic_id = get_my_clinic_id() 
    AND get_my_role() IN ('clinic_admin', 'super_admin', 'surgeon')
  );

-- Admin/surgeon can update templates
CREATE POLICY "v7_staff_update_template" ON protocol_templates FOR UPDATE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() IN ('clinic_admin', 'super_admin', 'surgeon'))
  WITH CHECK (clinic_id = get_my_clinic_id());

-- Admin can delete templates
CREATE POLICY "v7_admin_delete_template" ON protocol_templates FOR DELETE TO authenticated
  USING (clinic_id = get_my_clinic_id() AND get_my_role() IN ('clinic_admin', 'super_admin'));


-- ════════════════════════════════════════════
-- STEP 6: ENSURE UNIQUE CONSTRAINT FOR PAIN UPSERT
-- ════════════════════════════════════════════

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pain_scores_patient_day_key') THEN
        ALTER TABLE pain_scores ADD CONSTRAINT pain_scores_patient_day_key UNIQUE (patient_id, jour_post_op);
    END IF;
END $$;


-- ════════════════════════════════════════════
-- STEP 7: VERIFICATION — List all active policies
-- ════════════════════════════════════════════

SELECT 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
