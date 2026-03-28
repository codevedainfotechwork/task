import { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useTask } from '../../contexts/TaskContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import TaskCard from '../../components/shared/TaskCard';
import Modal from '../../components/shared/Modal';
import SearchBar from '../../components/shared/SearchBar';
import EmptyState from '../../components/shared/EmptyState';
import { DashboardSkeleton } from '../../components/shared/LoadingSkeleton';
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, Activity as ActivityIcon, Zap, Plus, Users, CalendarDays, MessageSquare } from 'lucide-react';
import { parseISO, isToday, isBefore, isAfter, format } from 'date-fns';
import api from '../../api';

function getDeadline(task) {
  if (task?.reminderTime) return new Date(task.reminderTime);
  if (task?.dueDate) return parseISO(`${String(task.dueDate).slice(0, 10)}T23:59:59`);
  return null;
}
function isOverdue(task)  { const deadline = getDeadline(task); return !!deadline && isBefore(deadline, new Date()) && task.status !== 'Completed'; }
function isTaskToday(task){ const deadline = getDeadline(task); return task.status !== 'Completed' && !!deadline && isToday(deadline) && !isOverdue(task); }
function isUpcoming(task) { const deadline = getDeadline(task); return task.status !== 'Completed' && !!deadline && isAfter(deadline, new Date()) && !isToday(deadline); }

function StatCard({ label, value, icon: Icon, color, glow, border, index, onClick, compact = false }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4, ease: [0.23,1,0.32,1] }}
      onClick={onClick}
      className={`rounded-2xl relative overflow-hidden holo-card transition-all duration-300 ${compact ? 'p-3.5' : 'p-5'} ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
      style={{
        boxShadow: isDark ? `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${glow}20` : 'var(--shadow-md)',
      }}
    >
      <div className={`flex items-start justify-between ${compact ? 'mb-2' : 'mb-3'}`}>
        <span className={`font-mono font-semibold tracking-wider text-slate-500 dark:text-slate-400/60 uppercase ${compact ? 'text-[9px]' : 'text-[10px]'}`}>{label}</span>
        <div className="flex items-center gap-1">
          <span
            className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} rounded-full border`}
            style={{
              background: `${color}14`,
              borderColor: `${color}30`,
              boxShadow: `0 0 8px ${color}18`,
            }}
          />
          <div className={`${compact ? 'h-5 w-5' : 'h-6 w-6'} flex items-center justify-center rounded-full border`}
            style={{ background: `${color}12`, borderColor: `${color}28`, boxShadow: `0 0 8px ${color}10` }}>
            <Icon size={compact ? 10 : 11} style={{ color, filter: `drop-shadow(0 0 4px ${color})` }} />
          </div>
        </div>
      </div>
      <motion.p
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: index * 0.07 + 0.2, type: 'spring', stiffness: 200 }}
        className={compact ? 'text-2xl font-bold text-slate-900 dark:text-white' : 'text-3xl font-bold text-slate-900 dark:text-white'}
        style={{ textShadow: isDark ? `0 0 20px ${glow}40` : 'none' }}
      >
        {value}
      </motion.p>
      {/* Glow bottom accent */}
      <div className={`absolute bottom-0 left-0 right-0 ${compact ? 'h-0.5' : 'h-0.5'}`}
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)`, boxShadow: isDark ? `0 0 10px ${color}` : 'none' }} />
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

function DonutAnalytics({ total, segments }) {
  const visibleSegments = segments.filter((segment) => segment.count > 0);
  const fallbackSegments = visibleSegments.length > 0 ? visibleSegments : [{ label: 'No tasks', count: 1, color: '#e2e8f0' }];
  const totalCount = visibleSegments.reduce((sum, segment) => sum + segment.count, 0) || total || 1;

  let cursor = 0;
  const stops = fallbackSegments.map((segment) => {
    const start = cursor;
    const portion = (segment.count / totalCount) * 100;
    cursor += portion;
    return `${segment.color} ${start}% ${cursor}%`;
  });

  return (
    <div
      className="rounded-3xl border p-4 md:p-5 holo-card"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-subtle)',
        backdropFilter: 'blur(22px)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-5">
        <div>
          <p className="text-[10px] font-mono font-bold tracking-[0.22em] uppercase text-indigo-600 dark:text-cyan-300/70">
            Employee Analytics
          </p>
          <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
            Task status breakdown
          </h3>
        </div>
        <div className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-slate-500 dark:text-slate-400">
          {total} Tasks
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-5 items-center">
        <div className="flex items-center justify-center">
          <div className="relative h-56 w-56 sm:h-64 sm:w-64">
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: `conic-gradient(${stops.join(', ')})` }}
            />
            <div
              className="absolute inset-[16px] rounded-full"
              style={{
                background: 'var(--bg-card)',
                boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.18), inset 0 0 30px rgba(255,255,255,0.7)',
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {total}
              </div>
              <div className="mt-1 text-[10px] font-mono font-bold tracking-[0.24em] uppercase text-slate-500 dark:text-slate-400">
                Total Tasks
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fallbackSegments.map((segment, index) => {
            const percent = totalCount ? Math.round((segment.count / totalCount) * 100) : 0;
            return (
              <div
                key={segment.label}
                className="rounded-2xl border px-4 py-4 bg-white/80 dark:bg-white/5"
                style={{
                  borderColor: 'var(--border-subtle)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3.5 w-3.5 rounded-full"
                      style={{
                        background: segment.color,
                        boxShadow: `0 0 10px ${segment.color}55`,
                      }}
                    />
                    <div>
                      <div className="text-[10px] font-mono font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">
                        {segment.label}
                      </div>
                      <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {segment.count}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold" style={{ color: segment.color }}>
                      {percent}%
                    </div>
                    <div className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase text-slate-400">
                      {index === 0 ? 'Main' : 'Status'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-[10px] font-mono font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">
        {fallbackSegments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: segment.color }} />
            <span>{segment.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EmployeeDashboard() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { getTasksForUser, editTask, refreshTasks, loading, createTask } = useTask();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [activeView, setActiveView] = useState('TASKS');
  const [activeStatDetail, setActiveStatDetail] = useState(null);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [completionTaskId, setCompletionTaskId] = useState(null);
  const [completionDescription, setCompletionDescription] = useState('');
  const [completionFiles, setCompletionFiles] = useState([]);
  const [submittingCompletion, setSubmittingCompletion] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentTaskId, setCommentTaskId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [sendTaskOpen, setSendTaskOpen] = useState(false);
  const [departmentDirectory, setDepartmentDirectory] = useState([]);
  const [loadingDirectory, setLoadingDirectory] = useState(true);
  const [managerSearch, setManagerSearch] = useState('');
  const [showManagerSuggestions, setShowManagerSuggestions] = useState(false);
  const primaryDepartment = currentUser?.department?.[0] || '';
  const [sendTaskForm, setSendTaskForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    assigneeRole: 'manager',
    department: primaryDepartment,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    dueTime: format(new Date(), 'HH:mm'),
    priority: 'Medium',
  });
  const [sendTaskFiles, setSendTaskFiles] = useState([]);
  const managerBoxRef = useRef(null);
  const [helpRequests, setHelpRequests] = useState([]);
  const [loadingHelpRequests, setLoadingHelpRequests] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpForm, setHelpForm] = useState({
    subject: '',
    description: '',
  });
  const [submittingHelpRequest, setSubmittingHelpRequest] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const location = useLocation();

  const allTasks = useMemo(() => getTasksForUser('employee', currentUser?.id || currentUser?._id, []), [currentUser, getTasksForUser]);

  useEffect(() => {
    const fetchDirectory = async () => {
      setLoadingDirectory(true);
      try {
        const res = await api.get('/manager/directory');
        setDepartmentDirectory(res.data || []);
      } catch (err) {
        console.error('Failed to fetch manager directory', err);
      } finally {
        setLoadingDirectory(false);
      }
    };

    fetchDirectory();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (managerBoxRef.current && !managerBoxRef.current.contains(event.target)) {
        setShowManagerSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeView === 'HELP') {
      fetchHelpRequests();
    }
  }, [activeView]);

  useEffect(() => {
    const handleHelpRequestsUpdated = () => {
      if (activeView === 'HELP') {
        fetchHelpRequests();
      }
    };

    window.addEventListener('help-requests-updated', handleHelpRequestsUpdated);
    return () => window.removeEventListener('help-requests-updated', handleHelpRequestsUpdated);
  }, [activeView]);

  useEffect(() => {
    if (activeView !== 'HELP') return undefined;
    const intervalId = window.setInterval(() => {
      fetchHelpRequests();
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [activeView]);

  useEffect(() => {
    if (currentUser?.department?.length) {
      setSendTaskForm((prev) => ({
        ...prev,
        department: primaryDepartment,
      }));
    }
  }, [currentUser, primaryDepartment]);

  useEffect(() => {
    const taskId = new URLSearchParams(location.search).get('taskId');
    if (taskId) {
      setSelectedTaskId(taskId);
      setActiveView('TASKS');
    }
  }, [location.search]);

  const fetchHelpRequests = async () => {
    setLoadingHelpRequests(true);
    try {
      const res = await api.get('/help-requests');
      setHelpRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch help requests', err);
      setHelpRequests([]);
    } finally {
      setLoadingHelpRequests(false);
    }
  };

  const assignableManagers = useMemo(() => {
    const term = managerSearch.trim().toLowerCase();
    const seen = new Map();

    departmentDirectory.forEach((department) => {
      if (String(department.name).toLowerCase() !== String(primaryDepartment).toLowerCase()) return;
      (department.managers || []).forEach((manager) => {
        if (!manager || !manager.isActive) return;
        const matchesTerm = !term
          || String(manager.name || '').toLowerCase().includes(term)
          || String(manager.email || '').toLowerCase().includes(term);

        if (matchesTerm && !seen.has(manager._id)) {
          seen.set(manager._id, manager);
        }
      });
    });

    return Array.from(seen.values()).sort((left, right) => String(left.name).localeCompare(String(right.name)));
  }, [departmentDirectory, managerSearch, primaryDepartment]);

  const filtered = useMemo(() => {
    let list = allTasks;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(t => String(t.title).toLowerCase().includes(s) || String(t.description).toLowerCase().includes(s));
    }
    if (statusFilter !== 'All') {
      list = list.filter(t => String(t.status).toLowerCase() === statusFilter.toLowerCase());
    }
    if (priorityFilter !== 'All') {
      list = list.filter(t => String(t.priority).toLowerCase() === priorityFilter.toLowerCase());
    }
    return list;
  }, [allTasks, search, statusFilter, priorityFilter]);

  const overdueTasks  = useMemo(() => filtered.filter(isOverdue),  [filtered]);
  const todayTasks    = useMemo(() => filtered.filter(isTaskToday), [filtered]);
  const upcomingTasks = useMemo(() => filtered.filter(isUpcoming),  [filtered]);
  const completedTasks = useMemo(() => filtered.filter(t => String(t.status).toLowerCase() === 'completed'), [filtered]);

  const total     = allTasks.length;
  const completed = allTasks.filter(t => String(t.status).toLowerCase() === 'completed').length;
  const pending   = allTasks.filter(t => String(t.status).toLowerCase() === 'pending').length;
  const inProgress = allTasks.filter(t => String(t.status).toLowerCase() === 'in progress').length;
  const progress  = total ? Math.round((completed / total) * 100) : 0;
  const remaining = Math.max(total - completed, 0);
  const employeeAnalytics = useMemo(() => ({
    total,
    completed,
    pending,
    inProgress,
    overdue: overdueTasks.length,
    remaining,
    segments: [
      { label: 'Completed', count: completed, color: '#10b981' },
      { label: 'In Progress', count: inProgress, color: '#22d3ee' },
      { label: 'Pending', count: pending, color: '#f59e0b' },
      { label: 'Overdue', count: overdueTasks.length, color: '#ef4444' },
    ].filter((segment) => segment.count > 0),
  }), [total, completed, pending, inProgress, overdueTasks.length, remaining]);

  const displayName = String(currentUser?.name || 'Employee')
    .split(' ')
    .filter(Boolean)[0]
    ?.toUpperCase() || 'EMPLOYEE';

  const STATUS_OPTIONS   = ['Pending', 'In Progress', 'Completed', 'All'];
  const PRIORITY_OPTIONS = ['All', 'Low', 'Medium', 'High'];
  const VIEW_TABS = [
    { id: 'TASKS', label: 'TASKS', icon: Zap },
    { id: 'ANALYTICS', label: 'ANALYTICS', icon: TrendingUp },
    { id: 'HELP', label: 'HELP', icon: MessageSquare },
  ];

  const { addToast } = useToast();

  if (loading) {
    return (
      <div className="p-8">
        <DashboardSkeleton />
      </div>
    );
  }

  const handleStatusUpdate = async (taskId, newStatus) => {
    if (String(newStatus).toLowerCase() === 'completed') {
      setCompletionTaskId(taskId);
      setCompletionDescription('');
      setCompletionFiles([]);
      setCompletionModalOpen(true);
      return;
    }

    try {
      await editTask(taskId, { status: newStatus });
      addToast(t('msg_task_update_success').replace('{status}', newStatus), 'cyber');
    } catch (err) {
      addToast(err.response?.data?.message || err.message, 'error');
    }
  };

  const openCommentModal = (task) => {
    if (!task) return;
    setCommentTaskId(task.id || task._id || null);
    setCommentText(task.employeeComment || '');
    setCommentModalOpen(true);
  };

  const handleSubmitComment = async () => {
    if (!commentTaskId) return;
    try {
      const trimmedComment = String(commentText || '').trim();
      if (!trimmedComment) throw new Error('Comment is required.');

      setSubmittingComment(true);
      await api.post(`/tasks/${commentTaskId}/employee-comment`, {
        comment: trimmedComment,
      });
      await refreshTasks();
      setCommentModalOpen(false);
      setCommentTaskId(null);
      setCommentText('');
      addToast('Comment sent to manager. Task remains pending.', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || err.message || 'Failed to send comment.', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSubmitCompletion = async () => {
    if (!completionTaskId) return;
    try {
      setSubmittingCompletion(true);
      const formData = new FormData();
      formData.append('status', 'Completed');
      formData.append('description', completionDescription);
      Array.from(completionFiles || []).forEach((file) => formData.append('files', file));

      await api.post(`/tasks/${completionTaskId}/completion-submit`, formData);
      await refreshTasks();
      setCompletionModalOpen(false);
      setCompletionTaskId(null);
      setCompletionDescription('');
      setCompletionFiles([]);
      addToast('Task submitted to manager for review.', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || err.message || 'Failed to submit completion.', 'error');
    } finally {
      setSubmittingCompletion(false);
    }
  };

  const handleSendTask = async (e) => {
    e.preventDefault();
    try {
      if (!sendTaskForm.assignedTo) throw new Error('Select a manager first.');
      if (!sendTaskForm.title.trim()) throw new Error('Task title is required.');
      if (!sendTaskForm.department) throw new Error('Please choose a department.');

      const reminderTime = sendTaskForm.dueDate && sendTaskForm.dueTime ? `${sendTaskForm.dueDate}T${sendTaskForm.dueTime}:00` : null;
      const createdTask = await createTask({ ...sendTaskForm, reminderTime });
      const createdTaskId = createdTask?._id || createdTask?.id;

      if (sendTaskFiles.length && createdTaskId) {
        const formData = new FormData();
        sendTaskFiles.forEach((file) => formData.append('files', file));
        await api.post(`/tasks/${createdTaskId}/attachments`, formData);
      }

      setSendTaskOpen(false);
      setManagerSearch('');
      setShowManagerSuggestions(false);
      setSendTaskFiles([]);
      setSendTaskForm({
        title: '',
        description: '',
        assignedTo: '',
        assigneeRole: 'manager',
        department: primaryDepartment,
        startDate: format(new Date(), 'yyyy-MM-dd'),
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        dueTime: format(new Date(), 'HH:mm'),
        priority: 'Medium',
      });
      addToast('Task sent to manager successfully.', 'success');
      refreshTasks();
    } catch (err) {
      addToast(err.response?.data?.message || err.message || 'Failed to send task.', 'error');
    }
  };

  const handleHelpSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!helpForm.subject.trim()) throw new Error('Subject is required.');
      if (!helpForm.description.trim()) throw new Error('Description is required.');

      setSubmittingHelpRequest(true);
      await api.post('/help-requests', helpForm);
      window.dispatchEvent(new Event('help-requests-updated'));
      await fetchHelpRequests();
      setHelpOpen(false);
      setHelpForm({ subject: '', description: '' });
      addToast('Help request sent successfully.', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || err.message || 'Failed to send help request.', 'error');
    } finally {
      setSubmittingHelpRequest(false);
    }
  };

  const renderGrid = (tasks, showEmpty = true) => {
    if (!tasks.length && showEmpty) return <EmptyState title={t('msg_no_tasks_found')} description={t('msg_tasks_appear_here')} />;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((task, i) => (
          <TaskCard
            key={task.id}
            task={task}
            index={i}
            onStatusUpdate={handleStatusUpdate}
            onEmployeeComment={openCommentModal}
            statusActionMode="employee"
            highlighted={String(selectedTaskId) === String(task.id || task._id)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono tracking-widest uppercase text-indigo-600 dark:text-cyan-300/60">
            // {t('welcome_back')}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-wide">
          <span className="text-slate-900 dark:text-white uppercase">{t('hello')}, </span>
          <span className="text-indigo-600 dark:text-cyan-400">{displayName}</span>
          <span className="text-2xl ml-2">⚡</span>
        </h1>
        <p className="text-[11px] font-mono mt-1 uppercase text-slate-500 dark:text-cyan-300/35">
          {t('sys_date')} :: {format(new Date(), "EEEE, MMMM do yyyy").toUpperCase()}
        </p>
      </motion.div>

      <div className="flex gap-1 mb-6 p-1 rounded-2xl border border-white/5 bg-black/5 dark:bg-black/20 w-full md:w-fit overflow-x-auto scrollbar-hide" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveView(tab.id)}
            className="relative px-4 py-1.5 rounded-xl flex items-center gap-1.5 transition-all duration-300 group"
          >
            {activeView === tab.id && (
              <motion.div
                layoutId="employee-active-tab-glow"
                className="absolute inset-0 rounded-xl"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
              />
            )}
            <tab.icon size={12} className={activeView === tab.id ? 'text-indigo-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-cyan-300'} />
            <span className={`text-[9px] font-mono font-bold tracking-widest relative z-10 transition-colors ${activeView === tab.id ? 'text-indigo-600 dark:text-white' : 'text-slate-500 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-cyan-300'}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      <div className={activeView === 'TASKS' ? '' : 'hidden'}>
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label={t('stat_pending')}      value={pending}   icon={Clock}         color="var(--status-pending)" glow="var(--accent-glow)"  border="var(--border-subtle)" index={0} onClick={() => setActiveStatDetail('Pending')} />
          <StatCard label={t('stat_active')}      value={inProgress} icon={ActivityIcon}  color="var(--status-active)" glow="var(--accent-glow)"  border="var(--border-subtle)" index={1} onClick={() => setActiveStatDetail('In Progress')} />
          <StatCard label={t('stat_completed')}    value={completed} icon={CheckCircle2}  color="var(--status-done)" glow="var(--accent-glow)"  border="var(--border-subtle)" index={2} onClick={() => setActiveStatDetail('Completed')} />
          <StatCard label={t('stat_total_tasks')}  value={total}     icon={TrendingUp}    color="var(--secondary)" glow="var(--accent-glow)"  border="var(--border-subtle)" index={3} onClick={() => setActiveStatDetail('All')} />
        </div>

        <Modal 
          isOpen={!!activeStatDetail} 
          onClose={() => setActiveStatDetail(null)} 
          title={
            activeStatDetail === 'All' ? t('stat_total_tasks') :
            activeStatDetail === 'Pending' ? t('stat_pending') :
            activeStatDetail === 'Completed' ? t('stat_completed') :
            activeStatDetail === 'Overdue' ? t('stat_overdue') : 
            t('title_directives')
          }
          size="lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
            {allTasks
              .filter(t => {
                if (activeStatDetail === 'All') return true;
                if (activeStatDetail === 'Overdue') return isOverdue(t);
                return String(t.status).toLowerCase() === String(activeStatDetail).toLowerCase();
              })
              .map((task, idx) => (
                <TaskCard 
                  key={task.id}
                  task={task} 
                  index={idx}
                  onStatusUpdate={handleStatusUpdate}
                  onEmployeeComment={openCommentModal}
                  statusActionMode="employee"
                  highlighted={String(selectedTaskId) === String(task.id || task._id)}
                />
              ))}
            {allTasks.filter(t => {
              if (activeStatDetail === 'All') return true;
              if (activeStatDetail === 'Overdue') return isOverdue(t);
              return String(t.status).toLowerCase() === String(activeStatDetail).toLowerCase();
            }).length === 0 && (
              <div className="col-span-full py-12 text-center opacity-50 font-mono text-xs uppercase tracking-widest">
                {t('msg_no_tasks_found')}
              </div>
            )}
          </div>
        </Modal>

        <Modal
          isOpen={completionModalOpen}
          onClose={() => {
            if (submittingCompletion) return;
            setCompletionModalOpen(false);
            setCompletionTaskId(null);
            setCompletionDescription('');
            setCompletionFiles([]);
          }}
          title="Submit Completed Task"
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono font-bold tracking-wider uppercase mb-2 text-slate-600 dark:text-slate-300">
                Completion Description
              </label>
              <textarea
                value={completionDescription}
                onChange={(e) => setCompletionDescription(e.target.value)}
                placeholder="Write what you completed and any notes for manager..."
                className="w-full min-h-[110px] rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 outline-none"
              />
            </div>

          <div>
            <label className="block text-[11px] font-mono font-bold tracking-wider uppercase mb-2 text-slate-600 dark:text-slate-300">
              Attach Files (Image/PDF/Excel)
            </label>
            <input
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.webp,.pdf,.xls,.xlsx"
              onChange={(e) => setCompletionFiles(Array.from(e.target.files || []))}
              className="w-full text-xs"
            />
            {!!completionFiles.length && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {completionFiles.length} file(s) selected
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                if (submittingCompletion) return;
                setCompletionModalOpen(false);
                setCompletionTaskId(null);
                setCompletionDescription('');
                setCompletionFiles([]);
              }}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submittingCompletion}
              onClick={handleSubmitCompletion}
              className="rounded-lg bg-indigo-600 dark:bg-cyan-500 px-5 py-2 text-xs font-bold text-white dark:text-black shadow-lg transition-all hover:opacity-90 disabled:opacity-50"
            >
              {submittingCompletion ? 'Submitting...' : 'Submit To Manager'}
            </button>
          </div>
          </div>
        </Modal>

        <Modal
          isOpen={commentModalOpen}
          onClose={() => {
            if (submittingComment) return;
            setCommentModalOpen(false);
            setCommentTaskId(null);
            setCommentText('');
          }}
          title="Comment for Manager"
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono font-bold tracking-wider uppercase mb-2 text-slate-600 dark:text-slate-300">
                Comment
              </label>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write why you cannot take this task right now, or any note for your manager..."
                className="w-full min-h-[120px] rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (submittingComment) return;
                  setCommentModalOpen(false);
                  setCommentTaskId(null);
                  setCommentText('');
                }}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingComment}
                onClick={handleSubmitComment}
                className="rounded-lg bg-amber-500 dark:bg-amber-400 px-5 py-2 text-xs font-bold text-white dark:text-black shadow-lg transition-all hover:opacity-90 disabled:opacity-50"
              >
                {submittingComment ? 'Sending...' : 'Send To Manager'}
              </button>
            </div>
          </div>
        </Modal>

        <motion.button
          type="button"
          aria-label="Send task to manager"
          onClick={() => setSendTaskOpen(true)}
          initial={{ opacity: 0, scale: 0.85, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.96 }}
          className="fixed bottom-6 right-6 z-40 group flex items-center justify-center h-14 w-14 rounded-full shadow-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #00d4ff 0%, #bf00ff 100%)',
            color: '#fff',
            boxShadow: '0 18px 40px rgba(0, 212, 255, 0.28), 0 0 0 1px rgba(255,255,255,0.08) inset',
          }}
        >
          <span
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: 'radial-gradient(circle at top left, rgba(255,255,255,0.35), transparent 55%)',
            }}
          />
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm border border-white/20">
            <Plus size={18} />
          </span>
        </motion.button>

        <Modal
          isOpen={sendTaskOpen}
          onClose={() => {
            setSendTaskOpen(false);
            setManagerSearch('');
            setShowManagerSuggestions(false);
          }}
          title="Send Task To Manager"
          size="md"
        >
          <form onSubmit={handleSendTask} className="grid grid-cols-1 md:grid-cols-2 gap-5 px-1 py-2">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">// ASSIGNEE TYPE</label>
            <div className="py-3 rounded-xl text-xs font-mono font-bold tracking-widest text-center" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid var(--secondary)', color: 'var(--secondary)' }}>
              MANAGER
            </div>
          </div>

          <div className="md:col-span-2" ref={managerBoxRef}>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">// ASSIGN TO</label>
            <div
              className="relative flex items-center rounded-xl border border-slate-200 dark:border-white/12 bg-slate-100 dark:bg-[#030812] focus-within:border-indigo-500/40 dark:focus-within:border-cyan-500/40 transition-colors px-3 py-2.5"
              onClick={() => setShowManagerSuggestions(true)}
            >
              <Users size={16} className="text-slate-400" />
              <input
                type="text"
                value={managerSearch}
                onChange={(e) => {
                  setManagerSearch(e.target.value);
                  setShowManagerSuggestions(true);
                }}
                onFocus={() => setShowManagerSuggestions(true)}
                placeholder="Search manager by name or email"
                className="flex-1 bg-transparent text-slate-900 dark:text-white text-sm pl-3 focus:outline-none placeholder:text-slate-400"
              />
            </div>
            {showManagerSuggestions && (
              <div className="relative">
                <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-white/12 bg-white dark:bg-[#050a14] shadow-2xl max-h-64">
                  {assignableManagers.length === 0 && (
                    <div className="px-4 py-3 text-xs font-mono text-slate-400">
                      {loadingDirectory ? 'Loading managers...' : 'No managers found'}
                    </div>
                  )}
                  <ul className="divide-y divide-white/5 overflow-y-auto max-h-64">
                    {assignableManagers.map((u) => (
                      <li
                        key={u._id}
                        onMouseDown={(evt) => evt.preventDefault()}
                        onClick={() => {
                          setSendTaskForm((f) => ({ ...f, assignedTo: u._id }));
                          setManagerSearch(`${u.name} (${u.email})`);
                          setShowManagerSuggestions(false);
                        }}
                        className={`px-4 py-3 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 ${
                          String(sendTaskForm.assignedTo) === String(u._id) ? 'bg-indigo-500/10 dark:bg-cyan-500/10 text-indigo-600 dark:text-cyan-200' : 'text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        <div className="font-semibold">{u.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{u.email}</div>
                        <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1">
                          Dept: {(u.department || []).join(', ') || 'N/A'}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">// TASK TITLE</label>
            <input
              required
              value={sendTaskForm.title}
              onChange={(e) => setSendTaskForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full bg-slate-100 dark:bg-[#030812] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm px-4 py-3 focus:outline-none focus:border-indigo-500/50 dark:focus:border-cyan-500/50 transition-colors rounded-xl placeholder:text-slate-400"
              placeholder="Task title"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">// DESCRIPTION</label>
            <textarea
              value={sendTaskForm.description}
              onChange={(e) => setSendTaskForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full bg-slate-100 dark:bg-[#030812] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm px-4 py-3 focus:outline-none focus:border-indigo-500/50 dark:focus:border-cyan-500/50 transition-colors rounded-xl placeholder:text-slate-400 resize-none"
              placeholder="Brief description (optional)"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">// ATTACHMENTS (OPTIONAL)</label>
            <input
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.webp,.pdf,.xls,.xlsx"
              onChange={(e) => setSendTaskFiles(Array.from(e.target.files || []))}
              className="w-full bg-slate-100 dark:bg-[#030812] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-200 text-xs px-4 py-2.5 rounded-xl"
            />
            {sendTaskFiles.length > 0 && (
              <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">{sendTaskFiles.length} file(s) selected</p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">// START DATE</label>
            <div className="relative">
              <input
                id="employee-start-date"
                required
                type="date"
                value={sendTaskForm.startDate}
                onChange={(e) => setSendTaskForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full bg-slate-100 dark:bg-[#030812] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm px-4 py-3 pr-11 focus:outline-none focus:border-indigo-500/50 dark:focus:border-cyan-500/50 transition-colors rounded-xl appearance-none"
                style={{ colorScheme: 'light dark' }}
              />
              <button
                type="button"
                onClick={() => document.getElementById('employee-start-date')?.showPicker?.()}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-500 dark:text-cyan-300 transition-transform hover:scale-110"
                aria-label="Open start date picker"
              >
                <CalendarDays size={16} className="drop-shadow-[0_0_6px_rgba(34,211,238,0.45)]" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">// DUE DATE</label>
            <div className="relative">
              <input
                id="employee-due-date"
                required
                type="date"
                value={sendTaskForm.dueDate}
                onChange={(e) => setSendTaskForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="w-full bg-slate-100 dark:bg-[#030812] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm px-4 py-3 pr-11 focus:outline-none focus:border-indigo-500/50 dark:focus:border-cyan-500/50 transition-colors rounded-xl appearance-none"
                style={{ colorScheme: 'light dark' }}
              />
              <button
                type="button"
                onClick={() => document.getElementById('employee-due-date')?.showPicker?.()}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-500 dark:text-cyan-300 transition-transform hover:scale-110"
                aria-label="Open due date picker"
              >
                <CalendarDays size={16} className="drop-shadow-[0_0_6px_rgba(34,211,238,0.45)]" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">// DUE TIME</label>
            <div className="relative">
              <input
                id="employee-due-time"
                required
                type="time"
                value={sendTaskForm.dueTime}
                onChange={(e) => setSendTaskForm((f) => ({ ...f, dueTime: e.target.value }))}
                className="w-full bg-slate-100 dark:bg-[#030812] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm px-4 py-3 pr-11 focus:outline-none focus:border-indigo-500/50 dark:focus:border-cyan-500/50 transition-colors rounded-xl appearance-none"
                style={{ colorScheme: 'light dark' }}
              />
              <button
                type="button"
                onClick={() => document.getElementById('employee-due-time')?.showPicker?.()}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-500 dark:text-cyan-300 transition-transform hover:scale-110"
                aria-label="Open due time picker"
              >
                <Clock size={16} className="drop-shadow-[0_0_6px_rgba(34,211,238,0.45)]" />
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">// DEPARTMENT</label>
            <div className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#030812] px-4 py-3 text-sm text-slate-900 dark:text-white">
              {sendTaskForm.department || 'N/A'}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">// PRIORITY</label>
            <select
              value={sendTaskForm.priority}
              onChange={(e) => setSendTaskForm((f) => ({ ...f, priority: e.target.value }))}
              className="w-full bg-slate-100 dark:bg-[#030812] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm px-4 py-3 focus:outline-none focus:border-indigo-500/50 dark:focus:border-cyan-500/50 transition-colors rounded-xl appearance-none cursor-pointer"
            >
              <option value="Low">LOW</option>
              <option value="Medium">MEDIUM</option>
              <option value="High">HIGH</option>
            </select>
          </div>

          <div className="md:col-span-2 flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setSendTaskOpen(false)}
              className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 py-3 text-xs font-mono font-bold tracking-widest uppercase text-slate-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 py-3 text-xs font-mono font-bold tracking-widest uppercase text-black shadow-lg"
            >
              Send Task
            </button>
          </div>
        </form>
        </Modal>
      </div>

      {activeView === 'TASKS' && (
        <>
          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <SearchBar value={search} onChange={setSearch} className="w-full sm:w-60" placeholder={t('search_directives')} />
            <div className="cyber-tab-bar w-full md:w-auto overflow-x-auto scrollbar-hide py-1 flex-shrink-0">
              <button onClick={() => setStatusFilter('Pending')} className={`cyber-tab flex-shrink-0 ${statusFilter === 'Pending' ? 'active' : ''}`}>{t('status_pending')}</button>
              <button onClick={() => setStatusFilter('In Progress')} className={`cyber-tab flex-shrink-0 ${statusFilter === 'In Progress' ? 'active' : ''}`}>{t('status_active')}</button>
              <button onClick={() => setStatusFilter('Completed')} className={`cyber-tab flex-shrink-0 ${statusFilter === 'Completed' ? 'active' : ''}`}>{t('status_done')}</button>
              <button onClick={() => setStatusFilter('All')} className={`cyber-tab flex-shrink-0 ${statusFilter === 'All' ? 'active' : ''}`}>{t('all_statuses')}</button>
            </div>
            <div className="cyber-tab-bar w-full md:w-auto overflow-x-auto scrollbar-hide py-1 flex-shrink-0">
              <button onClick={() => setPriorityFilter('All')} className={`cyber-tab flex-shrink-0 ${priorityFilter === 'All' ? 'active' : ''}`}>{t('all_priorities') || 'ALL PRIORITIES'}</button>
              <button onClick={() => setPriorityFilter('Low')} className={`cyber-tab flex-shrink-0 ${priorityFilter === 'Low' ? 'active' : ''}`}>{t('priority_low')}</button>
              <button onClick={() => setPriorityFilter('Medium')} className={`cyber-tab flex-shrink-0 ${priorityFilter === 'Medium' ? 'active' : ''}`}>{t('priority_med')}</button>
              <button onClick={() => setPriorityFilter('High')} className={`cyber-tab flex-shrink-0 ${priorityFilter === 'High' ? 'active' : ''}`}>{t('priority_high')}</button>
            </div>
          </div>

          {(search || statusFilter !== 'All' || priorityFilter !== 'All') && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20">
              <EmptyState title={t('msg_no_tasks_found')} description={`${t('msg_tasks_appear_here')} ${t('msg_try_clearing_filters') || 'Try clearing your filters.'}`} />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSearch('');
                  setStatusFilter('All');
                  setPriorityFilter('All');
                }}
                className="mt-6 px-6 py-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-cyan-400 font-mono text-[10px] font-bold tracking-widest uppercase hover:bg-indigo-500/20 transition-all duration-300 shadow-sm"
              >
                {t('btn_reset') || 'RESET FILTERS'}
              </motion.button>
            </div>
          )}

          {filtered.length === 0 && !(search || statusFilter !== 'All' || priorityFilter !== 'All') && (
            <EmptyState title={t('msg_no_tasks_found')} description={t('msg_tasks_appear_here')} />
          )}

          {overdueTasks.length > 0 && (
            <section className="mb-10">
              <SectionHeader title={t('critical_overdue')} count={overdueTasks.length} iconColor="var(--status-overdue)" />
              {renderGrid(overdueTasks, false)}
            </section>
          )}

          {todayTasks.length > 0 && (
            <section className="mb-10">
              <SectionHeader title={t('today_due')} count={todayTasks.length} iconColor="var(--status-active)" />
              {renderGrid(todayTasks, false)}
            </section>
          )}

          {upcomingTasks.length > 0 && (
            <section className="mb-10">
              <SectionHeader title={t('upcoming_queued')} count={upcomingTasks.length} iconColor="var(--primary)" />
              {renderGrid(upcomingTasks, false)}
            </section>
          )}

          {completedTasks.length > 0 && (
            <section className="mb-10">
              <SectionHeader title={t('completed_editable')} count={completedTasks.length} iconColor="var(--status-done)" />
              {renderGrid(completedTasks, false)}
            </section>
          )}
        </>
      )}

      {activeView === 'ANALYTICS' && (
        <div className="space-y-6 mb-10">
          <DonutAnalytics
            total={employeeAnalytics.total}
            segments={employeeAnalytics.segments}
          />
        </div>
      )}

      {activeView === 'HELP' && (
        <div className="space-y-6 mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-[10px] font-mono font-bold tracking-[0.22em] uppercase text-indigo-600 dark:text-cyan-300/70">
                Help Inbox
              </p>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Send questions or requirements to your manager
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setHelpForm({ subject: '', description: '' });
                setHelpOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-4 py-2 text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-black shadow-lg"
            >
              <MessageSquare size={14} />
              New Request
            </button>
          </div>

          {loadingHelpRequests ? (
            <div className="rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-white/60 dark:bg-black/20 py-20 text-center text-xs font-mono uppercase tracking-widest text-slate-500">
              Loading help requests...
            </div>
          ) : helpRequests.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-white/60 dark:bg-black/20 py-20 text-center">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No help requests yet.</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Your manager replies will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {helpRequests.map((request) => (
                <motion.div
                  key={request._id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border p-5 holo-card"
                  style={{
                    background: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-indigo-600 dark:text-cyan-300/70">
                        {request.status || 'Open'}
                      </p>
                      <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                        {request.subject}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        To {request.managerName || 'Manager'} {request.department ? `- ${request.department}` : ''}
                      </p>
                    </div>
                    <span
                      className="rounded-full px-3 py-1 text-[9px] font-mono font-bold tracking-[0.18em] uppercase border"
                      style={{
                        borderColor: request.status === 'Replied' ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)',
                        color: request.status === 'Replied' ? '#10b981' : '#f59e0b',
                        background: request.status === 'Replied' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                      }}
                    >
                      {request.status || 'Open'}
                    </span>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {request.description}
                  </p>

                  {request.reply && (
                    <div className="mt-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3">
                      <p className="text-[9px] font-mono tracking-[0.18em] uppercase text-emerald-600 dark:text-emerald-300/70">
                        Manager Reply
                      </p>
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-100 whitespace-pre-wrap">
                        {request.reply}
                      </p>
                      {request.repliedByName && (
                        <p className="mt-2 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          Replied by {request.repliedByName}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-mono text-slate-400">
                      {request.createdAt ? `Sent ${format(parseISO(request.createdAt), 'MMM d, yyyy p')}` : 'Recently sent'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setHelpForm({
                          subject: request.subject || '',
                          description: request.description || '',
                        });
                        setHelpOpen(true);
                      }}
                      className="rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-4 py-2 text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-black shadow-md"
                    >
                      {request.reply ? 'Ask Again' : 'New Request'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <Modal
            isOpen={helpOpen}
            onClose={() => {
              if (submittingHelpRequest) return;
              setHelpOpen(false);
              setHelpForm({ subject: '', description: '' });
            }}
            title="Send Help Request"
            size="md"
          >
            <form onSubmit={handleHelpSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">
                  // SUBJECT
                </label>
                <input
                  required
                  value={helpForm.subject}
                  onChange={(e) => setHelpForm((prev) => ({ ...prev, subject: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#030812] px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 dark:focus:border-cyan-500/50"
                  placeholder="Need clarification on a task"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">
                  // DESCRIPTION
                </label>
                <textarea
                  required
                  value={helpForm.description}
                  onChange={(e) => setHelpForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={5}
                  className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#030812] px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 dark:focus:border-cyan-500/50 resize-none"
                  placeholder="Write your request or requirement in detail..."
                />
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3">
                <p className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-slate-500 dark:text-slate-400">
                  Sent To
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {currentUser?.managerId ? 'Your Manager' : 'Manager not assigned'}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (submittingHelpRequest) return;
                    setHelpOpen(false);
                    setHelpForm({ subject: '', description: '' });
                  }}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 py-3 text-xs font-mono font-bold tracking-widest uppercase text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingHelpRequest}
                  className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 py-3 text-xs font-mono font-bold tracking-widest uppercase text-black shadow-lg disabled:opacity-60"
                >
                  {submittingHelpRequest ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </Modal>
        </div>
      )}
    </div>
  );
}
