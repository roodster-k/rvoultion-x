import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check, MessageCircle, Camera, Clock, Trash2, ChevronRight } from 'lucide-react';
import { usePatientContext } from '../context/PatientContext';
import { useAlertContext } from '../context/AlertContext';

const typeConfig = {
  danger: { label: 'Retard', icon: <Clock size={16} />, colorClass: 'text-red-600', bgClass: 'bg-red-50', borderClass: 'border-l-red-500' },
  warning: { label: 'Message', icon: <MessageCircle size={16} />, colorClass: 'text-amber-600', bgClass: 'bg-amber-50', borderClass: 'border-l-amber-500' },
  success: { label: 'Photo', icon: <Camera size={16} />, colorClass: 'text-emerald-600', bgClass: 'bg-emerald-50', borderClass: 'border-l-emerald-500' },
  info: { label: 'Action', icon: <Check size={16} />, colorClass: 'text-blue-600', bgClass: 'bg-blue-50', borderClass: 'border-l-blue-500' },
};

export default function AlertCenter({ onSelectPatient }) {
  const { patients } = usePatientContext();
  const { alerts, dismissAlert } = useAlertContext();
  const [filter, setFilter] = useState('all');
  const [readIds, setReadIds] = useState(new Set());

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.type === filter);
  const unreadCount = alerts.filter(a => !readIds.has(a.id)).length;

  const markRead = (id) => setReadIds(prev => new Set([...prev, id]));
  const markAllRead = () => setReadIds(new Set(alerts.map(a => a.id)));

  const filterButtons = [
    { key: 'all', label: `Toutes (${alerts.length})` },
    { key: 'danger', label: `Retards (${alerts.filter(a=>a.type==='danger').length})` },
    { key: 'warning', label: `Messages (${alerts.filter(a=>a.type==='warning').length})` },
    { key: 'success', label: `Photos (${alerts.filter(a=>a.type==='success').length})` },
    { key: 'info', label: `Actions (${alerts.filter(a=>a.type==='info').length})` },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header */}
      <header className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-[32px] flex items-center gap-3 mb-1 text-text-dark font-bold">
            Centre d'Alertes
            {unreadCount > 0 && <span className="bg-red-500 text-white text-sm font-bold py-1 px-3 rounded-full">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</span>}
          </h1>
          <p className="text-text-muted text-sm font-medium">Gestion centralisée des notifications et alertes cliniques</p>
        </div>
        <button onClick={markAllRead} className="bg-primary text-white border-none py-2.5 px-5 rounded-xl font-bold text-[13px] cursor-pointer hover:bg-primary-dark transition-colors shadow-button">
          ✓ Tout marquer comme lu
        </button>
      </header>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filterButtons.map(fb => (
          <button key={fb.key} onClick={() => setFilter(fb.key)} className={`py-2 px-4 rounded-xl border-none text-[13px] font-bold cursor-pointer transition-all shadow-sm
            ${filter === fb.key ? 'bg-primary text-white' : 'bg-white text-text-muted hover:bg-slate-50 hover:text-text-dark'}`}>
            {fb.label}
          </button>
        ))}
      </div>

      {/* Alert List */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center text-text-muted bg-slate-50/50">
            <AlertTriangle size={40} className="opacity-20 mb-3 mx-auto" />
            <p className="text-[15px] font-bold text-text-dark">Aucune alerte {filter !== 'all' ? 'de ce type' : ''}</p>
            <p className="text-[13px] mt-1 font-medium">Tout est sous contrôle !</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((a, i) => {
              const cfg = typeConfig[a.type] || typeConfig.info;
              const isRead = readIds.has(a.id);
              const patient = patients.find(p => p.id === a.patientId);
              return (
                <motion.div key={a.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ delay: i * 0.03 }}
                  className={`flex items-center gap-3.5 p-4 px-6 border-b border-slate-100 border-l-4 cursor-pointer transition-colors hover:bg-slate-50
                    ${cfg.borderClass} ${isRead ? 'bg-white' : 'bg-blue-50/30'}`}
                  onClick={() => { markRead(a.id); if (patient) onSelectPatient(patient); }}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bgClass} ${cfg.colorClass}`}>
                    {cfg.icon}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm text-text-dark ${isRead ? 'font-medium' : 'font-bold'}`}>{a.title}</span>
                      <span className={`text-[11px] py-0.5 px-2 rounded-md font-bold tracking-wide ${cfg.bgClass} ${cfg.colorClass}`}>{cfg.label}</span>
                      {!isRead && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 shadow-sm" />}
                    </div>
                    <p className="text-[13px] text-text-muted m-0 whitespace-nowrap overflow-hidden text-ellipsis font-medium">{a.message}</p>
                    <span className="text-[11px] text-slate-400 mt-1 inline-block font-semibold">
                      {new Date(a.date).toLocaleString('fr-BE', { timeZone: 'Europe/Brussels', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {/* Actions */}
                  <button onClick={(e) => { e.stopPropagation(); dismissAlert(a.id); }} title="Classer" className="bg-slate-100 hover:bg-slate-200 border-none w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer text-slate-400 hover:text-slate-600 transition-colors shrink-0">
                    <Trash2 size={14} />
                  </button>
                  <ChevronRight size={16} className="text-slate-300 ml-2" />
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
