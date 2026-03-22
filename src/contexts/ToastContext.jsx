import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X, Zap } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: { icon: CheckCircle2, color: '#00ff88', glow: 'rgba(0,255,136,0.3)' },
  error:   { icon: AlertCircle,  color: '#ff4444', glow: 'rgba(255,68,68,0.3)'  },
  info:    { icon: Info,         color: '#00d4ff', glow: 'rgba(0,212,255,0.3)'  },
  cyber:   { icon: Zap,          color: '#bf00ff', glow: 'rgba(191,0,255,0.3)'  },
};

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++toastId;
    setToasts(prev => [{ id, message, type }, ...prev]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast Portal */}
      <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2.5 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => {
            const cfg = ICONS[toast.type] || ICONS.info;
            const Icon = cfg.icon;
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, x: 60, scale: 0.88 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="pointer-events-all"
                style={{ pointerEvents: 'all' }}
              >
                <div
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl min-w-[280px] max-w-[360px] cursor-pointer"
                  style={{
                    background: 'rgba(5,13,26,0.92)',
                    border: `1px solid ${cfg.glow}`,
                    backdropFilter: 'blur(20px)',
                    boxShadow: `0 8px 30px rgba(0,0,0,0.7), 0 0 20px ${cfg.glow}`,
                  }}
                  onClick={() => removeToast(toast.id)}
                >
                  <div className="p-1.5 rounded-lg flex-shrink-0"
                    style={{ background: `${cfg.glow}`, boxShadow: `0 0 12px ${cfg.glow}` }}>
                    <Icon size={14} style={{ color: cfg.color }} />
                  </div>
                  <p className="text-sm text-slate-200 flex-1 leading-snug">{toast.message}</p>
                  <button onClick={() => removeToast(toast.id)}>
                    <X size={13} className="text-slate-500 hover:text-slate-300" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
