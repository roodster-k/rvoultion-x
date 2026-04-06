import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, CheckSquare, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import { usePatientContext } from '../context/PatientContext';
import { useAlertContext } from '../context/AlertContext';
import { statusConfig } from '../data/constants';

export default function AnalyticsDashboard() {
  const { patients } = usePatientContext();
  const { alerts } = useAlertContext();

  const stats = useMemo(() => {
    if (!patients.length) return null;

    // Status distribution
    const statusCounts = { normal: 0, attention: 0, complication: 0 };
    patients.forEach(p => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1; });

    // Task completion
    let totalTasks = 0, doneTasks = 0;
    patients.forEach(p => {
      p.checklist?.forEach(t => { totalTasks++; if (t.done) doneTasks++; });
    });
    const completionRate = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

    // Pain scores — latest per patient
    const patientsWithPain = patients.filter(p => p.painScores?.length > 0);
    const avgPain = patientsWithPain.length
      ? Math.round((patientsWithPain.reduce((sum, p) => {
          const last = p.painScores[p.painScores.length - 1];
          return sum + last.score;
        }, 0) / patientsWithPain.length) * 10) / 10
      : null;

    // Pain trend: average score by jour across all patients
    const painByDay = {};
    patients.forEach(p => {
      p.painScores?.forEach(ps => {
        if (!painByDay[ps.jour]) painByDay[ps.jour] = [];
        painByDay[ps.jour].push(ps.score);
      });
    });
    const painTrend = Object.entries(painByDay)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([jour, scores]) => ({
        jour: Number(jour),
        avg: Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10,
        count: scores.length,
      }));

    // Interventions breakdown
    const byIntervention = {};
    patients.forEach(p => {
      const key = p.intervention || 'Autre';
      if (!byIntervention[key]) byIntervention[key] = { count: 0, painSum: 0, painCount: 0 };
      byIntervention[key].count++;
      if (p.painScores?.length) {
        const last = p.painScores[p.painScores.length - 1];
        byIntervention[key].painSum += last.score;
        byIntervention[key].painCount++;
      }
    });
    const interventions = Object.entries(byIntervention)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([name, d]) => ({
        name,
        count: d.count,
        avgPain: d.painCount ? Math.round((d.painSum / d.painCount) * 10) / 10 : null,
      }));

    // Patients needing attention
    const needsAttention = patients
      .filter(p => p.status !== 'normal')
      .sort((a, b) => {
        const order = { complication: 0, attention: 1 };
        return (order[a.status] ?? 9) - (order[b.status] ?? 9);
      })
      .slice(0, 5);

    return {
      statusCounts,
      completionRate,
      avgPain,
      painTrend,
      interventions,
      needsAttention,
      total: patients.length,
      totalTasks,
      doneTasks,
    };
  }, [patients, alerts]);

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted font-medium">
        Aucun patient à analyser.
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-6">
        <h1 className="font-serif text-3xl mb-2 font-bold text-text-dark">Analytique Clinique</h1>
        <p className="text-text-muted font-medium text-sm">Vue d'ensemble de l'activité post-opératoire de votre clinique.</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={<Users size={20} />}
          label="Patients suivis"
          value={stats.total}
          color="primary"
        />
        <KpiCard
          icon={<CheckSquare size={20} />}
          label="Compliance tâches"
          value={`${stats.completionRate}%`}
          color={stats.completionRate >= 70 ? 'green' : 'amber'}
          sub={`${stats.doneTasks}/${stats.totalTasks} tâches`}
        />
        <KpiCard
          icon={<Activity size={20} />}
          label="Douleur moy. (dernière)"
          value={stats.avgPain !== null ? `${stats.avgPain}/10` : '—'}
          color={stats.avgPain >= 7 ? 'red' : stats.avgPain >= 4 ? 'amber' : 'green'}
        />
        <KpiCard
          icon={<AlertTriangle size={20} />}
          label="Alertes actives"
          value={alerts.length}
          color={alerts.length > 0 ? 'red' : 'green'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Status distribution */}
        <div className="card p-6 shadow-sm">
          <h2 className="font-bold text-[15px] text-text-dark mb-4">Répartition par statut</h2>
          <div className="flex flex-col gap-3">
            {Object.entries(statusConfig).map(([key, cfg]) => {
              const count = stats.statusCounts[key] || 0;
              const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-[13px] font-semibold mb-1">
                    <span style={{ color: cfg.color }}>{cfg.icon} {cfg.label}</span>
                    <span className="text-text-muted">{count} patient{count !== 1 ? 's' : ''} · {pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: cfg.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pain trend chart */}
        <div className="card p-6 shadow-sm">
          <h2 className="font-bold text-[15px] text-text-dark mb-1 flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" /> Tendance douleur moyenne
          </h2>
          <p className="text-[12px] text-text-muted mb-4">Score moyen par jour post-op (tous patients)</p>
          {stats.painTrend.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-text-muted text-sm">
              Aucune donnée de douleur enregistrée.
            </div>
          ) : (
            <ClinicPainChart trend={stats.painTrend} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Interventions breakdown */}
        <div className="card p-6 shadow-sm">
          <h2 className="font-bold text-[15px] text-text-dark mb-4">Par type d'intervention</h2>
          {stats.interventions.length === 0 ? (
            <p className="text-text-muted text-sm">Aucune donnée.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {stats.interventions.map(({ name, count, avgPain }) => (
                <div key={name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-border">
                  <div>
                    <div className="text-[13px] font-bold text-text-dark">{name}</div>
                    <div className="text-[11px] text-text-muted font-semibold">{count} patient{count !== 1 ? 's' : ''}</div>
                  </div>
                  {avgPain !== null && (
                    <div className="text-right">
                      <div className={`text-[18px] font-extrabold ${avgPain >= 7 ? 'text-red-500' : avgPain >= 4 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {avgPain}
                      </div>
                      <div className="text-[10px] text-text-muted font-semibold">douleur moy.</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Patients needing attention */}
        <div className="card p-6 shadow-sm">
          <h2 className="font-bold text-[15px] text-text-dark mb-4">Patients à surveiller</h2>
          {stats.needsAttention.length === 0 ? (
            <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-200">
              <div className="text-2xl mb-2">✓</div>
              <p className="text-emerald-700 font-bold text-sm">Tous les patients sont stables.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {stats.needsAttention.map(p => {
                const cfg = statusConfig[p.status];
                const lastPain = p.painScores?.length ? p.painScores[p.painScores.length - 1] : null;
                return (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-slate-50">
                    <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-text-dark truncate">{p.name}</div>
                      <div className="text-[11px] text-text-muted font-semibold truncate">
                        {p.intervention} · J+{p.jourPostOp}
                      </div>
                    </div>
                    {lastPain && (
                      <div className={`text-[13px] font-extrabold ${lastPain.score >= 7 ? 'text-red-500' : 'text-amber-500'}`}>
                        {lastPain.score}/10
                      </div>
                    )}
                    <span
                      className="text-[11px] font-bold px-2 py-1 rounded-lg"
                      style={{ color: cfg.color, background: cfg.bg }}
                    >
                      {cfg.icon}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function KpiCard({ icon, label, value, color, sub }) {
  const colors = {
    primary: 'bg-primary-light text-primary border-primary/20',
    green:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    red:     'bg-red-50 text-red-600 border-red-200',
  };
  return (
    <div className={`p-4 rounded-2xl border ${colors[color] || colors.primary}`}>
      <div className="flex items-center gap-2 mb-2 opacity-80">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-3xl font-extrabold">{value}</div>
      {sub && <div className="text-[11px] font-semibold mt-1 opacity-70">{sub}</div>}
    </div>
  );
}

function ClinicPainChart({ trend }) {
  const W = 400, H = 120;
  const PAD = { top: 12, right: 12, bottom: 22, left: 28 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const maxJour = Math.max(...trend.map(t => t.jour), 1);

  const toX = j => PAD.left + (j / maxJour) * cW;
  const toY = s => PAD.top + cH - (s / 10) * cH;

  const linePath = trend.map((t, i) => `${i === 0 ? 'M' : 'L'} ${toX(t.jour)} ${toY(t.avg)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {[4, 7, 10].map(s => (
        <g key={s}>
          <line x1={PAD.left} y1={toY(s)} x2={W - PAD.right} y2={toY(s)}
            stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
          <text x={PAD.left - 4} y={toY(s) + 4} fontSize="8" fill="#94a3b8" textAnchor="end" fontWeight="600">{s}</text>
        </g>
      ))}
      <path d={linePath} fill="none" stroke="var(--color-primary, #0f5f54)"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {trend.map((t, i) => {
        const color = t.avg >= 7 ? '#ef4444' : t.avg >= 4 ? '#f59e0b' : '#10b981';
        return (
          <g key={i}>
            <circle cx={toX(t.jour)} cy={toY(t.avg)} r="4" fill={color} stroke="white" strokeWidth="1.5" />
            <text x={toX(t.jour)} y={H - PAD.bottom + 14} fontSize="8" fill="#94a3b8" textAnchor="middle" fontWeight="600">
              J+{t.jour}
            </text>
          </g>
        );
      })}
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom}
        stroke="#e2e8f0" strokeWidth="1" />
    </svg>
  );
}
