import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Flag, CheckCircle2, Activity, AlertCircle, ArrowRight, User, Edit3, Trash2, X, FileText, FileSpreadsheet, Image as ImageIcon, Download } from 'lucide-react';
import { parseISO, isPast, isToday, differenceInHours, differenceInDays, format } from 'date-fns';
import { USERS } from '../../data/mockData';

import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

function getDueDateLabel(dueDate, reminderTime, t) {
  const deadline = reminderTime || dueDate;
  if (!deadline) return { label: 'No Date', color: 'var(--text-dim)', glow: 'transparent', overdue: false };
  
  let due;
  try {
    due = new Date(deadline);
    if (isNaN(due.getTime())) {
      due = parseISO(String(deadline));
    }
    if (!String(deadline).includes('T') && !isNaN(due.getTime())) {
      due.setHours(23, 59, 59);
    }
  } catch (e) {
    return { label: 'Invalid Date', color: 'var(--status-overdue)', glow: 'transparent', overdue: false };
  }

  if (isNaN(due.getTime())) {
    return { label: 'Invalid Date', color: 'var(--status-overdue)', glow: 'transparent', overdue: false };
  }

  const now = new Date();
  if (isPast(due)) {
    const days = Math.abs(differenceInDays(now, due));
    return { label: `${t('tag_overdue')} ${days}d`, color: 'var(--status-overdue)', overdue: true, glow: 'rgba(239,68,68,0.2)' };
  }
  const hours = differenceInHours(due, now);
  if (hours <= 24) {
    return { label: `${t('tag_due')} ${hours}h`, color: 'var(--status-pending)', dueSoon: true, glow: 'rgba(234,179,8,0.2)' };
  }
  const days = differenceInDays(due, now);
  return { label: `${days}d ${t('tag_left')}`, color: 'var(--secondary)', glow: 'transparent', overdue: false };
}

export default function TaskCard({ 
  task, 
  onEdit, 
  onDelete, 
  onStatusUpdate, 
  onTransferResponse,
  onEmployeeComment,
  onCompleteTask,
  showAssignee = true, 
  assigneeName = null, 
  index = 0,
  statusActionMode = 'default',
  highlighted = false,
}) {
  const [hovered, setHovered] = useState(false);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState(null);
  const { t } = useLanguage();
  const cardRef = useRef(null);

  const { currentUser } = useAuth();

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const PRIORITY_CONFIG = {
    Low:    { badge: 'badge-low',    neon: isDark ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.1)',   glow: '#10b981', label: `▼ ${t('priority_low')}` },
    Medium: { badge: 'badge-medium', neon: isDark ? 'rgba(234,179,8,0.3)' : 'rgba(234,179,8,0.1)',    glow: '#eab308', label: `► ${t('priority_medium')}` },
    High:   { badge: 'badge-high',   neon: isDark ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.15)',    glow: '#ef4444', label: `▲ ${t('priority_high')}` },
  };

  const STATUS_CONFIG = {
    'Pending':     { badge: 'badge-pending',    icon: Clock,        label: t('status_pending') },
    'In Progress': { badge: 'badge-inprogress', icon: Activity,     label: t('status_active') },
    'Completed':   { badge: 'badge-completed',  icon: CheckCircle2, label: t('status_done') },
  };

  // Real or Fallback Users
  const assignee = { name: assigneeName || USERS?.find(u => u.id === task.assignedTo)?.name || t('label_operator') };

  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Medium;
  const statusLabels = STATUS_CONFIG[task.status] || STATUS_CONFIG['Pending'];
  const StatusIcon = statusLabels.icon;
  const dueInfo = getDueDateLabel(task.dueDate, task.reminderTime, t);
  const dueMoment = task.reminderTime ? new Date(task.reminderTime) : null;
  const isEmployeeActionMode = statusActionMode === 'employee';
  const normalizedStatus = String(task.status || '').toLowerCase();
  const normalizedTransferStatus = String(task.transferStatus || '').toLowerCase();
  const isPendingTransferForCurrentUser =
    ['manager', 'admin'].includes(currentUser?.role) &&
    normalizedTransferStatus === 'pending' &&
    String(task.transferredToManagerId || '') === String(currentUser?._id);
  const isSentManagerTransfer =
    currentUser?.role === 'manager' &&
    normalizedTransferStatus === 'pending' &&
    String(task.transferredFromManagerId || '') === String(currentUser?._id);
  const safeDepartment = String(task.department || '');

  // Advanced 3D Tilt Effect on mouse movement
  const handleMouseMove = (e) => {
    if (!cardRef.current || window.innerWidth < 768) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    cardRef.current.style.transform = `perspective(1000px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateZ(10px)`;
  };

  const handleMouseLeave = () => {
    setHovered(false);
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) translateZ(0px)';
    }
  };

  const dynamicShadow = dueInfo.overdue
    ? (isDark ? '0 0 30px rgba(255,68,68,0.2), inset 0 0 30px rgba(255,68,68,0.05)' : '0 10px 30px rgba(239,68,68,0.15)')
    : hovered
    ? (isDark ? `0 20px 40px rgba(0,0,0,0.5), 0 0 40px ${priority.neon}` : `var(--shadow-lg), 0 10px 20px ${priority.neon}`)
    : 'var(--shadow-md)';

  useEffect(() => {
    if (highlighted) {
      cardRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [highlighted]);

  const handleDownloadAttachment = async (e, att) => {
    e.preventDefault();
    e.stopPropagation();

    const attachmentId = att.id || att.storedName || att.originalName;
    try {
      setDownloadingAttachmentId(attachmentId);
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
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative cursor-pointer group rounded-xl p-3 sm:p-4 overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md"
      style={{
        background: 'var(--bg-card)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${hovered ? (isDark ? priority.neon.replace('0.3', '0.5') : priority.glow) : 'var(--border-subtle)'}`,
        boxShadow: highlighted
          ? `0 0 0 2px rgba(34,211,238,0.35), 0 0 28px rgba(34,211,238,0.18), ${dynamicShadow}`
          : dynamicShadow,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 3D Holographic Inner Glow */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-500"
        style={{
          background: `radial-gradient(120% 120% at 50% -20%, ${priority.neon.replace('0.3', '0.1')}, transparent 80%)`,
          opacity: highlighted ? 1 : hovered ? (isDark ? 1 : 0.6) : (isDark ? 0.4 : 0.2),
        }}
      />

      {/* Header: Priority & Status */}
      <div className="relative z-10 flex items-start justify-between gap-2 mb-2 sm:mb-3" style={{ transform: hovered ? 'translateZ(15px)' : 'none', transition: 'transform 0.3s ease' }}>
        <div className="flex gap-1">
          <span className="text-[8px] sm:text-[9px] font-mono tracking-wider font-bold px-1.5 py-0.5 rounded border" 
            style={{ 
              background: isDark ? priority.neon : 'var(--bg-secondary)', 
              color: priority.glow, 
              borderColor: isDark ? `${priority.glow}30` : 'var(--border-subtle)',
            }}
          >
            {priority.label}
          </span>
          {dueInfo.overdue && (
            <span className="text-[8px] sm:text-[9px] font-mono tracking-wider font-bold px-1.5 py-0.5 rounded text-red-500 flex items-center gap-1 border border-red-500/20 bg-red-500/5">
              <AlertCircle size={8} /> {t('tag_ovr')}
            </span>
          )}
        </div>
        <span className="text-[8px] sm:text-[9px] font-mono tracking-wider font-bold px-1.5 py-0.5 rounded flex items-center gap-1 border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 shadow-sm" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
          <StatusIcon size={8} style={{ color: `var(--status-${statusLabels.label.toLowerCase().replace(' ', '')})` }} />
          {statusLabels.label}
        </span>
      </div>

      {/* Title */}
      <h3
        className="relative z-10 font-bold text-xs sm:text-sm mb-0.5 sm:mb-1 leading-tight transition-all duration-300 uppercase tracking-tight"
        style={{ 
          color: 'var(--text-primary)',
          transform: hovered ? 'translateZ(20px)' : 'none'
        }}
      >
        {task.title}
      </h3>

      {/* Description */}
      <p className="relative z-10 text-[11px] leading-relaxed mb-5 font-medium transition-all duration-300"
        style={{ 
          color: 'var(--text-secondary)', 
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          transform: hovered ? 'translateZ(15px)' : 'none'
        }}>
        {task.description}
      </p>

      {task.attachments && task.attachments.length > 0 && (
        <div className="relative z-10 mb-4 space-y-2" style={{ transform: hovered ? 'translateZ(15px)' : 'none' }}>
          <div className="flex flex-wrap gap-2">
            {task.attachments.map((att) => (
              <div key={att.id || att.storedName} className="flex items-center gap-1">
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] font-mono px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-300 transition-colors"
                >
                  {att.originalName}
                </a>
                <button
                  type="button"
                  onClick={(e) => handleDownloadAttachment(e, att)}
                  className="p-1 rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-500 hover:text-indigo-600 dark:hover:text-cyan-300 transition-colors"
                  title={downloadingAttachmentId === (att.id || att.storedName || att.originalName) ? 'Downloading...' : 'Download'}
                >
                  <Download size={10} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {task.attachments.map((att) => (
              att.isImage ? (
                <div key={`preview-${att.id || att.storedName}`} className="flex items-center gap-1">
                  <a href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                    <img
                      src={att.url}
                      alt={att.originalName}
                      className="h-12 w-12 rounded-lg object-cover border border-slate-200 dark:border-white/10"
                    />
                  </a>
                  <button
                    type="button"
                    onClick={(e) => handleDownloadAttachment(e, att)}
                    className="p-1 rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-500 hover:text-indigo-600 dark:hover:text-cyan-300 transition-colors"
                    title={downloadingAttachmentId === (att.id || att.storedName || att.originalName) ? 'Downloading...' : 'Download'}
                  >
                    <Download size={10} />
                  </button>
                </div>
              ) : (
                <div key={`icon-${att.id || att.storedName}`} className="flex items-center gap-1">
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-[9px] font-mono text-slate-600 dark:text-slate-300"
                  >
                    {att.isPdf ? <FileText size={10} /> : att.isExcel ? <FileSpreadsheet size={10} /> : <ImageIcon size={10} />}
                    {att.isPdf ? 'PDF' : att.isExcel ? 'XLS' : 'FILE'}
                  </a>
                  <button
                    type="button"
                    onClick={(e) => handleDownloadAttachment(e, att)}
                    className="p-1 rounded-md border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-500 hover:text-indigo-600 dark:hover:text-cyan-300 transition-colors"
                    title={downloadingAttachmentId === (att.id || att.storedName || att.originalName) ? 'Downloading...' : 'Download'}
                  >
                    <Download size={10} />
                  </button>
                </div>
              )
            ))}
          </div>
        </div>
        )}
        {task.employeeComment && (
          <div className="relative z-10 mb-3 rounded-xl border border-amber-500/15 bg-amber-500/5 px-3 py-2" style={{ transform: hovered ? 'translateZ(15px)' : 'none' }}>
            <p className="text-[9px] font-mono tracking-[0.18em] uppercase text-amber-500 dark:text-amber-300">
              Comment
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-700 dark:text-slate-200">
              {task.employeeComment}
            </p>
          </div>
        )}

      {/* Date & Alert Row */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-2 sm:mb-3 transition-all duration-300" 
           style={{ transform: hovered ? 'translateZ(15px)' : 'none' }}>
        <div className="flex items-center gap-2 sm:gap-2.5 text-[8px] sm:text-[9px] font-mono">
          <span className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
            <Calendar size={8} />
            {(() => {
              try {
                const sDate = new Date(task.startDate || task.createdAt);
                return isNaN(sDate.getTime()) ? '---' : format(sDate, 'MMM d');
              } catch (e) {
                return '---';
              }
            })()}
          </span>
          <span className="flex items-center gap-1 font-bold" style={{ color: dueInfo.color }}>
            <Clock size={8} />
            {dueInfo.label.toUpperCase()}
            {dueMoment && !isNaN(dueMoment.getTime()) && (
              <span className="font-normal opacity-80">
                • {format(dueMoment, 'h:mm a')}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Footer Area */}
      <div className="relative z-10 pt-4 mt-4 transition-all duration-300"
        style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)', transform: hovered ? 'translateZ(20px)' : 'none' }}>
        
        {/* Top Row: Dept & Assignee */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2 sm:mb-3">
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
            <span className="text-[7.5px] sm:text-[8.5px] font-mono tracking-wider px-1 py-0.5 rounded bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/5 uppercase" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
              {safeDepartment ? (t(`dept_${safeDepartment.toLowerCase()}`) || safeDepartment.toUpperCase()) : t('msg_unassigned')}
            </span>
            {showAssignee && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5" style={{ borderColor: 'var(--border-subtle)' }}>
                <User size={8} className="text-slate-400" />
                <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                  {assignee.name.toUpperCase()}
                </span>
              </div>
            )}
          </div>
          
          {/* Status Indicators */}
          {!onStatusUpdate && (
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[7.5px] sm:text-[9px] font-bold border ${
              task.status === 'Completed' ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500' :
              task.status === 'In Progress' ? 'bg-cyan-500/5 border-cyan-500/10 text-cyan-500' :
              'bg-amber-500/5 border-amber-500/10 text-amber-500'
            }`}>
              <div className={`w-1 h-1 rounded-full ${
                task.status === 'Completed' ? 'bg-emerald-500' :
                task.status === 'In Progress' ? 'bg-cyan-500' :
                'bg-amber-500'
              }`} />
              {statusLabels.label.toUpperCase()}
            </div>
          )}
        </div>

      {/* Bottom Row: Actions & Status Update */}
      <div className="flex flex-wrap items-center gap-2">
        {onStatusUpdate && isEmployeeActionMode && normalizedStatus === 'pending' && (
          <div className="flex w-full gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                if (isPendingTransferForCurrentUser && typeof onTransferResponse === 'function') {
                  onTransferResponse(task.id, 'accept');
                  return;
                }
                onStatusUpdate(task.id, 'In Progress');
              }}
              className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-mono font-bold tracking-widest uppercase text-white shadow-md transition-transform hover:scale-[1.01]"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof onEmployeeComment === 'function') {
                  onEmployeeComment(task);
                }
              }}
              className="flex-1 rounded-xl bg-amber-500 dark:bg-amber-400 px-3 py-2 text-[10px] font-mono font-bold tracking-widest uppercase text-white dark:text-black shadow-md transition-transform hover:scale-[1.01]"
            >
              {task.employeeComment ? 'Edit Comment' : 'Comment'}
            </button>
          </div>
        )}
        {onStatusUpdate && isEmployeeActionMode && normalizedStatus === 'in progress' && (
          <div className="flex-1 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                if (typeof onCompleteTask === 'function') {
                  onCompleteTask(task);
                  return;
                }
                onStatusUpdate(task.id, 'Completed');
              }}
              className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-mono font-bold tracking-widest uppercase text-white shadow-md transition-transform hover:scale-[1.01]"
            >
              Complete
            </button>
          </div>
        )}
        {onStatusUpdate && isEmployeeActionMode && normalizedStatus === 'completed' && (
          <div className="flex-1 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
            <div className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[10px] font-mono font-bold tracking-widest uppercase text-emerald-600 dark:text-emerald-400 text-center">
              Completed
            </div>
          </div>
        )}
        {onTransferResponse && isPendingTransferForCurrentUser && !isEmployeeActionMode && (
          <div className="flex w-full gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onTransferResponse(task.id, 'accept')}
              className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-mono font-bold tracking-widest uppercase text-white shadow-md transition-transform hover:scale-[1.01]"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof onEmployeeComment === 'function') {
                  onEmployeeComment(task);
                }
              }}
              className="flex-1 rounded-xl bg-amber-500 dark:bg-amber-400 px-3 py-2 text-[10px] font-mono font-bold tracking-widest uppercase text-white dark:text-black shadow-md transition-transform hover:scale-[1.01]"
            >
              Comment
            </button>
          </div>
        )}
        {onStatusUpdate && !isEmployeeActionMode && !isPendingTransferForCurrentUser && (
            <div className="flex-1 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
              <select
                value={task.status}
                onChange={(e) => onStatusUpdate(task.id, e.target.value)}
                className="w-full text-[10px] font-mono font-bold tracking-widest px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/40 text-slate-800 dark:text-white cursor-pointer appearance-none transition-all focus:outline-none focus:border-purple-500/50 hover:bg-white/80 dark:hover:bg-black/60 shadow-md"
                style={{
                  backgroundImage: isDark 
                    ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`
                    : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(15,23,42,0.4)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 10px center',
                }}
              >
                <option value="Pending">⏳ {t('status_pending')}</option>
                <option value="In Progress">🔄 {t('status_active')}</option>
                <option value="Completed">✅ {t('status_done')}</option>
              </select>
            </div>
          )}

        {isSentManagerTransfer && !isPendingManagerTransfer && (
          <div className="flex-1 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
            <div className="w-full rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[10px] font-mono font-bold tracking-widest uppercase text-amber-600 dark:text-amber-400 text-center">
              Awaiting Manager
            </div>
          </div>
        )}

           <div className="flex items-center gap-1.5 w-full justify-between sm:w-auto">
            <div className="flex items-center gap-1">
              {onEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                  className="flex items-center justify-center p-1.5 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-cyan-400 transition-all shadow-sm"
                >
                  <Edit3 size={11} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); if(window.confirm(t('msg_confirm_delete') || 'Are you sure you want to delete this task?')) onDelete(task.id || task._id); }}
                  className="flex items-center justify-center p-1.5 rounded-lg border border-red-500/10 bg-red-500/5 text-red-500/60 hover:text-red-500 transition-all shadow-sm"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic 3D Priority Glow Line at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl transition-all duration-500 opacity-0 group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, transparent, ${priority.glow}, transparent)`,
          boxShadow: `0 0 20px ${priority.glow}`,
          transform: hovered ? 'translateZ(30px) scaleX(1)' : 'translateZ(0) scaleX(0)',
        }}
      />
    </motion.div>
  );
}
