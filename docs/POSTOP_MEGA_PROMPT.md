# 🏥 POSTOP TRACKER — MEGA-PROMPT DE DÉVELOPPEMENT
-- 
> **Colle ce document au début de chaque session de dev pour donner le contexte complet à l'IA.**
> Dernière mise à jour : Avril 2026 (Phase 1 Complétée ✅)

---

## 🎯 CONTEXTE PROJET

**PostOp Tracker** est un SaaS de suivi post-opératoire à distance destiné aux cliniques de chirurgie esthétique. L'objectif est de commercialiser la plateforme auprès de plusieurs cliniques (multi-tenant).

- **Porteur** : Kevin — Marketing & Commercial Manager chez Clinique Churchill (Bruxelles).
- **Clinique pilote** : Clinique Churchill, Bruxelles.
- **URL de démo actuelle** : https://postoptracker.netlify.app
- **Repo** : GitHub (Déploiement Netlify).

---

## 🛠️ STACK TECHNIQUE ACTUEL

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite 5 |
| Routing | React Router DOM 6 |
| Animations | Framer Motion 10 |
| Backend | ✅ Supabase (PostgreSQL) |
| Auth | ✅ Supabase Auth (Email/Pass + Magic Link) |
| Storage | ✅ Supabase Storage (Patient Photos) |
| Notifications | ✅ Resend / Edge Functions (Email) |

---

## 📁 STRUCTURE DU CODE ACTUEL

```
src/
├── App.jsx                    # Router principal + Auth guarding
├── main.jsx                   # Point d'entrée + Providers
├── lib/supabase.js            # Client Supabase
├── context/
│   ├── AuthContext.jsx        # Session & Profils
│   ├── PatientContext.jsx     # Accès données patients
│   └── AlertContext.jsx       # Alertes temps réel
├── hooks/
│   ├── usePatients.js         # Logique CRUD Supabase
│   └── useAlerts.js           # Souscription realtime
├── pages/
│   ├── NurseDashboard.jsx     # Dashboard Staff
│   ├── SignupClinic.jsx       # Onboarding Clinique
│   ├── PatientPortalAuth.jsx  # Portail Patient Sécurisé
│   └── PatientActivation.jsx  # Callback Magic Link
```

---

## ✅ CE QUI FONCTIONNE DÉJÀ (Phase 1 Complétée)

1. **Authentification & multi-tenant** : Login sécurisé, isolation par `clinic_id` via RLS.
2. **Onboarding Clinique** : Création automatique clinique + profil + templates de protocole.
3. **Gestion Patients (CRUD)** : Ajout de patients, assignation de protocoles, édition de notes.
4. **Protocole interactif** : Tâches soignant/patient, horodatage, progression globale.
5. **Suivi Photo Réel** : Upload Storage avec compression client-side.
6. **Portail Patient Sécurisé** : Accès Magic Link, journal de bord, messagerie.

---

## 🗺️ ROADMAP DE DÉVELOPPEMENT

### Phase 1 — Fondations Backend (COMPLÉTÉ ✅)
- Schéma Supabase & RLS Multi-tenant
- Supabase Auth & Patient Activation (Magic Link)
- Migration complète du state vers DB
- Upload Photos (Storage)

### Phase 2 — Protocoles dynamiques (EN COURS 🚀)
- Table `protocol_templates` active (seeding initial ok)
- Échelle de douleur (VAS 0-10) quotidienne patient
- Timeline visuelle du parcours J+0 → J+90
- Tâches auto-planifiées avancées

### Phase 3 — Notifications & Automatisation (PRÉVU)
- Edge Functions / Resend pour emails quotidiens
- Rappels automatiques programmés via pg_cron

---

## 📐 RÈGLES DE DÉVELOPPEMENT

1. **Langue** : Français (BE).
2. **Timezone** : `Europe/Brussels`.
3. **RLS obligatoire** : Jamais de requête sans filtre `clinic_id`.
4. **Resilience Auth** : Utiliser `getSession()` directement dans les hooks pour éviter les stale closures.

---

## 🚀 INSTRUCTIONS POUR CETTE SESSION

**Phase en cours** : Phase 2 — Protocoles Dynamiques & Expérience Patient
**Objectif** : Stabiliser le portail patient et démarrer la timeline visuelle.
