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
    <div className="min-h-screen flex items-center justify-center bg-[#050510] text-slate-300 font-mono selection:bg-cyan-500/30 relative overflow-hidden">
      {/* Animated Background Glows */}
      <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[150px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-200px] right-[-200px] w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[150px] animate-pulse pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md mx-4 relative z-10"
      >
        {/* ─── LOADING STATE ─── */}
        <AnimatePresence mode="wait">
          {status === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-20">
              <Loader2 size={40} className="animate-spin text-cyan-400 mx-auto mb-4" />
              <p className="text-xs tracking-widest text-slate-500 uppercase">{t('val_invite')}</p>
            </motion.div>
          )}

          {/* ─── ERROR / EXPIRED / USED STATES ─── */}
          {(status === 'expired' || status === 'used' || status === 'error') && (
            <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
                style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)' }}>
                <XCircle size={32} className="text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2 tracking-widest uppercase">
                {status === 'expired' ? t('link_expired') : status === 'used' ? t('already_activated') : t('access_denied')}
              </h1>
              <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto leading-relaxed">{errorMsg}</p>
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3 rounded-xl text-xs font-bold tracking-widest transition-all uppercase"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff'
                }}
              >
                {t('go_to_login')}
              </button>
            </motion.div>
          )}

          {/* ─── SUCCESS STATE ─── */}
          {status === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="text-center py-16">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
                style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)' }}>
                <CheckCircle2 size={32} className="text-emerald-400" />
              </motion.div>
              <h1 className="text-xl font-bold text-white mb-2 tracking-widest uppercase">{t('account_activated')}</h1>
              <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto leading-relaxed uppercase">
                {t('activated_desc')}
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/login')}
                className="px-8 py-3 rounded-xl text-xs font-bold tracking-widest text-black uppercase"
                style={{ background: 'linear-gradient(135deg, #00ff88, #00d4ff)', boxShadow: '0 0 30px rgba(0,255,136,0.3)' }}
              >
                {t('login_proceed')}
              </motion.button>
            </motion.div>
          )}

          {/* ─── VALID TOKEN — SET PASSWORD FORM ─── */}
          {status === 'valid' && inviteData && (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Header */}
              <div className="mb-10 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-6"
                  style={{ background: `${ROLE_COLORS[inviteData.role] || '#00d4ff'}15`, border: `1px solid ${ROLE_COLORS[inviteData.role] || '#00d4ff'}40` }}>
                  <ShieldCheck size={24} style={{ color: ROLE_COLORS[inviteData.role] || '#00d4ff' }} />
                </div>
                <h1 className="text-xl tracking-[0.2em] font-semibold text-white mb-2 uppercase">{t('onboarding_title')}</h1>
                <p className="text-xs tracking-widest text-slate-500 uppercase">
                  {t(`role_${inviteData.role}`)} {t('onboarding_subtitle')}
                </p>
              </div>

              {/* Info Card */}
              <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-black"
                    style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[inviteData.role] || '#00d4ff'}, rgba(255,255,255,0.3))` }}>
                    {inviteData.name?.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{inviteData.name}</p>
                    <p className="text-[10px] text-slate-500 tracking-wider uppercase">{inviteData.email}</p>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold tracking-widest px-2 py-1 rounded"
                  style={{ background: `${ROLE_COLORS[inviteData.role]}15`, color: ROLE_COLORS[inviteData.role], border: `1px solid ${ROLE_COLORS[inviteData.role]}30` }}>
                  {t(`role_${inviteData.role}`).toUpperCase()}
                </span>
              </div>

              {/* Password Form */}
              <div className="p-8 rounded-xl" style={{ background: 'rgba(17,17,17,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-[10px] tracking-widest mb-2 uppercase" style={{ color: ROLE_COLORS[inviteData.role] || '#00d4ff' }}>
                      {t('set_passphrase')}
                    </label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••"
                        required
                        className="w-full bg-[#0a0a0a] border border-[#333] text-white text-sm px-4 py-3 pr-10 focus:outline-none transition-colors rounded-xl placeholder:text-slate-700 uppercase"
                        style={{ borderColor: `${ROLE_COLORS[inviteData.role]}30` }}
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors">
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] tracking-widest mb-2 uppercase" style={{ color: ROLE_COLORS[inviteData.role] || '#00d4ff' }}>
                      {t('confirm_passphrase')}
                    </label>
                    <input
                      type="password"
                      value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)}
                      placeholder="••••••"
                      required
                      className="w-full bg-[#0a0a0a] border border-[#333] text-white text-sm px-4 py-3 focus:outline-none transition-colors rounded-xl placeholder:text-slate-700 uppercase"
                      style={{ borderColor: `${ROLE_COLORS[inviteData.role]}30` }}
                    />
                  </div>

                  {errorMsg && (
                    <div className="flex items-start gap-3 p-3 text-red-400 text-xs rounded-xl"
                      style={{ background: 'rgba(255,68,68,0.05)', border: '1px solid rgba(255,68,68,0.2)' }}>
                      <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <motion.button
                    type="submit" disabled={submitting}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="w-full py-4 rounded-xl text-sm font-bold tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-50 text-black"
                    style={{
                      background: `linear-gradient(135deg, ${ROLE_COLORS[inviteData.role] || '#00d4ff'}, #00ff88)`,
                      boxShadow: `0 0 30px ${ROLE_COLORS[inviteData.role] || '#00d4ff'}40`
                    }}
                  >
                    {submitting
                      ? <Loader2 size={16} className="animate-spin" />
                      : t('activate_btn')
                    }
                  </motion.button>
                </form>
              </div>

              {/* Footer */}
              <div className="mt-8 text-center">
                <p className="text-[10px] text-slate-600 tracking-widest leading-loose uppercase">
                  {t('onboarding_footer')}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
