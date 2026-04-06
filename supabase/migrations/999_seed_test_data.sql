-- 999_seed_test_data.sql
-- 
-- Script de test pour peupler une clinique avec des données réalistes.
-- 
-- UTILISATION :
-- 1. Récupérez votre clinic_id (Table 'clinics' dans Supabase)
-- 2. Remplacez la valeur de v_clinic_id ci-dessous.
-- 3. Exécutez le script.

DO $$
DECLARE
    -- REMPLACEZ CET ID PAR VOTRE CLINIC_ID RÉEL
    v_clinic_id uuid := (SELECT id FROM clinics ORDER BY created_at DESC LIMIT 1);
    v_surgeon_id uuid := (SELECT id FROM users WHERE clinic_id = v_clinic_id AND role IN ('clinic_admin', 'surgeon') LIMIT 1);
    v_patient_id uuid;
BEGIN
    -- Vérification
    IF v_clinic_id IS NULL THEN
        RAISE EXCEPTION 'Aucune clinique trouvée. Veuillez d''abord créer votre espace via /signup';
    END IF;

    RAISE NOTICE 'Utilisation de la clinique : %', (SELECT name FROM clinics WHERE id = v_clinic_id);

    -- 1. Création d'un patient test (Vérification manuelle car pas de contrainte UNIQUE sur email)
    SELECT id INTO v_patient_id FROM patients WHERE email = 'sarah.test@example.com' LIMIT 1;

    IF v_patient_id IS NULL THEN
        INSERT INTO patients (
            clinic_id, surgeon_id, full_name, email, phone, whatsapp, 
            intervention, surgery_date, status, notes
        ) VALUES (
            v_clinic_id, v_surgeon_id, 'Sarah Bernard', 'sarah.test@example.com', '+32 475 00 11 22', '+32475001122',
            'Augmentation Mammaire', CURRENT_DATE - INTERVAL '3 days', 'normal', 'Patient test pour démonstration. Évolution favorable à J+3.'
        ) RETURNING id INTO v_patient_id;
    ELSE
        UPDATE patients SET 
            full_name = 'Sarah Bernard',
            clinic_id = v_clinic_id,
            surgeon_id = v_surgeon_id,
            status = 'normal'
        WHERE id = v_patient_id;
    END IF;

    -- 2. Création de tâches pour ce patient
    -- On simule des tâches déjà faites et à faire
    INSERT INTO tasks (patient_id, clinic_id, label, jour_post_op_ref, patient_can_check, done, done_at)
    VALUES 
    (v_patient_id, v_clinic_id, 'Premier lever et marche', 1, false, true, CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (v_patient_id, v_clinic_id, 'Prise des antalgiques J+1', 1, true, true, CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (v_patient_id, v_clinic_id, 'Vérification du pansement', 2, false, true, CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (v_patient_id, v_clinic_id, 'Douche autorisée (sans mouiller le pansement)', 3, true, false, NULL),
    (v_patient_id, v_clinic_id, 'Photo de contrôle cicatrice', 3, true, false, NULL),
    (v_patient_id, v_clinic_id, 'Rendez-vous retrait fils', 7, false, false, NULL)
    ON CONFLICT DO NOTHING;

    -- 3. Ajout d'une douleur historique
    INSERT INTO pain_scores (patient_id, clinic_id, score, jour_post_op)
    VALUES 
    (v_patient_id, v_clinic_id, 6, 1),
    (v_patient_id, v_clinic_id, 4, 2),
    (v_patient_id, v_clinic_id, 3, 3)
    ON CONFLICT DO NOTHING;

    -- 4. Un message de bienvenue
    INSERT INTO messages (patient_id, clinic_id, sender_type, sender_id, content)
    VALUES (v_patient_id, v_clinic_id, 'nurse', v_surgeon_id, 'Bonjour Sarah, comment vous sentez-vous aujourd''hui ? N''oubliez pas de nous envoyer la photo de contrôle.')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Données de test générées pour le patient Sarah Bernard (ID: %)', v_patient_id;
END $$;
