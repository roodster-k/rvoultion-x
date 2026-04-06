-- Migration 011: Extend pain_scores for full daily check-in
-- Adds symptom fields to the existing pain_scores table.

ALTER TABLE pain_scores
  ADD COLUMN IF NOT EXISTS temperature       numeric(4,1),
  ADD COLUMN IF NOT EXISTS swelling_level    smallint CHECK (swelling_level BETWEEN 0 AND 3),
  ADD COLUMN IF NOT EXISTS has_fever         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS other_symptoms    text;

COMMENT ON COLUMN pain_scores.temperature    IS 'Température corporelle en °C (optionnel)';
COMMENT ON COLUMN pain_scores.swelling_level IS '0=Aucun, 1=Léger, 2=Modéré, 3=Sévère';
COMMENT ON COLUMN pain_scores.has_fever      IS 'Fièvre signalée (température >= 38°C ou déclarée)';
COMMENT ON COLUMN pain_scores.other_symptoms IS 'Autres symptômes décrits librement par le patient';
