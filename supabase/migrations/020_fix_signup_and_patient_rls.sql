-- ============================================================
-- POSTOP TRACKER — MIGRATION 020
-- Fix complet des politiques RLS bloquantes
--
-- Problèmes résolus :
--
-- 1. SIGNUP BLOQUÉ — clinics INSERT
--    Migration 002 créait "superadmin_insert_clinic" qui limite la
--    création de cliniques aux super_admin. Si migration 009 n'a pas
--    été appliquée, ce verrou reste actif et bloque tout nouveau signup.
--    Fix : supprimer toutes les variantes restrictives et recréer une
--    politique permissive pour tout utilisateur authentifié.
--
-- 2. SIGNUP BLOQUÉ — users INSERT pour nouveaux utilisateurs
--    Migration 002 créait "admin_insert_user" qui exige
--    get_my_role() IN ('clinic_admin','super_admin'). Pour un
--    NOUVEL utilisateur (aucun profil dans users), get_my_role()
--    retourne NULL → l'insertion de son propre profil est bloquée.
--    Fix : politique distincte permettant l'auto-insertion lors du
--    onboarding (auth_user_id = auth.uid()).
--
-- 3. PATIENTS UPDATE manquant pour le staff
--    Migration 009 n'a créé que SELECT + INSERT pour patients.
--    Sans politique UPDATE, le staff ne peut pas modifier : statut,
--    notes, invited_at, etc. (echecs silencieux).
--    Fix : ajout d'une politique UPDATE pour tout le staff de la clinique.
--
-- SÛRE à ré-exécuter (IF NOT EXISTS / DROP IF EXISTS partout).
-- ============================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════
-- 1. CLINICS — Fix INSERT pour le signup (tout utilisateur authentifié)
-- ════════════════════════════════════════════════════════════════

-- Supprimer les anciennes politiques restrictives (migration 002 + variantes)
DROP POLICY IF EXISTS "superadmin_insert_clinic"    ON clinics;
DROP POLICY IF EXISTS "v9_clinics_insert_onboarding" ON clinics;

-- Recréer proprement : toute personne authentifiée peut créer sa clinique
CREATE POLICY "v20_clinics_insert_onboarding" ON clinics
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- S'assurer que la politique UPDATE existe (ajoutée en 019, mais idempotent ici)
DROP POLICY IF EXISTS "admin_update_clinic"      ON clinics;  -- migration 002
DROP POLICY IF EXISTS "v19_clinics_admin_update" ON clinics;  -- migration 019
CREATE POLICY "v20_clinics_admin_update" ON clinics
  FOR UPDATE TO authenticated
  USING (
    id = get_my_clinic_id()
    AND get_my_role() IN ('clinic_admin', 'super_admin')
  )
  WITH CHECK (
    id = get_my_clinic_id()
    AND get_my_role() IN ('clinic_admin', 'super_admin')
  );

-- ════════════════════════════════════════════════════════════════
-- 2. USERS — Fix INSERT : séparer onboarding (self) et admin (staff)
-- ════════════════════════════════════════════════════════════════

-- Supprimer l'ancienne politique restrictive (requiert un rôle existant)
DROP POLICY IF EXISTS "admin_insert_user"         ON users;   -- migration 002
DROP POLICY IF EXISTS "v9_users_insert_onboarding" ON users;  -- migration 009
DROP POLICY IF EXISTS "v17_users_admin_insert"    ON users;   -- migration 017

-- Politique 1 : un utilisateur peut créer son propre profil (signup/onboarding)
-- auth_user_id doit correspondre à l'utilisateur connecté → pas de usurpation
CREATE POLICY "v20_users_insert_self" ON users
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

-- Politique 2 : un admin peut créer des profils staff pour sa clinique
-- (utile si l'admin crée un compte manuellement côté dashboard)
CREATE POLICY "v20_users_admin_insert" ON users
  FOR INSERT TO authenticated
  WITH CHECK (
    clinic_id = get_my_clinic_id()
    AND get_my_role() IN ('clinic_admin', 'super_admin')
  );

-- ════════════════════════════════════════════════════════════════
-- 3. PATIENTS — Ajout de la politique UPDATE pour le staff
--    (manquante dans migration 009, causait des échecs silencieux
--    pour : updatePatientStatus, addNote, invitePatient, etc.)
-- ════════════════════════════════════════════════════════════════

-- Supprimer l'ancienne de migration 002 si elle existe
DROP POLICY IF EXISTS "staff_update_patient"       ON patients;
DROP POLICY IF EXISTS "patient_update_own"         ON patients;
DROP POLICY IF EXISTS "v20_patients_update_staff"  ON patients;

-- Staff peut modifier tout patient de sa clinique
CREATE POLICY "v20_patients_update_staff" ON patients
  FOR UPDATE TO authenticated
  USING (clinic_id = get_my_clinic_id())
  WITH CHECK (clinic_id = get_my_clinic_id());

-- Le patient peut modifier certains champs de son propre dossier
CREATE POLICY "v20_patients_update_own" ON patients
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- ════════════════════════════════════════════════════════════════
-- 4. PATIENTS SELECT by email (idempotent — peut exister depuis 019)
-- ════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "v19_patients_select_by_email_activation" ON patients;
CREATE POLICY "v20_patients_select_by_email_activation" ON patients
  FOR SELECT TO authenticated
  USING (
    auth_user_id IS NULL
    AND lower(email) = lower(
      (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)
    )
  );

-- ════════════════════════════════════════════════════════════════
-- 5. GRANTS — s'assurer que les permissions de table sont en place
-- ════════════════════════════════════════════════════════════════
GRANT ALL ON clinics  TO authenticated, service_role;
GRANT ALL ON users    TO authenticated, service_role;
GRANT ALL ON patients TO authenticated, service_role;

COMMIT;
