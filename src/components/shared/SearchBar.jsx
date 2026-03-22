import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SearchBar({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(0,212,255,0.4)' }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-cyber pl-9 pr-8"
        style={{ fontSize: '12px' }}
      />
      <AnimatePresence>
        {value && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: 'rgba(0,212,255,0.4)' }}
          >
            <X size={12} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
