import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Zap, Shield, Activity, Users, ArrowRight, CheckCircle2, ChevronRight, Moon, Sun } from 'lucide-react';

function HeroBackdrop() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.12),transparent_30%),radial-gradient(circle_at_80%_30%,rgba(14,165,233,0.10),transparent_28%),radial-gradient(circle_at_50%_80%,rgba(168,85,247,0.10),transparent_30%)]" />
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] md:w-[620px] md:h-[620px] rounded-full blur-3xl bg-indigo-500/15 animate-pulse" />
      <div className="absolute top-[42%] left-[58%] -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] md:w-[420px] md:h-[420px] rounded-full blur-3xl bg-cyan-500/12 animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] md:w-[520px] md:h-[520px] rounded-full border border-indigo-500/10 dark:border-cyan-400/10" style={{ animation: 'spin 24s linear infinite' }} />
      <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] md:w-[680px] md:h-[680px] rounded-full border border-purple-500/8" style={{ animation: 'spin 36s linear infinite reverse' }} />
    </div>
  );
}

// --- UI Components ---
const NavBar = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useSettings();
  const [scrolled, setScrolled] = useState(false);
  const isDark = theme === 'dark';
  const brandName = settings?.companyName?.trim() || 'TASKFLOW';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'py-4 bg-white/80 dark:bg-[#030712]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 shadow-sm' : 'py-6 bg-transparent'}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="w-10 h-10 rounded-xl outline outline-1 outline-indigo-500/30 dark:outline-cyan-500/30 flex items-center justify-center bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur relative overflow-hidden">
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Zap size={18} className="text-indigo-600 dark:text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-slate-900 dark:text-white font-bold tracking-[0.25em] text-sm uppercase">{brandName}</span>
        </div>
        
        <div className="flex items-center gap-4 md:gap-8">
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors tracking-[0.2em] uppercase">{t('nav_features')}</a>
            <a href="#benefits" className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors tracking-[0.2em] uppercase">{t('nav_benefits')}</a>
          </div>

          <div className="flex items-center gap-3">
             <motion.button
               whileHover={{ scale: 1.1, rotate: 10 }}
               whileTap={{ scale: 0.9 }}
               onClick={toggleTheme}
               className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors shadow-sm"
             >
               {isDark ? <Sun size={14} /> : <Moon size={14} />}
             </motion.button>
             
             <motion.button 
               whileHover={{ scale: 1.05, y: -1 }}
               whileTap={{ scale: 0.95 }}
               onClick={() => navigate('/login')}
               className="group relative px-5 py-2.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-black text-[10px] font-mono font-bold tracking-[0.2em] overflow-hidden transition-all shadow-lg uppercase"
             >
               <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-cyan-400 dark:to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
               <span className="relative z-10 transition-colors duration-300">{t('access_workspace')}</span>
             </motion.button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { settings } = useSettings();
  const { scrollYProgress } = useScroll();
  const brandName = settings?.companyName?.trim() || 'TASKFLOW';
  const y = useTransform(scrollYProgress, [0, 1], [0, -300]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-white transition-colors duration-500 overflow-hidden selection:bg-indigo-500/30 dark:selection:bg-cyan-500/30">
      <NavBar />
      
      {/* --- HERO SECTION --- */}
      <section className="relative min-h-[85vh] md:min-h-screen flex flex-col items-center justify-center py-20 md:pt-20">
        <HeroBackdrop />

        {/* CSS Animated Sphere - MOBILE ONLY */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] z-0 pointer-events-none md:hidden opacity-50">
          <div className="absolute inset-0 rounded-full border border-indigo-500/20 dark:border-cyan-500/20"
            style={{ animation: 'spin 15s linear infinite' }} />
          <div className="absolute inset-4 rounded-full border border-purple-500/25"
            style={{ animation: 'spin 10s linear infinite reverse' }} />
          <div className="absolute inset-10 rounded-full border border-indigo-400/15 dark:border-cyan-400/15"
            style={{ animation: 'spin 20s linear infinite' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140px] h-[140px] rounded-full animate-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, rgba(147,51,234,0.1) 50%, transparent 70%)',
              boxShadow: '0 0 70px rgba(79,70,229,0.15), 0 0 140px rgba(147,51,234,0.1)',
            }}
          />
        </div>

        {/* Ambient Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] md:w-[800px] md:h-[800px] rounded-full blur-[80px] md:blur-[150px] bg-gradient-to-tr from-purple-500/5 to-indigo-500/5 dark:from-purple-500/10 dark:to-cyan-500/10 pointer-events-none z-0" />

        <div className="relative z-[2] w-full max-w-5xl mx-auto px-4 md:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/20 dark:border-cyan-500/20 bg-white/50 dark:bg-cyan-500/5 mb-8 backdrop-blur-md shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-cyan-400 animate-pulse shadow-[0_0_8px_var(--primary)]" />
            <span className="text-[10px] font-mono font-bold tracking-[0.3em] text-indigo-700 dark:text-cyan-400 uppercase">{t('sys_ops_os')}</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-[1] md:leading-[0.9] text-slate-900 dark:text-white"
          >
            {t('landing_hero_title')} <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-cyan-400 dark:via-purple-400 dark:to-pink-500 leading-tight">
              {t('landing_hero_highlight')}
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.7 }}
            className="text-lg md:text-2xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-12 font-medium leading-relaxed px-4 opacity-80"
          >
            {t('landing_hero_subtitle')}
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.9 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full"
          >
            <motion.button 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/login')}
              className="px-10 py-5 rounded-2xl bg-indigo-600 dark:bg-white text-white dark:text-black font-bold tracking-[0.2em] transition-all flex items-center justify-center gap-2 w-full sm:w-auto shadow-2xl shadow-indigo-600/20 dark:shadow-none uppercase text-[11px] relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative z-10 flex items-center gap-2">
                {t('landing_signin_btn')} <ArrowRight size={18} />
              </span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-5 rounded-2xl border-2 border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md hover:bg-slate-100 dark:hover:bg-white/10 transition-all text-slate-600 dark:text-slate-300 font-bold tracking-[0.2em] justify-center w-full sm:w-auto uppercase text-[11px] shadow-lg"
            >
              {t('landing_docs_btn')}
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section id="features" className="py-24 md:py-40 relative z-10 bg-white dark:bg-[#030712] transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="mb-16 md:mb-28 text-center md:text-left max-w-3xl">
            <h2 className="text-4xl md:text-6xl font-black mb-8 text-slate-900 dark:text-white uppercase tracking-tighter leading-[0.9]">{t('feature_title')}</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg md:text-2xl font-medium opacity-80">{t('feature_subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Feature 1 */}
            <div className="md:col-span-2 p-10 md:p-14 rounded-[3rem] bg-slate-50/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] hover:border-indigo-500/40 dark:hover:border-cyan-500/30 transition-all duration-500 group relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -mr-32 -mt-32 rounded-full pointer-events-none" />
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 dark:bg-cyan-500 text-white flex items-center justify-center mb-10 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(79,70,229,0.3)]">
                  <Shield size={32} />
                </div>
                <h3 className="text-3xl font-black mb-6 text-slate-900 dark:text-white uppercase tracking-tight">{t('feature_1_title')}</h3>
                <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-12 max-w-xl text-xl opacity-90">
                  {t('feature_1_desc')}
                </p>
                <div className="relative h-72 w-full rounded-[2rem] overflow-hidden shadow-2xl">
                   <img src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1200" alt="Security abstract" className="w-full h-full object-cover opacity-30 dark:opacity-50 grayscale hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-100" />
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-50/80 dark:from-[#030712]/80 to-transparent" />
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-10 md:p-14 rounded-[3rem] bg-slate-50/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] hover:border-purple-500/40 transition-all duration-500 group shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-purple-600 text-white flex items-center justify-center mb-10 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(147,51,234,0.3)]">
                <Activity size={32} />
              </div>
              <h3 className="text-3xl font-black mb-6 text-slate-900 dark:text-white uppercase tracking-tight">{t('feature_2_title')}</h3>
              <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed text-xl opacity-90">
                {t('feature_2_desc')}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-10 md:p-14 rounded-[3rem] bg-slate-50/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] hover:border-pink-500/40 transition-all duration-500 group shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-pink-600 text-white flex items-center justify-center mb-10 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(219,39,119,0.3)]">
                <Zap size={32} />
              </div>
              <h3 className="text-3xl font-black mb-6 text-slate-900 dark:text-white uppercase tracking-tight">{t('feature_3_title')}</h3>
              <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed text-xl opacity-90">
                {t('feature_3_desc')}
              </p>
            </div>

            {/* Feature 4 */}
            <div className="md:col-span-2 p-10 md:p-14 rounded-[3rem] bg-slate-50/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.05] hover:border-emerald-500/40 transition-all duration-500 group overflow-hidden relative shadow-sm">
              <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="relative z-10 w-full md:w-3/5">
                <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mb-10 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(5,150,105,0.3)]">
                  <Users size={32} />
                </div>
                <h3 className="text-3xl font-black mb-6 text-slate-900 dark:text-white uppercase tracking-tight">{t('feature_4_title')}</h3>
                <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed text-xl opacity-90">
                  {t('feature_4_desc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- TESTIMONIALS --- */}
      <section id="testimonials" className="py-24 md:py-40 relative bg-slate-50 dark:bg-[#020408] border-y border-slate-200 dark:border-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="mb-20 text-center">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{t('trusted_by')}</h2>
            <div className="w-20 h-1 bg-indigo-600 dark:bg-cyan-500 mx-auto mt-6 rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { text: t('testimonial_1_text'), author: t('testimonial_1_author'), role: t('testimonial_1_role') },
              { text: t('testimonial_2_text'), author: t('testimonial_2_author'), role: t('testimonial_2_role') },
              { text: t('testimonial_3_text'), author: t('testimonial_3_author'), role: t('testimonial_3_role') }
            ].map((t_item, i) => (
              <div key={i} className="p-10 md:p-12 rounded-[2.5rem] bg-white dark:bg-white/[0.01] border border-slate-200 dark:border-white/[0.04] shadow-xl shadow-slate-200/50 dark:shadow-none transition-all hover:-translate-y-3 hover:border-indigo-500/20 duration-500 relative group overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-0 bg-indigo-600 dark:bg-cyan-500 group-hover:h-full transition-all duration-700" />
                <div className="flex gap-1 mb-8">
                  {[1,2,3,4,5].map(s => <span key={s} className="text-indigo-600 dark:text-cyan-500 text-xl transition-transform hover:scale-125 cursor-default">★</span>)}
                </div>
                <p className="text-slate-700 dark:text-slate-300 italic mb-10 text-xl font-medium leading-relaxed opacity-90">"{t_item.text}"</p>
                <div className="pt-8 border-t border-slate-100 dark:border-white/5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-600 dark:text-cyan-400 font-bold text-lg border border-indigo-500/10">
                    {t_item.author.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg leading-none">{t_item.author}</p>
                    <p className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase mt-2 tracking-[0.25em]">{t_item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA / FOOTER --- */}
      <section className="py-32 md:py-64 relative overflow-hidden bg-white dark:bg-[#030712]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-[500px] bg-indigo-500/10 dark:bg-cyan-500/10 blur-[150px] rounded-full pointer-events-none opacity-50 transition-all duration-1000" />
        <div className="max-w-5xl mx-auto px-6 md:px-12 text-center relative z-10">
          <motion.h2 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-5xl md:text-8xl font-black mb-10 text-slate-900 dark:text-white tracking-tighter uppercase leading-[0.9]"
          >
            {t('cta_title')}
          </motion.h2>
          <p className="text-slate-600 dark:text-slate-400 mb-12 md:mb-16 max-w-2xl mx-auto text-xl md:text-2xl font-medium leading-relaxed opacity-80">{t('cta_subtitle')}</p>
          <motion.button 
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/login')}
            className="px-12 py-6 rounded-2xl bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 dark:from-cyan-500 dark:to-purple-600 text-white font-bold tracking-[0.25em] text-xs md:text-sm hover:shadow-[0_0_40px_rgba(79,70,229,0.4)] transition-all uppercase relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10">{t('cta_btn')}</span>
          </motion.button>
        </div>
      </section>

      <footer className="bg-white dark:bg-black border-t border-slate-200 dark:border-white/5 py-16 md:py-20 text-center text-slate-500 dark:text-slate-600 text-[10px] font-mono font-bold uppercase tracking-[0.2em]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer">
            <Zap size={16} className="text-indigo-600 dark:text-cyan-400" />
            <span className="text-slate-900 dark:text-white font-black tracking-[0.3em]">{brandName}</span>
          </div>
          <p className="opacity-70">{t('footer_rights')}</p>
          <div className="flex flex-wrap justify-center gap-10">
            <a href="#" className="hover:text-indigo-600 dark:hover:text-white transition-colors">{t('nav_sys_status')}</a>
            <a href="#" className="hover:text-indigo-600 dark:hover:text-white transition-colors">{t('nav_privacy')}</a>
            <a href="#" className="hover:text-indigo-600 dark:hover:text-white transition-colors">{t('nav_terms')}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
