import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const sizes = { xs: 'max-w-sm', sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={`w-full ${sizes[size]} rounded-2xl overflow-hidden shadow-2xl relative holo-card`}
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 dark:via-cyan-500/50 to-transparent" />
              
              <div className="flex items-center justify-between px-6 py-4 border-b dark:border-white/5 bg-slate-50 dark:bg-white/5"
                style={{ borderBottomColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-1 h-4 rounded-full bg-indigo-600 dark:bg-cyan-500 shadow-[0_0_8px_var(--primary)]" />
                  <h2 className="text-sm font-mono font-bold tracking-widest text-slate-900 dark:text-white uppercase">// {title}</h2>
                </div>
                <button onClick={onClose}
                  className="p-1.5 rounded-xl transition-all duration-200 text-slate-400 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/10"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="px-6 py-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
