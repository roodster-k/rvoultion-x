/**
 * PainChart — Graphique SVG de l'évolution de la douleur.
 * Reçoit un tableau de { score: number, jour: number } trié par jour croissant.
 */
export default function PainChart({ painScores, height = 160 }) {
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

  // Zones de couleur (grid)
  const gridLines = [
    { score: 10, label: '10', color: '#fecaca' },
    { score: 7,  label: '7',  color: '#fed7aa' },
    { score: 4,  label: '4',  color: '#d1fae5' },
    { score: 0,  label: '0',  color: 'transparent' },
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

        {/* Lignes de grille */}
        {gridLines.map(({ score, label }) => score > 0 && (
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

        {/* Zone remplie */}
        <path d={areaPath} fill="url(#painAreaGrad)" />

        {/* Ligne principale */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-primary, #0f5f54)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points + labels de score */}
        {sorted.map((p, i) => {
          const x = toX(p.jour);
          const y = toY(p.score);
          const isHigh = p.score >= 7;
          const color = isHigh ? '#ef4444' : p.score >= 4 ? '#f59e0b' : '#10b981';
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="5" fill={color} stroke="white" strokeWidth="2" />
              <text x={x} y={y - 9} fontSize="9" fill={color} textAnchor="middle" fontWeight="700">
                {p.score}
              </text>
            </g>
          );
        })}

        {/* Labels axe X (jour post-op) */}
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

        {/* Ligne d'axe X */}
        <line
          x1={PAD.left} y1={H - PAD.bottom}
          x2={W - PAD.right} y2={H - PAD.bottom}
          stroke="#e2e8f0" strokeWidth="1"
        />
      </svg>

      {/* Légende */}
      <div className="flex gap-4 mt-3 flex-wrap">
        {[
          { color: '#10b981', label: '0–3 : Douleur légère' },
          { color: '#f59e0b', label: '4–6 : Modérée' },
          { color: '#ef4444', label: '7–10 : Sévère' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-[11px] text-text-muted font-semibold">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
