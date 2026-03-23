import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, ShieldAlert, Lock, Mail, Terminal, Fingerprint } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import ParticleField from '../../components/3d/ParticleField';

export default function AdminLogin() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', adminToken: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password, form.adminToken, 'admin');
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
    <div className="min-h-screen relative flex items-center justify-center bg-[#03060a] overflow-hidden text-slate-300 font-sans selection:bg-emerald-500/30">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <ParticleField />
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/20 via-transparent to-purple-900/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05)_0%,transparent_70%)]" />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-[440px] px-6"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="mb-8 text-center">
          <div className="inline-flex relative group">
            <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full scale-150 opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center border border-emerald-500/30 bg-[#0a0a0a]/80 backdrop-blur-xl shadow-2xl">
              <ShieldAlert size={36} className="text-emerald-400" style={{ filter: 'drop-shadow(0 0 10px rgba(52,211,153,0.5))' }} />
            </div>
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-[0.15em] text-white uppercase sm:text-3xl">
            {t('admin_workspace')}
          </h1>
          <div className="mt-2 flex items-center justify-center gap-3">
            <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-emerald-500/50" />
            <p className="text-[10px] font-mono tracking-[0.3em] text-emerald-500/70 uppercase">
              {t('op_terminal_login')}
            </p>
            <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-emerald-500/50" />
          </div>
        </motion.div>

        {/* Main Form Card */}
        <motion.div 
          variants={itemVariants}
          className="relative group"
        >
          {/* Subtle Outer Glow */}
          <div className="absolute -inset-[1px] bg-gradient-to-b from-emerald-500/20 to-transparent rounded-[2rem] blur-sm opacity-50 group-hover:opacity-70 transition-opacity" />
          
          <div className="relative bg-[#0a0a0a]/60 border border-white/10 p-8 rounded-[2rem] backdrop-blur-2xl shadow-2xl overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

            <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
              {/* Hidden dummy inputs to confuse browser autofill */}
              <input type="text" name="prevent_autofill_email" style={{ display: 'none' }} tabIndex="-1" aria-hidden="true" />
              <input type="password" name="prevent_autofill_password" style={{ display: 'none' }} tabIndex="-1" aria-hidden="true" />

              {/* Email Input */}
              <motion.div variants={itemVariants}>
                <label className="block text-[10px] font-mono font-bold mb-2 tracking-widest text-emerald-400/80 uppercase">
                  {t('login_email')}
                </label>
                <div className="relative group/input">
                  <input 
                    type="email" 
                    name="admin_email"
                    autoComplete="off"
                    value={form.email} 
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
                    placeholder="admin@terminal.io" 
                    required 
                    className="w-full bg-white/5 border border-white/10 text-white px-5 py-3.5 rounded-2xl focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.08] transition-all placeholder:text-slate-600 text-sm shadow-inner"
                  />
                </div>
              </motion.div>
              
              {/* Password Input */}
              <motion.div variants={itemVariants}>
                <label className="block text-[10px] font-mono font-bold mb-2 tracking-widest text-emerald-400/80 uppercase">
                  {t('login_password')}
                </label>
                <div className="relative group/input">
                  <input 
                    type={showPw ? 'text' : 'password'} 
                    name="admin_password"
                    autoComplete="new-password"
                    value={form.password} 
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))} 
                    placeholder="••••••••" 
                    required 
                    className="w-full bg-white/5 border border-white/10 text-white px-5 py-3.5 rounded-2xl focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.08] transition-all placeholder:text-slate-600 text-sm shadow-inner"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPw(v => !v)} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-400 transition-colors"
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </motion.div>

              {/* Admin Token Input */}
              <motion.div variants={itemVariants}>
                <label className="block text-[10px] font-mono font-bold mb-2 tracking-widest text-red-400 uppercase">
                  {t('sys_decrypt_token')}
                </label>
                <div className="relative group/input">
                  <input 
                    type="password" 
                    name="admin_token"
                    autoComplete="off"
                    value={form.adminToken} 
                    onChange={e => setForm(f => ({ ...f, adminToken: e.target.value }))} 
                    placeholder={t('ph_admin_token')} 
                    required 
                    className="w-full bg-red-500/[0.03] border border-red-500/20 text-white px-5 py-3.5 rounded-2xl focus:outline-none focus:border-red-500/50 focus:bg-red-500/[0.05] transition-all placeholder:text-red-900/40 text-sm shadow-inner font-mono"
                  />
                </div>
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl"
                  >
                    <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                    <span className="text-xs text-red-300/90 leading-relaxed font-mono">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button 
                type="submit" 
                disabled={loading}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="group relative w-full py-4 rounded-2xl font-bold tracking-[0.2em] text-sm overflow-hidden text-black transition-all shadow-[0_10px_40px_rgba(16,185,129,0.3)]"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                <span className="relative z-10 flex items-center justify-center gap-2 uppercase">
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
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
          className="mt-10 px-4 flex flex-col items-center gap-4 py-6 border-t border-white/5"
        >
          <div className="flex items-center gap-4">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
             <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase font-mono">Secure Node: ACTIVE</p>
          </div>
          <p className="text-[10px] text-slate-600 text-center tracking-[0.1em] leading-relaxed uppercase max-w-[280px]">
            {t('auth_prohibited')} <br />
            <span className="text-slate-700">{t('auth_logged')}</span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
