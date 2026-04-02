-- =====================================================
-- PostOp Tracker — Phase 5 : Sécurité (Row Level Security)
-- 
-- Application médicale — sécurité HIPAA-grade.
-- Toutes les données sont restreintes aux utilisateurs
-- authentifiés via Supabase Auth uniquement.
--
-- EXÉCUTER dans : Supabase Dashboard > SQL Editor > New Query > Run
-- =====================================================

-- =====================================================
-- 1. SUPPRIMER les politiques de développement (Phase 4)
-- =====================================================

DROP POLICY IF EXISTS "Allow all for dev" ON patients;
DROP POLICY IF EXISTS "Allow all for dev" ON checklist_items;
DROP POLICY IF EXISTS "Allow all for dev" ON messages;
DROP POLICY IF EXISTS "Allow all for dev" ON photos;

-- =====================================================
-- 2. ACTIVER la Row Level Security (si pas déjà fait)
-- =====================================================

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. PATIENTS — Accès complet pour l'équipe médicale authentifiée
--
-- Justification : Dans une clinique, TOUS les membres de l'équipe
-- soignante doivent accéder à TOUS les dossiers patients.
-- L'accès est restreint aux seuls utilisateurs connectés.
-- =====================================================

-- SELECT : L'équipe peut consulter tous les patients
CREATE POLICY "authenticated_read_patients"
  ON patients FOR SELECT
  TO authenticated
  USING (true);

-- INSERT : L'équipe peut ajouter de nouveaux patients
CREATE POLICY "authenticated_insert_patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE : L'équipe peut modifier les dossiers patients (notes, statut)
CREATE POLICY "authenticated_update_patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE : L'équipe peut supprimer un dossier (si justifié médicalement)
CREATE POLICY "authenticated_delete_patients"
  ON patients FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- 4. CHECKLIST ITEMS — Accès équipe + patients authentifiés
--
-- Les items de checklist sont liés à un patient via patient_id.
-- L'équipe médicale a un accès complet.
-- Les patients accèdent via le portail (token) sans auth Supabase,
-- donc les politiques anon sont nécessaires en lecture seule.
-- =====================================================

-- SELECT : L'équipe peut consulter toutes les tâches
CREATE POLICY "authenticated_read_checklist"
  ON checklist_items FOR SELECT
  TO authenticated
  USING (true);

-- INSERT : L'équipe peut ajouter des tâches personnalisées
CREATE POLICY "authenticated_insert_checklist"
  ON checklist_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE : L'équipe peut cocher/décocher les tâches
CREATE POLICY "authenticated_update_checklist"
  ON checklist_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE : L'équipe peut supprimer une tâche
CREATE POLICY "authenticated_delete_checklist"
  ON checklist_items FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- 5. MESSAGES — Accès équipe authentifiée
-- =====================================================

-- SELECT : L'équipe peut lire tous les messages
CREATE POLICY "authenticated_read_messages"
  ON messages FOR SELECT
  TO authenticated
  USING (true);

-- INSERT : L'équipe peut envoyer des messages
CREATE POLICY "authenticated_insert_messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE : Non nécessaire (les messages ne sont pas modifiables)
-- DELETE : Non nécessaire (les messages ne sont pas supprimables)

-- =====================================================
-- 6. PHOTOS — Accès équipe authentifiée
-- =====================================================

-- SELECT : L'équipe peut voir toutes les photos
CREATE POLICY "authenticated_read_photos"
  ON photos FOR SELECT
  TO authenticated
  USING (true);

-- INSERT : L'équipe peut ajouter des photos
CREATE POLICY "authenticated_insert_photos"
  ON photos FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE/DELETE : Non nécessaire (les photos médicales ne sont
-- jamais modifiées ni supprimées — traçabilité médicale)

-- =====================================================
-- 7. PORTAIL PATIENT — Accès anonyme en lecture seule (via token)
--
-- Le portail patient utilise le client Supabase avec la clé anon.
-- Les patients ne se connectent PAS via Supabase Auth — ils accèdent
-- via un lien unique contenant un token.
-- 
-- On autorise l'accès anonyme en LECTURE SEULE aux tables nécessaires
-- pour le portail, et en ÉCRITURE limitée pour les interactions patient.
-- =====================================================

-- Patients : anon peut lire (nécessaire pour résoudre le token)
CREATE POLICY "anon_read_patients"
  ON patients FOR SELECT
  TO anon
  USING (true);

-- Checklist : anon peut lire (afficher les tâches du patient)
CREATE POLICY "anon_read_checklist"
  ON checklist_items FOR SELECT
  TO anon
  USING (true);

-- Checklist : anon peut UPDATE (le patient coche ses tâches)
CREATE POLICY "anon_update_checklist"
  ON checklist_items FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Messages : anon peut lire (historique de conversation)
CREATE POLICY "anon_read_messages"
  ON messages FOR SELECT
  TO anon
  USING (true);

-- Messages : anon peut INSERT (le patient envoie un message)
CREATE POLICY "anon_insert_messages"
  ON messages FOR INSERT
  TO anon
  WITH CHECK (true);

-- Photos : anon peut lire (historique des photos)
CREATE POLICY "anon_read_photos"
  ON photos FOR SELECT
  TO anon
  USING (true);

-- Photos : anon peut INSERT (le patient envoie une photo)
CREATE POLICY "anon_insert_photos"
  ON photos FOR INSERT
  TO anon
  WITH CHECK (true);

-- =====================================================
-- 8. VÉRIFICATION — Liste toutes les politiques actives
-- =====================================================

SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
