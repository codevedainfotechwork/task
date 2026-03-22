import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, CalendarClock, ClipboardList, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import api from '../../api';

export default function TaskNotificationPopup({ notification, onClose }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTransferResponse = async (action) => {
    if (!notification || !notification.taskId) return;
    try {
      setIsProcessing(true);
      await api.post(`/tasks/${notification.taskId}/transfer-response`, { action });
      onClose();
    } catch (error) {
      console.error('Error handling transfer response:', error);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };
  const formattedDueDate = notification?.dueDate
    ? format(parseISO(notification.dueDate), 'MMM d, yyyy')
    : null;
  const formattedTransferDate = notification?.transferMeta?.transferredAt
    ? format(parseISO(notification.transferMeta.transferredAt), 'MMM d, yyyy p')
    : null;

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
            className="relative w-full max-w-2xl rounded-[32px] border p-6 md:p-8 shadow-2xl"
            style={{
              background: 'linear-gradient(145deg, rgba(3,7,18,0.96), rgba(10,18,36,0.94))',
              borderColor: 'rgba(0,212,255,0.18)',
              backdropFilter: 'blur(30px)',
              boxShadow: '0 24px 90px rgba(0,0,0,0.58), 0 0 50px rgba(0,212,255,0.14)',
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-10 top-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.6), transparent)' }}
            />
            <div className="flex items-start justify-between gap-5">
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,212,255,0.18), rgba(191,0,255,0.18))',
                    border: '1px solid rgba(0,212,255,0.22)',
                    boxShadow: '0 0 24px rgba(0,212,255,0.08)',
                  }}
                >
                  <BellRing size={22} className="text-cyan-300" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-mono font-bold tracking-[0.28em] text-cyan-300/75">
                    LIVE ALERT
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                    {notification.title || 'New Task Assigned'}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {notification.type === 'task-transferred'
                      ? 'A task has been transferred into your manager queue and will remain visible until you close it.'
                      : notification.type === 'transfer-request'
                      ? 'A task transfer is pending your approval. Please accept or reject below.'
                      : 'A new task has been assigned and will remain visible here until you close it.'}
                  </p>

                  <div className="mt-6 rounded-3xl border border-white/8 bg-black/20 px-5 py-5">
                    <div className="flex items-center gap-2 text-cyan-300/80">
                      <ClipboardList size={15} />
                      <span className="text-[10px] font-mono tracking-[0.22em]">TASK TITLE</span>
                    </div>
                    <p className="mt-3 text-xl font-semibold text-white md:text-2xl">
                      {notification.taskTitle || notification.message || 'Assigned task'}
                    </p>
                    <p className="mt-4 text-sm leading-relaxed text-slate-300 md:text-base">
                      {notification.description || 'Open the task board to review the full assignment details.'}
                    </p>

                    {(notification.type === 'task-transferred' || notification.type === 'transfer-request') && notification.transferMeta && (
                      <div className="mt-5 rounded-2xl border border-purple-400/20 bg-purple-500/5 px-4 py-3 text-sm text-purple-100">
                        <p className="font-mono text-[10px] tracking-[0.18em] text-purple-300/70">TRANSFER DETAILS</p>
                        <p className="mt-2">
                          From: {notification.transferMeta.fromManagerName || 'Manager'}
                        </p>
                        <p className="mt-1">
                          Department: {notification.transferMeta.department || 'Unassigned'}
                        </p>
                        {formattedTransferDate && <p className="mt-1">Transferred: {formattedTransferDate}</p>}
                      </div>
                    )}

                    {formattedDueDate && (
                      <div className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-2 text-sm text-cyan-200">
                        <CalendarClock size={16} />
                        <span className="font-mono tracking-wide">Due: {formattedDueDate}</span>
                      </div>
                    )}

                    {notification.type === 'transfer-request' && (
                      <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/5 pt-4">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleTransferResponse('reject')}
                          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleTransferResponse('accept')}
                          className="rounded-xl bg-cyan-500/10 px-6 py-2.5 text-sm font-bold text-cyan-400 border border-cyan-500/20 transition-all hover:bg-cyan-500/20 hover:border-cyan-400 disabled:opacity-50"
                        >
                          {isProcessing ? 'Processing' : 'Accept Task'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition-colors hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
                aria-label="Close task notification"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
