import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Activity, MessageCircle, Camera, CheckSquare, CalendarDays, Pill, AlertTriangle, CheckCheck, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const TYPE_CONFIG = {
  message:  { icon: <MessageCircle size={16} />, color: '#3b82f6', bg: '#eff6ff', label: 'Message' },
  photo:    { icon: <Camera size={16} />,         color: '#8b5cf6', bg: '#f5f3ff', label: 'Photo' },
  action:   { icon: <CheckSquare size={16} />,    color: '#10b981', bg: '#ecfdf5', label: 'Action' },
  delay:    { icon: <AlertTriangle size={16} />,  color: '#ef4444', bg: '#fef2f2', label: 'Délai' },
};

export default function ActivityFeed({ onSelectPatient }) {
  const { profile } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const fetchActivities = useCallback(async () => {
    if (!profile?.clinic_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('alerts')
      .select('*, patients (id, full_name, intervention)')
      .eq('clinic_id', profile.clinic_id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setActivities(data.map(a => ({
        id: a.id,
        type: a.type,
        title: a.title,
        message: a.message,
        isRead: a.is_read,
        patientId: a.patients?.id,
        patientName: a.patients?.full_name || 'Inconnu',
        intervention: a.patients?.intervention || '',
        createdAt: a.created_at,
      })));
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const markAsRead = async (id) => {
    if (!profile) return;
    setActivities(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
    await supabase.from('alerts')
      .update({ is_read: true, read_at: new Date().toISOString(), read_by: profile.id })
      .eq('id', id);
  };

  const markAllRead = async () => {
    setMarkingAllRead(true);
    const unreadIds = activities.filter(a => !a.isRead).map(a => a.id);
    if (unreadIds.length > 0) {
      setActivities(prev => prev.map(a => ({ ...a, isRead: true })));
      await supabase.from('alerts')
        .update({ is_read: true, read_at: new Date().toISOString(), read_by: profile.id })
        .in('id', unreadIds);
    }
    setMarkingAllRead(false);
  };

  const unreadCount = activities.filter(a => !a.isRead).length;

  // Group by date
  const grouped = activities.reduce((acc, act) => {
    const date = new Date(act.createdAt).toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(act);
    return acc;
  }, {});

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <header className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl mb-1 font-bold text-text-dark flex items-center gap-3">
            <Activity size={28} className="text-primary" /> Journal d'activité
          </h1>
          <p className="text-text-muted font-medium text-sm">
            Historique complet des événements pour votre clinique.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAllRead}
            className="flex items-center gap-2 text-[13px] font-bold text-primary bg-primary-light hover:bg-primary-hover border-none cursor-pointer py-2 px-4 rounded-xl transition-colors disabled:opacity-60"
          >
            {markingAllRead
              ? <Loader2 size={14} className="animate-spin" />
              : <CheckCheck size={14} />}
            Tout marquer comme lu ({unreadCount})
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : activities.length === 0 ? (
        <div className="mt-8 text-center p-12 bg-white rounded-[28px] border border-border shadow-sm max-w-lg mx-auto">
          <Activity size={40} className="text-primary/20 mx-auto mb-4" />
          <h3 className="font-serif text-xl font-bold text-text-dark mb-2">Aucune activité</h3>
          <p className="text-text-muted text-sm">L'activité de la clinique apparaîtra ici.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                <CalendarDays size={13} />
                <span className="capitalize">{date}</span>
                <div className="flex-1 h-px bg-border ml-1" />
              </div>
              <div className="flex flex-col gap-2">
                {items.map(act => {
                  const cfg = TYPE_CONFIG[act.type] || TYPE_CONFIG.action;
                  return (
                    <motion.div
                      key={act.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`bg-white rounded-2xl border p-4 flex items-start gap-3.5 transition-all shadow-sm
                        ${act.isRead ? 'border-border opacity-70' : 'border-l-4 border-border'}`}
                      style={!act.isRead ? { borderLeftColor: cfg.color } : {}}
                    >
                      {/* Type icon */}
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <span className="font-bold text-[14px] text-text-dark">{act.title}</span>
                            <span className="ml-2 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                              style={{ background: cfg.bg, color: cfg.color }}>
                              {cfg.label}
                            </span>
                          </div>
                          <span className="text-[11px] text-text-muted font-medium shrink-0">
                            {new Date(act.createdAt).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' })}
                          </span>
                        </div>
                        {act.message && (
                          <p className="text-[13px] text-text-muted mt-0.5 leading-snug">{act.message}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          {act.patientName && (
                            <button
                              onClick={() => onSelectPatient && onSelectPatient({ id: act.patientId })}
                              className="text-[12px] text-primary font-semibold bg-primary-light hover:bg-primary-hover px-2.5 py-1 rounded-lg border-none cursor-pointer transition-colors"
                            >
                              {act.patientName}
                            </button>
                          )}
                          {!act.isRead && (
                            <button
                              onClick={() => markAsRead(act.id)}
                              className="text-[11px] text-text-muted hover:text-primary font-semibold bg-transparent border-none cursor-pointer transition-colors"
                            >
                              Marquer comme lu
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
