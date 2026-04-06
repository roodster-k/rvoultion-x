-- 012_auto_alerts_trigger.sql
-- Automatic alert creation on critical patient check-in events.
-- Triggers on pain_scores INSERT when:
--   - score >= 8 (severe pain)
--   - has_fever = true OR temperature >= 38.0 (fever detected)

CREATE OR REPLACE FUNCTION public.auto_alert_on_checkin()
RETURNS TRIGGER AS $$
DECLARE
  v_clinic_id    uuid;
  v_patient_name text;
BEGIN
  SELECT p.clinic_id, p.full_name
    INTO v_clinic_id, v_patient_name
    FROM patients p
   WHERE p.id = NEW.patient_id;

  -- Severe pain alert (score >= 8)
  IF NEW.score >= 8 THEN
    INSERT INTO alerts (clinic_id, patient_id, type, title, message)
    VALUES (
      v_clinic_id,
      NEW.patient_id,
      'action',
      'Douleur sévère signalée',
      v_patient_name
        || ' a déclaré une douleur de '
        || NEW.score
        || '/10 à J+'
        || NEW.jour_post_op
        || '. Évaluation clinique recommandée.'
    );
  END IF;

  -- Fever alert
  IF NEW.has_fever = true
     OR (NEW.temperature IS NOT NULL AND NEW.temperature >= 38.0)
  THEN
    INSERT INTO alerts (clinic_id, patient_id, type, title, message)
    VALUES (
      v_clinic_id,
      NEW.patient_id,
      'action',
      'Fièvre détectée',
      v_patient_name
        || ' a signalé '
        || CASE
             WHEN NEW.temperature IS NOT NULL
             THEN 'une température de ' || NEW.temperature || '°C'
             ELSE 'de la fièvre'
           END
        || ' à J+'
        || NEW.jour_post_op
        || '. Consulter rapidement.'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_alert_checkin ON pain_scores;

CREATE TRIGGER trigger_auto_alert_checkin
  AFTER INSERT ON pain_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_alert_on_checkin();

COMMENT ON FUNCTION public.auto_alert_on_checkin IS
  'Crée automatiquement une alerte clinique en cas de douleur ≥8/10 ou de fièvre détectée lors du check-in patient.';
