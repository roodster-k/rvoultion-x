-- ============================================================
-- POSTOP TRACKER — TEST DATA SEEDING
-- Targeted for clinic_id: d59e1341-fcf7-4298-8d2b-366d73b18d4f (Clinique Churchill)
-- ============================================================

DO $$
DECLARE
    v_clinic_id uuid := 'd59e1341-fcf7-4298-8d2b-366d73b18d4f';
    v_nurse_id uuid;
    v_patient_id uuid;
BEGIN
    -- 1. Get the first nurse/admin of this clinic
    SELECT id INTO v_nurse_id FROM users WHERE clinic_id = v_clinic_id LIMIT 1;

    IF v_nurse_id IS NULL THEN
        RAISE NOTICE 'No user found for this clinic. Please sign up first.';
        RETURN;
    END IF;

    -- 2. Insert 3 Test Patients
    
    -- Patient 1: Sophie Martin (Status: normal)
    INSERT INTO patients (clinic_id, assigned_to, full_name, email, intervention, surgery_date, status, token)
    VALUES (v_clinic_id, v_nurse_id, 'Sophie Martin', 'sophie.m@example.com', 'Augmentation Mammaire', CURRENT_DATE - INTERVAL '2 days', 'normal', gen_random_uuid())
    RETURNING id INTO v_patient_id;

    -- Add some mock tasks for Sophie
    INSERT INTO tasks (patient_id, clinic_id, label, due_date, done)
    VALUES 
    (v_patient_id, v_clinic_id, 'Premier changement de pansement', CURRENT_DATE - INTERVAL '1 day', true),
    (v_patient_id, v_clinic_id, 'Prise des constantes matin', CURRENT_DATE, false);

    -- Patient 2: Marc Lefebvre (Status: attention)
    INSERT INTO patients (clinic_id, assigned_to, full_name, email, intervention, surgery_date, status, token)
    VALUES (v_clinic_id, v_nurse_id, 'Marc Lefebvre', 'marc.l@example.com', 'Rhinoplastie', CURRENT_DATE - INTERVAL '5 days', 'attention', gen_random_uuid())
    RETURNING id INTO v_patient_id;

    -- Add an alert for Marc
    INSERT INTO alerts (clinic_id, patient_id, type, title, message)
    VALUES (v_clinic_id, v_patient_id, 'photo', 'Rougeur suspecte', 'Le patient a envoyé une photo montrant une rougeur sur l''arête nasale.');

    -- Patient 3: Claire Dubois (Status: normal)
    INSERT INTO patients (clinic_id, assigned_to, full_name, email, intervention, surgery_date, status, token)
    VALUES (v_clinic_id, v_nurse_id, 'Claire Dubois', 'claire.d@example.com', 'Abdominoplastie', CURRENT_DATE - INTERVAL '10 days', 'normal', gen_random_uuid());

    RAISE NOTICE 'Test data seeded successfully for clinic %', v_clinic_id;
END $$;
