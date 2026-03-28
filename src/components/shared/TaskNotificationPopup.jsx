import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BellRing, CalendarClock, ClipboardList, Download, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function TaskNotificationPopup({ notification, onClose, onRefresh }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [sharedAttachments, setSharedAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function loadSharedAttachments() {
      if (!notification?.taskId || notification?.type !== 'task-completion-submitted') {
        setSharedAttachments([]);
        setAttachmentsLoading(false);
        return;
      }

      try {
        setAttachmentsLoading(true);
        const res = await api.get(`/tasks/${notification.taskId}/attachments`);
        if (!cancelled) {
          setSharedAttachments(Array.isArray(res.data) ? res.data : []);
        }
      } catch {
        if (!cancelled) {
          setSharedAttachments([]);
        }
      } finally {
        if (!cancelled) {
          setAttachmentsLoading(false);
        }
      }
    }

    loadSharedAttachments();
    return () => {
      cancelled = true;
    };
  }, [notification?.taskId, notification?.type]);

  const handleTransferResponse = async (action) => {
    if (!notification || !notification.taskId) return;
    try {
      setIsProcessing(true);
      await api.post(`/tasks/${notification.taskId}/transfer-response`, { action });
      await onRefresh?.();
      onClose();
    } catch (error) {
      console.error('Error handling transfer response:', error);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompletionReview = async (action) => {
    if (!notification || !notification.taskId) return;
    try {
      setReviewError('');
      if (action === 'reject' && !String(rejectReason || '').trim()) {
        setReviewError('Reject reason is required.');
        return;
      }
      setIsProcessing(true);
      await api.post(`/tasks/${notification.taskId}/completion-review`, {
        action,
        feedback: action === 'reject' ? rejectReason : '',
      });
      await onRefresh?.();
      onClose();
    } catch (error) {
      console.error('Error handling completion review:', error);
      setReviewError(error.response?.data?.message || 'Failed to submit review.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadAttachment = async (e, att) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await fetch(att.url);
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = att.originalName || att.storedName || 'attachment';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Attachment download error:', error);
    }
  };
  const formattedDueDate = notification?.reminderTime
    ? format(parseISO(notification.reminderTime), 'MMM d, yyyy p')
    : notification?.dueDate
      ? format(parseISO(notification.dueDate), 'MMM d, yyyy')
      : null;
  const formattedTransferDate = notification?.transferMeta?.transferredAt
    ? format(parseISO(notification.transferMeta.transferredAt), 'MMM d, yyyy p')
    : null;

  if (notification?.type === 'task-assigned') {
    return (
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, x: 80, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="fixed bottom-5 right-5 z-[100] w-[92vw] max-w-sm"
          >
            <div
              className="overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl"
              style={{
                background: 'linear-gradient(180deg, rgba(10,14,26,0.96), rgba(5,8,18,0.98))',
                borderColor: 'rgba(148,163,184,0.18)',
                boxShadow: '0 18px 50px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04) inset',
              }}
            >
              <div className="h-1 bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500" />
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
                    style={{
                      background: 'rgba(15,23,42,0.8)',
                      borderColor: 'rgba(148,163,184,0.16)',
                    }}
                  >
                    <BellRing size={18} className="text-cyan-300" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-mono font-bold tracking-[0.28em] uppercase text-cyan-300/80">
                      Task Assigned
                    </p>
                    <h3 className="mt-1 text-base font-semibold tracking-tight text-white">
                      {notification.taskTitle || 'New task received'}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">
                      {notification.description || 'Open the task board to view the assignment.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Close task notification"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/5"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      const routeByRole = {
                        employee: '/employee',
                        manager: '/manager',
                        admin: '/admin',
                      };
                      navigate(routeByRole[currentUser?.role] || '/employee');
                    }}
                    className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-black shadow-lg transition-all hover:opacity-90"
                  >
                    Open Task
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {notification && (
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
            className="relative w-full max-w-lg rounded-[24px] border p-4 shadow-2xl holo-card"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 dark:via-cyan-500/50 to-transparent"
            />
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: '0 0 24px rgba(99,102,241,0.08)',
                  }}
                >
                  <BellRing size={18} className="text-indigo-600 dark:text-cyan-400" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-mono font-bold tracking-[0.2em] text-indigo-600 dark:text-cyan-400/80 uppercase">
                    LIVE ALERT
                  </p>
                  <h3 className="mt-1 text-lg md:text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                    {notification.title || 'New Task Assigned'}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {notification.type === 'task-transferred'
                      ? 'A task has been transferred into your manager queue.'
                      : notification.type === 'transfer-request'
                      ? 'A task transfer is pending your approval.'
                      : notification.type === 'transfer-response'
                      ? 'The task transfer request has been processed.'
                      : notification.type === 'task-completion-submitted'
                      ? 'An employee marked this task completed and sent it for your review.'
                      : notification.type === 'task-completion-review'
                      ? 'Manager reviewed your completed task.'
                      : notification.message || 'A new task has been assigned to you.'}
                  </p>

                  <div className="mt-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 px-4 py-4">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-cyan-400/80">
                      <ClipboardList size={12} />
                      <span className="text-[8px] font-mono tracking-[0.2em] uppercase">TASK TITLE</span>
                    </div>
                    <p className="mt-1.5 text-base md:text-lg font-semibold text-slate-800 dark:text-white">
                      {notification.taskTitle || notification.message || 'Assigned task'}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {notification.description || 'Review the task board for full details.'}
                    </p>

                    {notification.type === 'task-completion-submitted' && notification.transferMeta?.completionNote && (
                      <div className="mt-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 px-3 py-2">
                        <p className="text-[9px] font-mono tracking-[0.18em] uppercase text-slate-500 dark:text-slate-400">Employee Note</p>
                        <p className="mt-1 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{notification.transferMeta.completionNote}</p>
                      </div>
                    )}

                    {notification.type === 'task-employee-comment' && (
                      <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                        <p className="text-[9px] font-mono tracking-[0.18em] uppercase text-amber-600 dark:text-amber-300">Employee Comment</p>
                        <p className="mt-1 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                          {notification.description || notification.message || 'Employee left a comment on this task.'}
                        </p>
                      </div>
                    )}

                    {notification.type === 'task-completion-submitted' && (
                      <div className="mt-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 px-3 py-2">
                        <p className="text-[9px] font-mono tracking-[0.18em] uppercase text-slate-500 dark:text-slate-400">Shared Files</p>
                        {attachmentsLoading ? (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Loading attachments...</p>
                        ) : sharedAttachments.length === 0 ? (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">No attachments shared.</p>
                        ) : (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {sharedAttachments.map((att) => (
                              <div key={att.id || att.storedName} className="flex items-center gap-1">
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-mono px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-300 transition-colors"
                                >
                                  {att.originalName || att.storedName || 'Attachment'}
                                </a>
                                <button
                                  type="button"
                                  onClick={(e) => handleDownloadAttachment(e, att)}
                                  className="p-1 rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-500 hover:text-indigo-600 dark:hover:text-cyan-300 transition-colors"
                                  title="Download"
                                >
                                  <Download size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {(notification.type === 'task-transferred' || notification.type === 'transfer-request' || notification.type === 'transfer-response' || notification.type === 'task-assigned' || notification.type === 'task-completion-submitted' || notification.type === 'task-completion-review') && notification.transferMeta && (
                      <div className="mt-4 rounded-xl border border-indigo-500/10 dark:border-purple-400/10 bg-indigo-500/5 dark:bg-purple-500/5 px-3 py-2 text-[11px] text-slate-700 dark:text-purple-100">
                        <p className="font-mono text-[9px] tracking-[0.15em] text-indigo-600 dark:text-purple-300/60 uppercase">
                          {notification.type === 'task-assigned' ? 'DETAILS' : notification.type === 'task-completion-submitted' || notification.type === 'task-completion-review' ? 'REVIEW' : 'TRANSFER'}
                        </p>
                        <p className="mt-1">
                          <span className="text-slate-500 dark:text-white/30 text-[10px]">
                            {notification.type === 'transfer-response' ? 'Responded By: ' : 
                             notification.type === 'task-assigned' ? 'Assigned By: ' :
                             notification.type === 'task-completion-review' ? 'Reviewed By: ' :
                             notification.type === 'task-completion-submitted' ? 'Submitted By: ' : 'From: '}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white ml-1">
                            {notification.transferMeta.submittedByName || notification.transferMeta.reviewedByName || notification.transferMeta.fromManagerName || 'Manager'}
                          </span>
                        </p>
                        {notification.transferMeta.status && (
                          <p className="mt-0.5 capitalize">
                            <span className="text-slate-500 dark:text-white/30 text-[10px]">Status: </span>
                            <span className={
                              notification.transferMeta.status === 'accepted' || notification.transferMeta.status === 'assigned' 
                                ? 'text-emerald-600 dark:text-emerald-400 font-bold' 
                                : notification.transferMeta.status === 'rejected' 
                                  ? 'text-rose-600 dark:text-rose-400 font-bold' 
                                  : 'text-indigo-600 dark:text-cyan-400 font-bold'
                            }>
                              {notification.transferMeta.status}
                            </span>
                          </p>
                        )}
                        {formattedTransferDate && (
                          <p className="mt-1 italic text-slate-400 dark:text-white/20 text-[9px]">
                            {formattedTransferDate}
                          </p>
                        )}
                      </div>
                    )}

                    {formattedDueDate && (
                      <div className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-indigo-400/10 dark:border-cyan-400/10 bg-indigo-400/5 dark:bg-cyan-400/5 px-3 py-1.5 text-xs text-indigo-700 dark:text-cyan-200 font-mono">
                        <CalendarClock size={12} />
                        <span className="tracking-wide uppercase">Due: {formattedDueDate}</span>
                      </div>
                    )}

                    {notification.type === 'transfer-request' && (
                      <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-white/5 pt-3">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleTransferResponse('reject')}
                          className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 dark:text-white/50 transition-colors hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50"
                        >
                          {t('btn_reject_tfr')}
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleTransferResponse('accept')}
                          className="rounded-lg bg-indigo-600 dark:bg-cyan-500 px-5 py-2 text-xs font-bold text-white dark:text-black shadow-lg transition-all hover:opacity-90 disabled:opacity-50"
                        >
                          {isProcessing ? t('msg_updating') : t('btn_accept_tfr')}
                        </button>
                      </div>
                    )}

                    {notification.type === 'task-completion-submitted' && (
                      <div className="mt-4 border-t border-slate-200 dark:border-white/5 pt-3 space-y-2">
                        <textarea
                          value={rejectReason}
                          onChange={(e) => {
                            setRejectReason(e.target.value);
                            if (reviewError) setReviewError('');
                          }}
                          placeholder="If rejecting, write issue/reason for employee..."
                          className="w-full min-h-[90px] rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 px-3 py-2 text-xs text-slate-700 dark:text-slate-100 outline-none"
                        />
                        {reviewError && (
                          <p className="text-xs text-rose-600 dark:text-rose-300">{reviewError}</p>
                        )}
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleCompletionReview('reject')}
                            className="rounded-lg px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-300 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleCompletionReview('accept')}
                            className="rounded-lg bg-indigo-600 dark:bg-cyan-500 px-5 py-2 text-xs font-bold text-white dark:text-black shadow-lg transition-all hover:opacity-90 disabled:opacity-50"
                          >
                            {isProcessing ? t('msg_updating') : 'Accept'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-1.5 text-slate-400 transition-colors hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-500"
                aria-label="Close task notification"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
