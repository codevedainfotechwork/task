import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import ParticleField from '../../components/3d/ParticleField';

export default function AdminLogin() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username, form.password, null, 'admin');
      navigate('/admin');
    } catch (err) {
      console.log('Login error details:', err.response || err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-slate-50 dark:bg-[#03060a] overflow-hidden text-slate-700 dark:text-slate-300 font-sans selection:bg-emerald-500/30">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <ParticleField />
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-transparent to-purple-500/5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05)_0%,transparent_70%)] invisible dark:visible" />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-[440px] px-6"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="mb-10 text-center">
          <div className="inline-flex relative group">
            <div className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-500/20 blur-2xl rounded-full scale-150 opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative w-24 h-24 rounded-3xl flex items-center justify-center border border-slate-200 dark:border-emerald-500/30 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl shadow-2xl transition-transform duration-500 group-hover:scale-110">
              <ShieldAlert size={42} className="text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <h1 className="mt-8 text-3xl font-bold tracking-[0.2em] text-slate-900 dark:text-white uppercase sm:text-4xl text-center">
            {t('admin_workspace')}
          </h1>
          <div className="mt-3 flex items-center justify-center gap-4">
            <div className="h-[2px] w-12 bg-gradient-to-r from-transparent via-emerald-600/30 dark:via-emerald-500/50 to-transparent" />
            <p className="text-[10px] font-mono font-bold tracking-[0.4em] text-emerald-600 dark:text-emerald-500/70 uppercase">
              // {t('op_terminal_login')}
            </p>
            <div className="h-[2px] w-12 bg-gradient-to-l from-transparent via-emerald-600/30 dark:via-emerald-500/50 to-transparent" />
          </div>
        </motion.div>

        {/* Main Form Card */}
        <motion.div 
          variants={itemVariants}
          className="relative group"
        >
          <div className="relative bg-white/70 dark:bg-[#0a0a0a]/60 border border-slate-200 dark:border-white/10 p-10 rounded-[3rem] backdrop-blur-3xl shadow-2xl overflow-hidden holo-card">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

            <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
              {/* Hidden dummy inputs to confuse browser autofill */}
              <input type="text" name="dummy_u" autoComplete="username" style={{ display: 'none' }} tabIndex="-1" aria-hidden="true" />
              <input type="password" name="dummy_p" autoComplete="current-password" style={{ display: 'none' }} tabIndex="-1" aria-hidden="true" />

              {/* Email Input */}
              <motion.div variants={itemVariants}>
                <label className="block text-[10px] font-mono font-bold mb-2.5 tracking-[0.2em] text-emerald-600 dark:text-emerald-400 uppercase">
                  // Username
                </label>
                <div className="relative group/input">
                  <input 
                    type="text" 
                    name="ux_mail_99"
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    spellCheck={false}
                    autoCapitalize="none"
                    readOnly
                    onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
                    value={form.username} 
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))} 
                    placeholder="admin_username" 
                    required 
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white px-5 py-4 rounded-2xl focus:outline-none focus:border-emerald-500/50 focus:bg-slate-200 dark:focus:bg-white/[0.08] transition-all placeholder:text-slate-400 text-sm font-medium"
                  />
                </div>
              </motion.div>
              
              {/* Password Input */}
              <motion.div variants={itemVariants}>
                <label className="block text-[10px] font-mono font-bold mb-2.5 tracking-[0.2em] text-emerald-600 dark:text-emerald-400 uppercase">
                  // {t('login_password')}
                </label>
                <div className="relative group/input">
                  <input 
                    type={showPw ? 'text' : 'password'} 
                    name="ux_pass_99"
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    spellCheck={false}
                    readOnly
                    onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
                    value={form.password} 
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))} 
                    placeholder="••••••••" 
                    required 
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white px-5 py-4 rounded-2xl focus:outline-none focus:border-emerald-500/50 focus:bg-slate-200 dark:focus:bg-white/[0.08] transition-all placeholder:text-slate-400 text-sm font-medium pr-12"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPw(v => !v)} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl"
                  >
                    <AlertCircle size={16} className="text-rose-600 dark:text-red-400 mt-0.5 shrink-0" />
                    <span className="text-xs text-rose-800 dark:text-red-300/90 leading-relaxed font-mono font-bold uppercase tracking-wider">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button 
                type="submit" 
                disabled={loading}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="group relative w-full py-4 rounded-2xl font-bold tracking-[0.25em] text-sm overflow-hidden text-white dark:text-black transition-all shadow-xl"
                style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                <span className="relative z-10 flex items-center justify-center gap-2 uppercase font-mono font-bold">
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white dark:border-black/30 dark:border-t-black rounded-full animate-spin" />
                  ) : (
                    t('init_conn_btn')
                  )}
                </span>
              </motion.button>
            </form>
          </div>
        </motion.div>

        {/* Footer Warning Section */}
        <motion.div 
          variants={itemVariants}
          className="mt-12 px-4 flex flex-col items-center gap-5 py-8 border-t border-slate-200 dark:border-white/5"
        >
          <div className="flex items-center gap-4">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
             <p className="text-[10px] text-slate-500 dark:text-slate-500 tracking-[0.3em] font-mono font-bold uppercase">Secure Node: ACTIVE</p>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-600 text-center tracking-[0.15em] leading-relaxed uppercase max-w-[320px] font-bold">
            {t('auth_prohibited')} <br />
            <span className="text-slate-500 dark:text-slate-700">{t('auth_logged')}</span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
