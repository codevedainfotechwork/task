import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SearchBar({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-indigo-500 dark:group-focus-within:text-cyan-400 transition-colors" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 dark:focus:border-cyan-500/50 transition-all font-medium"
      />
      <AnimatePresence>
        {value && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
          >
            <X size={14} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
