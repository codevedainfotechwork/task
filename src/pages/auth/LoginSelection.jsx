import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Target, Zap } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSettings } from '../../contexts/SettingsContext';
import ParticleField from '../../components/3d/ParticleField';

export default function LoginSelection() {
  const navigate = useNavigate();
  const { t, currentLanguage, setCurrentLanguage } = useLanguage();
  const { settings } = useSettings();
  const brandName = settings?.companyName?.trim() || 'TASKFLOW';
  
  const languages = [
    { code: 'en', label: 'EN' }
  ];

  const options = [
    {
      id: 'manager',
      title: t('role_manager').toUpperCase(),
      subtitle: t('sector_command'),
      icon: Users,
      route: '/login/manager',
      color: '#bf00ff',
      glow: 'rgba(191,0,255,0.3)',
      border: 'rgba(191,0,255,0.4)',
      bg: 'linear-gradient(135deg, rgba(191,0,255,0.15), rgba(0,0,0,0.8))'
    },
    {
      id: 'employee',
      title: t('role_employee').toUpperCase(),
      subtitle: t('workspace_access'),
      icon: Target,
      route: '/login/employee',
      color: '#00d4ff',
      glow: 'rgba(0,212,255,0.3)',
      border: 'rgba(0,212,255,0.4)',
      bg: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,0,0,0.8))'
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-[#030712]">
      <ParticleField />
      
      {/* Ambient glows behind options */}
      <div className="absolute inset-0 z-0 pointer-events-none flex justify-center items-center gap-32">
        <div className="w-64 h-64 rounded-full blur-[120px] bg-indigo-500/5 translate-x-[-200px]" />
        <div className="w-64 h-64 rounded-full blur-[120px] bg-purple-500/5" />
        <div className="w-64 h-64 rounded-full blur-[120px] bg-cyan-500/5 translate-x-[200px]" />
      </div>

      <div className="absolute inset-0 z-0 pointer-events-none cyber-grid-bg opacity-[0.03] dark:opacity-40" />
      <div className="dot-grid absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none z-0" />

      <div className="relative z-10 w-full max-w-5xl mx-4 py-12 flex flex-col items-center">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="flex flex-col items-center mb-16"
        >
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 border border-slate-200 dark:border-cyan-500/30 bg-white/80 dark:bg-cyan-500/5 backdrop-blur-xl shadow-xl dark:shadow-[0_0_30px_rgba(0,212,255,0.2)]">
            <Zap size={32} className="text-indigo-600 dark:text-cyan-400" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-widest text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-cyan-400 dark:to-purple-500 text-center drop-shadow-sm dark:drop-shadow-[0_0_15px_rgba(0,212,255,0.5)] leading-tight px-4 uppercase">
            {brandName}
          </h1>
          <p className="text-[10px] md:text-sm font-mono mt-4 tracking-[0.3em] max-w-[280px] md:max-w-none text-center px-4 leading-relaxed uppercase text-slate-500 dark:text-slate-400/60 font-bold">
            // {t('identify_clearance')}
          </p>
          <div className="h-px w-32 mt-6 bg-gradient-to-r from-transparent via-slate-300 dark:via-cyan-500/50 to-transparent" />
          
          {/* Quick Lang Switcher for Login */}
          <div className="flex gap-4 mt-8">
            {languages.map(lang => (
              <button
                key={lang.code}
                onClick={() => setCurrentLanguage(lang.code)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all text-xs font-mono font-bold tracking-widest ${currentLanguage === lang.code ? 'bg-indigo-600 dark:bg-cyan-500 text-white dark:text-black border-transparent shadow-lg' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-indigo-500 dark:hover:border-cyan-500'}`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 w-full max-w-4xl px-4">
          {options.map((opt, i) => (
            <motion.button
              key={opt.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15, duration: 0.6, type: 'spring' }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(opt.route)}
              className="relative p-8 md:p-10 rounded-3xl flex flex-col items-center text-center group overflow-hidden transition-all holo-card"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.05)'
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: opt.color }} />
              
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl flex items-center justify-center mb-6 relative z-10 transition-all duration-500 group-hover:scale-110 shadow-sm"
                style={{ background: `${opt.color}10`, border: `2px solid ${opt.color}40` }}>
                <opt.icon size={36} style={{ color: opt.color }} />
              </div>
              
              <h2 className="text-2xl font-bold tracking-widest mb-3 relative z-10 text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors">
                {opt.title}
              </h2>
              <p className="text-[11px] font-mono font-bold tracking-widest relative z-10 text-slate-500 dark:text-slate-400 uppercase">
                {opt.subtitle}
              </p>
              
              <div className="mt-8 flex items-center gap-3 text-[10px] font-mono font-bold tracking-[0.2em] relative z-10 transition-colors text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white uppercase">
                <span className="w-6 h-[2px] bg-slate-200 dark:bg-white/10 group-hover:bg-indigo-500 dark:group-hover:bg-cyan-500 transition-colors"></span>
                {t('initiate_btn')}
                <span className="w-6 h-[2px] bg-slate-200 dark:bg-white/10 group-hover:bg-indigo-500 dark:group-hover:bg-cyan-500 transition-colors"></span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
