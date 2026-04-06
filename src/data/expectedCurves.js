/**
 * Expected post-operative pain curves by intervention type.
 * Each entry maps post-op day (jour) → expected average pain score (0–10).
 * Based on general surgical recovery literature for aesthetic procedures.
 */

const GENERIC_CURVE = {
  0: 7, 1: 7, 2: 6, 3: 5.5, 4: 5, 5: 4.5, 6: 4, 7: 3.5,
  10: 3, 14: 2, 21: 1.5, 30: 1,
};

const CURVES = {
  rhinoplastie: {
    0: 5, 1: 5, 2: 4.5, 3: 4, 4: 3.5, 5: 3, 7: 2.5, 10: 2, 14: 1.5, 21: 1, 30: 0.5,
  },
  septoplastie: {
    0: 5, 1: 5, 2: 4, 3: 3.5, 4: 3, 5: 2.5, 7: 2, 10: 1.5, 14: 1, 21: 0.5,
  },
  rhinoseptoplastie: {
    0: 6, 1: 6, 2: 5, 3: 4.5, 4: 4, 5: 3.5, 7: 3, 10: 2.5, 14: 2, 21: 1.5, 30: 1,
  },
  'augmentation mammaire': {
    0: 7, 1: 7, 2: 6.5, 3: 6, 4: 5, 5: 4.5, 7: 4, 10: 3, 14: 2, 21: 1.5, 30: 1,
  },
  'réduction mammaire': {
    0: 7, 1: 7, 2: 6.5, 3: 6, 4: 5.5, 5: 5, 7: 4, 10: 3, 14: 2.5, 21: 2, 30: 1.5,
  },
  'mastopexie': {
    0: 6, 1: 6, 2: 5.5, 3: 5, 4: 4.5, 5: 4, 7: 3.5, 10: 3, 14: 2, 21: 1.5, 30: 1,
  },
  abdominoplastie: {
    0: 8, 1: 8, 2: 7.5, 3: 7, 4: 6.5, 5: 6, 7: 5, 10: 4, 14: 3, 21: 2, 30: 1.5,
  },
  'mini-abdominoplastie': {
    0: 7, 1: 7, 2: 6.5, 3: 6, 4: 5, 5: 4.5, 7: 4, 10: 3, 14: 2, 21: 1.5, 30: 1,
  },
  liposuccion: {
    0: 6, 1: 6, 2: 5.5, 3: 5, 4: 4.5, 5: 4, 7: 3.5, 10: 3, 14: 2, 21: 1, 30: 0.5,
  },
  'lipostructure': {
    0: 5, 1: 5, 2: 4.5, 3: 4, 4: 3.5, 5: 3, 7: 2.5, 10: 2, 14: 1.5, 21: 1,
  },
  'blépharoplastie': {
    0: 3, 1: 3, 2: 2.5, 3: 2, 4: 1.5, 5: 1.5, 7: 1, 10: 0.5, 14: 0.5,
  },
  'lifting': {
    0: 5, 1: 5, 2: 4.5, 3: 4, 4: 3.5, 5: 3, 7: 2.5, 10: 2, 14: 1.5, 21: 1, 30: 0.5,
  },
  'mini-lift': {
    0: 4, 1: 4, 2: 3.5, 3: 3, 4: 2.5, 5: 2, 7: 1.5, 10: 1, 14: 0.5,
  },
  otoplastie: {
    0: 4, 1: 4, 2: 3.5, 3: 3, 4: 2.5, 5: 2, 7: 1.5, 10: 1, 14: 0.5,
  },
  'génioplastie': {
    0: 6, 1: 6, 2: 5.5, 3: 5, 4: 4, 5: 3.5, 7: 3, 10: 2, 14: 1.5, 21: 1,
  },
  brachioplastie: {
    0: 6, 1: 6, 2: 5.5, 3: 5, 4: 4.5, 5: 4, 7: 3.5, 10: 3, 14: 2, 21: 1.5, 30: 1,
  },
  cruroplastie: {
    0: 7, 1: 7, 2: 6.5, 3: 6, 4: 5.5, 5: 5, 7: 4.5, 10: 3.5, 14: 2.5, 21: 2, 30: 1.5,
  },
  bodylifting: {
    0: 8, 1: 8, 2: 7.5, 3: 7, 4: 6.5, 5: 6, 7: 5.5, 10: 5, 14: 4, 21: 3, 30: 2,
  },
  'greffe de cheveux': {
    0: 3, 1: 3, 2: 2.5, 3: 2, 4: 1.5, 5: 1, 7: 0.5, 10: 0.5,
  },
};

/**
 * Returns interpolated expected pain score for a given intervention and post-op day.
 * Falls back to generic curve if intervention not found.
 */
function interpolate(curve, jour) {
  const days = Object.keys(curve).map(Number).sort((a, b) => a - b);
  if (jour <= days[0]) return curve[days[0]];
  if (jour >= days[days.length - 1]) return curve[days[days.length - 1]];

  const lower = days.filter(d => d <= jour).pop();
  const upper = days.filter(d => d >= jour)[0];
  if (lower === upper) return curve[lower];

  const t = (jour - lower) / (upper - lower);
  return Math.round((curve[lower] + t * (curve[upper] - curve[lower])) * 10) / 10;
}

/**
 * Returns an array of { jour, expected } for each actual pain score day,
 * plus the range [0..maxJour] sampled every 2 days for the chart overlay.
 *
 * @param {string} interventionName  - Patient's intervention string (case-insensitive)
 * @param {number} maxJour           - Maximum post-op day to plot
 * @returns {{ jour: number, expected: number }[]}
 */
export function getExpectedCurve(interventionName, maxJour = 30) {
  const key = (interventionName || '').toLowerCase();
  const curve = Object.entries(CURVES).find(([k]) => key.includes(k))?.[1] ?? GENERIC_CURVE;

  const points = [];
  for (let j = 0; j <= maxJour; j += 1) {
    points.push({ jour: j, expected: interpolate(curve, j) });
  }
  return points;
}

/**
 * Detects anomalous pain readings: actual score > expected + 2 on any day.
 * @returns {{ jour: number, actual: number, expected: number, delta: number }[]}
 */
export function detectAnomalies(interventionName, painScores) {
  if (!painScores?.length) return [];

  const key = (interventionName || '').toLowerCase();
  const curve = Object.entries(CURVES).find(([k]) => key.includes(k))?.[1] ?? GENERIC_CURVE;

  return painScores
    .map(ps => {
      const expected = interpolate(curve, ps.jour);
      const delta = ps.score - expected;
      return { jour: ps.jour, actual: ps.score, expected, delta };
    })
    .filter(r => r.delta > 2);
}
