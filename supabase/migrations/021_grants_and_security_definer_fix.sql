-- ============================================================
-- POSTOP TRACKER — MIGRATION 021
-- Fix GRANT permissions + recréation SECURITY DEFINER functions
--
-- Problèmes résolus :
--
-- 1. "permission denied for table users" lors de la création patient
--    Le rôle `authenticated` n'a pas les droits table-level (GRANT)
--    sur `users`. Même si les fonctions RLS sont SECURITY DEFINER,
--    PostgREST peut échouer si le rôle n'a pas au minimum USAGE
--    sur le schema. Cette migration garantit tous les GRANTs
--    nécessaires sur toutes les tables publiques.
--
-- 2. Fonctions SECURITY DEFINER mal propriétaires
--    Recréation explicite des fonctions helper avec
--    SECURITY DEFINER + SET search_path = public pour s'assurer
--    qu'elles tournent avec les bons privilèges, peu importe
--    comment les migrations précédentes ont été exécutées.
--
-- SÛRE à ré-exécuter (CREATE OR REPLACE, DROP IF EXISTS).
-- ============================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════
-- 1. SCHEMA USAGE — prérequis absolu
-- ════════════════════════════════════════════════════════════════
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;

-- ════════════════════════════════════════════════════════════════
-- 2. TABLE GRANTS — toutes les tables publiques
--    GRANT ALL ON ALL TABLES couvre uniquement les tables existantes
--    au moment de l'exécution (pas les futures tables).
-- ════════════════════════════════════════════════════════════════
GRANT ALL ON ALL TABLES    IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL ROUTINES  IN SCHEMA public TO authenticated, service_role;

-- Permissions de lecture pour anon (portail patient token)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT INSERT, UPDATE ON tasks, messages, photos, pain_scores, alerts TO anon;

-- ════════════════════════════════════════════════════════════════
-- 3. FONCTIONS HELPER — recréation garantie SECURITY DEFINER
--    Owned by postgres (superuser) → accès complet à users + patients
--    sans dépendre des GRANTs de `authenticated`
-- ════════════════════════════════════════════════════════════════

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

CREATE OR REPLACE FUNCTION is_patient()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM patients WHERE auth_user_id = (SELECT auth.uid()))
$$;

-- ════════════════════════════════════════════════════════════════
-- 4. DEFAULT PRIVILEGES — les nouvelles tables héritent des droits
-- ════════════════════════════════════════════════════════════════
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON ROUTINES TO authenticated, service_role;

COMMIT;
