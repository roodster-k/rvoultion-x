import { AlertTriangle } from 'lucide-react';
import { usePatientContext } from '../context/PatientContext';
import { useAlertContext } from '../context/AlertContext';

export default function StatsCards({ stats, onSelectPatient }) {
  const { patients } = usePatientContext();
  const { alerts } = useAlertContext();
  const priorityAlerts = alerts.filter(a => !a.silent || a.type === 'danger');

  return (
    <>
      {/* Top Priority Alerts */}
      {priorityAlerts.length > 0 && (
        <div className="bg-status-complication-bg border border-red-300 rounded-2xl p-5 mb-6 shadow-sm">
          <h3 className="text-red-700 text-[15px] flex items-center gap-2 mb-3 font-semibold">
            <AlertTriangle size={18} /> Alertes Prioritaires
          </h3>
          <div className="flex flex-col gap-2">
            {priorityAlerts.slice(0, 5).map(a => (
              <div key={a.id} className={`flex justify-between items-center bg-white py-2.5 px-4 rounded-xl border-l-4 gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]
                ${a.type === 'danger' ? 'border-l-status-complication' : (a.type === 'warning' ? 'border-l-status-attention' : 'border-l-status-normal')}`}>
                <span className="text-[13px] font-medium flex-1 text-text-dark">{a.message}</span>
                {a.patientId && (
                  <button onClick={() => {
                    const p = patients.find(pat => pat.id === a.patientId);
                    if(p) onSelectPatient(p);
                  }} className="bg-primary hover:bg-primary-dark text-white border-none cursor-pointer text-xs py-1.5 px-3 rounded-lg font-bold whitespace-nowrap transition-colors shadow-sm">Voir</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 mb-8">
        <div className="bg-primary-light rounded-[20px] p-6 shadow-card hover:shadow-card-hover transition-shadow border border-primary/10">
          <div className="text-4xl font-extrabold text-primary">{stats.total}</div>
          <div className="text-sm text-primary font-bold mt-1 tracking-wide">Patients suivis</div>
        </div>
        <div className="bg-status-attention-bg rounded-[20px] p-6 shadow-card hover:shadow-card-hover transition-shadow border border-amber-200">
          <div className="text-4xl font-extrabold text-status-attention">{stats.complication + stats.attention}</div>
          <div className="text-sm text-status-attention font-bold mt-1 tracking-wide">Action requise</div>
        </div>
        <div className="bg-emerald-50 rounded-[20px] p-6 shadow-card hover:shadow-card-hover transition-shadow border border-emerald-200">
          <div className="text-4xl font-extrabold text-status-normal">{stats.complianceRate}%</div>
          <div className="text-sm text-status-normal font-bold mt-1 tracking-wide">Compliance globale</div>
        </div>
        <div className="bg-blue-50 rounded-[20px] p-6 shadow-card hover:shadow-card-hover transition-shadow border border-blue-200">
          <div className="text-4xl font-extrabold text-blue-600">{alerts.length}</div>
          <div className="text-sm text-blue-600 font-bold mt-1 tracking-wide">Notifs non lues</div>
        </div>
      </div>
    </>
  );
}
