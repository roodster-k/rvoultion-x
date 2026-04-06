-- 010_daily_reminders_cron.sql
-- 
-- Finalisation de la Phase 1 : Automatisation des rappels.
-- Ce script configure l'extension pg_cron (si disponible) pour appeler 
-- l'Edge Function de rappels tous les matins à 8h00.

-- 1. Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS pg_net; -- Pour faire des requêtes HTTP depuis SQL

-- 2. Création d'une fonction wrapper pour appeler l'Edge Function
CREATE OR REPLACE FUNCTION public.trigger_daily_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Appel de l'Edge Function Supabase via pg_net
  -- Remplacez l'URL par votre URL de projet réelle si nécessaire, 
  -- ou laissez Supabase gérer le routage interne.
  PERFORM net.http_post(
    url := 'https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/daily-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- 3. Planification via pg_cron (8h00 tous les jours)
-- Note : pg_cron n'est disponible que sur l'instance 'postgres' de Supabase.
-- Cette commande doit être exécutée dans le SQL Editor.
/*
SELECT cron.schedule(
  'send-patient-reminders-daily',
  '0 8 * * *',
  'SELECT public.trigger_daily_reminders();'
);
*/

COMMENT ON FUNCTION public.trigger_daily_reminders IS 'Déclenche l''envoi des rappels quotidiens par email aux patients ayant des tâches dues.';
