import { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', icon: <CheckCircle2 size={17} className="text-emerald-500 shrink-0" /> },
  error:   { bg: 'bg-red-50 border-red-200',         text: 'text-red-800',     icon: <XCircle    size={17} className="text-red-500 shrink-0" /> },
  info:    { bg: 'bg-blue-50 border-blue-200',        text: 'text-blue-800',    icon: <Info        size={17} className="text-blue-500 shrink-0" /> },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const dismiss = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[2000] flex flex-col gap-2 items-end pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => {
            const s = STYLES[t.type] || STYLES.info;
            return (
              <motion.div key={t.id}
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0,  scale: 1    }}
                exit={{    opacity: 0, y: 16, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={`pointer-events-auto flex items-center gap-2.5 py-3 px-4 rounded-2xl border shadow-lg text-[13px] font-semibold max-w-[340px] ${s.bg}`}
              >
                {s.icon}
                <span className={`flex-1 ${s.text}`}>{t.message}</span>
                <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600 transition-colors ml-1 pointer-events-auto">
                  <X size={13} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
};
