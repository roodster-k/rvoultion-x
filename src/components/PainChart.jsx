/**
 * PainChart — Graphique SVG de l'évolution de la douleur.
 * Props:
 *   painScores  { score: number, jour: number }[]
 *   height      number (default 160)
 *   intervention  string (optional) — enables expected-curve overlay + anomaly markers
 */
import { getExpectedCurve, detectAnomalies } from '../data/expectedCurves';

export default function PainChart({ painScores, height = 160, intervention }) {
  if (!painScores || painScores.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-text-muted text-sm font-medium bg-slate-50 rounded-2xl border border-border">
        Aucune donnée de douleur enregistrée pour ce patient.
      </div>
    );
  }

  const sorted = [...painScores].sort((a, b) => a.jour - b.jour);

  const W = 440;
  const H = height;
  const PAD = { top: 16, right: 20, bottom: 28, left: 30 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const maxJour = Math.max(...sorted.map(p => p.jour), 1);

  const toX = j => PAD.left + (j / maxJour) * cW;
  const toY = s => PAD.top + cH - (s / 10) * cH;

  const linePath = sorted
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.jour)} ${toY(p.score)}`)
    .join(' ');

  const areaPath =
    linePath +
    ` L ${toX(sorted[sorted.length - 1].jour)} ${H - PAD.bottom}` +
    ` L ${toX(sorted[0].jour)} ${H - PAD.bottom} Z`;

  // Expected curve (only if intervention provided)
  const expectedPoints = intervention
    ? getExpectedCurve(intervention, maxJour)
    : null;

  const expectedPath = expectedPoints
    ? expectedPoints
        .filter(p => p.jour <= maxJour)
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.jour)} ${toY(p.expected)}`)
        .join(' ')
    : null;

  const anomalies = intervention ? detectAnomalies(intervention, sorted) : [];

  const gridLines = [
    { score: 10, label: '10' },
    { score: 7,  label: '7'  },
    { score: 4,  label: '4'  },
  ];

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height, minWidth: 260 }}
        aria-label="Évolution douleur"
      >
        <defs>
          <linearGradient id="painAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary, #0f5f54)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-primary, #0f5f54)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLines.map(({ score, label }) => (
          <g key={score}>
            <line
              x1={PAD.left} y1={toY(score)}
              x2={W - PAD.right} y2={toY(score)}
              stroke={score >= 7 ? '#fecaca' : score >= 4 ? '#fde68a' : '#e2e8f0'}
              strokeWidth="1"
              strokeDasharray="4 3"
            />
            <text x={PAD.left - 5} y={toY(score) + 4} fontSize="9" fill="#94a3b8" textAnchor="end" fontWeight="600">
              {label}
            </text>
          </g>
        ))}

        {/* Expected curve (dashed grey) */}
        {expectedPath && (
          <path
            d={expectedPath}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="5 3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
          />
        )}

        {/* Area fill */}
        <path d={areaPath} fill="url(#painAreaGrad)" />

        {/* Main line */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-primary, #0f5f54)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Anomaly halo (red glow behind dot) */}
        {anomalies.map((a, i) => (
          <circle
            key={`halo-${i}`}
            cx={toX(a.jour)} cy={toY(a.actual)}
            r="10" fill="#ef4444" opacity="0.15"
          />
        ))}

        {/* Dots + score labels */}
        {sorted.map((p, i) => {
          const x = toX(p.jour);
          const y = toY(p.score);
          const isAnomaly = anomalies.some(a => a.jour === p.jour);
          const color = isAnomaly ? '#ef4444' : p.score >= 7 ? '#ef4444' : p.score >= 4 ? '#f59e0b' : '#10b981';
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="5" fill={color} stroke="white" strokeWidth="2" />
              <text x={x} y={y - 9} fontSize="9" fill={color} textAnchor="middle" fontWeight="700">
                {p.score}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {sorted.map((p, i) => (
          <text
            key={i}
            x={toX(p.jour)}
            y={H - PAD.bottom + 14}
            fontSize="9"
            fill="#94a3b8"
            textAnchor="middle"
            fontWeight="600"
          >
            J+{p.jour}
          </text>
        ))}

        {/* X-axis line */}
        <line
          x1={PAD.left} y1={H - PAD.bottom}
          x2={W - PAD.right} y2={H - PAD.bottom}
          stroke="#e2e8f0" strokeWidth="1"
        />
      </svg>

      {/* Legend */}
      <div className="flex gap-4 mt-3 flex-wrap">
        {[
          { color: '#10b981', label: '0–3 : Légère' },
          { color: '#f59e0b', label: '4–6 : Modérée' },
          { color: '#ef4444', label: '7–10 : Sévère' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-[11px] text-text-muted font-semibold">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
            {label}
          </div>
        ))}
        {expectedPath && (
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted font-semibold">
            <svg width="18" height="8" viewBox="0 0 18 8">
              <line x1="0" y1="4" x2="18" y2="4" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 2" />
            </svg>
            Courbe attendue
          </div>
        )}
        {anomalies.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-red-500 font-bold">
            <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-red-500 opacity-50" />
            {anomalies.length} anomalie{anomalies.length > 1 ? 's' : ''} détectée{anomalies.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Anomaly details */}
      {anomalies.length > 0 && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-[12px] font-bold text-red-700 mb-1.5">Écart par rapport à la récupération attendue :</p>
          <div className="flex flex-col gap-1">
            {anomalies.map((a, i) => (
              <p key={i} className="text-[11px] text-red-600 font-semibold">
                J+{a.jour} : score {a.actual}/10 (attendu ≈{a.expected}/10, écart +{Math.round(a.delta * 10) / 10})
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
