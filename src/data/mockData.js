// src/data/mockData.js

const getBelgianDate = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toLocaleDateString('fr-BE', { timeZone: 'Europe/Brussels' });
};

// Country codes
export const countryCodes = [
  { code: '+32', country: 'Belgique', flag: '🇧🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+31', country: 'Pays-Bas', flag: '🇳🇱' },
  { code: '+49', country: 'Allemagne', flag: '🇩🇪' },
  { code: '+352', country: 'Luxembourg', flag: '🇱🇺' },
  { code: '+44', country: 'Royaume-Uni', flag: '🇬🇧' },
  { code: '+41', country: 'Suisse', flag: '🇨🇭' },
];

// ----- LIBELLÉS AUTOCOMPLETE -----
export const interventionLabels = [
  "Rhinoplastie",
  "Septoplastie",
  "Rhinoseptoplastie",
  "Augmentation mammaire",
  "Réduction mammaire",
  "Mastopexie (lifting seins)",
  "Abdominoplastie",
  "Mini-abdominoplastie",
  "Liposuccion",
  "Lipostructure (lipofilling)",
  "Blépharoplastie (paupières)",
  "Lifting cervico-facial",
  "Mini-lift",
  "Otoplastie (oreilles)",
  "Génioplastie (menton)",
  "Brachioplastie (bras)",
  "Cruroplastie (cuisses)",
  "Bodylifting",
  "Implants fessiers",
  "Gynécomastie",
  "Reconstruction mammaire",
  "Greffe de cheveux (FUE)",
  "Injection acide hyaluronique",
  "Injection toxine botulique",
  "Peelings chimiques",
];

export const chirurgienLabels = [
  "Dr. Renaud",
  "Dr. Van den Berg",
  "Dr. Claessens",
  "Dr. Lambert",
  "Dr. Dupuis",
  "Dr. Moens",
  "Dr. Peeters",
  "Dr. Janssens",
  "Dr. Leroy",
  "Dr. Maes",
];

// ----- PATIENTS (8 cas cliniques variés) -----
export const initialPatients = [
  { 
    id: 1, name: "Sophie Martin",
    intervention: "Rhinoplastie",
    date: getBelgianDate(-8), jourPostOp: 8, status: "normal", 
    chirurgien: "Dr. Renaud", assignedTo: "Kevin M.",
    email: "sophie.martin@gmail.com",
    phone: "+32 475 12 34 56",
    whatsapp: "+32475123456",
    notes: "Évolution favorable, œdème en régression", 
    photos: [
      { jour: 1, label: "J+1 (Normal)" }, { jour: 3, label: "J+3 (Normal)" }, { jour: 7, label: "J+7 (Normal)" }
    ], 
    messages: [
      { from: 'patient', text: 'Bonjour, mon œdème a bien dégonflé.', timestamp: new Date(Date.now() - 3600000).toISOString() }
    ],
    checklist: [
      { id: 'c1', label: "Retrait pansement", done: true, jourPostOpRef: 1, jour: "J+1", patientCanCheck: false },
      { id: 'c2', label: "Contrôle œdème", done: true, jourPostOpRef: 3, jour: "J+3", patientCanCheck: false },
      { id: 'c3', label: "Retrait attelle", done: true, jourPostOpRef: 7, jour: "J+7", patientCanCheck: false },
      { id: 'c4', label: "Contrôle cicatrisation", done: false, jourPostOpRef: 14, jour: "J+14", patientCanCheck: false },
      { id: 'c6', label: "Prise de température (matin)", done: true, jourPostOpRef: 0, jour: "Quotidien", patientCanCheck: true },
    ], 
    token: "token_sophie_123"
  },
  
  { 
    id: 2, name: "Claire Dubois",
    intervention: "Augmentation mammaire",
    date: getBelgianDate(-5), jourPostOp: 5, status: "attention", 
    chirurgien: "Dr. Renaud", assignedTo: "Kevin M.",
    email: "claire.dubois@outlook.be",
    phone: "+32 489 98 76 54",
    whatsapp: "+32489987654",
    notes: "Léger hématome sein gauche à surveiller", 
    photos: [
      { jour: 1, label: "J+1" }, { jour: 3, label: "J+3" }
    ], 
    messages: [],
    checklist: [
      { id: 'c8', label: "Contrôle pansement", done: true, jourPostOpRef: 1, jour: "J+1", patientCanCheck: false },
      { id: 'c10', label: "Retrait drains", done: true, jourPostOpRef: 3, jour: "J+3", patientCanCheck: false },
      { id: 'c11', label: "Contrôle hématome", done: false, jourPostOpRef: 5, jour: "J+5", patientCanCheck: false },
      { id: 'c12', label: "Port du soutien-gorge médical", done: false, jourPostOpRef: null, jour: "Quotidien", patientCanCheck: true },
    ], 
    token: "token_claire_456"
  },

  { 
    id: 3, name: "Isabelle Roux",
    intervention: "Abdominoplastie",
    date: getBelgianDate(-12), jourPostOp: 12, status: "complication", 
    chirurgien: "Dr. Renaud", assignedTo: "Sarah L.",
    email: "isabelle.roux@gmail.com",
    phone: "+33 6 12 34 56 78",
    whatsapp: "+33612345678",
    notes: "Désunion partielle de la cicatrice — soins locaux renforcés", 
    photos: [
      { jour: 1, label: "J+1" }, { jour: 5, label: "J+5" }, { jour: 10, label: "J+10" }
    ], 
    messages: [
      { from: 'patient', text: 'Je suis très inquiète concernant la cicatrice, elle suinte un peu.', timestamp: new Date(Date.now() - 7200000).toISOString() },
      { from: 'nurse', text: 'Pas de panique, je vous appelle dans 5 minutes.', timestamp: new Date(Date.now() - 3600000).toISOString() }
    ],
    checklist: [
      { id: 'c16', label: "Contrôle cicatrice", done: true, jourPostOpRef: 7, jour: "J+7", patientCanCheck: false },
      { id: 'c17', label: "Soins désunion", done: false, jourPostOpRef: 10, jour: "J+10", patientCanCheck: false },
      { id: 'c18', label: "Contrôle cicatrisation (URGENT)", done: false, jourPostOpRef: 8, jour: "J+8", patientCanCheck: false },
      { id: 'c19', label: "Changement pansement à domicile", done: false, jourPostOpRef: null, jour: "Quotidien", patientCanCheck: true },
    ], 
    token: "token_isabelle_789"
  },

  // ----- NOUVEAUX CAS CLINIQUES -----

  {
    id: 4, name: "Marc Lejeune",
    intervention: "Blépharoplastie (paupières), Lifting cervico-facial",
    date: getBelgianDate(-3), jourPostOp: 3, status: "normal",
    chirurgien: "Dr. Van den Berg", assignedTo: "Kevin M.",
    email: "marc.lejeune@proximus.be",
    phone: "+32 478 55 44 33",
    whatsapp: "+32478554433",
    notes: "Patient de 62 ans. Double intervention visage programmée. Résultat esthétique très prometteur.",
    photos: [
      { jour: 1, label: "J+1 Paupières" }, { jour: 1, label: "J+1 Visage" }
    ],
    messages: [
      { from: 'patient', text: 'Les ecchymoses autour des yeux sont normales ?', timestamp: new Date(Date.now() - 1800000).toISOString() },
      { from: 'nurse', text: 'Oui tout à fait normal à J+3, elles vont disparaître progressivement sur 10 jours.', timestamp: new Date(Date.now() - 900000).toISOString() },
    ],
    checklist: [
      { id: 'c20', label: "Retrait pansement compressif visage", done: true, jourPostOpRef: 1, jour: "J+1", patientCanCheck: false },
      { id: 'c21', label: "Retrait pansement paupières", done: true, jourPostOpRef: 2, jour: "J+2", patientCanCheck: false },
      { id: 'c22', label: "Contrôle ecchymoses", done: false, jourPostOpRef: 5, jour: "J+5", patientCanCheck: false },
      { id: 'c23', label: "Retrait fils paupières", done: false, jourPostOpRef: 7, jour: "J+7", patientCanCheck: false },
      { id: 'c24', label: "Retrait agrafes visage", done: false, jourPostOpRef: 10, jour: "J+10", patientCanCheck: false },
      { id: 'c25', label: "Application arnica (matin et soir)", done: false, jourPostOpRef: null, jour: "Quotidien", patientCanCheck: true },
    ],
    token: "token_marc_004"
  },

  {
    id: 5, name: "Fatima El Amrani",
    intervention: "Liposuccion, Lipofilling fessier",
    date: getBelgianDate(-14), jourPostOp: 14, status: "normal",
    chirurgien: "Dr. Claessens", assignedTo: "Kevin M.",
    email: "fatima.elamrani@hotmail.be",
    phone: "+32 496 77 88 99",
    whatsapp: "+32496778899",
    notes: "Double aspiration flancs + réinjection fessière. Résultat conforme aux attentes de la patiente. Vêtement compressif bien porté.",
    photos: [
      { jour: 1, label: "J+1" }, { jour: 7, label: "J+7" }, { jour: 14, label: "J+14" }
    ],
    messages: [],
    checklist: [
      { id: 'c30', label: "Contrôle zones aspirées", done: true, jourPostOpRef: 3, jour: "J+3", patientCanCheck: false },
      { id: 'c31', label: "Retrait pansement lipofilling", done: true, jourPostOpRef: 5, jour: "J+5", patientCanCheck: false },
      { id: 'c32', label: "Contrôle ecchymoses", done: true, jourPostOpRef: 7, jour: "J+7", patientCanCheck: false },
      { id: 'c33', label: "Contrôle final de volume", done: false, jourPostOpRef: 30, jour: "J+30", patientCanCheck: false },
      { id: 'c34', label: "Port vêtement compressif 24h/24", done: true, jourPostOpRef: null, jour: "6 semaines", patientCanCheck: true },
    ],
    token: "token_fatima_005"
  },

  {
    id: 6, name: "Thomas Vandenberghe",
    intervention: "Gynécomastie",
    date: getBelgianDate(-10), jourPostOp: 10, status: "attention",
    chirurgien: "Dr. Lambert", assignedTo: "Sarah L.",
    email: "t.vandenberghe@gmail.com",
    phone: "+32 471 22 33 44",
    whatsapp: "+32471223344",
    notes: "Sérome léger sur le côté gauche. Ponction évacuatrice réalisée à J+7. Surveillance renforcée.",
    photos: [
      { jour: 1, label: "J+1" }, { jour: 7, label: "J+7 Sérome" }
    ],
    messages: [
      { from: 'patient', text: 'Le côté gauche est encore un peu gonflé ce matin.', timestamp: new Date(Date.now() - 14400000).toISOString() },
    ],
    checklist: [
      { id: 'c40', label: "Retrait pansement compressif", done: true, jourPostOpRef: 2, jour: "J+2", patientCanCheck: false },
      { id: 'c41', label: "Contrôle hématome", done: true, jourPostOpRef: 5, jour: "J+5", patientCanCheck: false },
      { id: 'c42', label: "Ponction sérome", done: true, jourPostOpRef: 7, jour: "J+7", patientCanCheck: false },
      { id: 'c43', label: "Contrôle post-ponction", done: false, jourPostOpRef: 10, jour: "J+10", patientCanCheck: false },
      { id: 'c44', label: "Retrait fils", done: false, jourPostOpRef: 14, jour: "J+14", patientCanCheck: false },
      { id: 'c45', label: "Port gilet compressif jour et nuit", done: false, jourPostOpRef: null, jour: "4 semaines", patientCanCheck: true },
    ],
    token: "token_thomas_006"
  },

  {
    id: 7, name: "Nathalie Peeters",
    intervention: "Mastopexie (lifting seins), Liposuccion abdominale",
    date: getBelgianDate(-20), jourPostOp: 20, status: "complication",
    chirurgien: "Dr. Dupuis", assignedTo: "Kevin M.",
    email: "nathalie.peeters@telenet.be",
    phone: "+32 485 11 22 33",
    whatsapp: "+32485112233",
    notes: "Infection locale sein droit détectée à J+15. Antibiothérapie en cours (Amoxicilline 1g x3/jour). Évolution à contrôler strictement.",
    photos: [
      { jour: 1, label: "J+1" }, { jour: 7, label: "J+7" }, { jour: 15, label: "J+15 Infection" }, { jour: 18, label: "J+18 Sous antibio." }
    ],
    messages: [
      { from: 'patient', text: 'La rougeur a diminué depuis hier, je continue bien les antibiotiques.', timestamp: new Date(Date.now() - 86400000).toISOString() },
      { from: 'nurse', text: 'Très bien. Envoyez-nous une photo ce soir pour le contrôle du Dr. Dupuis.', timestamp: new Date(Date.now() - 82800000).toISOString() },
      { from: 'patient', text: 'Photo envoyée. La zone est beaucoup moins chaude au toucher.', timestamp: new Date(Date.now() - 43200000).toISOString() },
    ],
    checklist: [
      { id: 'c50', label: "Retrait drains", done: true, jourPostOpRef: 3, jour: "J+3", patientCanCheck: false },
      { id: 'c51', label: "Contrôle cicatrice mammaire", done: true, jourPostOpRef: 7, jour: "J+7", patientCanCheck: false },
      { id: 'c52', label: "Contrôle zone liposuccion", done: true, jourPostOpRef: 7, jour: "J+7", patientCanCheck: false },
      { id: 'c53', label: "Détection infection — début antibio.", done: true, jourPostOpRef: 15, jour: "J+15", patientCanCheck: false },
      { id: 'c54', label: "Contrôle post-antibio (CRITIQUE)", done: false, jourPostOpRef: 21, jour: "J+21", patientCanCheck: false },
      { id: 'c55', label: "Prise température + photo cicatrice", done: false, jourPostOpRef: null, jour: "Quotidien", patientCanCheck: true },
    ],
    token: "token_nathalie_007"
  },

  {
    id: 8, name: "Jean-Pierre Dumont",
    intervention: "Otoplastie (oreilles)",
    date: getBelgianDate(-1), jourPostOp: 1, status: "normal",
    chirurgien: "Dr. Van den Berg", assignedTo: "Sarah L.",
    email: "jpdumont@skynet.be",
    phone: "+32 477 66 55 44",
    whatsapp: "+32477665544",
    notes: "Intervention bilatérale. Patient mineur (16 ans), père présent comme accompagnant. Tout s'est bien passé.",
    photos: [
      { jour: 1, label: "J+1 Bandage" }
    ],
    messages: [],
    checklist: [
      { id: 'c60', label: "Vérification bandeau compressif", done: true, jourPostOpRef: 1, jour: "J+1", patientCanCheck: false },
      { id: 'c61', label: "Contrôle douleur", done: false, jourPostOpRef: 2, jour: "J+2", patientCanCheck: false },
      { id: 'c62', label: "Retrait bandeau jour (port nuit)", done: false, jourPostOpRef: 7, jour: "J+7", patientCanCheck: false },
      { id: 'c63', label: "Retrait fils", done: false, jourPostOpRef: 10, jour: "J+10", patientCanCheck: false },
      { id: 'c64', label: "Prise antalgique si douleur", done: false, jourPostOpRef: null, jour: "Si besoin", patientCanCheck: true },
    ],
    token: "token_jeanpierre_008"
  },
];

export const statusConfig = {
  normal: { label: "Normal", color: "#10b981", bg: "#ecfdf5", icon: "✓" },
  attention: { label: "Attention", color: "#f59e0b", bg: "#fffbeb", icon: "⚠" },
  complication: { label: "Complication", color: "#ef4444", bg: "#fef2f2", icon: "!" },
};
