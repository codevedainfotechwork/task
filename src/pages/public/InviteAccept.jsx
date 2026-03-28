import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, Globe, ShieldCheck, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import api from '../../api';
import { useLanguage } from '../../contexts/LanguageContext';

export default function InviteAccept() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [status, setStatus] = useState('loading'); // loading | valid | expired | used | error | success
  const [inviteData, setInviteData] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const res = await api.get(`/invite/${token}`);
      if (res.data.valid) {
        setInviteData(res.data);
        setStatus('valid');
      } else {
        setStatus('error');
        setErrorMsg(res.data.message || t('invalid_invite') || 'Invalid invite.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || t('val_invite_err') || 'Invalid or expired invite link.';
      const code = err.response?.status;
      if (code === 410) setStatus('expired');
      else if (code === 409) setStatus('used');
      else setStatus('error');
      setErrorMsg(msg);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 6) {
      setErrorMsg(t('passphrase_min_len'));
      return;
    }
    if (password !== confirmPw) {
      setErrorMsg(t('passphrase_mismatch'));
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/invite/${token}/accept`, { password });
      setStatus('success');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || t('activate_err') || 'Failed to activate account.');
    } finally {
      setSubmitting(false);
    }
  };

  const ROLE_COLORS = { manager: '#bf00ff', employee: '#00d4ff' };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#050510] text-slate-700 dark:text-slate-300 font-mono selection:bg-indigo-500/30 dark:selection:bg-cyan-500/30 relative overflow-hidden transition-colors duration-500">
      {/* Animated Background Glows */}
      <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-indigo-500/5 dark:bg-cyan-500/5 rounded-full blur-[150px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-200px] right-[-200px] w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[150px] animate-pulse pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-lg mx-4 relative z-10"
      >
        {/* ─── LOADING STATE ─── */}
        <AnimatePresence mode="wait">
          {status === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-20">
              <Loader2 size={40} className="animate-spin text-indigo-600 dark:text-cyan-400 mx-auto mb-4" />
              <p className="text-[10px] font-bold tracking-[0.3em] text-slate-500 dark:text-slate-500 uppercase">{t('val_invite')}</p>
            </motion.div>
          )}

          {/* ─── ERROR / EXPIRED / USED STATES ─── */}
          {(status === 'expired' || status === 'used' || status === 'error') && (
            <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="text-center py-16 px-8 rounded-[2.5rem] bg-white dark:bg-[#0a0a0a]/60 border border-slate-200 dark:border-white/10 shadow-2xl holo-card">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-8"
                style={{ background: 'rgba(255,68,68,0.05)', border: '1px solid rgba(255,68,68,0.2)' }}>
                <XCircle size={36} className="text-rose-500 dark:text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 tracking-widest uppercase">
                {status === 'expired' ? t('link_expired') : status === 'used' ? t('already_activated') : t('access_denied')}
              </h1>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-500 mb-10 max-w-xs mx-auto leading-relaxed uppercase tracking-wider">{errorMsg}</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-4 rounded-2xl text-[10px] font-bold tracking-[0.3em] transition-all uppercase shadow-lg bg-slate-900 dark:bg-white/5 text-white dark:text-white hover:opacity-90 font-mono"
              >
                {t('go_to_login')}
              </button>
            </motion.div>
          )}

          {/* ─── SUCCESS STATE ─── */}
          {status === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="text-center py-16 px-8 rounded-[2.5rem] bg-white dark:bg-[#0a0a0a]/60 border border-slate-200 dark:border-white/10 shadow-2xl holo-card">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-8 shadow-inner"
                style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)' }}>
                <CheckCircle2 size={36} className="text-emerald-500 dark:text-emerald-400" />
              </motion.div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 tracking-widest uppercase">{t('account_activated')}</h1>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-500 mb-10 max-w-xs mx-auto leading-relaxed uppercase tracking-wider">
                {t('activated_desc')}
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/login')}
                className="w-full py-4 rounded-2xl text-[10px] font-bold tracking-[0.3em] text-white dark:text-black uppercase shadow-xl font-mono"
                style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}
              >
                {t('login_proceed')}
              </motion.button>
            </motion.div>
          )}

          {/* ─── VALID TOKEN — SET PASSWORD FORM ─── */}
          {status === 'valid' && inviteData && (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="p-10 rounded-[3rem] bg-white/80 dark:bg-[#0a0a0a]/70 border border-slate-200 dark:border-white/10 backdrop-blur-3xl shadow-2xl holo-card">
              {/* Header */}
              <div className="mb-10 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-8 shadow-sm transition-transform hover:scale-105"
                  style={{ background: `${ROLE_COLORS[inviteData.role] || '#6366f1'}10`, border: `1.5px solid ${ROLE_COLORS[inviteData.role] || '#6366f1'}40` }}>
                  <ShieldCheck size={40} style={{ color: ROLE_COLORS[inviteData.role] || '#6366f1' }} />
                </div>
                <h1 className="text-3xl tracking-[0.2em] font-bold text-slate-900 dark:text-white mb-3 uppercase">{t('onboarding_title')}</h1>
                <p className="text-[10px] font-bold tracking-[0.3em] text-slate-500 dark:text-slate-400 uppercase">
                  // {t(`role_${inviteData.role}`)} {t('onboarding_subtitle')}
                </p>
              </div>

              {/* Info Card */}
              <div className="mb-10 p-6 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-inner">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-sm font-bold text-white shadow-xl"
                    style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[inviteData.role] || '#6366f1'}, #9333ea)` }}>
                    {inviteData.name?.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{inviteData.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-1 opacity-80">{inviteData.email}</p>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold tracking-[0.2em] px-4 py-2 rounded-xl text-center uppercase border shadow-sm"
                  style={{ background: `${ROLE_COLORS[inviteData.role]}08`, color: ROLE_COLORS[inviteData.role], borderColor: `${ROLE_COLORS[inviteData.role]}25` }}>
                  {t(`role_${inviteData.role}`)}
                </span>
              </div>

              {/* Password Form */}
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold tracking-[0.25em] mb-2.5 uppercase text-slate-500 dark:text-slate-400">
                      // {t('set_passphrase')}
                    </label>
                    <div className="relative group">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm px-6 py-4.5 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-cyan-500/20 transition-all rounded-2xl font-bold tracking-widest uppercase"
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors">
                        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold tracking-[0.25em] mb-2.5 uppercase text-slate-500 dark:text-slate-400">
                      // {t('confirm_passphrase')}
                    </label>
                    <input
                      type="password"
                      value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm px-6 py-4.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-cyan-500/20 transition-all rounded-2xl font-bold tracking-widest uppercase"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-start gap-4 p-5 text-rose-600 dark:text-red-400 text-xs rounded-2xl font-bold uppercase tracking-wider border border-rose-500/10 dark:border-red-500/20 bg-rose-500/5 dark:bg-red-500/5">
                    <ShieldAlert size={18} className="mt-0.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}

                <motion.button
                  type="submit" disabled={submitting}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-5 rounded-[1.25rem] text-[10px] font-bold tracking-[0.3em] uppercase flex items-center justify-center gap-3 disabled:opacity-50 text-white dark:text-black shadow-2xl transition-all font-mono"
                  style={{
                    background: `linear-gradient(135deg, ${ROLE_COLORS[inviteData.role] || '#6366f1'}, #06b6d4)`,
                    boxShadow: `0 20px 50px ${ROLE_COLORS[inviteData.role] || '#6366f1'}30`
                  }}
                >
                  {submitting
                    ? <Loader2 size={24} className="animate-spin" />
                    : <span className="flex items-center gap-3">{t('activate_btn')} <ShieldCheck size={18}/></span>
                  }
                </motion.button>

                <div className="mt-8 text-center">
                  <p className="text-[10px] text-slate-400 dark:text-slate-600 font-bold tracking-[0.15em] leading-loose uppercase max-w-[280px] mx-auto">
                    {t('onboarding_footer')}
                  </p>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
