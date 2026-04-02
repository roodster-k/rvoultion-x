// src/data/constants.js
// UI constants — labels, country codes, status config.
// These are static reference data, NOT patient data.

export const countryCodes = [
  { code: '+32', country: 'Belgique', flag: '🇧🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+31', country: 'Pays-Bas', flag: '🇳🇱' },
  { code: '+49', country: 'Allemagne', flag: '🇩🇪' },
  { code: '+352', country: 'Luxembourg', flag: '🇱🇺' },
  { code: '+44', country: 'Royaume-Uni', flag: '🇬🇧' },
  { code: '+41', country: 'Suisse', flag: '🇨🇭' },
];

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

export const statusConfig = {
  normal: { label: "Normal", color: "#10b981", bg: "#ecfdf5", icon: "✓" },
  attention: { label: "Attention", color: "#f59e0b", bg: "#fffbeb", icon: "⚠" },
  complication: { label: "Complication", color: "#ef4444", bg: "#fef2f2", icon: "!" },
};
