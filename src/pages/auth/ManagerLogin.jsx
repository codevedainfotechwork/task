import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, Users, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import ParticleField from '../../components/3d/ParticleField';

export default function ManagerLogin() {
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
      const user = await login(form.username, form.password, null, 'manager');
      navigate('/manager');
    } catch (err) {
      console.log('Login error details:', err.response || err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-[#030712]">
      <ParticleField />
      <div className="absolute inset-0 z-0 pointer-events-none flex justify-center items-center">
        <div className="w-[600px] h-[600px] rounded-full blur-[150px] bg-indigo-500/5 dark:bg-indigo-500/10" />
      </div>
      <div className="absolute inset-0 z-0 pointer-events-none cyber-grid-bg opacity-[0.03] dark:opacity-30" />

      {/* Back Button */}
      <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate('/login')}
        className="absolute top-8 left-8 z-20 flex items-center gap-2 text-[10px] font-mono font-bold tracking-[0.2em] text-indigo-600 dark:text-[#bf00ff] hover:opacity-80 transition-all uppercase">
        <ArrowLeft size={16} /> // {t('back_to_root')}
      </motion.button>

      <motion.div initial={{ opacity: 0, y: 40, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6 }} className="relative z-10 w-full max-w-md mx-4">
        <div className="relative rounded-[2.5rem] overflow-hidden p-8 md:p-10 holo-card" 
          style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.1)' 
          }}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-600 dark:via-[#bf00ff] to-transparent" />

          <div className="flex flex-col items-center mb-8 md:mb-10">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 border border-slate-200 dark:border-indigo-500/30 bg-slate-50 dark:bg-indigo-500/5 shadow-sm">
              <Users size={32} className="text-indigo-600 dark:text-[#bf00ff]" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-widest text-center leading-tight uppercase text-slate-800 dark:text-white">{t('manager_workspace')}</h1>
            <p className="text-[10px] md:text-xs font-mono mt-3 tracking-[0.2em] text-center text-slate-500 dark:text-slate-400 uppercase font-bold">// {t('op_terminal_login')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
            {/* Hidden dummy inputs to confuse browser autofill */}
            <input type="text" name="dummy_u" autoComplete="username" style={{ display: 'none' }} tabIndex="-1" aria-hidden="true" />
            <input type="password" name="dummy_p" autoComplete="current-password" style={{ display: 'none' }} tabIndex="-1" aria-hidden="true" />

            <div>
              <label className="label-cyber">Username</label>
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
                placeholder="manager_username" 
                required 
                className="input-cyber py-4 rounded-2xl"
              />
            </div>
            <div>
              <label className="label-cyber">{t('login_password')}</label>
              <div className="relative">
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
                  className="input-cyber py-4 rounded-2xl pr-12"
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 dark:hover:text-[#bf00ff] transition-colors">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-mono font-bold border border-red-500/20 bg-red-500/5 text-red-500 uppercase tracking-wider"><AlertCircle size={16} />{error}</motion.div>}

            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full py-4 rounded-2xl font-mono font-bold text-sm flex items-center justify-center gap-2 mt-6 text-white dark:text-black uppercase shadow-lg tracking-[0.2em]" style={{ background: 'linear-gradient(135deg, var(--primary), #ff0088)' }}>
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white dark:border-black/30 dark:border-t-black rounded-full animate-spin" /> : t('init_conn_btn')}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
