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
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 30 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className={`w-full ${sizes[size]} rounded-2xl overflow-hidden scan-overlay`}
              style={{
                background: 'rgba(3,10,24,0.97)',
                border: '1px solid rgba(0,212,255,0.25)',
                backdropFilter: 'blur(24px)',
                boxShadow: '0 30px 80px rgba(0,0,0,0.9), 0 0 60px rgba(0,212,255,0.06)',
              }}
            >
              {/* Holographic top bar */}
              <div className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: '1px solid rgba(0,212,255,0.1)', background: 'rgba(0,212,255,0.04)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-px h-4 rounded-full" style={{ background: 'linear-gradient(to bottom, #00d4ff, #bf00ff)', boxShadow: '0 0 8px #00d4ff' }} />
                  <h2 className="text-sm font-bold tracking-wide text-slate-100 uppercase">{title}</h2>
                </div>
                <button onClick={onClose}
                  className="p-1.5 rounded-xl transition-all duration-200"
                  style={{ color: 'rgba(0,212,255,0.4)', border: '1px solid rgba(0,212,255,0.12)' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ff4444'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(0,212,255,0.4)'}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
