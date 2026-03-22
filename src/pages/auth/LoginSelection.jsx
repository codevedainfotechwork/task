import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, Users, Target, Zap, Globe } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import ParticleField from '../../components/3d/ParticleField';

export default function LoginSelection() {
  const navigate = useNavigate();
  const { t, currentLanguage, setCurrentLanguage } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  
  const languages = [
    { code: 'en', label: 'EN', flag: '🇺🇸' },
    { code: 'hi', label: 'HI', flag: '🇮🇳' },
    { code: 'gu', label: 'GU', flag: '🇮🇳' }
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#030712]">
      <ParticleField />
      
      {/* Ambient glows behind options */}
      <div className="absolute inset-0 z-0 pointer-events-none flex justify-center items-center gap-32">
        <div className="w-64 h-64 rounded-full blur-[120px] bg-[rgba(255,68,68,0.05)] translate-x-[-200px]" />
        <div className="w-64 h-64 rounded-full blur-[120px] bg-[rgba(191,0,255,0.05)]" />
        <div className="w-64 h-64 rounded-full blur-[120px] bg-[rgba(0,212,255,0.05)] translate-x-[200px]" />
      </div>

      <div className="absolute inset-0 z-0 pointer-events-none cyber-grid-bg opacity-40" />
      <div className="dot-grid absolute inset-0 opacity-20 pointer-events-none z-0" />

      <div className="relative z-10 w-full max-w-5xl mx-4 py-12 flex flex-col items-center">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="flex flex-col items-center mb-16"
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border"
            style={{ 
              background: 'linear-gradient(135deg, rgba(0,212,255,0.1), rgba(191,0,255,0.1))',
              borderColor: 'rgba(0,212,255,0.3)',
              boxShadow: '0 0 30px rgba(0,212,255,0.2)'
            }}>
            <Zap size={28} className="text-cyan-400" style={{ filter: 'drop-shadow(0 0 10px #00d4ff)' }} />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.1em] md:tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 text-center drop-shadow-[0_0_15px_rgba(0,212,255,0.5)] leading-tight px-4">
            TASKFLOW
          </h1>
          <p className="text-[10px] md:text-sm font-mono mt-3 md:mt-4 tracking-widest md:tracking-[0.4em] max-w-[280px] md:max-w-none text-center px-4 leading-relaxed uppercase" style={{ color: 'rgba(148,163,184,0.6)' }}>
            {t('identify_clearance')}
          </p>
          <div className="h-px w-24 md:w-32 mt-5 md:mt-6" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.5), transparent)' }} />
          
          {/* Quick Lang Switcher for Login */}
          <div className="flex gap-4 mt-8">
            {languages.map(lang => (
              <button
                key={lang.code}
                onClick={() => setCurrentLanguage(lang.code)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[10px] font-mono font-bold ${currentLanguage === lang.code ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'}`}
              >
                <span>{lang.flag}</span> {lang.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 w-full max-w-4xl px-2">
          {options.map((opt, i) => (
            <motion.button
              key={opt.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15, duration: 0.6, type: 'spring' }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(opt.route)}
              className="relative p-6 md:p-8 rounded-2xl flex flex-col items-center text-center group overflow-hidden"
              style={{
                background: opt.bg,
                border: `1px solid ${opt.border}`,
                backdropFilter: 'blur(20px)',
                boxShadow: `0 10px 40px rgba(0,0,0,0.5), 0 0 0 ${opt.color}00 inset`
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = `0 15px 50px rgba(0,0,0,0.7), 0 0 30px ${opt.glow} inset`}
              onMouseLeave={e => e.currentTarget.style.boxShadow = `0 10px 40px rgba(0,0,0,0.5), 0 0 0 ${opt.color}00 inset`}
            >
              {/* Scanline on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `linear-gradient(to bottom, transparent, ${opt.glow}, transparent)`, height: '200%', animation: 'scan 3s linear infinite' }} />

              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-4 md:mb-6 relative z-10 transition-transform duration-500 group-hover:scale-110"
                style={{ background: `rgba(0,0,0,0.5)`, border: `2px solid ${opt.color}`, boxShadow: `0 0 20px ${opt.glow}` }}>
                <opt.icon size={32} style={{ color: opt.color, filter: `drop-shadow(0 0 10px ${opt.color})` }} />
              </div>
              
              <h2 className="text-xl font-bold tracking-widest mb-3 relative z-10" style={{ color: opt.color, textShadow: `0 0 15px ${opt.glow}` }}>
                {opt.title}
              </h2>
              <p className="text-[11px] font-mono relative z-10" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {opt.subtitle}
              </p>
              
              <div className="mt-8 flex items-center gap-2 text-[10px] font-mono font-bold tracking-widest opacity-0 group-hover:opacity-100 transition-opacity relative z-10" style={{ color: opt.color }}>
                <span className="w-4 h-px" style={{ background: opt.color }}></span>
                {t('initiate_btn')}
                <span className="w-4 h-px" style={{ background: opt.color }}></span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
