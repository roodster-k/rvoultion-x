-- ============================================================
-- POSTOP TRACKER — SCHÉMA SUPABASE
-- Phase 2 : Protocoles dynamiques
-- Script : 003_seed_protocols.sql
-- ============================================================

-- Ces templates sont configurés comme is_global = true ce qui permet 
-- à notre code d'assignation automatique de retomber dessus si la clinique
-- n'a pas défini de protocoles personnalisés pour ce type d'intervention.

INSERT INTO protocol_templates (intervention_type, name, description, is_global, tasks)
VALUES
(
  'Augmentation Mammaire',
  'Protocole Standard Augmentation Mammaire',
  'Suivi régulier post augmentation mammaire par prothèses ou lipofilling',
  true,
  '[
    { "label": "Vérification de la température", "description": "Température corporelle sous 38°C", "jour_post_op_ref": 1, "patient_can_check": true, "sort_order": 1 },
    { "label": "Retrait du pansement compressif", "description": "Si appliqué par le chirurgien, retirer selon instructions", "jour_post_op_ref": 2, "patient_can_check": false, "sort_order": 2 },
    { "label": "Premier shampoing", "description": "Autorisé avec de l''aide. Ne pas lever les bras au-dessus des épaules.", "jour_post_op_ref": 3, "patient_can_check": true, "sort_order": 3 },
    { "label": "Reprise de la conduite", "description": "Possible si aucune douleur aux mouvements et arrêt des antalgiques majeurs.", "jour_post_op_ref": 7, "patient_can_check": true, "sort_order": 4 },
    { "label": "Première consultation de suivi", "description": "Vérification cicatrisation et retrait fils si non résorbables", "jour_post_op_ref": 14, "patient_can_check": false, "sort_order": 5 },
    { "label": "Reprise du sport (bas du corps)", "description": "Vélo stationnaire, marche rapide. Pas d''impacts.", "jour_post_op_ref": 21, "patient_can_check": true, "sort_order": 6 },
    { "label": "Reprise du sport (complet)", "description": "Course à pied, tennis, musculation.", "jour_post_op_ref": 45, "patient_can_check": true, "sort_order": 7 }
  ]'::jsonb
),
(
  'Rhinoplastie',
  'Protocole Standard Rhinoplastie',
  'Suivi post rhinoplastie ou septorhinoplastie',
  true,
  '[
    { "label": "Maintien de la tête surélevée", "description": "Dormir avec 2-3 oreillers.", "jour_post_op_ref": 1, "patient_can_check": true, "sort_order": 1 },
    { "label": "Nettoyage fosses nasales", "description": "Sérum physiologique doux sans pression.", "jour_post_op_ref": 2, "patient_can_check": true, "sort_order": 2 },
    { "label": "Retrait de l''attelle", "description": "Consultation pour retrait.", "jour_post_op_ref": 7, "patient_can_check": false, "sort_order": 3 },
    { "label": "Massage cicatriciel", "description": "Commencer les massages doux selon instructions.", "jour_post_op_ref": 14, "patient_can_check": true, "sort_order": 4 }
  ]'::jsonb
),
(
  'Liposuccion',
  'Protocole Standard Liposuccion',
  'Suivi post lipoaspiration',
  true,
  '[
    { "label": "Vérification des écoulements", "description": "Il est normal que les petites incisions coulent. Changer pansements si saturés.", "jour_post_op_ref": 1, "patient_can_check": true, "sort_order": 1 },
    { "label": "Douche rapide", "description": "Autorisée. Laver les incisions à l''eau et au savon doux.", "jour_post_op_ref": 2, "patient_can_check": true, "sort_order": 2 },
    { "label": "Port du vêtement compressif H24", "description": "Indispensable pour limiter l''oedème.", "jour_post_op_ref": 7, "patient_can_check": true, "sort_order": 3 },
    { "label": "Reprise de la conduite", "description": "Si douleurs tolérables.", "jour_post_op_ref": 5, "patient_can_check": true, "sort_order": 4 },
    { "label": "Premier drainage lymphatique", "description": "Recommandé pour accélérer la résolution de l''oedème.", "jour_post_op_ref": 10, "patient_can_check": true, "sort_order": 5 }
  ]'::jsonb
);
