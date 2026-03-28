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
          className="w-20 h-20 rounded-full border border-dashed border-slate-200 dark:border-white/10"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm">
            <Icon size={22} className="text-slate-400 dark:text-cyan-500/50" />
          </div>
        </div>
      </div>

      <p className="text-[10px] font-mono font-bold tracking-[0.2em] mb-2 text-indigo-600 dark:text-cyan-500/60 uppercase">
        // {title.toUpperCase()}
      </p>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{description || 'No data available in this sector'}</p>
      {action && (
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={action.onClick}
          className="mt-4 px-6 py-2.5 rounded-xl text-xs font-mono font-bold bg-indigo-600 dark:bg-cyan-500 text-white dark:text-black shadow-lg"
        >
          {action.label.toUpperCase()}
        </motion.button>
      )}
    </motion.div>
  );
}
