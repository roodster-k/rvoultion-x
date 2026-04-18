import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, MessageCircle, ArrowUpDown, Phone, CheckSquare } from 'lucide-react';
import StatusBadge from './StatusBadge';

const SORT_OPTIONS = [
  { value: 'status',    label: 'Statut' },
  { value: 'jourPostOp', label: 'Jour post-op' },
  { value: 'date',      label: 'Date opération' },
  { value: 'name',      label: 'Nom' },
];

const STATUS_ORDER = { complication: 0, attention: 1, normal: 2 };

export default function PatientList({ patients, searchTerm, onAddPatient, onSelectPatient, viewMode }) {
  const [sortBy, setSortBy] = useState('status');
  const [surgeonFilter, setSurgeonFilter] = useState('');

  // Build surgeon list from current patients
  const surgeons = useMemo(() => {
    const names = [...new Set(patients.map(p => p.chirurgien).filter(Boolean))].sort();
    return names;
  }, [patients]);

  const sorted = useMemo(() => {
    let list = surgeonFilter
      ? patients.filter(p => p.chirurgien === surgeonFilter)
      : [...patients];

    list.sort((a, b) => {
      switch (sortBy) {
        case 'status':     return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        case 'jourPostOp': return b.jourPostOp - a.jourPostOp;
        case 'date':       return new Date(b.date) - new Date(a.date);
        case 'name':       return a.name.localeCompare(b.name, 'fr');
        default:           return 0;
      }
    });
    return list;
  }, [patients, sortBy, surgeonFilter]);

  return (
    <div className="card overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 px-5 border-b border-border flex flex-wrap justify-between items-center gap-3 bg-white">
        <h2 className="text-[15px] font-bold text-text-dark">
          Liste de suivi
          {searchTerm && <span className="text-text-muted font-medium ml-1">— "{searchTerm}"</span>}
          <span className="ml-2 text-[12px] font-semibold text-text-muted bg-slate-100 px-2 py-0.5 rounded-lg">{sorted.length}</span>
        </h2>

        <div className="flex gap-2 items-center flex-wrap">
          {/* Surgeon filter */}
          {surgeons.length > 1 && (
            <select
              value={surgeonFilter}
              onChange={e => setSurgeonFilter(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-border text-[12px] font-semibold text-text-dark bg-white outline-none focus:border-primary cursor-pointer"
            >
              <option value="">Tous les chirurgiens</option>
              {surgeons.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          {/* Sort */}
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl px-2.5 py-1.5">
            <ArrowUpDown size={13} className="text-text-muted" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-transparent border-none text-[12px] font-semibold text-text-muted outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <button onClick={onAddPatient} className="bg-primary hover:bg-primary-dark text-white border-none py-1.5 px-3.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer text-[12px] transition-colors shadow-button">
            <Plus size={14} /> Nouveau Patient
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="p-10 text-center text-text-muted bg-surface-main/30">Aucun patient trouvé.</div>
      ) : (
        sorted.map((p) => (
          <motion.div key={p.id} whileHover={{ backgroundColor: '#f8fffe' }} onClick={() => onSelectPatient(p)}
            className="flex items-center gap-4 p-4 px-5 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 bg-white"
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-[15px] font-bold shrink-0 shadow-sm
              ${p.status === 'normal' ? 'bg-status-normal-bg text-status-normal' :
                p.status === 'attention' ? 'bg-status-attention-bg text-status-attention' :
                'bg-status-complication-bg text-status-complication'}`}
            >
              {p.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[15px] text-text-dark flex items-center gap-2 flex-wrap mb-0.5">
                {p.name}
                {viewMode === 'equipe' && (
                  <span className="text-[11px] bg-slate-200 text-slate-700 py-0.5 px-2 rounded-md font-semibold tracking-wide">{p.assignedTo}</span>
                )}
              </div>
              <div className="text-[13px] text-text-muted flex items-center gap-2 flex-wrap">
                <span>{p.intervention} · <span className="font-semibold">J+{p.jourPostOp}</span> · {p.chirurgien}</span>
                {(p.phone || p.whatsapp) && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                    <Phone size={10} /> {p.phone || p.whatsapp}
                  </span>
                )}
                {p.checklist?.length > 0 && (
                  <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md
                    ${p.checklist.filter(c => c.done).length === p.checklist.length
                      ? 'text-emerald-700 bg-emerald-50'
                      : 'text-primary bg-primary-light'}`}>
                    <CheckSquare size={10} />
                    {p.checklist.filter(c => c.done).length}/{p.checklist.length}
                  </span>
                )}
              </div>
            </div>
            {p.messages.some(m => m.from === 'patient' && !m.isRead) && (
              <MessageCircle size={15} className="text-primary shrink-0" />
            )}
            <StatusBadge status={p.status} />
            <span className="text-slate-300 text-xl font-light ml-1">›</span>
          </motion.div>
        ))
      )}
    </div>
  );
}
