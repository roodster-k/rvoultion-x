/**
 * Contenu éducatif post-opératoire par type d'intervention.
 * Affiché dans l'onglet "Infos" du portail patient.
 */

const content = {
  'rhinoplastie': {
    title: 'Votre convalescence — Rhinoplastie',
    sections: [
      {
        heading: '🕐 Semaine 1 : Les premiers jours',
        body: 'Gardez la tête surélevée en permanence (même la nuit). Des ecchymoses et un gonflement autour des yeux sont normaux — ils atteignent leur pic à J+2/J+3 puis régressent. Appliquez des compresses froides en dehors de la zone opérée. Ne soufflez pas dans votre nez.',
      },
      {
        heading: '🚿 Hygiène',
        body: "Nettoyez délicatement les fosses nasales avec du sérum physiologique stérile. Ne mouillez pas l'attelle nasale. Vous pouvez vous laver les cheveux en penchant la tête en arrière à partir de J+3.",
      },
      {
        heading: '✅ Ce qui est normal',
        body: "Congestion nasale importante les premières semaines (respirez par la bouche). Légère sensibilité et engourdissement du bout du nez. L'attelle est retirée généralement à J+7 par votre chirurgien.",
      },
      {
        heading: '⚠️ Signaux d\'alarme',
        body: "Consultez immédiatement si : saignement abondant ne s'arrêtant pas, fièvre > 38,5°C, douleur intense soudaine, ou rougeur croissante autour de la cicatrice.",
      },
      {
        heading: '🚫 À éviter (6 semaines minimum)',
        body: 'Exposition solaire directe sur le nez. Port de lunettes sur le dos du nez. Sports de contact. Se moucher fort. Activités physiques intenses.',
      },
    ],
  },

  'septoplastie': {
    title: 'Votre convalescence — Septoplastie',
    sections: [
      {
        heading: '🕐 Premiers jours',
        body: "Des méches ou attelles internes peuvent être présentes les premières 48h. Une congestion importante et des écoulements séreux sont normaux. Reposez-vous et dormez la tête surélevée.",
      },
      {
        heading: '🚿 Hygiène nasale',
        body: 'Rinçages au sérum physiologique plusieurs fois par jour dès le retrait des méches. Ne mouchez pas fort — soufflez doucement chaque narine séparément si nécessaire.',
      },
      {
        heading: '✅ Reprise d\'activité',
        body: 'Travail sédentaire : J+5 à J+7. Conduite : J+5. Activité sportive légère : 3 semaines. Sport intensif ou natation : 4 à 6 semaines.',
      },
      {
        heading: '⚠️ Signaux d\'alarme',
        body: 'Saignement abondant, fièvre > 38,5°C, douleur ou gonflement croissant.',
      },
    ],
  },

  'augmentation mammaire': {
    title: 'Votre convalescence — Augmentation Mammaire',
    sections: [
      {
        heading: '🕐 Semaine 1',
        body: "Douleur et tension dans la poitrine sont normales — les implants s'installent progressivement. Portez le soutien-gorge de contention jour et nuit. Dormez sur le dos, légèrement surélevé. Évitez tout mouvement des bras au-dessus des épaules.",
      },
      {
        heading: '👙 Port du soutien-gorge',
        body: "Soutien-gorge de contention sans armatures pendant 6 semaines minimum (jour et nuit les 3 premières semaines). Après 6 semaines, soutien-gorge classique. Pas de soutien-gorge à armatures avant 3 mois.",
      },
      {
        heading: '✅ Ce qui est normal',
        body: "Les implants paraissent hauts et rigides les premières semaines — c'est normal. Ils descendent et s'assouplissent progressivement sur 3 à 6 mois. Asymétrie légère temporaire.",
      },
      {
        heading: '⚠️ Signaux d\'alarme',
        body: "Rougeur, chaleur ou gonflement inhabituel d'un sein. Fièvre > 38°C. Douleur intense et soudaine. Écoulement au niveau de la cicatrice. Contactez immédiatement votre chirurgien.",
      },
      {
        heading: '🚫 À éviter',
        body: 'Sport et effort physique : 4 à 6 semaines. Exposition solaire des cicatrices : 1 an (crème SPF 50+). Sauna, hammam : 2 mois. Massages non prescrits.',
      },
    ],
  },

  'réduction mammaire': {
    title: 'Votre convalescence — Réduction Mammaire',
    sections: [
      {
        heading: '🕐 Première semaine',
        body: 'Douleur modérée gérée par antalgiques prescrits. Portez le soutien-gorge de contention en permanence. Drains éventuels retirés à J+1 ou J+2. Premiers pansements refaits à J+2 ou J+3.',
      },
      {
        heading: '🩺 Cicatrices',
        body: "Les cicatrices (en T inversé ou verticales) sont rouges et fermes les premières semaines — c'est normal. Protégez-les du soleil 1 an (vêtements ou SPF 50+). Crème cicatrisante après accord de votre chirurgien.",
      },
      {
        heading: '✅ Reprise d\'activité',
        body: 'Travail de bureau : J+10 à J+14. Conduite : J+10 à J+14. Sport léger : 4 semaines. Sport intensif (course, natation) : 6 à 8 semaines.',
      },
      {
        heading: '⚠️ Signaux d\'alarme',
        body: "Zona cicatriciel (noircissement ou nécrose), fièvre, douleur intense, écoulement purulent.",
      },
    ],
  },

  'abdominoplastie': {
    title: 'Votre convalescence — Abdominoplastie',
    sections: [
      {
        heading: '🕐 Premiers jours',
        body: "Position semi-fléchie (légèrement courbée en avant) pendant 5 à 10 jours pour éviter la tension sur la cicatrice. Des drains sont souvent présents 2 à 4 jours. La gaine abdominale doit être portée en permanence.",
      },
      {
        heading: '🩱 Gaine compressive',
        body: 'Portez la gaine abdominale jour et nuit pendant 6 semaines minimum. Elle réduit le gonflement, améliore le confort et soutient la paroi musculaire.',
      },
      {
        heading: '✅ Ce qui est normal',
        body: "Gonflement important les 3 premières semaines. Engourdissement de la peau abdominale (peut durer plusieurs mois). Cicatrice basse cachée sous la lingerie.",
      },
      {
        heading: '⚠️ Signaux d\'alarme',
        body: "Douleur thoracique ou essoufflement soudain (risque de phlébite/embolie). Rougeur et chaleur sur les mollets. Fièvre > 38°C. Contactez immédiatement votre chirurgien.",
      },
      {
        heading: '🚫 À éviter',
        body: 'Tout effort abdominal : 6 semaines. Sport : 2 mois. Conduite : 2 à 3 semaines. Exposition solaire de la cicatrice : 1 an.',
      },
    ],
  },

  'liposuccion': {
    title: 'Votre convalescence — Liposuccion',
    sections: [
      {
        heading: '🕐 Premiers jours',
        body: "Des ecchymoses importantes et un gonflement sont normaux — ils s'estompent progressivement sur 4 à 6 semaines. Un écoulement séreux rosé peut apparaître les 24 premières heures : c'est normal.",
      },
      {
        heading: '🩱 Vêtement compressif',
        body: 'Portez le vêtement de contention (ceinture, collant) jour et nuit les 3 premières semaines, puis uniquement la journée pendant 3 à 6 semaines supplémentaires.',
      },
      {
        heading: '✅ Reprise d\'activité',
        body: 'Marche légère dès J+2 (favorise la circulation). Travail sédentaire : J+5 à J+7. Sport léger : 4 semaines. Sport intensif : 6 à 8 semaines.',
      },
      {
        heading: '⚠️ Signaux d\'alarme',
        body: "Douleur intense et localisée sur les mollets (phlébite). Fièvre > 38,5°C. Rougeur croissante sur une zone traitée. Gonflement asymétrique important.",
      },
    ],
  },

  'blépharoplastie': {
    title: 'Votre convalescence — Blépharoplastie',
    sections: [
      {
        heading: '🕐 Premiers jours',
        body: "Oedème et ecchymoses importants autour des yeux, maximaux à J+2/J+3. Appliquez des compresses froides (pas directement sur les yeux). Gardez la tête surélevée. Une vision légèrement floue les premiers jours est normale.",
      },
      {
        heading: '👁️ Soins des yeux',
        body: 'Collyres ou pommade ophtalmique prescrits à appliquer selon les instructions. Ne portez pas de lentilles de contact pendant 2 semaines minimum. Protégez vos yeux du vent et du soleil (lunettes de soleil enveloppantes).',
      },
      {
        heading: '✅ Ce qui est normal',
        body: "Larmoiement ou sécheresse oculaire temporaire. Difficulté à fermer complètement les yeux les premiers jours. Les fils sont retirés à J+5 ou J+7.",
      },
      {
        heading: '⚠️ Signaux d\'alarme',
        body: "Douleur oculaire intense et soudaine. Baisse importante de la vision. Rougeur marquée de la conjonctive. Contactez immédiatement votre chirurgien ou un ophtalmologue.",
      },
    ],
  },

  'lifting': {
    title: 'Votre convalescence — Lifting Cervico-facial',
    sections: [
      {
        heading: '🕐 Premiers jours',
        body: "Bandage compressif les 24 à 48 premières heures. Gonflement et ecchymoses importants — ils régressent progressivement sur 2 à 3 semaines. Dormez la tête surélevée sur 2 oreillers.",
      },
      {
        heading: '🚿 Soins',
        body: 'Premiers shampoings autorisés à J+4 ou J+5 (eau tiède, pas de chaleur). Évitez tout frottement. Les fils sont retirés progressivement entre J+7 et J+14.',
      },
      {
        heading: '⚠️ Signaux d\'alarme',
        body: "Hématome (gonflement dur et douloureux d'un côté). Douleur intense. Rougeur ou chaleur localisée. Fièvre.",
      },
      {
        heading: '🚫 À éviter (2 mois minimum)',
        body: 'Exposition solaire directe du visage. Sauna, hammam. Soins esthétiques agressifs (peeling, laser). Sport intensif.',
      },
    ],
  },

  'otoplastie': {
    title: 'Votre convalescence — Otoplastie',
    sections: [
      {
        heading: '🕐 Premiers jours',
        body: "Un bandage est porté en continu pendant 5 à 7 jours. Il protège les oreilles et maintient le résultat. Une sensation de tension et de légère douleur est normale.",
      },
      {
        heading: '🩹 Port du bandeau',
        body: "Après le bandage initial, portez un bandeau de nuit pendant 4 à 6 semaines (pour éviter de replier les oreilles dans le sommeil). Le port diurne n'est plus obligatoire après J+7.",
      },
      {
        heading: '✅ Reprise d\'activité',
        body: "Activité normale légère dès J+7. Sport : 4 à 6 semaines. École ou travail : J+7 à J+10.",
      },
      {
        heading: '⚠️ Signaux d\'alarme',
        body: "Douleur intense, hématome (gonflement douloureux rapide), fièvre, rougeur croissante.",
      },
    ],
  },

  'greffe de cheveux': {
    title: 'Votre convalescence — Greffe FUE',
    sections: [
      {
        heading: '🕐 Premiers jours',
        body: "Ne touchez pas la zone greffée les 5 premiers jours. Dormez la tête surélevée à 45° pour réduire le gonflement frontal. Évitez toute transpiration excessive.",
      },
      {
        heading: '🚿 Premiers shampoings',
        body: "Premier shampoing doux à J+3 ou J+4 selon les instructions (eau tiède, pas de jet direct). Mouvements très doux, sans frotter. Séchage à l'air froid.",
      },
      {
        heading: '✅ Évolution normale',
        body: "Les greffons tombent entre J+10 et J+21 — c'est normal et attendu (chute de caducité). La repousse définitive commence à 3 mois et se complète sur 9 à 12 mois.",
      },
      {
        heading: '🚫 À éviter',
        body: 'Soleil direct (chapeau obligatoire) : 3 mois. Sport intensif et transpiration : 2 semaines. Natation, mer, piscine : 4 semaines. Coiffeur et teinture : 1 mois.',
      },
    ],
  },
};

// Générique pour les interventions non mappées
const defaultContent = {
  title: 'Conseils post-opératoires généraux',
  sections: [
    {
      heading: '🕐 Premiers jours',
      body: 'Reposez-vous et suivez scrupuleusement les instructions de votre chirurgien. Prenez vos médicaments aux heures prescrites.',
    },
    {
      heading: '⚠️ Signaux d\'alarme',
      body: "Contactez immédiatement votre clinique en cas de : fièvre > 38,5°C, saignement important, douleur intense et soudaine, gonflement ou rougeur croissants.",
    },
    {
      heading: '✅ Suivi',
      body: "Respectez les rendez-vous de contrôle. N'hésitez pas à envoyer des photos via l'application ou à contacter l'équipe via la messagerie.",
    },
  ],
};

/**
 * Retourne le contenu éducatif pour une intervention donnée.
 * Fait une correspondance partielle (insensible à la casse).
 */
export function getEducationalContent(interventionString) {
  if (!interventionString) return defaultContent;
  const lower = interventionString.toLowerCase();

  // Correspondance exacte
  if (content[lower]) return content[lower];

  // Correspondance partielle (multi-interventions séparées par virgule)
  const found = Object.entries(content).find(([key]) =>
    lower.includes(key) || key.includes(lower.split(',')[0].trim())
  );

  return found ? found[1] : defaultContent;
}
