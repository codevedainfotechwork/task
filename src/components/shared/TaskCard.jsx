import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Flag, CheckCircle2, Activity, AlertCircle, ArrowRight, User, Edit3 } from 'lucide-react';
import { parseISO, isPast, isToday, differenceInHours, differenceInDays, format } from 'date-fns';
import { USERS } from '../../data/mockData';

import { useLanguage } from '../../contexts/LanguageContext';

function getDueDateLabel(dueDate, t) {
  const due = parseISO(dueDate + 'T23:59:59');
  const now = new Date();
  if (isPast(due)) {
    const days = Math.abs(differenceInDays(now, due));
    return { label: `${t('tag_overdue')} ${days}d`, color: '#ff4444', overdue: true, glow: 'rgba(255,68,68,0.4)' };
  }
  const hours = differenceInHours(due, now);
  if (hours <= 24) {
    return { label: `${t('tag_due')} ${hours}h`, color: '#eab308', dueSoon: true, glow: 'rgba(234,179,8,0.3)' };
  }
  const days = differenceInDays(due, now);
  return { label: `${days}d ${t('tag_left')}`, color: 'rgba(0,212,255,0.6)', glow: 'transparent', overdue: false };
}

export default function TaskCard({ task, onEdit, onTransfer, onStatusUpdate, showAssignee = false, assigneeName = null, index = 0 }) {
  const [hovered, setHovered] = useState(false);
  const { t } = useLanguage();
  const cardRef = useRef(null);
  
  const PRIORITY_CONFIG = {
    Low:    { badge: 'badge-low',    neon: 'rgba(16,185,129,0.3)',   glow: '#10b981', label: `▼ ${t('priority_low')}` },
    Medium: { badge: 'badge-medium', neon: 'rgba(234,179,8,0.3)',    glow: '#eab308', label: `► ${t('priority_med')}` },
    High:   { badge: 'badge-high',   neon: 'rgba(239,68,68,0.4)',    glow: '#ef4444', label: `▲ ${t('priority_high')}` },
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
  const dueInfo = getDueDateLabel(task.dueDate, t);

  // Advanced 3D Tilt Effect on mouse movement
  const handleMouseMove = (e) => {
    if (!cardRef.current || window.innerWidth < 768) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    cardRef.current.style.transform = `perspective(1000px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateZ(10px)`;
  };

  const handleMouseLeave = () => {
    setHovered(false);
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) translateZ(0px)';
    }
  };

  const dynamicShadow = dueInfo.overdue
    ? '0 0 30px rgba(255,68,68,0.2), inset 0 0 30px rgba(255,68,68,0.05)'
    : hovered
    ? `0 20px 40px rgba(0,0,0,0.1), 0 0 40px ${priority.neon}`
    : '0 8px 30px rgba(0,0,0,0.1)';

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative cursor-pointer group rounded-2xl p-5 overflow-hidden transition-all duration-300"
      style={{
        background: 'var(--bg-card)',
        backdropFilter: 'blur(24px)',
        border: `1px solid ${hovered ? priority.neon.replace('0.3', '0.6') : 'var(--border-subtle)'}`,
        boxShadow: dynamicShadow,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 3D Holographic Inner Glow */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-500"
        style={{
          background: `radial-gradient(120% 120% at 50% -20%, ${priority.neon.replace('0.3', '0.1')}, transparent 80%)`,
          opacity: hovered ? 1 : 0.4,
        }}
      />

      {/* Header: Priority & Status */}
      <div className="relative z-10 flex items-start justify-between gap-3 mb-4" style={{ transform: hovered ? 'translateZ(20px)' : 'none', transition: 'transform 0.3s ease' }}>
        <div className="flex gap-2">
          <span className="text-[10px] font-mono tracking-widest font-bold px-2 py-1 rounded border" style={{ background: priority.neon, color: priority.glow, borderColor: `${priority.glow}40`, boxShadow: `0 0 10px ${priority.neon}` }}>
            {priority.label}
          </span>
          {dueInfo.overdue && (
            <span className="text-[10px] font-mono tracking-widest font-bold px-2 py-1 rounded text-red-500 flex flex-center gap-1 border border-red-500/30 bg-red-500/10">
              <AlertCircle size={10} /> {t('tag_ovr')}
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono tracking-widest font-bold px-2 py-1 rounded flex items-center gap-1 border border-slate-700 bg-slate-800/50 text-slate-300 shadow-sm">
          <StatusIcon size={10} style={{ color: statusLabels.label === 'DONE' ? '#00ff88' : statusLabels.label === 'ACTIVE' ? '#00d4ff' : '#eab308' }} />
          {statusLabels.label}
        </span>
      </div>

      {/* Title */}
      <h3
        className="relative z-10 font-bold text-[15px] mb-2 leading-snug transition-all duration-300"
        style={{ 
          color: 'var(--text-primary)',
          textShadow: hovered ? `0 0 20px ${priority.glow}40` : 'none',
          transform: hovered ? 'translateZ(25px)' : 'none'
        }}
      >
        {task.title}
      </h3>

      {/* Description */}
      <p className="relative z-10 text-[11px] leading-relaxed mb-5 font-medium transition-all duration-300"
        style={{ 
          color: 'var(--text-secondary', 
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          transform: hovered ? 'translateZ(15px)' : 'none'
        }}>
        {task.description}
      </p>

      {/* Date & Dept Row */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-4 transition-all duration-300" 
           style={{ transform: hovered ? 'translateZ(20px)' : 'none' }}>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1.5" style={{ color: 'rgba(0,212,255,0.6)' }}>
            <Calendar size={10} style={{ filter: 'drop-shadow(0 0 5px rgba(0,212,255,0.5))' }} />
            {format(parseISO(task.startDate), 'MMM d')}
          </span>
          <span className="flex items-center gap-1.5 font-bold" style={{ color: dueInfo.color }}>
            <Clock size={10} style={{ filter: `drop-shadow(0 0 5px ${dueInfo.color})` }} />
            {dueInfo.label}
          </span>
        </div>
      </div>

      {/* Footer Area */}
      <div className="relative z-10 pt-4 mt-4 transition-all duration-300"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', transform: hovered ? 'translateZ(20px)' : 'none' }}>
        
        {/* Top Row: Dept & Assignee */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono tracking-wider px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5 uppercase">
              {t(`dept_${task.department.toLowerCase()}`) || task.department.toUpperCase()}
            </span>
            {showAssignee && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-500/5 border border-cyan-500/10">
                <User size={10} className="text-cyan-400" />
                <span className="text-[10px] font-medium text-cyan-100/80 tracking-tight">
                  {assignee.name.toUpperCase()}
                </span>
              </div>
            )}
          </div>
          
          {/* Status Badge (Static display if not updating) */}
          {!onStatusUpdate && (
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              task.status === 'Completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
              task.status === 'In Progress' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' :
              'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}>
              <div className={`w-1 h-1 rounded-full animate-pulse ${
                task.status === 'Completed' ? 'bg-emerald-400' :
                task.status === 'In Progress' ? 'bg-cyan-400' :
                'bg-amber-400'
              }`} />
              {statusLabels.label.toUpperCase()}
            </div>
          )}
        </div>

        {/* Bottom Row: Actions & Status Update */}
        <div className="flex flex-wrap items-center gap-2">
          {onStatusUpdate && (
            <div className="flex-1 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
              <select
                value={task.status}
                onChange={(e) => onStatusUpdate(task.id, e.target.value)}
                className="w-full text-[10px] font-mono font-bold tracking-widest px-3 py-2 rounded-xl border border-white/10 bg-black/40 text-white cursor-pointer appearance-none transition-all focus:outline-none focus:border-purple-500/50 hover:bg-black/60 shadow-lg"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
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

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                className="flex items-center justify-center p-2 rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-300 hover:border-cyan-500/30 transition-all duration-300 group/btn"
                title={t('tooltip_edit')}
              >
                <Edit3 size={14} className="group-hover/btn:rotate-12 transition-transform" />
              </button>
            )}
            {onTransfer && (
              <button
                onClick={(e) => { e.stopPropagation(); onTransfer(task); }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-purple-500/20 bg-purple-500/5 text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/40 transition-all duration-300 group/tfr"
              >
                <span className="text-[10px] font-bold tracking-tighter uppercase">{t('task_transfer_btn')}</span>
                <ArrowRight size={12} className="group-hover/tfr:translate-x-0.5 transition-transform" />
              </button>
            )}
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
