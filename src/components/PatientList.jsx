import { motion } from 'framer-motion';
import { Plus, MessageCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { statusConfig } from '../data/constants';

export default function PatientList({ 
  patients, searchTerm, onAddPatient, onSelectPatient, viewMode 
}) {
  return (
    <div className="card overflow-hidden">
      <div className="p-5 px-6 border-b border-border flex justify-between items-center bg-white">
        <h2 className="text-lg font-bold text-text-dark">Liste de suivi {searchTerm && `— "${searchTerm}"`}</h2>
        <button onClick={onAddPatient} className="bg-primary hover:bg-primary-dark text-white border-none py-2 px-4 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer text-[13px] transition-colors shadow-button">
          <Plus size={16} /> Nouveau Patient
        </button>
      </div>
      
      {patients.length === 0 ? (
        <div className="p-10 text-center text-text-muted bg-surface-main/30">Aucun patient trouvé.</div>
      ) : (
        [...patients].sort((a, b) => {
          const order = { complication: 0, attention: 1, normal: 2 };
          return order[a.status] - order[b.status];
        }).map((p) => (
          <motion.div key={p.id} whileHover={{ backgroundColor: '#f8fffe' }} onClick={() => onSelectPatient(p)}
            className="flex items-center gap-4 p-4 px-6 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 bg-white"
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-[15px] font-bold shrink-0 shadow-sm
              ${p.status === 'normal' ? 'bg-status-normal-bg text-status-normal' : 
                p.status === 'attention' ? 'bg-status-attention-bg text-status-attention' : 
                'bg-status-complication-bg text-status-complication'}`}
            >
              {p.name.split(' ').map(n=>n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[15px] text-text-dark flex items-center gap-2 flex-wrap mb-0.5">
                {p.name}
                {viewMode === 'equipe' && <span className="text-[11px] bg-slate-200 text-slate-700 py-0.5 px-2 rounded-md font-semibold tracking-wide">{p.assignedTo}</span>}
              </div>
              <div className="text-[13px] text-text-muted">{p.intervention} · J+{p.jourPostOp} · {p.date}</div>
            </div>
            {p.messages.length > 0 && <MessageCircle size={16} className="text-primary opacity-40 shrink-0" />}
            <StatusBadge status={p.status} />
            <span className="text-slate-300 text-xl font-light ml-2">›</span>
          </motion.div>
        ))
      )}
    </div>
  );
}
