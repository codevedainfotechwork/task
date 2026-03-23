import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useTask } from '../../contexts/TaskContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import TaskCard from '../../components/shared/TaskCard';
import SearchBar from '../../components/shared/SearchBar';
import EmptyState from '../../components/shared/EmptyState';
import { DashboardSkeleton } from '../../components/shared/LoadingSkeleton';
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import { parseISO, isToday, isBefore, isAfter, format } from 'date-fns';

function isOverdue(task)  { return isBefore(parseISO(task.dueDate + 'T23:59:59'), new Date()) && task.status !== 'Completed'; }
function isTaskToday(task){ return task.status !== 'Completed' && isToday(parseISO(task.dueDate)) && !isOverdue(task); }
function isUpcoming(task) { const d = parseISO(task.dueDate + 'T23:59:59'); return task.status !== 'Completed' && isAfter(d, new Date()) && !isToday(parseISO(task.dueDate)); }

// Animated circular progress ring
function RingProgress({ value, size = 80, stroke = 6, color = '#00d4ff', label }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
          <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold" style={{ color }}>{value}%</span>
        </div>
      </div>
      {label && <span className="text-[10px] font-mono" style={{ color: 'rgba(0,212,255,0.5)' }}>{label}</span>}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, glow, border, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4, ease: [0.23,1,0.32,1] }}
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: 'rgba(8,18,36,0.7)',
        border: `1px solid ${border}`,
        backdropFilter: 'blur(20px)',
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${glow}`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono font-semibold tracking-wider" style={{ color: 'rgba(148,163,184,0.6)' }}>{label}</span>
        <Icon size={15} style={{ color, filter: `drop-shadow(0 0 6px ${color})` }} />
      </div>
      <motion.p
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: index * 0.07 + 0.2, type: 'spring', stiffness: 200 }}
        className="text-3xl font-bold"
        style={{ color, textShadow: `0 0 20px ${glow}` }}
      >
        {value}
      </motion.p>
      {/* Glow bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)`, boxShadow: `0 0 10px ${color}` }} />
    </motion.div>
  );
}

function SectionHeader({ title, count, iconColor }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="h-px flex-1 max-w-[40px]" style={{ background: `linear-gradient(90deg, transparent, ${iconColor})` }} />
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full"
        style={{ background: `${iconColor}15`, border: `1px solid ${iconColor}33` }}>
        <Zap size={11} style={{ color: iconColor, filter: `drop-shadow(0 0 4px ${iconColor})` }} />
        <span className="text-[11px] font-mono font-bold tracking-widest" style={{ color: iconColor }}>{title}</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md"
          style={{ background: `${iconColor}20`, color: iconColor }}>{count}</span>
      </div>
      <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${iconColor}, transparent)` }} />
    </div>
  );
}

export default function EmployeeDashboard() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const { getTasksForUser, editTask, loading } = useTask();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const allTasks = useMemo(() => getTasksForUser('employee', currentUser.id, []), [currentUser, getTasksForUser]);

  const filtered = useMemo(() => {
    let list = allTasks;
    if (search) list = list.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== 'All') list = list.filter(t => t.status === statusFilter);
    if (priorityFilter !== 'All') list = list.filter(t => t.priority === priorityFilter);
    return list;
  }, [allTasks, search, statusFilter, priorityFilter]);

  const overdueTasks  = useMemo(() => filtered.filter(isOverdue),  [filtered]);
  const todayTasks    = useMemo(() => filtered.filter(isTaskToday), [filtered]);
  const upcomingTasks = useMemo(() => filtered.filter(isUpcoming),  [filtered]);
  const completedTasks = useMemo(() => filtered.filter(t => t.status === 'Completed'), [filtered]);

  if (loading) {
    return (
      <div className="p-8">
        <DashboardSkeleton />
      </div>
    );
  }

  const total     = allTasks.length;
  const completed = allTasks.filter(t => t.status === 'Completed').length;
  const pending   = allTasks.filter(t => t.status === 'Pending').length;
  const progress  = total ? Math.round((completed / total) * 100) : 0;

  const STATUS_OPTIONS   = ['All', 'Pending', 'In Progress', 'Completed'];
  const PRIORITY_OPTIONS = ['All', 'Low', 'Medium', 'High'];

  const { addToast } = useToast();

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      await editTask(taskId, { status: newStatus });
      addToast(t('msg_task_update_success').replace('{status}', newStatus), 'cyber');
    } catch (err) {
      addToast(err.response?.data?.message || err.message, 'error');
    }
  };

  const renderGrid = (tasks, showEmpty = true) => {
    if (!tasks.length && showEmpty) return <EmptyState title={t('msg_no_tasks_found')} description={t('msg_tasks_appear_here')} />;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((task, i) => <TaskCard key={task.id} task={task} index={i} onStatusUpdate={handleStatusUpdate} />)}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'rgba(0,212,255,0.4)' }}>
            // {t('welcome_back')}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-wide">
          <span className="text-slate-100 uppercase">{t('hello')}, </span>
          <span className="neon-text-blue">{currentUser.name.split(' ')[0].toUpperCase()}</span>
          <span className="text-2xl ml-2">⚡</span>
        </h1>
        <p className="text-[11px] font-mono mt-1 uppercase" style={{ color: 'rgba(0,212,255,0.35)' }}>
          {t('sys_date')} :: {format(new Date(), "EEEE, MMMM do yyyy").toUpperCase()}
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label={t('stat_total_tasks')}  value={total}     icon={TrendingUp}    color="#00d4ff" glow="rgba(0,212,255,0.1)"  border="rgba(0,212,255,0.15)" index={0} />
        <StatCard label={t('stat_completed')}    value={completed} icon={CheckCircle2}  color="#00ff88" glow="rgba(0,255,136,0.1)"  border="rgba(0,255,136,0.15)" index={1} />
        <StatCard label={t('stat_pending')}      value={pending}   icon={Clock}         color="#eab308" glow="rgba(234,179,8,0.1)"  border="rgba(234,179,8,0.15)"  index={2} />
        <StatCard label={t('stat_overdue')}      value={overdueTasks.length} icon={AlertTriangle} color="#ff4444" glow="rgba(255,68,68,0.12)" border="rgba(255,68,68,0.2)" index={3} />
      </div>

      {/* Progress + Ring */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="rounded-2xl p-4 md:p-5 mb-8 flex flex-col md:flex-row items-center md:items-stretch gap-6 text-center md:text-left"
        style={{
          background: 'rgba(8,18,36,0.7)',
          border: '1px solid rgba(0,212,255,0.1)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <RingProgress value={progress} size={90} color="#00d4ff" />
        <div className="flex-1 w-full">
          <div className="flex flex-col md:flex-row items-center justify-between gap-1 mb-2">
            <span className="text-sm font-semibold text-slate-200 uppercase">{t('mission_progress')}</span>
            <span className="text-sm font-mono text-cyan-400">{completed}/{total} {t('stat_completed')}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, delay: 0.4, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #00d4ff, #bf00ff)', boxShadow: '0 0 10px rgba(0,212,255,0.4)' }}
            />
          </div>
          <p className="text-[10px] font-mono mt-2" style={{ color: 'rgba(0,212,255,0.35)' }}>
            {overdueTasks.length > 0 ? `⚠ ${overdueTasks.length} ${t('overdue_tasks_alert')}` : `✓ ${t('all_tasks_on_schedule')}`}
          </p>
        </div>
      </motion.div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <SearchBar value={search} onChange={setSearch} className="w-full sm:w-60" placeholder={t('search_directives')} />
        <div className="cyber-tab-bar w-full md:w-auto overflow-x-auto scrollbar-hide py-1 flex-shrink-0">
          <button onClick={() => setStatusFilter('All')} className={`cyber-tab flex-shrink-0 ${statusFilter === 'All' ? 'active' : ''}`}>{t('all_statuses')}</button>
          <button onClick={() => setStatusFilter('Pending')} className={`cyber-tab flex-shrink-0 ${statusFilter === 'Pending' ? 'active' : ''}`}>{t('status_pending')}</button>
          <button onClick={() => setStatusFilter('In Progress')} className={`cyber-tab flex-shrink-0 ${statusFilter === 'In Progress' ? 'active' : ''}`}>{t('status_active')}</button>
          <button onClick={() => setStatusFilter('Completed')} className={`cyber-tab flex-shrink-0 ${statusFilter === 'Completed' ? 'active' : ''}`}>{t('status_done')}</button>
        </div>
        <div className="cyber-tab-bar w-full md:w-auto overflow-x-auto scrollbar-hide py-1 flex-shrink-0">
          <button onClick={() => setPriorityFilter('All')} className={`cyber-tab flex-shrink-0 ${priorityFilter === 'All' ? 'active' : ''}`}>{t('all_priorities') || 'ALL PRIORITIES'}</button>
          <button onClick={() => setPriorityFilter('Low')} className={`cyber-tab flex-shrink-0 ${priorityFilter === 'Low' ? 'active' : ''}`}>{t('priority_low')}</button>
          <button onClick={() => setPriorityFilter('Medium')} className={`cyber-tab flex-shrink-0 ${priorityFilter === 'Medium' ? 'active' : ''}`}>{t('priority_med')}</button>
          <button onClick={() => setPriorityFilter('High')} className={`cyber-tab flex-shrink-0 ${priorityFilter === 'High' ? 'active' : ''}`}>{t('priority_high')}</button>
        </div>
      </div>

      {filtered.length === 0 && (
        <EmptyState title={t('msg_no_tasks_found')} description={t('msg_tasks_appear_here')} />
      )}

      {overdueTasks.length > 0 && (
        <section className="mb-10">
          <SectionHeader title={t('critical_overdue')} count={overdueTasks.length} iconColor="#ff4444" />
          {renderGrid(overdueTasks, false)}
        </section>
      )}

      {todayTasks.length > 0 && (
        <section className="mb-10">
          <SectionHeader title={t('today_due')} count={todayTasks.length} iconColor="#00d4ff" />
          {renderGrid(todayTasks, false)}
        </section>
      )}

      {upcomingTasks.length > 0 && (
        <section className="mb-10">
          <SectionHeader title={t('upcoming_queued')} count={upcomingTasks.length} iconColor="#bf00ff" />
          {renderGrid(upcomingTasks, false)}
        </section>
      )}

      {completedTasks.length > 0 && (
        <section className="mb-10">
          <SectionHeader title={t('completed_editable')} count={completedTasks.length} iconColor="#00ff88" />
          {renderGrid(completedTasks, false)}
        </section>
      )}
    </div>
  );
}
