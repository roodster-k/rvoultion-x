import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check, MessageCircle, Camera, Clock, Trash2, Filter, ChevronRight } from 'lucide-react';

const typeConfig = {
  danger: { label: 'Retard', color: '#ef4444', bg: '#fef2f2', icon: <Clock size={16} /> },
  warning: { label: 'Message', color: '#f59e0b', bg: '#fffbeb', icon: <MessageCircle size={16} /> },
  success: { label: 'Photo', color: '#10b981', bg: '#ecfdf5', icon: <Camera size={16} /> },
  info: { label: 'Action', color: '#3b82f6', bg: '#eff6ff', icon: <Check size={16} /> },
};

export default function AlertCenter({ alerts, setAlerts, patients, onSelectPatient }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'danger' | 'warning' | 'success' | 'info'
  const [readIds, setReadIds] = useState(new Set());

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.type === filter);
  const unreadCount = alerts.filter(a => !readIds.has(a.id)).length;

  const markRead = (id) => setReadIds(prev => new Set([...prev, id]));
  const markAllRead = () => setReadIds(new Set(alerts.map(a => a.id)));
  const dismissAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    setReadIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const filterButtons = [
    { key: 'all', label: `Toutes (${alerts.length})` },
    { key: 'danger', label: `Retards (${alerts.filter(a=>a.type==='danger').length})` },
    { key: 'warning', label: `Messages (${alerts.filter(a=>a.type==='warning').length})` },
    { key: 'success', label: `Photos (${alerts.filter(a=>a.type==='success').length})` },
    { key: 'info', label: `Actions (${alerts.filter(a=>a.type==='info').length})` },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            Centre d'Alertes
            {unreadCount > 0 && <span style={{ background: '#ef4444', color: 'white', fontSize: 14, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</span>}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Gestion centralisée des notifications et alertes cliniques</p>
        </div>
        <button onClick={markAllRead} style={{ background: 'var(--color-primary)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ✓ Tout marquer comme lu
        </button>
      </header>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {filterButtons.map(fb => (
          <button key={fb.key} onClick={() => setFilter(fb.key)} style={{
            padding: '8px 16px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: filter === fb.key ? 'var(--color-primary)' : 'white',
            color: filter === fb.key ? 'white' : 'var(--text-muted)',
            boxShadow: filter !== fb.key ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.2s'
          }}>{fb.label}</button>
        ))}
      </div>

      {/* Alert List */}
      <div style={{ background: 'white', borderRadius: 20, border: '1px solid var(--border-color)', overflow: 'hidden' }} className="card-shadow">
        {filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <AlertTriangle size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
            <p style={{ fontSize: 15, fontWeight: 600 }}>Aucune alerte {filter !== 'all' ? 'de ce type' : ''}</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Tout est sous contrôle !</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((a, i) => {
              const cfg = typeConfig[a.type] || typeConfig.info;
              const isRead = readIds.has(a.id);
              const patient = patients.find(p => p.id === a.patientId);
              return (
                <motion.div key={a.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ delay: i * 0.03 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '16px 24px',
                    borderBottom: '1px solid #f1f5f9', borderLeft: `4px solid ${cfg.color}`,
                    background: isRead ? 'white' : '#fafbff',
                    cursor: 'pointer', transition: 'background 0.15s'
                  }}
                  onClick={() => { markRead(a.id); if (patient) onSelectPatient(patient); }}
                >
                  {/* Icon */}
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {cfg.icon}
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontWeight: isRead ? 500 : 700, fontSize: 14, color: 'var(--text-dark)' }}>{a.title}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: cfg.bg, color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
                      {!isRead && <span style={{ width: 8, height: 8, borderRadius: 4, background: '#3b82f6', flexShrink: 0 }} />}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.message}</p>
                    <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'inline-block' }}>
                      {new Date(a.date).toLocaleString('fr-BE', { timeZone: 'Europe/Brussels', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {/* Actions */}
                  <button onClick={(e) => { e.stopPropagation(); dismissAlert(a.id); }} title="Classer" style={{ background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8', flexShrink: 0 }}>
                    <Trash2 size={14} />
                  </button>
                  <ChevronRight size={16} color="#cbd5e1" />
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
