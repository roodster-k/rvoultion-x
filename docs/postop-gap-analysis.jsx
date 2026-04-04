import { useState } from "react";

const GAP_DATA = [
  {
    category: "Architecture & Backend",
    icon: "🏗️",
    color: "#0f5f54",
    items: [
      {
        label: "Persistance des données (Backend)",
        current: "Mock data en mémoire — tout est perdu au refresh",
        target: "Base de données Supabase (PostgreSQL) avec Row Level Security",
        priority: "P0",
        effort: "Élevé",
        detail: "C'est le fondement de tout. Sans backend, rien d'autre ne fonctionne en production. Supabase = auth + DB + storage + realtime en un seul service."
      },
      {
        label: "Architecture multi-tenant",
        current: "Aucune — une seule clinique hardcodée",
        target: "Isolation par clinic_id sur chaque table, chaque clinique a son espace",
        priority: "P0",
        effort: "Élevé",
        detail: "Indispensable pour un SaaS multi-cliniques. Buddy Healthcare et SeamlessMD utilisent ce modèle. Chaque clinique voit uniquement ses patients."
      },
      {
        label: "Gestion des rôles (RBAC)",
        current: "Rôle 'nurse' simulé, pas de hiérarchie",
        target: "Super Admin (vous) → Admin Clinique → Chirurgien → Infirmier(e) → Patient",
        priority: "P0",
        effort: "Moyen",
        detail: "Les concurrents (Pabau, PatientNow) offrent 4-6 rôles avec permissions granulaires. Ex: un chirurgien voit tous ses patients, une infirmière seulement ceux assignés."
      },
      {
        label: "API / Séparation front-back",
        current: "Toute la logique dans les composants React",
        target: "API via Supabase Edge Functions ou endpoints REST",
        priority: "P1",
        effort: "Moyen",
        detail: "Permet la réutilisation future (app mobile Capacitor, intégrations tierces). Les concurrents matures exposent tous une API."
      },
    ]
  },
  {
    category: "Authentification & Sécurité",
    icon: "🔐",
    color: "#7c3aed",
    items: [
      {
        label: "Authentification réelle",
        current: "Login simulé (n'importe quel email passe)",
        target: "Supabase Auth : email/password + magic link pour patients",
        priority: "P0",
        effort: "Moyen",
        detail: "Buddy Healthcare et DocToDoor utilisent des magic links pour l'onboarding patient (pas de mot de passe). SeamlessMD fait pareil."
      },
      {
        label: "Création de compte patient",
        current: "Aucune — token statique dans l'URL",
        target: "Invitation par email/SMS avec lien sécurisé → création de compte patient",
        priority: "P0",
        effort: "Moyen",
        detail: "Le standard du marché : l'infirmier(e) enregistre le patient, celui-ci reçoit un lien d'activation. Pas d'inscription libre."
      },
      {
        label: "Sessions & tokens sécurisés",
        current: "État React uniquement, perdu au reload",
        target: "JWT Supabase + refresh tokens + session persistante",
        priority: "P0",
        effort: "Faible",
        detail: "Géré nativement par Supabase Auth. Indispensable pour ne pas perdre la session."
      },
      {
        label: "Audit trail / logs",
        current: "Aucun",
        target: "Log de chaque action sensible (qui a modifié quoi, quand)",
        priority: "P2",
        effort: "Moyen",
        detail: "Exigence réglementaire en santé (HDS/RGPD). Pabau et PatientNow loguent toutes les modifications de dossier patient."
      },
    ]
  },
  {
    category: "Protocoles & Suivi Clinique",
    icon: "📋",
    color: "#0ea5e9",
    items: [
      {
        label: "Protocoles dynamiques par intervention",
        current: "Checklist manuelle, identique pour tous",
        target: "Templates de protocole liés au type d'intervention (rhinoplastie ≠ abdominoplastie)",
        priority: "P1",
        effort: "Élevé",
        detail: "C'est le cœur de Buddy Healthcare et SeamlessMD. Chaque intervention a son propre parcours de soin (timeline, tâches, alertes). C'est ce qui différencie un outil pro d'un simple to-do."
      },
      {
        label: "Échelles de douleur (VAS/NRS)",
        current: "Aucune collecte de données patient",
        target: "Patient saisit son niveau de douleur quotidiennement (échelle 0-10)",
        priority: "P1",
        effort: "Faible",
        detail: "Standard chez tous les concurrents. Buddy Healthcare collecte automatiquement via l'app. Permet de détecter les complications tôt."
      },
      {
        label: "PROMs / PREMs (questionnaires validés)",
        current: "Aucun",
        target: "Questionnaires standardisés envoyés automatiquement (ex: QoR-15, BREAST-Q)",
        priority: "P2",
        effort: "Moyen",
        detail: "SeamlessMD et PostOp.ai collectent des PROMs (Patient-Reported Outcome Measures). En chirurgie esthétique, le BREAST-Q est le gold standard pour la mammoplastie."
      },
      {
        label: "Timeline visuelle du parcours",
        current: "Liste linéaire de tâches",
        target: "Frise chronologique interactive J+0 → J+90 avec jalons et statuts",
        priority: "P1",
        effort: "Moyen",
        detail: "Buddy Healthcare affiche une timeline complète du parcours. Le patient et le soignant voient exactement où ils en sont dans le protocole."
      },
      {
        label: "Contenu éducatif (vidéos, fiches)",
        current: "Aucun contenu patient",
        target: "Fiches post-op, vidéos d'exercices, instructions de soins par intervention",
        priority: "P2",
        effort: "Moyen",
        detail: "SeamlessMD et Buddy Healthcare livrent du contenu éducatif timed (ex: J+3 = vidéo 'comment changer votre pansement'). Réduit les appels téléphoniques de 40%."
      },
    ]
  },
  {
    category: "Photos & Documents",
    icon: "📸",
    color: "#f59e0b",
    items: [
      {
        label: "Upload réel de photos",
        current: "Simulé — aucun fichier n'est stocké",
        target: "Upload vers Supabase Storage, compression, métadonnées EXIF",
        priority: "P0",
        effort: "Moyen",
        detail: "CureCast et PatientNow en font leur argument principal. Le patient photographie sa cicatrice, le chirurgien la consulte à distance."
      },
      {
        label: "Comparaison avant/après",
        current: "Aucune",
        target: "Vue split-screen ou slider pour comparer J+1, J+7, J+14, etc.",
        priority: "P2",
        effort: "Moyen",
        detail: "Feature signature de 4D EMR et CureCast. En chirurgie esthétique, le before/after est critique pour le suivi et le marketing (avec consentement)."
      },
      {
        label: "Consentements numériques",
        current: "Aucun",
        target: "Formulaires de consentement signés électroniquement (e-signature)",
        priority: "P2",
        effort: "Élevé",
        detail: "Pabau et Consentz intègrent la signature numérique des consentements. Requis légalement avant toute intervention."
      },
    ]
  },
  {
    category: "Notifications & Communication",
    icon: "🔔",
    color: "#ef4444",
    items: [
      {
        label: "Notifications email",
        current: "Toast simulé '📧 Notification'",
        target: "Emails transactionnels réels (Resend, Supabase Edge Functions)",
        priority: "P1",
        effort: "Moyen",
        detail: "Buddy Healthcare envoie des rappels automatiques. Un email à J+3 'N'oubliez pas votre photo de contrôle' augmente la compliance de 60%."
      },
      {
        label: "Notifications SMS",
        current: "Aucune",
        target: "SMS via Twilio ou équivalent pour rappels critiques",
        priority: "P2",
        effort: "Moyen",
        detail: "Pabau et DocToDoor utilisent SMS + email. En Belgique/France, le SMS reste le canal le plus fiable pour les patients 50+."
      },
      {
        label: "Push notifications (mobile)",
        current: "Aucune",
        target: "Web push ou push natif via Capacitor",
        priority: "P3",
        effort: "Élevé",
        detail: "Buddy Healthcare et SeamlessMD utilisent des push notifications pour les tâches quotidiennes. Nécessite l'app mobile (Capacitor dans ton cas)."
      },
      {
        label: "Rappels automatiques programmés",
        current: "Aucun — tout est déclenché manuellement",
        target: "Cron jobs / scheduled functions : rappels automatiques basés sur J+X",
        priority: "P1",
        effort: "Moyen",
        detail: "Le moteur de rappels est le cœur de toutes les plateformes concurrentes. 'À J+7, envoyer rappel photo + questionnaire douleur' = automatique."
      },
    ]
  },
  {
    category: "Dashboard & Analytics",
    icon: "📊",
    color: "#8b5cf6",
    items: [
      {
        label: "Analytics & KPIs cliniques",
        current: "Compteurs basiques (total, complications)",
        target: "Taux de compliance, temps moyen de récupération, taux de complications par intervention",
        priority: "P2",
        effort: "Moyen",
        detail: "SeamlessMD propose un ROI Calculator. Buddy Healthcare affiche le taux de compliance des patients. Ces données justifient l'abonnement pour les cliniques."
      },
      {
        label: "Export de données / rapports",
        current: "Aucun",
        target: "Export CSV/PDF des dossiers, rapports pour le chirurgien",
        priority: "P2",
        effort: "Moyen",
        detail: "PatientNow et Pabau proposent des rapports personnalisables. Utile aussi pour le médico-légal."
      },
      {
        label: "Dashboard multi-clinique (Super Admin)",
        current: "Aucun",
        target: "Vue globale SaaS : nombre de cliniques, patients actifs, MRR",
        priority: "P3",
        effort: "Moyen",
        detail: "Nécessaire quand tu auras plusieurs cliniques clientes. Gestion des abonnements, onboarding, support."
      },
    ]
  },
  {
    category: "Expérience Patient (Mobile)",
    icon: "📱",
    color: "#10b981",
    items: [
      {
        label: "PWA ou app mobile",
        current: "Web responsive basique",
        target: "PWA installable ou app native via Capacitor",
        priority: "P2",
        effort: "Moyen",
        detail: "Buddy Healthcare et SeamlessMD ont des apps natives. Avec Capacitor (déjà dans ton plan), tu peux wrapper ton React existant."
      },
      {
        label: "Mode offline patient",
        current: "Aucun",
        target: "Cache des tâches et données patient pour consultation sans réseau",
        priority: "P3",
        effort: "Élevé",
        detail: "Utile dans les zones à faible couverture. Les concurrents premium le proposent."
      },
      {
        label: "Onboarding patient guidé",
        current: "Le patient arrive directement sur la liste de tâches",
        target: "Écran de bienvenue, explication du parcours, tutoriel première utilisation",
        priority: "P1",
        effort: "Faible",
        detail: "DocToDoor propose un onboarding en 3 étapes. Réduit le taux d'abandon de 35% selon leurs données."
      },
    ]
  },
  {
    category: "Business & SaaS",
    icon: "💼",
    color: "#374151",
    items: [
      {
        label: "Onboarding clinique (self-service)",
        current: "Aucun — une seule clinique hardcodée",
        target: "Formulaire d'inscription clinique → configuration → premier patient en 10 min",
        priority: "P2",
        effort: "Élevé",
        detail: "Pour scaler en SaaS, chaque clinique doit pouvoir s'inscrire, configurer ses chirurgiens et protocoles, et commencer à utiliser l'outil rapidement."
      },
      {
        label: "Gestion des abonnements / billing",
        current: "Aucun",
        target: "Stripe Billing : plans mensuels par clinique (ex: starter/pro/enterprise)",
        priority: "P3",
        effort: "Élevé",
        detail: "Pabau et Buddy Healthcare fonctionnent sur abonnement mensuel. Stripe + Supabase = combo éprouvé pour le billing SaaS."
      },
      {
        label: "White-labeling",
        current: "Branding fixe 'Clinique Churchill'",
        target: "Logo, couleurs, nom personnalisables par clinique",
        priority: "P2",
        effort: "Moyen",
        detail: "DocToDoor propose du white-labeling complet. Chaque clinique veut voir son logo et ses couleurs sur le portail patient."
      },
      {
        label: "Landing page / site marketing",
        current: "Aucun site commercial pour le produit SaaS",
        target: "Site vitrine PostOp Tracker avec démo, pricing, témoignages",
        priority: "P2",
        effort: "Moyen",
        detail: "Tous les concurrents ont un site marketing solide. C'est ton premier point de contact avec les cliniques prospects."
      },
    ]
  },
];

const PRIORITY_CONFIG = {
  P0: { label: "Critique", color: "#ef4444", bg: "#fef2f2", desc: "Bloquant pour la mise en production" },
  P1: { label: "Important", color: "#f59e0b", bg: "#fffbeb", desc: "Nécessaire pour un MVP crédible" },
  P2: { label: "Souhaitable", color: "#0ea5e9", bg: "#f0f9ff", desc: "Différenciation concurrentielle" },
  P3: { label: "Futur", color: "#94a3b8", bg: "#f8fafc", desc: "Croissance et scale" },
};

const COMPETITORS = [
  { name: "Buddy Healthcare", focus: "Coordination pré/post-op hospitalière", geo: "Finlande / NHS UK", model: "SaaS B2B" },
  { name: "SeamlessMD", focus: "Parcours digitaux chirurgicaux + intégration EHR", geo: "Canada / USA", model: "SaaS B2B" },
  { name: "PostOp.ai", focus: "Protocoles ERAS multilingues", geo: "UK / NHS", model: "SaaS B2B" },
  { name: "DocToDoor", focus: "Suivi post-op white-label + RPM", geo: "USA / International", model: "SaaS B2B" },
  { name: "Pabau", focus: "Gestion complète clinique esthétique", geo: "UK / Europe", model: "SaaS B2B" },
  { name: "PatientNow", focus: "EMR + CRM chirurgie plastique", geo: "USA", model: "SaaS B2B" },
];

export default function GapAnalysis() {
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [expandedItem, setExpandedItem] = useState(null);
  const [view, setView] = useState("gaps");

  const allItems = GAP_DATA.flatMap((cat, ci) =>
    cat.items.map((item, ii) => ({ ...item, category: cat.category, icon: cat.icon, catColor: cat.color, key: `${ci}-${ii}` }))
  );

  const filteredItems = allItems.filter(item => {
    if (selectedPriority !== "all" && item.priority !== selectedPriority) return false;
    if (selectedCat !== null && item.category !== selectedCat) return false;
    return true;
  });

  const stats = {
    P0: allItems.filter(i => i.priority === "P0").length,
    P1: allItems.filter(i => i.priority === "P1").length,
    P2: allItems.filter(i => i.priority === "P2").length,
    P3: allItems.filter(i => i.priority === "P3").length,
    total: allItems.length,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fafbfc", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#0f172a" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0f5f54 0%, #064e3b 50%, #022c22 100%)", padding: "48px 32px 40px", color: "white" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", opacity: 0.6, marginBottom: 12 }}>
            Analyse Concurrentielle
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8, lineHeight: 1.15 }}>
            PostOp Tracker — Gap Analysis
          </h1>
          <p style={{ fontSize: 16, opacity: 0.75, maxWidth: 600, lineHeight: 1.6 }}>
            Comparaison fonctionnelle entre ton MVP actuel et les solutions matures du marché (Buddy Healthcare, SeamlessMD, Pabau, etc.)
          </p>

          {/* View Toggle */}
          <div style={{ display: "flex", gap: 4, marginTop: 28, background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: 4, width: "fit-content" }}>
            {[
              { key: "gaps", label: "Écarts fonctionnels" },
              { key: "competitors", label: "Concurrents" },
              { key: "roadmap", label: "Roadmap suggérée" },
            ].map(v => (
              <button key={v.key} onClick={() => setView(v.key)} style={{
                padding: "10px 20px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: view === v.key ? "white" : "transparent",
                color: view === v.key ? "#0f5f54" : "rgba(255,255,255,0.7)",
                transition: "all 0.2s"
              }}>{v.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 32px 80px" }}>

        {/* ===== GAPS VIEW ===== */}
        {view === "gaps" && (
          <>
            {/* Priority Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 28 }}>
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => setSelectedPriority(selectedPriority === key ? "all" : key)} style={{
                  padding: "18px 16px", borderRadius: 16, border: selectedPriority === key ? `2px solid ${cfg.color}` : "2px solid transparent",
                  background: "white", cursor: "pointer", textAlign: "left", transition: "all 0.2s",
                  boxShadow: selectedPriority === key ? `0 4px 16px ${cfg.color}22` : "0 1px 4px rgba(0,0,0,0.04)"
                }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: cfg.color }}>{stats[key]}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: cfg.color, marginTop: 2 }}>{cfg.label}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{cfg.desc}</div>
                </button>
              ))}
            </div>

            {/* Category Filters */}
            <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
              <button onClick={() => setSelectedCat(null)} style={{
                padding: "8px 14px", borderRadius: 10, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: selectedCat === null ? "#0f5f54" : "#e2e8f0", color: selectedCat === null ? "white" : "#64748b"
              }}>Toutes ({allItems.length})</button>
              {GAP_DATA.map(cat => {
                const count = cat.items.filter(i => selectedPriority === "all" || i.priority === selectedPriority).length;
                return (
                  <button key={cat.category} onClick={() => setSelectedCat(selectedCat === cat.category ? null : cat.category)} style={{
                    padding: "8px 14px", borderRadius: 10, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: selectedCat === cat.category ? cat.color : "white", color: selectedCat === cat.category ? "white" : "#64748b",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                  }}>{cat.icon} {cat.category.split("&")[0].trim()} ({count})</button>
                );
              })}
            </div>

            {/* Gap Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredItems.map((item) => {
                const pcfg = PRIORITY_CONFIG[item.priority];
                const isExpanded = expandedItem === item.key;
                return (
                  <div key={item.key} onClick={() => setExpandedItem(isExpanded ? null : item.key)} style={{
                    background: "white", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", cursor: "pointer",
                    borderLeft: `4px solid ${pcfg.color}`, transition: "box-shadow 0.2s",
                    boxShadow: isExpanded ? "0 8px 24px rgba(0,0,0,0.08)" : "0 1px 4px rgba(0,0,0,0.03)"
                  }}>
                    <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ fontSize: 20 }}>{item.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{item.label}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: pcfg.bg, color: pcfg.color }}>{item.priority} — {pcfg.label}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "#f1f5f9", color: "#64748b" }}>Effort: {item.effort}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{item.category}</div>
                      </div>
                      <span style={{ color: "#cbd5e1", fontSize: 18, transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>›</span>
                    </div>
                    {isExpanded && (
                      <div style={{ padding: "0 20px 20px", borderTop: "1px solid #f1f5f9" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                          <div style={{ padding: 16, borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#b91c1c", textTransform: "uppercase", marginBottom: 6 }}>État actuel</div>
                            <div style={{ fontSize: 13, color: "#7f1d1d", lineHeight: 1.5 }}>{item.current}</div>
                          </div>
                          <div style={{ padding: 16, borderRadius: 12, background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#065f46", textTransform: "uppercase", marginBottom: 6 }}>Cible marché</div>
                            <div style={{ fontSize: 13, color: "#064e3b", lineHeight: 1.5 }}>{item.target}</div>
                          </div>
                        </div>
                        <div style={{ marginTop: 14, padding: 16, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Benchmark concurrentiel</div>
                          <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6 }}>{item.detail}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ===== COMPETITORS VIEW ===== */}
        {view === "competitors" && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Concurrents analysés</h2>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>Les 6 plateformes de référence utilisées pour cette analyse comparative.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {COMPETITORS.map((c, i) => (
                <div key={i} style={{ background: "white", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#0f5f54", marginBottom: 8 }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, marginBottom: 12 }}>{c.focus}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 8, background: "#f0f9ff", color: "#0ea5e9" }}>{c.geo}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 8, background: "#ecfdf5", color: "#10b981" }}>{c.model}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 32, background: "white", borderRadius: 16, padding: 28, border: "1px solid #e2e8f0" }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 16 }}>Ton positionnement différenciant</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { icon: "🇧🇪", text: "Marché belge/français — aucun concurrent majeur n'est localisé BE/FR avec connaissance du terrain esthétique" },
                  { icon: "🏥", text: "Spécialisation chirurgie esthétique — Buddy Healthcare et SeamlessMD visent l'hôpital généraliste, pas la clinique privée" },
                  { icon: "💰", text: "Pricing accessible — les concurrents facturent 500-2000€/mois. Un positionnement à 150-300€/mois est viable" },
                  { icon: "🔧", text: "Stack moderne et léger — React + Supabase vs les monolithes Java/C# des concurrents. Déploiement rapide." },
                  { icon: "🤖", text: "IA intégrée — chatbot patient contextuel, détection d'anomalies photos. Différenciateur fort vs concurrents classiques." },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 16px", borderRadius: 12, background: "#f8fafc" }}>
                    <span style={{ fontSize: 22 }}>{item.icon}</span>
                    <span style={{ fontSize: 14, color: "#334155", lineHeight: 1.6 }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== ROADMAP VIEW ===== */}
        {view === "roadmap" && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Roadmap suggérée</h2>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 28 }}>Séquencée selon tes priorités : Supabase → Auth → Protocoles → Notifications.</p>

            {[
              {
                phase: "Phase 1", title: "Fondations Backend", duration: "3-4 semaines", color: "#ef4444",
                tasks: [
                  "Schéma Supabase : tables clinics, users, patients, protocols, tasks, messages, photos, alerts",
                  "Row Level Security (RLS) multi-tenant par clinic_id",
                  "Supabase Auth : inscription soignants (email/password) + invitation patients (magic link)",
                  "Migration du state React vers requêtes Supabase (CRUD patients, checklist, messages)",
                  "Upload photos vers Supabase Storage avec compression client-side",
                  "Sessions persistantes (JWT + refresh tokens)",
                ]
              },
              {
                phase: "Phase 2", title: "Protocoles dynamiques", duration: "2-3 semaines", color: "#f59e0b",
                tasks: [
                  "Table protocol_templates : chaque type d'intervention a son template de tâches",
                  "Assignation automatique du protocole lors de la création du dossier patient",
                  "Échelle de douleur patient (VAS 0-10) avec saisie quotidienne",
                  "Timeline visuelle du parcours J+0 → J+90",
                  "Tâches auto-planifiées basées sur la date d'intervention",
                ]
              },
              {
                phase: "Phase 3", title: "Notifications & Automatisation", duration: "2 semaines", color: "#0ea5e9",
                tasks: [
                  "Supabase Edge Functions pour envoi d'emails transactionnels (Resend)",
                  "Rappels automatiques : photo à J+3, questionnaire douleur quotidien",
                  "Alertes soignants en temps réel (Supabase Realtime)",
                  "Notifications navigateur (Web Push API)",
                ]
              },
              {
                phase: "Phase 4", title: "SaaS & Scale", duration: "3-4 semaines", color: "#8b5cf6",
                tasks: [
                  "Onboarding clinique : formulaire inscription → configuration → premier patient",
                  "White-labeling : logo, couleurs, nom par clinique",
                  "Dashboard analytics : compliance, complications, satisfaction",
                  "Landing page marketing PostOp Tracker",
                  "Stripe Billing : gestion des abonnements",
                  "Capacitor : wrapper mobile iOS/Android",
                ]
              },
            ].map((phase, i) => (
              <div key={i} style={{ marginBottom: 24, background: "white", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 14, borderLeft: `4px solid ${phase.color}` }}>
                  <span style={{ fontSize: 12, fontWeight: 800, padding: "4px 12px", borderRadius: 8, background: phase.color, color: "white" }}>{phase.phase}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{phase.title}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{phase.duration}</div>
                  </div>
                </div>
                <div style={{ padding: "16px 24px" }}>
                  {phase.tasks.map((task, j) => (
                    <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderBottom: j < phase.tasks.length - 1 ? "1px solid #f8fafc" : "none" }}>
                      <span style={{ width: 20, height: 20, borderRadius: 6, border: "2px solid #e2e8f0", flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 13, color: "#334155", lineHeight: 1.5 }}>{task}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 16, padding: 24, marginTop: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#92400e", marginBottom: 8 }}>⏱ Estimation totale : 10-14 semaines</div>
              <div style={{ fontSize: 13, color: "#78350f", lineHeight: 1.6 }}>
                En travaillant avec Claude Code ou un outil d'IA assistée, chaque phase peut être accélérée de 30-40%. La Phase 1 est la plus critique — une fois Supabase en place, les phases suivantes s'enchaînent naturellement.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
