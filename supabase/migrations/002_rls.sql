-- ============================================================
-- POSTOP TRACKER — ROW LEVEL SECURITY
-- Phase 1 : Fondations Backend
-- Migration 002 : RLS Policies
-- ============================================================
-- Principe : chaque soignant ne voit que sa clinique.
--            chaque patient ne voit que son propre dossier.
-- ============================================================

-- ────────────────────────────────────────────
-- 0. FONCTIONS HELPER (SECURITY DEFINER)
-- ────────────────────────────────────────────
-- Ces fonctions s'exécutent avec les droits du créateur (bypass RLS)
-- pour résoudre le clinic_id / patient_id de l'utilisateur connecté.

-- Récupère le clinic_id du soignant connecté
CREATE OR REPLACE FUNCTION get_my_clinic_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_id FROM users WHERE auth_user_id = auth.uid()
$$;

-- Récupère l'id du dossier patient du patient connecté
CREATE OR REPLACE FUNCTION get_my_patient_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM patients WHERE auth_user_id = auth.uid()
$$;

-- Récupère le clinic_id du patient connecté
CREATE OR REPLACE FUNCTION get_my_patient_clinic_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_id FROM patients WHERE auth_user_id = auth.uid()
$$;

-- Vérifie si l'utilisateur connecté est un soignant
CREATE OR REPLACE FUNCTION is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND is_active = true)
$$;

-- Vérifie si l'utilisateur connecté est un patient
CREATE OR REPLACE FUNCTION is_patient()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM patients WHERE auth_user_id = auth.uid())
$$;

-- Récupère le rôle du soignant connecté
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE auth_user_id = auth.uid()
$$;


-- ════════════════════════════════════════════
-- 1. RLS : clinics
-- ════════════════════════════════════════════
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

-- Soignants : voir uniquement leur clinique
CREATE POLICY "staff_select_own_clinic"
  ON clinics FOR SELECT
  TO authenticated
  USING (
    id = get_my_clinic_id()
    OR id = get_my_patient_clinic_id()  -- Les patients aussi voient l'info de leur clinique
  );

-- Seuls les clinic_admin et super_admin peuvent modifier la clinique
CREATE POLICY "admin_update_clinic"
  ON clinics FOR UPDATE
  TO authenticated
  USING (
    id = get_my_clinic_id()
    AND get_my_role() IN ('clinic_admin', 'super_admin')
  )
  WITH CHECK (
    id = get_my_clinic_id()
    AND get_my_role() IN ('clinic_admin', 'super_admin')
  );

-- Seul super_admin peut créer des cliniques (onboarding futur)
CREATE POLICY "superadmin_insert_clinic"
  ON clinics FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() = 'super_admin'
  );

-- Seul super_admin peut supprimer des cliniques
CREATE POLICY "superadmin_delete_clinic"
  ON clinics FOR DELETE
  TO authenticated
  USING (
    get_my_role() = 'super_admin'
  );


-- ════════════════════════════════════════════
-- 2. RLS : users (soignants)
-- ════════════════════════════════════════════
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Soignants : voir les collègues de leur clinique
CREATE POLICY "staff_select_clinic_users"
  ON users FOR SELECT
  TO authenticated
  USING (
    clinic_id = get_my_clinic_id()
    OR clinic_id = get_my_patient_clinic_id()  -- Les patients voient les soignants de leur clinique (pour la messagerie)
  );

-- Seuls admin/super_admin peuvent créer des utilisateurs
CREATE POLICY "admin_insert_user"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id = get_my_clinic_id()
    AND get_my_role() IN ('clinic_admin', 'super_admin')
  );

-- Un utilisateur peut modifier son propre profil, un admin peut modifier tout le monde dans sa clinique
CREATE POLICY "staff_update_user"
  ON users FOR UPDATE
  TO authenticated
  USING (
    clinic_id = get_my_clinic_id()
    AND (
      auth_user_id = auth.uid()  -- Son propre profil
      OR get_my_role() IN ('clinic_admin', 'super_admin')  -- Ou admin
    )
  )
  WITH CHECK (
    clinic_id = get_my_clinic_id()
  );

-- Seul admin peut désactiver/supprimer des utilisateurs
CREATE POLICY "admin_delete_user"
  ON users FOR DELETE
  TO authenticated
  USING (
    clinic_id = get_my_clinic_id()
    AND get_my_role() IN ('clinic_admin', 'super_admin')
  );


-- ════════════════════════════════════════════
-- 3. RLS : patients
-- ════════════════════════════════════════════
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Soignants : voir tous les patients de leur clinique
CREATE POLICY "staff_select_patients"
  ON patients FOR SELECT
  TO authenticated
  USING (
    clinic_id = get_my_clinic_id()
  );

-- Patient : voir uniquement son propre dossier
CREATE POLICY "patient_select_own"
  ON patients FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid()
  );

-- Soignants (nurse, surgeon, admin) peuvent créer des patients dans leur clinique
CREATE POLICY "staff_insert_patient"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id = get_my_clinic_id()
    AND is_staff()
  );

-- Soignants peuvent modifier les patients de leur clinique
CREATE POLICY "staff_update_patient"
  ON patients FOR UPDATE
  TO authenticated
  USING (
    clinic_id = get_my_clinic_id()
    AND is_staff()
  )
  WITH CHECK (
    clinic_id = get_my_clinic_id()
  );

-- Le patient peut modifier certains champs de son propre dossier (ex: téléphone, notes)
CREATE POLICY "patient_update_own"
  ON patients FOR UPDATE
  TO authenticated
  USING (
    auth_user_id = auth.uid()
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    -- NOTE: Côté application, on restreint les champs modifiables (pas le statut, pas l'intervention)
  );

-- Seul admin peut supprimer un patient
CREATE POLICY "admin_delete_patient"
  ON patients FOR DELETE
  TO authenticated
  USING (
    clinic_id = get_my_clinic_id()
    AND get_my_role() IN ('clinic_admin', 'super_admin')
  );


-- ════════════════════════════════════════════
-- 4. RLS : protocol_templates
-- ════════════════════════════════════════════
ALTER TABLE protocol_templates ENABLE ROW LEVEL SECURITY;

-- Soignants : voir les templates de leur clinique + les templates globaux
CREATE POLICY "staff_select_templates"
  ON protocol_templates FOR SELECT
  TO authenticated
  USING (
    clinic_id = get_my_clinic_id()
    OR is_global = true
  );

-- Admin et chirurgiens peuvent créer des templates pour leur clinique
CREATE POLICY "staff_insert_template"
  ON protocol_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id = get_my_clinic_id()
    AND get_my_role() IN ('clinic_admin', 'super_admin', 'surgeon')
  );

-- Admin et chirurgiens peuvent modifier les templates de leur clinique
CREATE POLICY "staff_update_template"
  ON protocol_templates FOR UPDATE
  TO authenticated
  USING (
    clinic_id = get_my_clinic_id()
    AND get_my_role() IN ('clinic_admin', 'super_admin', 'surgeon')
  )
  WITH CHECK (
    clinic_id = get_my_clinic_id()
  );

-- Seul admin peut supprimer un template
CREATE POLICY "admin_delete_template"
  ON protocol_templates FOR DELETE
  TO authenticated
  USING (
    clinic_id = get_my_clinic_id()
    AND get_my_role() IN ('clinic_admin', 'super_admin')
  );


-- ════════════════════════════════════════════
-- 5. RLS : tasks
-- ════════════════════════════════════════════
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Soignants : voir toutes les tâches de leur clinique
CREATE POLICY "staff_select_tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    clinic_id = get_my_clinic_id()
  );

-- Patient : voir uniquement ses propres tâches
CREATE POLICY "patient_select_own_tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    patient_id = get_my_patient_id()
  );

-- Soignants peuvent créer des tâches dans leur clinique
CREATE POLICY "staff_insert_task"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id = get_my_clinic_id()
    AND is_staff()
  );

-- Soignants peuvent modifier toutes les tâches de leur clinique
CREATE POLICY "staff_update_task"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    clinic_id = get_my_clinic_id()
    AND is_staff()
  )
  WITH CHECK (
    clinic_id = get_my_clinic_id()
  );

-- Patient peut cocher uniquement les tâches patient_can_check = true
CREATE POLICY "patient_check_own_task"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    patient_id = get_my_patient_id()
    AND patient_can_check = true
  )
  WITH CHECK (
    patient_id = get_my_patient_id()
    AND patient_can_check = true
    -- NOTE: Côté application, on ne permet de modifier que 'done' et 'done_at'
  );

-- Soignants admin peuvent supprimer des tâches
CREATE POLICY "staff_delete_task"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    clinic_id = get_my_clinic_id()
    AND is_staff()
  );


-- ════════════════════════════════════════════
-- 6. RLS : messages
-- ════════════════════════════════════════════
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Soignants : voir les messages de leur clinique
CREATE POLICY "staff_select_messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    clinic_id = get_my_clinic_id()
  );

-- Patient : voir ses propres messages
CREATE POLICY "patient_select_own_messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    patient_id = get_my_patient_id()
  );

-- Soignants peuvent envoyer des messages dans leur clinique
CREATE POLICY "staff_insert_message"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id = get_my_clinic_id()
    AND is_staff()
  );

-- Patient peut envoyer des messages dans sa propre conversation
CREATE POLICY "patient_insert_message"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id = get_my_patient_id()
    AND sender_type = 'patient'
  );

-- Soignants peuvent marquer les messages comme lus
CREATE POLICY "staff_update_message"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    clinic_id = get_my_clinic_id()
    AND is_staff()
  )
  WITH CHECK (
    clinic_id = get_my_clinic_id()
  );

-- Patient peut marquer ses messages comme lus
CREATE POLICY "patient_update_own_message"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    patient_id = get_my_patient_id()
  )
  WITH CHECK (
    patient_id = get_my_patient_id()
  );


-- ════════════════════════════════════════════
-- 7. RLS : photos
-- ════════════════════════════════════════════
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Soignants : voir les photos de leur clinique
CREATE POLICY "staff_select_photos"
  ON photos FOR SELECT
  TO authenticated
  USING (
    clinic_id = get_my_clinic_id()
  );

-- Patient : voir ses propres photos
CREATE POLICY "patient_select_own_photos"
  ON photos FOR SELECT
  TO authenticated
  USING (
    patient_id = get_my_patient_id()
  );

-- Soignants peuvent uploader des photos dans leur clinique
CREATE POLICY "staff_insert_photo"
  ON photos FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id = get_my_clinic_id()
    AND is_staff()
  );

-- Patient peut uploader ses propres photos
CREATE POLICY "patient_insert_photo"
  ON photos FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id = get_my_patient_id()
    AND uploaded_by = 'patient'
  );

-- Seul admin peut supprimer des photos
CREATE POLICY "admin_delete_photo"
  ON photos FOR DELETE
  TO authenticated
  USING (
    clinic_id = get_my_clinic_id()
    AND get_my_role() IN ('clinic_admin', 'super_admin')
  );


-- ════════════════════════════════════════════
-- 8. RLS : alerts
-- ════════════════════════════════════════════
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Soignants : voir les alertes de leur clinique
CREATE POLICY "staff_select_alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (
    clinic_id = get_my_clinic_id()
  );

-- Les alertes sont créées par le système (triggers/Edge Functions), pas par les utilisateurs
-- On crée une policy INSERT pour le service_role uniquement (pas de policy = bloqué pour authenticated)
-- Le service_role bypass RLS automatiquement, donc pas besoin de policy INSERT ici.

-- Soignants peuvent marquer les alertes comme lues
CREATE POLICY "staff_update_alert"
  ON alerts FOR UPDATE
  TO authenticated
  USING (
    clinic_id = get_my_clinic_id()
    AND is_staff()
  )
  WITH CHECK (
    clinic_id = get_my_clinic_id()
  );

-- Admin peut supprimer/archiver des alertes
CREATE POLICY "admin_delete_alert"
  ON alerts FOR DELETE
  TO authenticated
  USING (
    clinic_id = get_my_clinic_id()
    AND get_my_role() IN ('clinic_admin', 'super_admin')
  );


-- ════════════════════════════════════════════
-- 9. RLS : pain_scores
-- ════════════════════════════════════════════
ALTER TABLE pain_scores ENABLE ROW LEVEL SECURITY;

-- Soignants : voir les scores douleur de leur clinique
CREATE POLICY "staff_select_pain"
  ON pain_scores FOR SELECT
  TO authenticated
  USING (
    clinic_id = get_my_clinic_id()
  );

-- Patient : voir ses propres scores
CREATE POLICY "patient_select_own_pain"
  ON pain_scores FOR SELECT
  TO authenticated
  USING (
    patient_id = get_my_patient_id()
  );

-- Patient peut soumettre ses scores douleur
CREATE POLICY "patient_insert_pain"
  ON pain_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id = get_my_patient_id()
    AND is_patient()
  );

-- Soignants peuvent aussi saisir un score (ex: relevé en consultation)
CREATE POLICY "staff_insert_pain"
  ON pain_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id = get_my_clinic_id()
    AND is_staff()
  );

-- Patient peut corriger son score du jour (UPDATE, pas DELETE)
CREATE POLICY "patient_update_own_pain"
  ON pain_scores FOR UPDATE
  TO authenticated
  USING (
    patient_id = get_my_patient_id()
  )
  WITH CHECK (
    patient_id = get_my_patient_id()
  );


-- ════════════════════════════════════════════
-- 10. STORAGE : Bucket pour les photos patient
-- ════════════════════════════════════════════
-- À exécuter dans les Storage Policies de Supabase (Dashboard)
-- ou via SQL :

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'patient-photos',
  'patient-photos',
  false,                                     -- Bucket privé
  1048576,                                   -- 1MB max (compression client-side)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Storage RLS : les fichiers sont organisés par clinic_id/patient_id/
-- Chemin : patient-photos/{clinic_id}/{patient_id}/{filename}

-- Soignants : lire les photos de leur clinique
CREATE POLICY "staff_read_photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'patient-photos'
    AND (storage.foldername(name))[1] = get_my_clinic_id()::text
  );

-- Patient : lire ses propres photos
CREATE POLICY "patient_read_own_photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'patient-photos'
    AND (storage.foldername(name))[2] = get_my_patient_id()::text
  );

-- Soignants : uploader dans le dossier de leur clinique
CREATE POLICY "staff_upload_photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'patient-photos'
    AND (storage.foldername(name))[1] = get_my_clinic_id()::text
  );

-- Patient : uploader dans son propre dossier
CREATE POLICY "patient_upload_own_photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'patient-photos'
    AND (storage.foldername(name))[2] = get_my_patient_id()::text
  );

-- Admin : supprimer des photos de leur clinique
CREATE POLICY "admin_delete_storage_photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'patient-photos'
    AND (storage.foldername(name))[1] = get_my_clinic_id()::text
    AND get_my_role() IN ('clinic_admin', 'super_admin')
  );
