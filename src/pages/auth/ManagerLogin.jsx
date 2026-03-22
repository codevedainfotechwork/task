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
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password, null, 'manager');
      navigate('/manager');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#030712]">
      <ParticleField />
      <div className="absolute inset-0 z-0 pointer-events-none flex justify-center items-center">
        <div className="w-[600px] h-[600px] rounded-full blur-[150px]" style={{ background: 'linear-gradient(135deg, rgba(191,0,255,0.08), rgba(0,212,255,0.05))' }} />
      </div>
      <div className="absolute inset-0 z-0 pointer-events-none cyber-grid-bg opacity-30" />

      {/* Back Button */}
      <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate('/login')}
        className="absolute top-8 left-8 z-20 flex items-center gap-2 text-xs font-mono tracking-widest text-[#bf00ff] hover:text-white transition-colors uppercase">
        <ArrowLeft size={14} /> {t('back_to_root')}
      </motion.button>

      <motion.div initial={{ opacity: 0, y: 40, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6 }} className="relative z-10 w-full max-w-md mx-4">
        <div className="absolute -inset-px rounded-2xl pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(191,0,255,0.4), rgba(0,212,255,0.3))', borderRadius: '20px' }} />
        <div className="relative rounded-2xl overflow-hidden scan-overlay p-6 md:p-8" style={{ background: 'rgba(3,10,24,0.95)', border: '1px solid rgba(191,0,255,0.3)', backdropFilter: 'blur(30px)', boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 60px rgba(191,0,255,0.15)' }}>
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, transparent, #bf00ff, #00d4ff, transparent)' }} />

          <div className="flex flex-col items-center mb-6 md:mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border" style={{ background: 'rgba(191,0,255,0.1)', borderColor: 'rgba(191,0,255,0.4)', boxShadow: '0 0 20px rgba(191,0,255,0.3)' }}>
              <Users size={30} style={{ color: '#bf00ff', filter: 'drop-shadow(0 0 8px #bf00ff)' }} />
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-wider md:tracking-widest text-center leading-tight uppercase" style={{ color: '#bf00ff', textShadow: '0 0 15px rgba(191,0,255,0.5)' }}>{t('manager_workspace')}</h1>
            <p className="text-[9px] md:text-[10px] font-mono mt-2 tracking-widest text-center text-slate-400 uppercase">{t('op_terminal_login')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            {/* Hidden dummy inputs to confuse browser autofill */}
            <input type="text" name="prevent_autofill_email" style={{ display: 'none' }} tabIndex="-1" aria-hidden="true" />
            <input type="password" name="prevent_autofill_password" style={{ display: 'none' }} tabIndex="-1" aria-hidden="true" />

            <div>
              <label className="block text-[10px] font-mono font-semibold mb-1.5 tracking-wider text-[#bf00ff] uppercase">// {t('login_email')}</label>
              <input 
                type="email" 
                name="manager_email"
                autoComplete="off"
                value={form.email} 
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
                placeholder="manager@domain.com" 
                required 
                className="input-cyber w-full" 
                style={{ borderColor: 'rgba(191,0,255,0.3)', '--tw-ring-color': '#bf00ff' }} 
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-semibold mb-1.5 tracking-wider text-[#bf00ff] uppercase">// {t('login_password')}</label>
              <div className="relative">
                <input 
                  type={showPw ? 'text' : 'password'} 
                  name="manager_password"
                  autoComplete="new-password"
                  value={form.password} 
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} 
                  placeholder="••••••••" 
                  required 
                  className="input-cyber w-full pr-10" 
                  style={{ borderColor: 'rgba(191,0,255,0.3)' }} 
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bf00ff]/60 hover:text-[#bf00ff] transition-colors">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border border-red-500/50 bg-red-500/10 text-red-400"><AlertCircle size={14} />{error}</motion.div>}

            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full py-3.5 rounded-xl font-mono font-bold text-sm flex items-center justify-center gap-2 mt-4 text-black uppercase" style={{ background: 'linear-gradient(135deg, #bf00ff, #ff0088)', boxShadow: '0 0 25px rgba(191,0,255,0.4)', letterSpacing: '0.1em' }}>
              {loading ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : t('init_conn_btn')}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
