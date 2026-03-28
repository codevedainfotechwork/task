import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, LifeBuoy, Send, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import api from '../../api';

export default function HelpRequestPopup({ notification, onClose }) {
  const [reply, setReply] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const isHelpRequest = notification?.type === 'help-request';
  const meta = notification?.transferMeta || {};
  const requestId = meta.requestId || notification?.helpRequestId || null;

  useEffect(() => {
    setReply('');
    setError('');
  }, [notification?.id]);

  if (!notification) return null;

  const subject = meta.subject || notification.taskTitle || notification.message || 'Help Request';
  const requestDescription = meta.description || notification.description || 'No description provided.';
  const requesterName = meta.requesterName || 'Employee';
  const managerName = meta.managerName || 'Manager';
  const createdAtLabel = notification.createdAt ? format(parseISO(notification.createdAt), 'MMM d, yyyy p') : null;
  const repliedAtLabel = meta.repliedAt ? format(parseISO(meta.repliedAt), 'MMM d, yyyy p') : null;

  const handleReply = async () => {
    if (!requestId) {
      setError('Request reference is missing.');
      return;
    }

    if (!String(reply || '').trim()) {
      setError('Reply is required.');
      return;
    }

    try {
      setIsSending(true);
      setError('');
      await api.post(`/help-requests/${requestId}/reply`, { reply });
      window.dispatchEvent(new Event('help-requests-updated'));
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to send reply.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="fixed inset-0 z-[90] flex items-center justify-center p-4 md:p-8"
      >
        <div className="absolute inset-0 bg-[rgba(2,6,23,0.72)] backdrop-blur-md" />

        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="relative w-full max-w-xl rounded-[24px] border p-4 shadow-2xl holo-card"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 dark:via-cyan-500/50 to-transparent" />

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: '0 0 24px rgba(99,102,241,0.08)',
                }}
              >
                {isHelpRequest ? <LifeBuoy size={18} className="text-indigo-600 dark:text-cyan-400" /> : <CheckCircle2 size={18} className="text-emerald-500" />}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-mono font-bold tracking-[0.2em] text-indigo-600 dark:text-cyan-400/80 uppercase">
                  {isHelpRequest ? 'NEW HELP REQUEST' : 'HELP RESPONSE'}
                </p>
                <h3 className="mt-1 text-lg md:text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  {notification.title || (isHelpRequest ? 'Help Request' : 'Help Reply Received')}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {isHelpRequest
                    ? `${requesterName} asked for help and needs a reply.`
                    : `${managerName} replied to your request.`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-1.5 text-slate-400 transition-colors hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-500"
              aria-label="Close help notification"
            >
              <X size={14} />
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 px-4 py-4">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">
              <span className="rounded-full px-2 py-1 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                Subject
              </span>
              {meta.department && (
                <span className="rounded-full px-2 py-1 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  Dept: {meta.department}
                </span>
              )}
              {createdAtLabel && (
                <span className="rounded-full px-2 py-1 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  {createdAtLabel}
                </span>
              )}
            </div>

            <p className="mt-3 text-base md:text-lg font-semibold text-slate-800 dark:text-white">
              {subject}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
              {requestDescription}
            </p>
          </div>

          {isHelpRequest ? (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">
                  // REPLY
                </label>
                <textarea
                  value={reply}
                  onChange={(e) => {
                    setReply(e.target.value);
                    if (error) setError('');
                  }}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 dark:focus:border-cyan-500/50 resize-none"
                  placeholder="Write your response to the employee..."
                />
              </div>

              {error && <p className="text-xs text-rose-600 dark:text-rose-300">{error}</p>}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-500 dark:text-white/60 transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
                  disabled={isSending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReply}
                  disabled={isSending}
                  className="rounded-lg bg-indigo-600 dark:bg-cyan-500 px-5 py-2 text-xs font-bold text-white dark:text-black shadow-lg transition-all hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <Send size={12} />
                  {isSending ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3">
              <p className="text-[9px] font-mono tracking-[0.18em] uppercase text-emerald-600 dark:text-emerald-300/70">
                Manager Reply
              </p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-100 whitespace-pre-wrap">
                {meta.reply || notification.description || 'Your help request has been replied to.'}
              </p>
              {repliedAtLabel && (
                <p className="mt-2 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  Replied at {repliedAtLabel}
                </p>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
