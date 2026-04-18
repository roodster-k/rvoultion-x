import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCheck, FileText, AlertCircle, Mail, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const TYPE_CONFIG = {
  protocol_step_due: { icon: <FileText size={14} />, color: 'text-blue-600 bg-blue-50' },
  patient_alert:     { icon: <AlertCircle size={14} />, color: 'text-red-600 bg-red-50' },
  staff_invite:      { icon: <Mail size={14} />, color: 'text-purple-600 bg-purple-50' },
  general:           { icon: <Info size={14} />, color: 'text-slate-600 bg-slate-100' },
};

export default function NotificationBell() {
  const { authUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const userId = authUser?.id;

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, read, link, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);
    setNotifications(data || []);
  }, [userId]);

  // Initial fetch
  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev].slice(0, 30));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (!unreadIds.length) return;
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleNotifClick = (notif) => {
    markRead(notif.id);
    if (notif.link) window.location.href = notif.link;
    setOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl text-text-muted hover:text-primary hover:bg-primary-light bg-white border border-border shadow-sm transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[340px] max-w-[calc(100vw-32px)] bg-white rounded-[18px] shadow-2xl border border-border z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-bold text-[14px] text-text-dark">Notifications</span>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary-dark bg-primary-light px-2.5 py-1 rounded-lg border-none cursor-pointer transition-colors"
                  >
                    <CheckCheck size={12} /> Tout lire
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 text-text-muted hover:text-text-dark bg-transparent border-none cursor-pointer rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[60vh] sm:max-h-[380px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-text-muted">
                  <Bell size={28} className="opacity-20 mb-2" />
                  <p className="text-[13px] font-medium">Aucune notification</p>
                </div>
              ) : (
                notifications.map(notif => {
                  const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.general;
                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-slate-50 transition-colors cursor-pointer border-none
                        ${notif.read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/60 hover:bg-blue-50'}`}
                    >
                      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${config.color}`}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] leading-snug mb-0.5 ${notif.read ? 'font-medium text-text-dark' : 'font-bold text-text-dark'}`}>
                          {notif.title}
                        </p>
                        {notif.body && (
                          <p className="text-[11px] text-text-muted line-clamp-2">{notif.body}</p>
                        )}
                        <p className="text-[10px] text-text-muted/70 mt-1">
                          {new Date(notif.created_at).toLocaleString('fr-BE', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                      {!notif.read && (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
