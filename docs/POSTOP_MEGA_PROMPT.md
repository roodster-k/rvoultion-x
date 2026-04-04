# 🏥 POSTOP TRACKER — MEGA-PROMPT DE DÉVELOPPEMENT

> **Colle ce document au début de chaque session de dev pour donner le contexte complet à l'IA.**
> Dernière mise à jour : Avril 2026

---

## 🎯 CONTEXTE PROJET

**PostOp Tracker** est un SaaS de suivi post-opératoire à distance destiné aux cliniques de chirurgie esthétique. L'objectif est de commercialiser la plateforme auprès de plusieurs cliniques (multi-tenant).

- **Porteur** : Kevin — Marketing & Commercial Manager chez Clinique Churchill (Bruxelles), également fondateur de l'agence web Roots / RvolutionX
- **Clinique pilote** : Clinique Churchill, Bruxelles
- **Chirurgien référent** : Dr Horn Gary (chirurgie plastique, Bruxelles/Londres)
- **URL de démo actuelle** : https://postoptracker.netlify.app
- **Repo** : déployé sur Netlify (GitHub)

---

## 🛠️ STACK TECHNIQUE ACTUEL

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite 5 |
| Routing | React Router DOM 6 |
| Animations | Framer Motion 10 |
| Icônes | Lucide React |
| Typographie | DM Sans + Playfair Display (Google Fonts) |
| Déploiement | Netlify |
| Backend | ❌ AUCUN — tout est en mock data React state |
| Auth | ❌ Simulée (n'importe quel email passe) |
| BDD | ❌ Aucune |
| Storage | ❌ Aucun (photos simulées) |
| Notifications | ❌ Toast simulé uniquement |

**Stack cible** : Supabase (PostgreSQL + Auth + Storage + Edge Functions + Realtime)

---

## 📁 STRUCTURE DU CODE ACTUEL

```
src/
├── App.jsx                    # Router principal + state global + mutations
├── main.jsx                   # Point d'entrée React
├── styles/global.css          # Variables CSS, reset, thème
├── data/mockData.js           # Patients fictifs, statuts, labels interventions/chirurgiens
├── pages/
│   ├── LoginPage.jsx          # Page de connexion (simulée)
│   ├── NurseDashboard.jsx     # Dashboard infirmier(e) — le plus gros fichier (~500 lignes)
│   └── PatientPortal.jsx      # Portail patient (accessible via token URL)
├── components/
│   ├── AlertCenter.jsx        # Centre d'alertes avec filtres
│   ├── NavItem.jsx            # Item de navigation sidebar
│   └── StatusBadge.jsx        # Badge de statut patient (normal/attention/complication)
```

### Architecture actuelle (problèmes à résoudre)
- **Tout le state est dans App.jsx** — patients, alerts, user — passé en props à travers 3 niveaux
- **NurseDashboard.jsx est un monolithe** — dashboard + détail patient + formulaire ajout + tabs dans un seul fichier
- **Aucune séparation front/back** — les mutations (toggleTask, addNote, sendMessage, addPhoto) sont des fonctions locales
- **Les données sont perdues au refresh** — mock data uniquement

---

## ✅ CE QUI FONCTIONNE DÉJÀ (acquis du MVP)

1. **Login simulé** avec écran professionnel (branding Clinique Churchill)
2. **Dashboard infirmier** avec liste de patients triée par priorité, stats, recherche, filtres "Mes patients" / "Vue Équipe"
3. **Dossier patient détaillé** avec :
   - Infos patient (nom, intervention, chirurgien, J+X, statut)
   - Contacts directs (téléphone, WhatsApp, email)
   - Notes cliniques modifiables
   - Onglet Protocole (checklist avec tâches infirmier + patient, détection retard > 3 jours, ajout de tâches personnalisées)
   - Onglet Photos (simulé)
   - Onglet Messages (messagerie bidirectionnelle)
4. **Centre d'alertes** avec filtres par type (retard, message, photo, action), lecture/non-lu, classement
5. **Portail Patient** accessible par token URL :
   - Tâches patient cochables
   - Vue du protocole médical (lecture seule)
   - Upload photo (simulé)
   - Messagerie avec l'équipe soignante
   - Barre de progression globale
6. **Système d'alertes automatiques** : retard de protocole > 3 jours, nouvelle action patient, nouveau message, photo reçue
7. **Toast email simulé** pour les nouvelles alertes
8. **8 cas cliniques variés** avec données réalistes (rhinoplastie, augmentation mammaire, abdominoplastie, blépharoplastie, liposuccion/lipofilling, gynécomastie, mastopexie, otoplastie)
9. **Autocomplete** pour interventions (25 types) et chirurgiens (10 noms)
10. **Indicatifs téléphoniques** BE/FR/NL/DE/LU/UK/CH

---

## 🔴 GAP ANALYSIS — CE QUI MANQUE (31 items identifiés)

### Résumé par priorité

| Priorité | Signification | Nombre d'items |
|----------|---------------|----------------|
| **P0 — Critique** | Bloquant pour la mise en production | 9 |
| **P1 — Important** | Nécessaire pour un MVP crédible | 8 |
| **P2 — Souhaitable** | Différenciation concurrentielle | 10 |
| **P3 — Futur** | Croissance et scale | 4 |

### P0 — CRITIQUES (à faire en premier)

1. **Persistance des données (Backend)** — Remplacer le mock data par Supabase PostgreSQL
2. **Architecture multi-tenant** — Isolation par `clinic_id` sur chaque table
3. **Gestion des rôles (RBAC)** — Super Admin → Admin Clinique → Chirurgien → Infirmier(e) → Patient
4. **Authentification réelle** — Supabase Auth : email/password soignants + magic link patients
5. **Création de compte patient** — Invitation par email/SMS → lien d'activation → compte patient
6. **Sessions & tokens sécurisés** — JWT Supabase + refresh tokens + session persistante
7. **Upload réel de photos** — Supabase Storage + compression client-side

### P1 — IMPORTANTS (MVP crédible)

8. **Protocoles dynamiques par intervention** — Templates liés au type d'intervention
9. **Échelles de douleur (VAS/NRS)** — Saisie quotidienne patient (0-10)
10. **Timeline visuelle du parcours** — Frise J+0 → J+90 avec jalons
11. **Notifications email réelles** — Emails transactionnels via Resend + Edge Functions
12. **Rappels automatiques programmés** — Cron/scheduled functions basés sur J+X
13. **API / Séparation front-back** — Logique métier dans Edge Functions
14. **Onboarding patient guidé** — Écran de bienvenue + tutoriel première utilisation

### P2 — SOUHAITABLES (différenciation)

15. **PROMs / PREMs** — Questionnaires standardisés (QoR-15, BREAST-Q)
16. **Contenu éducatif** — Fiches post-op, vidéos par intervention
17. **Comparaison avant/après** — Vue split-screen photos
18. **Consentements numériques** — E-signature
19. **Notifications SMS** — Twilio pour rappels critiques
20. **Analytics & KPIs cliniques** — Taux compliance, complications par intervention
21. **Export données / rapports** — CSV/PDF
22. **Onboarding clinique self-service** — Inscription → configuration → premier patient
23. **White-labeling** — Logo, couleurs par clinique
24. **PWA ou app mobile** — Capacitor pour wrapper React
25. **Landing page marketing** — Site vitrine PostOp Tracker

### P3 — FUTUR (scale)

26. **Audit trail / logs** — Log de chaque action sensible
27. **Push notifications mobile** — Web Push ou natif Capacitor
28. **Dashboard multi-clinique Super Admin** — Vue globale SaaS
29. **Gestion abonnements / billing** — Stripe Billing
30. **Mode offline patient** — Cache des données patient
31. **Intégration EHR** — Connexion aux systèmes existants

---

## 🗺️ ROADMAP DE DÉVELOPPEMENT (4 phases)

### Phase 1 — Fondations Backend (3-4 semaines)
```
□ Schéma Supabase : tables clinics, users, patients, protocols, tasks, messages, photos, alerts
□ Row Level Security (RLS) multi-tenant par clinic_id
□ Supabase Auth : inscription soignants (email/password) + invitation patients (magic link)
□ Migration du state React vers requêtes Supabase (CRUD patients, checklist, messages)
□ Upload photos vers Supabase Storage avec compression client-side
□ Sessions persistantes (JWT + refresh tokens)
```

### Phase 2 — Protocoles dynamiques (2-3 semaines)
```
□ Table protocol_templates : chaque intervention a son template de tâches
□ Assignation automatique du protocole lors de la création du dossier patient
□ Échelle de douleur patient (VAS 0-10) avec saisie quotidienne
□ Timeline visuelle du parcours J+0 → J+90
□ Tâches auto-planifiées basées sur la date d'intervention
```

### Phase 3 — Notifications & Automatisation (2 semaines)
```
□ Supabase Edge Functions pour envoi d'emails transactionnels (Resend)
□ Rappels automatiques : photo à J+3, questionnaire douleur quotidien
□ Alertes soignants en temps réel (Supabase Realtime)
□ Notifications navigateur (Web Push API)
```

### Phase 4 — SaaS & Scale (3-4 semaines)
```
□ Onboarding clinique : formulaire inscription → configuration → premier patient
□ White-labeling : logo, couleurs, nom par clinique
□ Dashboard analytics : compliance, complications, satisfaction
□ Landing page marketing PostOp Tracker
□ Stripe Billing : gestion des abonnements
□ Capacitor : wrapper mobile iOS/Android
```

---

## 🏗️ SCHÉMA BDD SUPABASE (proposition)

```sql
-- Cliniques (tenants)
clinics (
  id uuid PK,
  name text,
  slug text UNIQUE,
  logo_url text,
  primary_color text DEFAULT '#0f5f54',
  created_at timestamptz
)

-- Utilisateurs (soignants + admins)
users (
  id uuid PK REFERENCES auth.users,
  clinic_id uuid FK → clinics,
  full_name text,
  role enum('super_admin','clinic_admin','surgeon','nurse'),
  email text,
  phone text,
  created_at timestamptz
)

-- Patients
patients (
  id uuid PK,
  clinic_id uuid FK → clinics,
  assigned_to uuid FK → users,
  surgeon_id uuid FK → users,
  full_name text,
  email text,
  phone text,
  whatsapp text,
  intervention text,
  surgery_date date,
  status enum('normal','attention','complication'),
  notes text,
  token text UNIQUE, -- pour accès portail patient
  created_at timestamptz
)

-- Templates de protocole
protocol_templates (
  id uuid PK,
  clinic_id uuid FK → clinics,
  intervention_type text,
  tasks jsonb -- [{label, jour_post_op_ref, patient_can_check, ...}]
)

-- Tâches du protocole (instance par patient)
tasks (
  id uuid PK,
  patient_id uuid FK → patients,
  clinic_id uuid FK → clinics,
  label text,
  jour_post_op_ref int,
  patient_can_check boolean DEFAULT false,
  done boolean DEFAULT false,
  done_at timestamptz,
  done_by uuid FK → users
)

-- Messages
messages (
  id uuid PK,
  patient_id uuid FK → patients,
  clinic_id uuid FK → clinics,
  sender_type enum('nurse','patient','surgeon'),
  sender_id uuid,
  text text,
  created_at timestamptz
)

-- Photos
photos (
  id uuid PK,
  patient_id uuid FK → patients,
  clinic_id uuid FK → clinics,
  storage_path text,
  label text,
  jour_post_op int,
  uploaded_by enum('patient','nurse'),
  created_at timestamptz
)

-- Alertes
alerts (
  id uuid PK,
  clinic_id uuid FK → clinics,
  patient_id uuid FK → patients,
  type enum('delay','message','photo','action'),
  title text,
  message text,
  read boolean DEFAULT false,
  created_at timestamptz
)

-- Échelles de douleur
pain_scores (
  id uuid PK,
  patient_id uuid FK → patients,
  score int CHECK (score >= 0 AND score <= 10),
  jour_post_op int,
  created_at timestamptz
)

-- RLS : chaque table filtrée par clinic_id de l'utilisateur connecté
```

---

## 🎨 DESIGN SYSTEM

| Variable | Valeur | Usage |
|----------|--------|-------|
| `--color-primary` | `#0f5f54` | Couleur principale (teal foncé) |
| `--color-primary-light` | `#e0f0ee` | Fonds de cartes, badges |
| `--color-primary-dark` | `#0a4038` | Texte sur fond clair |
| `--background-main` | `#f5f8f7` | Fond de page |
| `--font-sans` | DM Sans | Corps de texte |
| `--font-serif` | Playfair Display | Titres h1/h2 |
| Status normal | `#10b981` sur `#ecfdf5` | Patient en bonne voie |
| Status attention | `#f59e0b` sur `#fffbeb` | Surveillance requise |
| Status complication | `#ef4444` sur `#fef2f2` | Action urgente |

**Conventions UI** :
- Border radius : 16-20px (cartes), 10-12px (boutons/inputs)
- Shadows : `0 4px 20px rgba(0,0,0,0.03)` (cartes)
- Sidebar fixe 250px à gauche
- Contenu principal max-width 1100px
- Animations : framer-motion pour les transitions de vue

---

## 🏆 CONCURRENTS DE RÉFÉRENCE

| Plateforme | Focus | Ce qu'ils font bien |
|-----------|-------|---------------------|
| **Buddy Healthcare** | Coordination pré/post-op hospitalière | Timeline automatisée, PROMs, push notifications, dashboard clinique |
| **SeamlessMD** | Parcours digitaux chirurgicaux | Intégration EHR (Epic/Cerner), contenu éducatif timed, analytics |
| **PostOp.ai** | Protocoles ERAS multilingues | Multi-spécialités, recherche publiée, NHS |
| **DocToDoor** | Suivi post-op white-label + RPM | White-labeling complet, app mobile, wearables |
| **Pabau** | Gestion complète clinique esthétique | CRM + marketing + booking + consentements + photos |
| **PatientNow** | EMR + CRM chirurgie plastique | Before/after photos, patient portal, 4795 cliniques |

**Notre positionnement** : spécialisation chirurgie esthétique × marché BE/FR × pricing accessible (150-300€/mois vs 500-2000€ chez les concurrents) × stack moderne × IA intégrée.

---

## 📐 RÈGLES DE DÉVELOPPEMENT

1. **Langue de l'interface** : Français (BE) — les labels, placeholders, messages d'erreur sont en français
2. **Timezone** : `Europe/Brussels` pour tous les formats de date
3. **Format dates** : `fr-BE` — ex: `04/04/2026`
4. **Téléphones** : format international avec indicatif (+32, +33)
5. **Ne jamais exposer de clés API côté client** — utiliser les Edge Functions Supabase
6. **Photos** : compresser côté client avant upload (max 1MB, JPEG quality 0.8)
7. **RLS obligatoire** sur chaque table Supabase — toujours filtrer par `clinic_id`
8. **Mobile-first** pour le portail patient, desktop-first pour le dashboard infirmier

---

## 🚀 INSTRUCTIONS POUR CETTE SESSION

> **Modifie cette section selon ce que tu veux accomplir dans la session.**

**Phase en cours** : Phase 1 — Fondations Backend
**Tâche spécifique** : [DÉCRIS ICI CE QUE TU VEUX FAIRE]
**Fichiers concernés** : [LISTE LES FICHIERS À MODIFIER]
**Contraintes** : [PRÉCISE SI NÉCESSAIRE]

---

*Ce document est un briefing vivant. Mets-le à jour après chaque phase complétée.*
