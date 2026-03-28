import { useLanguage } from '../../contexts/LanguageContext';
import { useSettings } from '../../contexts/SettingsContext';

export default function Signup() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { settings } = useSettings();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const brandName = settings?.companyName?.trim() || 'TASKFLOW';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 900)); // simulate network
    setLoading(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      <div className="orb w-96 h-96 bg-purple-600/20 -top-40 -right-32 animate-float" />
      <div className="orb w-72 h-72 bg-brand-600/20 -bottom-32 -left-20 animate-float" style={{ animationDelay: '2s' }} />
      <div className="dot-grid absolute inset-0 opacity-40 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md mx-4 z-10"
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-glow-brand">
            <span className="text-white font-bold text-lg">{brandName.substring(0,2).toUpperCase()}</span>
          </div>
          <span className="text-2xl font-bold text-slate-100">{brandName}</span>
        </div>

        <div className="glass-card rounded-2xl border border-white/10 shadow-glass p-8">
          <div className="text-center mb-7">
            <h1 className="text-2xl font-bold text-slate-100 mb-1">{t('title_create_account')}</h1>
            <p className="text-sm text-slate-500">{t('subtitle_join_today')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('label_full_name')}</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t('ph_john_doe')} required className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('login_email')}</label>
              <input type="text" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder={t('ph_example_email')} required className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('label_user_role').replace('// ', '')}</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="input-base">
                <option value="employee">{t('role_employee')}</option>
                <option value="manager">{t('role_manager')}</option>
                <option value="admin">{t('role_admin')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('login_password')}</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" required className="input-base pr-10" />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-glow-brand transition-all disabled:opacity-60 mt-2"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><UserPlus size={16} />{t('btn_create_account')}</>}
            </motion.button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            {t('msg_already_have_account')}{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">{t('link_signin')}</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
