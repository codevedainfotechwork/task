import { motion } from 'framer-motion';
import { Inbox, Search, AlertCircle, Zap } from 'lucide-react';

const ICONS = {
  default: Inbox,
  search:  Search,
  error:   AlertCircle,
  task:    Zap,
};

export default function EmptyState({ title = 'Nothing here', description = '', type = 'default', action }) {
  const Icon = ICONS[type] || ICONS.default;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      {/* Animated glow ring */}
      <div className="relative mb-5">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="w-20 h-20 rounded-full border"
          style={{ borderColor: 'rgba(0,212,255,0.15)', borderStyle: 'dashed' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)', boxShadow: '0 0 20px rgba(0,212,255,0.08)' }}>
            <Icon size={22} style={{ color: 'rgba(0,212,255,0.4)', filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.3))' }} />
          </div>
        </div>
      </div>

      <p className="text-xs font-mono font-bold tracking-widest mb-2" style={{ color: 'rgba(0,212,255,0.5)' }}>
        // NO DATA FOUND
      </p>
      <p className="text-base font-semibold text-slate-300 mb-1">{title}</p>
      {description && <p className="text-xs text-slate-500 mb-4 max-w-xs">{description}</p>}
      {action && (
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={action.onClick}
          className="px-5 py-2 rounded-xl text-xs font-mono font-bold"
          style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)', color: '#00d4ff', boxShadow: '0 0 15px rgba(0,212,255,0.08)' }}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}
