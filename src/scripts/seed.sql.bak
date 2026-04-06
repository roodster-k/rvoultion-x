-- =====================================================
-- PostOp Tracker — Schema + Seed Data
-- Supabase SQL Editor (run once)
-- =====================================================

-- 1. PATIENTS TABLE
CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  intervention TEXT NOT NULL,
  date_op TEXT NOT NULL,
  jour_post_op INTEGER DEFAULT 0,
  status TEXT DEFAULT 'normal' CHECK (status IN ('normal', 'attention', 'complication')),
  chirurgien TEXT DEFAULT 'Dr. Renaud',
  assigned_to TEXT DEFAULT 'Kevin M.',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CHECKLIST ITEMS TABLE
CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  jour_post_op_ref INTEGER,
  jour TEXT NOT NULL,
  patient_can_check BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  from_sender TEXT NOT NULL CHECK (from_sender IN ('nurse', 'patient')),
  text TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PHOTOS TABLE
CREATE TABLE IF NOT EXISTS photos (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  jour INTEGER NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DISABLE RLS (Development — enable in production)
-- =====================================================
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated and anon users (dev policy)
CREATE POLICY "Allow all for dev" ON patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for dev" ON checklist_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for dev" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for dev" ON photos FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_checklist_patient ON checklist_items(patient_id);
CREATE INDEX IF NOT EXISTS idx_messages_patient ON messages(patient_id);
CREATE INDEX IF NOT EXISTS idx_photos_patient ON photos(patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_token ON patients(token);
CREATE INDEX IF NOT EXISTS idx_patients_assigned ON patients(assigned_to);

-- =====================================================
-- SEED DATA — 8 Patients
-- =====================================================
INSERT INTO patients (id, name, intervention, date_op, jour_post_op, status, chirurgien, assigned_to, email, phone, whatsapp, notes, token)
VALUES
  (1, 'Sophie Martin', 'Rhinoplastie', to_char(NOW() - INTERVAL '8 days', 'DD/MM/YYYY'), 8, 'normal', 'Dr. Renaud', 'Kevin M.', 'sophie.martin@gmail.com', '+32 475 12 34 56', '+32475123456', 'Évolution favorable, œdème en régression', 'token_sophie_123'),
  (2, 'Claire Dubois', 'Augmentation mammaire', to_char(NOW() - INTERVAL '5 days', 'DD/MM/YYYY'), 5, 'attention', 'Dr. Renaud', 'Kevin M.', 'claire.dubois@outlook.be', '+32 489 98 76 54', '+32489987654', 'Léger hématome sein gauche à surveiller', 'token_claire_456'),
  (3, 'Isabelle Roux', 'Abdominoplastie', to_char(NOW() - INTERVAL '12 days', 'DD/MM/YYYY'), 12, 'complication', 'Dr. Renaud', 'Sarah L.', 'isabelle.roux@gmail.com', '+33 6 12 34 56 78', '+33612345678', 'Désunion partielle de la cicatrice — soins locaux renforcés', 'token_isabelle_789'),
  (4, 'Marc Lejeune', 'Blépharoplastie (paupières), Lifting cervico-facial', to_char(NOW() - INTERVAL '3 days', 'DD/MM/YYYY'), 3, 'normal', 'Dr. Van den Berg', 'Kevin M.', 'marc.lejeune@proximus.be', '+32 478 55 44 33', '+32478554433', 'Patient de 62 ans. Double intervention visage programmée. Résultat esthétique très prometteur.', 'token_marc_004'),
  (5, 'Fatima El Amrani', 'Liposuccion, Lipofilling fessier', to_char(NOW() - INTERVAL '14 days', 'DD/MM/YYYY'), 14, 'normal', 'Dr. Claessens', 'Kevin M.', 'fatima.elamrani@hotmail.be', '+32 496 77 88 99', '+32496778899', 'Double aspiration flancs + réinjection fessière. Résultat conforme aux attentes de la patiente. Vêtement compressif bien porté.', 'token_fatima_005'),
  (6, 'Thomas Vandenberghe', 'Gynécomastie', to_char(NOW() - INTERVAL '10 days', 'DD/MM/YYYY'), 10, 'attention', 'Dr. Lambert', 'Sarah L.', 't.vandenberghe@gmail.com', '+32 471 22 33 44', '+32471223344', 'Sérome léger sur le côté gauche. Ponction évacuatrice réalisée à J+7. Surveillance renforcée.', 'token_thomas_006'),
  (7, 'Nathalie Peeters', 'Mastopexie (lifting seins), Liposuccion abdominale', to_char(NOW() - INTERVAL '20 days', 'DD/MM/YYYY'), 20, 'complication', 'Dr. Dupuis', 'Kevin M.', 'nathalie.peeters@telenet.be', '+32 485 11 22 33', '+32485112233', 'Infection locale sein droit détectée à J+15. Antibiothérapie en cours (Amoxicilline 1g x3/jour). Évolution à contrôler strictement.', 'token_nathalie_007'),
  (8, 'Jean-Pierre Dumont', 'Otoplastie (oreilles)', to_char(NOW() - INTERVAL '1 day', 'DD/MM/YYYY'), 1, 'normal', 'Dr. Van den Berg', 'Sarah L.', 'jpdumont@skynet.be', '+32 477 66 55 44', '+32477665544', 'Intervention bilatérale. Patient mineur (16 ans), père présent comme accompagnant. Tout s''est bien passé.', 'token_jeanpierre_008')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence
SELECT setval('patients_id_seq', (SELECT MAX(id) FROM patients));

-- =====================================================
-- SEED — Checklist Items
-- =====================================================
INSERT INTO checklist_items (id, patient_id, label, done, jour_post_op_ref, jour, patient_can_check) VALUES
  -- Sophie Martin (id=1)
  ('c1', 1, 'Retrait pansement', true, 1, 'J+1', false),
  ('c2', 1, 'Contrôle œdème', true, 3, 'J+3', false),
  ('c3', 1, 'Retrait attelle', true, 7, 'J+7', false),
  ('c4', 1, 'Contrôle cicatrisation', false, 14, 'J+14', false),
  ('c6', 1, 'Prise de température (matin)', true, 0, 'Quotidien', true),
  -- Claire Dubois (id=2)
  ('c8', 2, 'Contrôle pansement', true, 1, 'J+1', false),
  ('c10', 2, 'Retrait drains', true, 3, 'J+3', false),
  ('c11', 2, 'Contrôle hématome', false, 5, 'J+5', false),
  ('c12', 2, 'Port du soutien-gorge médical', false, NULL, 'Quotidien', true),
  -- Isabelle Roux (id=3)
  ('c16', 3, 'Contrôle cicatrice', true, 7, 'J+7', false),
  ('c17', 3, 'Soins désunion', false, 10, 'J+10', false),
  ('c18', 3, 'Contrôle cicatrisation (URGENT)', false, 8, 'J+8', false),
  ('c19', 3, 'Changement pansement à domicile', false, NULL, 'Quotidien', true),
  -- Marc Lejeune (id=4)
  ('c20', 4, 'Retrait pansement compressif visage', true, 1, 'J+1', false),
  ('c21', 4, 'Retrait pansement paupières', true, 2, 'J+2', false),
  ('c22', 4, 'Contrôle ecchymoses', false, 5, 'J+5', false),
  ('c23', 4, 'Retrait fils paupières', false, 7, 'J+7', false),
  ('c24', 4, 'Retrait agrafes visage', false, 10, 'J+10', false),
  ('c25', 4, 'Application arnica (matin et soir)', false, NULL, 'Quotidien', true),
  -- Fatima El Amrani (id=5)
  ('c30', 5, 'Contrôle zones aspirées', true, 3, 'J+3', false),
  ('c31', 5, 'Retrait pansement lipofilling', true, 5, 'J+5', false),
  ('c32', 5, 'Contrôle ecchymoses', true, 7, 'J+7', false),
  ('c33', 5, 'Contrôle final de volume', false, 30, 'J+30', false),
  ('c34', 5, 'Port vêtement compressif 24h/24', true, NULL, '6 semaines', true),
  -- Thomas Vandenberghe (id=6)
  ('c40', 6, 'Retrait pansement compressif', true, 2, 'J+2', false),
  ('c41', 6, 'Contrôle hématome', true, 5, 'J+5', false),
  ('c42', 6, 'Ponction sérome', true, 7, 'J+7', false),
  ('c43', 6, 'Contrôle post-ponction', false, 10, 'J+10', false),
  ('c44', 6, 'Retrait fils', false, 14, 'J+14', false),
  ('c45', 6, 'Port gilet compressif jour et nuit', false, NULL, '4 semaines', true),
  -- Nathalie Peeters (id=7)
  ('c50', 7, 'Retrait drains', true, 3, 'J+3', false),
  ('c51', 7, 'Contrôle cicatrice mammaire', true, 7, 'J+7', false),
  ('c52', 7, 'Contrôle zone liposuccion', true, 7, 'J+7', false),
  ('c53', 7, 'Détection infection — début antibio.', true, 15, 'J+15', false),
  ('c54', 7, 'Contrôle post-antibio (CRITIQUE)', false, 21, 'J+21', false),
  ('c55', 7, 'Prise température + photo cicatrice', false, NULL, 'Quotidien', true),
  -- Jean-Pierre Dumont (id=8)
  ('c60', 8, 'Vérification bandeau compressif', true, 1, 'J+1', false),
  ('c61', 8, 'Contrôle douleur', false, 2, 'J+2', false),
  ('c62', 8, 'Retrait bandeau jour (port nuit)', false, 7, 'J+7', false),
  ('c63', 8, 'Retrait fils', false, 10, 'J+10', false),
  ('c64', 8, 'Prise antalgique si douleur', false, NULL, 'Si besoin', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SEED — Messages
-- =====================================================
INSERT INTO messages (patient_id, from_sender, text, timestamp) VALUES
  -- Sophie Martin
  (1, 'patient', 'Bonjour, mon œdème a bien dégonflé.', NOW() - INTERVAL '1 hour'),
  -- Isabelle Roux
  (3, 'patient', 'Je suis très inquiète concernant la cicatrice, elle suinte un peu.', NOW() - INTERVAL '2 hours'),
  (3, 'nurse', 'Pas de panique, je vous appelle dans 5 minutes.', NOW() - INTERVAL '1 hour'),
  -- Marc Lejeune
  (4, 'patient', 'Les ecchymoses autour des yeux sont normales ?', NOW() - INTERVAL '30 minutes'),
  (4, 'nurse', 'Oui tout à fait normal à J+3, elles vont disparaître progressivement sur 10 jours.', NOW() - INTERVAL '15 minutes'),
  -- Thomas Vandenberghe
  (6, 'patient', 'Le côté gauche est encore un peu gonflé ce matin.', NOW() - INTERVAL '4 hours'),
  -- Nathalie Peeters
  (7, 'patient', 'La rougeur a diminué depuis hier, je continue bien les antibiotiques.', NOW() - INTERVAL '1 day'),
  (7, 'nurse', 'Très bien. Envoyez-nous une photo ce soir pour le contrôle du Dr. Dupuis.', NOW() - INTERVAL '23 hours'),
  (7, 'patient', 'Photo envoyée. La zone est beaucoup moins chaude au toucher.', NOW() - INTERVAL '12 hours')
ON CONFLICT DO NOTHING;

-- =====================================================
-- SEED — Photos
-- =====================================================
INSERT INTO photos (patient_id, jour, label) VALUES
  -- Sophie Martin
  (1, 1, 'J+1 (Normal)'), (1, 3, 'J+3 (Normal)'), (1, 7, 'J+7 (Normal)'),
  -- Claire Dubois
  (2, 1, 'J+1'), (2, 3, 'J+3'),
  -- Isabelle Roux
  (3, 1, 'J+1'), (3, 5, 'J+5'), (3, 10, 'J+10'),
  -- Marc Lejeune
  (4, 1, 'J+1 Paupières'), (4, 1, 'J+1 Visage'),
  -- Fatima El Amrani
  (5, 1, 'J+1'), (5, 7, 'J+7'), (5, 14, 'J+14'),
  -- Thomas Vandenberghe
  (6, 1, 'J+1'), (6, 7, 'J+7 Sérome'),
  -- Nathalie Peeters
  (7, 1, 'J+1'), (7, 7, 'J+7'), (7, 15, 'J+15 Infection'), (7, 18, 'J+18 Sous antibio.'),
  -- Jean-Pierre Dumont
  (8, 1, 'J+1 Bandage')
ON CONFLICT DO NOTHING;
