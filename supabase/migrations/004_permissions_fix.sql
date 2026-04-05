-- ============================================================
-- POSTOP TRACKER — FIX PERMISSIONS
-- Migration 004 : Garantir les droits SERVICE_ROLE
-- ============================================================

-- On s'assure que tout le schéma public est accessible au service_role (Admin)
-- Normalement automatique, mais évite les bugs de suppression/re-création de tables.

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- S'assurer que le schéma public est dans le search_path par défaut (au cas où)
ALTER ROLE service_role SET search_path = public;

-- Forcer l'accès aux tables système d'auth si besoin (lecture seule par défaut)
GRANT SELECT ON auth.users TO service_role;
GRANT SELECT ON auth.identities TO service_role;

COMMIT;
