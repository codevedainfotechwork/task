import { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useTask } from '../../contexts/TaskContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api';
import TaskCard from '../../components/shared/TaskCard';
import Modal from '../../components/shared/Modal';
import EditTaskModal from '../../components/shared/EditTaskModal';
import { DashboardSkeleton } from '../../components/shared/LoadingSkeleton';
import { format, parseISO, isBefore } from 'date-fns';
import { Target, AlertTriangle, CheckCircle, Clock, Plus, Users, Zap, Search, Building2, Activity as ActivityIcon, Filter, CalendarDays, MessageSquare } from 'lucide-react';

const VIEW_TABS = [
  { id: 'OVERVIEW', label: 'tab_overview', icon: Zap },
  { id: 'TEAM', label: 'tab_team', icon: Users },
  { id: 'TASKS', label: 'tab_tasks', icon: Target },
  { id: 'ANALYTICS', label: 'ANALYTICS', icon: ActivityIcon },
  { id: 'REQUESTS', label: 'REQUESTS', icon: MessageSquare }
];

function StatPanel({ title, value, color, icon: Icon, glow, delay = 0, onClick }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay, duration: 0.5, type: 'spring' }}
      whileHover={{ y: -2, scale: 1.01 }}
      onClick={onClick}
      className={`rounded-xl p-2.5 sm:p-4 relative overflow-hidden group transition-all duration-300 holo-card ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ 
        boxShadow: `0 4px 15px rgba(0,0,0,0.06), 0 0 10px ${glow}10` 
      }}
    >
      <div className="flex items-center justify-between mb-0.5 sm:mb-1.5">
        <span className="text-[8px] sm:text-[9px] font-mono tracking-widest font-bold text-slate-500 dark:text-slate-400/40 uppercase truncate mr-1">{title}</span>
        <div className="p-0.5 sm:p-1 rounded-lg transition-all duration-300 group-hover:scale-105 shadow-sm" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
          <Icon size={10} className="sm:w-3 sm:h-3" style={{ color, filter: `drop-shadow(0 0 3px ${color})` }} />
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <motion.p
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: delay + 0.1 }}
          className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white" 
          style={{ textShadow: isDark ? `0 0 15px ${glow}20` : 'none' }}
        >{value}</motion.p>
      </div>
      
      {/* Subtle Background Glow */}
      <div className="absolute -bottom-8 -right-8 w-16 h-16 rounded-full blur-[30px] transition-all duration-500 opacity-15 group-hover:opacity-30" style={{ background: glow }} />
    </motion.div>
  );
}

function DonutAnalytics({ title = 'Department Analytics', subtitle = 'Department status breakdown', totalLabel = 'Tasks', total, segments }) {
  const safeSegments = segments.filter((segment) => segment.count > 0);
  const fallbackSegments = safeSegments.length > 0 ? safeSegments : [{ label: 'No tasks', count: 1, color: '#e2e8f0' }];
  const totalCount = safeSegments.reduce((sum, segment) => sum + segment.count, 0) || total || 1;

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
          <p className="text-[10px] font-mono font-bold tracking-[0.22em] uppercase text-indigo-600 dark:text-purple-300/70">
            {title}
          </p>
          <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
            {subtitle}
          </h3>
        </div>
        <div className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-slate-500 dark:text-slate-400">
          {total} {totalLabel}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-5 items-center">
        <div className="flex items-center justify-center">
          <div className="relative h-56 w-56 sm:h-64 sm:w-64">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(${stops.join(', ')})`,
              }}
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
                {totalLabel}
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
                    <div
                      className="text-xl font-bold"
                      style={{ color: segment.color }}
                    >
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

export default function ManagerDashboard() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { tasks, loading, refreshTasks, createTask, editTask, deleteTask, respondToTransfer } = useTask();
  const { addToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Real API fetching for employees
  const [employees, setEmployees] = useState([]);
  
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [viewDept, setViewDept] = useState(currentUser?.department?.[0] || 'All');
  const [deployOpen, setDeployOpen] = useState(false);
  const [createEmpOpen, setCreateEmpOpen] = useState(false);
  
  const [departments, setDepartments] = useState([]);
  const [, setLoadingDepartments] = useState(true);
  const [departmentDirectory, setDepartmentDirectory] = useState([]);
  const [loadingDirectory, setLoadingDirectory] = useState(true);
  const [adminDirectory, setAdminDirectory] = useState([]);
  const [loadingAdminDirectory, setLoadingAdminDirectory] = useState(true);
  
  // Task Filters
  const [taskFilters, setTaskFilters] = useState({ search: '', status: 'All', assignee: 'All', department: 'All', dateFrom: '', dateTo: '' });
  const [showDateFilterOpen, setShowDateFilterOpen] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [togglingEmployeeId, setTogglingEmployeeId] = useState(null);
  const [helpRequests, setHelpRequests] = useState([]);
  const [loadingHelpRequests, setLoadingHelpRequests] = useState(true);
  const [helpStatusFilter, setHelpStatusFilter] = useState('All');
  const [helpReplyOpen, setHelpReplyOpen] = useState(false);
  const [selectedHelpRequest, setSelectedHelpRequest] = useState(null);
  const [helpReplyText, setHelpReplyText] = useState('');
  const [submittingHelpReply, setSubmittingHelpReply] = useState(false);
  const [incomingCommentOpen, setIncomingCommentOpen] = useState(false);
  const [incomingCommentTaskId, setIncomingCommentTaskId] = useState(null);
  const [incomingCommentText, setIncomingCommentText] = useState('');
  const [submittingIncomingComment, setSubmittingIncomingComment] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [completionTaskId, setCompletionTaskId] = useState(null);
  const [completionDescription, setCompletionDescription] = useState('');
  const [completionFiles, setCompletionFiles] = useState([]);
  const [submittingCompletion, setSubmittingCompletion] = useState(false);
  
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignedTo: '', assigneeRole: 'employee', department: viewDept==='All' ? currentUser?.department?.[0] : viewDept, startDate: format(new Date(), 'yyyy-MM-dd'), dueDate: format(new Date(), 'yyyy-MM-dd'), dueTime: format(new Date(), 'HH:mm'), priority: 'Medium' });
  const [taskFiles, setTaskFiles] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeSuggestions, setShowEmployeeSuggestions] = useState(false);
  const employeeBoxRef = useRef(null);
  const dateFilterRef = useRef(null);
  const dateFromInputRef = useRef(null);
  const dateToInputRef = useRef(null);
  const [empForm, setEmpForm] = useState({ name: '', email: '', password: '', role: 'employee', department: '' });
  
  const [editingTask, setEditingTask] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [isAdminHubOpen, setIsAdminHubOpen] = useState(false);
  const [activeStatDetail, setActiveStatDetail] = useState(null);
  const [completedTimingFilter, setCompletedTimingFilter] = useState('All');
  const [activeEmployeeDetail, setActiveEmployeeDetail] = useState(null);
  const isMyTasksRoute = location.pathname === '/manager/my-tasks';

  useEffect(() => {
    const taskId = new URLSearchParams(location.search).get('taskId');
    if (taskId) {
      setSelectedTaskId(taskId);
      setActiveTab('TASKS');
    }
  }, [location.search]);

  const getTaskDeadline = (task) => {
    if (task?.reminderTime) {
      return new Date(task.reminderTime);
    }
    if (task?.dueDate) {
      return parseISO(`${String(task.dueDate).slice(0, 10)}T23:59:59`);
    }
    return null;
  };

  const getTaskCompletionMoment = (task) => {
    if (task?.completedAt) return new Date(task.completedAt);
    if (task?.updatedAt) return new Date(task.updatedAt);
    if (task?.createdAt) return new Date(task.createdAt);
    return null;
  };

  const isCompletedOnTime = (task) => {
    if (String(task?.status || '').toLowerCase() !== 'completed') return false;
    const deadline = getTaskDeadline(task);
    const completedAt = getTaskCompletionMoment(task);
    if (!deadline || !completedAt) return true;
    return completedAt <= deadline;
  };

  const isCompletedOverTime = (task) => {
    if (String(task?.status || '').toLowerCase() !== 'completed') return false;
    const deadline = getTaskDeadline(task);
    const completedAt = getTaskCompletionMoment(task);
    if (!deadline || !completedAt) return false;
    return completedAt > deadline;
  };

  useEffect(() => {
    fetchEmployees();
    refreshTasks();
    fetchDepartments();
    fetchDirectory();
  }, []);

  useEffect(() => {
    const fetchAdmins = async () => {
      setLoadingAdminDirectory(true);
      try {
        const res = await api.get('/users/admins');
        setAdminDirectory(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to fetch admin directory', err);
        setAdminDirectory([]);
      } finally {
        setLoadingAdminDirectory(false);
      }
    };

    fetchAdmins();
  }, []);

  useEffect(() => {
    if (location.pathname === '/manager/create') {
      setDeployOpen(true);
      setActiveTab('TASKS');
    } else {
      setDeployOpen(false);
    }

    if (location.pathname === '/manager/my-tasks') {
      setActiveTab('TASKS');
    }

    if (location.pathname === '/manager/team') {
      setActiveTab('TEAM');
    }

    if (location.pathname !== '/manager/team') {
      setCreateEmpOpen(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (activeTab === 'REQUESTS') {
      fetchHelpRequests();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeStatDetail !== 'Completed') {
      setCompletedTimingFilter('All');
    }
  }, [activeStatDetail]);

  useEffect(() => {
    const handleHelpRequestsUpdated = () => {
      if (activeTab === 'REQUESTS') {
        fetchHelpRequests();
      }
    };

    window.addEventListener('help-requests-updated', handleHelpRequestsUpdated);
    return () => window.removeEventListener('help-requests-updated', handleHelpRequestsUpdated);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'REQUESTS') return undefined;

    const intervalId = window.setInterval(() => {
      fetchHelpRequests();
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [activeTab]);

  const availableDepartments = useMemo(() => {
    const primaryDepartment = currentUser?.department?.[0];
    if (!primaryDepartment) return [];
    return departments.filter((department) => department.name === primaryDepartment);
  }, [departments, currentUser]);

  // Sync taskForm department when modal opens or availableDepartments load
  useEffect(() => {
    if (deployOpen && availableDepartments.length > 0) {
      setTaskForm(prev => ({
        ...prev,
        department: prev.department || availableDepartments[0].name
      }));
    }
  }, [deployOpen, availableDepartments]);

  const assignableRecipients = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase();
    if (taskForm.assigneeRole === 'manager') {
      const seen = new Map();

      departmentDirectory.forEach((department) => {
        (department.managers || []).forEach((manager) => {
          if (!manager || String(manager._id) === String(currentUser?._id)) return;
          if (!manager.isActive) return;

          const matchesTerm = !term
            || String(manager.name || '').toLowerCase().includes(term)
            || String(manager.email || '').toLowerCase().includes(term);

          if (matchesTerm && !seen.has(manager._id)) {
            seen.set(manager._id, manager);
          }
        });
      });

      return Array.from(seen.values()).sort((left, right) => {
        const leftDept = String((left.department || []).join(', ')).toLowerCase();
        const rightDept = String((right.department || []).join(', ')).toLowerCase();
        const deptCompare = leftDept.localeCompare(rightDept);
        if (deptCompare !== 0) return deptCompare;
        return String(left.name).localeCompare(String(right.name));
      });
    }

    if (taskForm.assigneeRole === 'admin') {
      return adminDirectory
        .filter((admin) => {
          if (!admin || !admin.isActive) return false;
          return !term
            || String(admin.name || '').toLowerCase().includes(term)
            || String(admin.email || '').toLowerCase().includes(term);
        })
        .sort((left, right) => String(left.name).localeCompare(String(right.name)));
    }

    return employees
      .filter((e) => String(e.managerId) === String(currentUser?._id))
      .filter((e) => (e.department || []).some((dept) => (currentUser?.department || []).includes(dept)))
      .filter((e) => {
        if (!term) return true;
        return (
          String(e.name || '').toLowerCase().includes(term) ||
          String(e.email || '').toLowerCase().includes(term)
        );
      })
      .sort((left, right) => String(left.name).localeCompare(String(right.name)));
  }, [departmentDirectory, adminDirectory, employeeSearch, taskForm.assigneeRole, taskForm.department, currentUser, employees]);

  // Reset search when department changes to avoid empty lists from stale filters
  useEffect(() => {
    setEmployeeSearch('');
    setShowEmployeeSuggestions(false);
  }, [taskForm.department, taskForm.assigneeRole]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (employeeBoxRef.current && !employeeBoxRef.current.contains(event.target)) {
        setShowEmployeeSuggestions(false);
      }
      if (dateFilterRef.current && !dateFilterRef.current.contains(event.target)) {
        setShowDateFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showDateFilterOpen) return;
    const timer = window.setTimeout(() => {
      const targetInput = taskFilters.dateFrom ? dateToInputRef.current : dateFromInputRef.current;
      targetInput?.showPicker?.();
      targetInput?.focus?.();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [showDateFilterOpen, taskFilters.dateFrom]);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/manager/employees');
      setEmployees(res.data);
    } catch (err) {
      console.error('Failed to fetch employees');
    }
  };

  const fetchDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (err) {
      console.error('Failed to fetch departments');
    } finally {
      setLoadingDepartments(false);
    }
  };

  const fetchDirectory = async () => {
    setLoadingDirectory(true);
    try {
      const res = await api.get('/manager/directory');
      setDepartmentDirectory(res.data);
      return res.data;
    } catch (err) {
      console.error('Failed to fetch manager directory');
      return [];
    } finally {
      setLoadingDirectory(false);
    }
  };

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

  const handleToggleAccess = async (userId) => {
    setTogglingEmployeeId(userId);
    try {
      const res = await api.patch(`/manager/employee/${userId}/toggle-access`);
      const updatedEmployee = res.data.employee;

      setEmployees((prev) => prev.map((employee) => (
        String(employee._id) === String(userId) || String(employee.id) === String(userId) ? updatedEmployee : employee
      )));
    } catch (err) {
      addToast(err.response?.data?.message || t('err_failed_users'), 'error');
    } finally {
      setTogglingEmployeeId(null);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      if (!taskForm.assignedTo) throw new Error(t('msg_assignee_required') || 'Employee assignment required');
      const reminderTime = taskForm.dueDate && taskForm.dueTime ? `${taskForm.dueDate}T${taskForm.dueTime}:00` : null;
      const createdTask = await createTask({ ...taskForm, reminderTime });
      const createdTaskId = createdTask?._id || createdTask?.id;
      if (taskFiles.length && createdTaskId) {
        const formData = new FormData();
        taskFiles.forEach((file) => formData.append('files', file));
        await api.post(`/tasks/${createdTaskId}/attachments`, formData);
      } else if (taskFiles.length) {
        addToast('Task created, but attachment upload skipped (missing task id).', 'error');
      }
      setDeployOpen(false);
      setTaskForm({
        title: '',
        description: '',
        assignedTo: '',
        assigneeRole: 'employee',
        department: viewDept==='All' ? currentUser?.department?.[0] : viewDept,
        startDate: format(new Date(), 'yyyy-MM-dd'),
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        dueTime: format(new Date(), 'HH:mm'),
        priority: 'Medium',
      });
      setTaskFiles([]);
      addToast(t('msg_task_deployed_success') || 'Task assigned successfully.', 'cyber');
      navigate('/manager');
    } catch (err) {
      addToast(err.response?.data?.message || err.message, 'error');
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    try {
      const department = currentUser?.department?.[0] || availableDepartments[0]?.name || empForm.department || '';
      if (!department) throw new Error(t('msg_select_dept_err') || 'Select a department for the employee');
      if (!empForm.password || empForm.password.length < 6) throw new Error(t('err_pass_short') || 'Password must be at least 6 characters');
      // Backend expects department as array for consistency
      await api.post('/users', {
        ...empForm,
        username: empForm.email,
        department: [department],
      });
      addToast(t('msg_user_created_success')?.replace('{role}', 'employee') || 'Employee created successfully!', 'success');
      setCreateEmpOpen(false);
      setEmpForm({ name: '', email: '', password: '', role: 'employee', department: '' });
      fetchEmployees();
      setActiveTab('TEAM');
      navigate('/manager/team');
    } catch (err) {
      addToast(err.response?.data?.message || err.message, 'error');
    }
  };

  const openHelpReply = (request) => {
    setSelectedHelpRequest(request);
    setHelpReplyText(request?.reply || '');
    setHelpReplyOpen(true);
  };

  const handleHelpReplySubmit = async (e) => {
    e.preventDefault();
    if (!selectedHelpRequest) return;

    try {
      if (!String(helpReplyText || '').trim()) {
        throw new Error('Reply is required.');
      }

      setSubmittingHelpReply(true);
      await api.post(`/help-requests/${selectedHelpRequest._id}/reply`, {
        reply: helpReplyText,
      });

      window.dispatchEvent(new Event('help-requests-updated'));
      await fetchHelpRequests();
      setHelpReplyOpen(false);
      setSelectedHelpRequest(null);
      setHelpReplyText('');
      addToast('Reply sent successfully.', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || err.message || 'Failed to send reply.', 'error');
    } finally {
      setSubmittingHelpReply(false);
    }
  };

  const openCreateEmployeeModal = () => {
    setActiveTab('TEAM');
    setCreateEmpOpen(true);
    
    const defaultDepartment = currentUser?.department?.[0] || availableDepartments[0]?.name || '';
    if (defaultDepartment) {
      setEmpForm(f => ({ ...f, department: defaultDepartment }));
    }

    if (location.pathname !== '/manager/team') {
      navigate('/manager/team');
    }
  };

  const handleViewTabChange = (tabId) => {
    setActiveTab(tabId);

    if (tabId === 'TEAM') {
      setDeployOpen(false);
      setCreateEmpOpen(false);
      setHelpReplyOpen(false);
      navigate('/manager/team');
      return;
    }

    setDeployOpen(false);
    setCreateEmpOpen(false);
    setHelpReplyOpen(false);

    if (location.pathname !== '/manager') {
      navigate('/manager');
    }
  };

  // toggleDept no longer needed â€” single select now

  const directoryCards = useMemo(() => {
    if (viewDept === 'All') {
      return departmentDirectory;
    }

    return departmentDirectory.filter((department) => department.name === viewDept);
  }, [departmentDirectory, viewDept]);

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      await editTask(taskId, { status: newStatus });
      addToast(t('msg_task_updated_success') || 'Task status updated successfully', 'success');
      refreshTasks();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to update task status', 'error');
    }
  };

  const handleTransferResponse = async (taskId, action) => {
    try {
      await respondToTransfer(taskId, action);
      addToast(
        action === 'accept'
          ? 'Manager task accepted successfully.'
          : 'Manager task rejected successfully.',
        action === 'accept' ? 'success' : 'info'
      );
      refreshTasks();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to respond to transfer', 'error');
    }
  };

  const getTaskAssignerRole = (task) => {
    const assignerId = String(task?.assignedBy || '');
    if (!assignerId) return '';

    if (String(currentUser?._id || '') === assignerId) {
      return String(currentUser?.role || '').toLowerCase();
    }

    if (adminDirectory.some((admin) => String(admin._id) === assignerId)) {
      return 'admin';
    }

    for (const department of departmentDirectory) {
      if ((department.managers || []).some((manager) => String(manager._id) === assignerId)) {
        return 'manager';
      }
    }

    return '';
  };

  const isManagerIncomingTask = (task) => {
    if (String(currentUser?.role || '').toLowerCase() !== 'manager') return false;
    const currentManagerId = String(currentUser?._id || '');
    if (!currentManagerId) return false;

    const isPendingTransferRecipient =
      String(task?.transferStatus || '').toLowerCase() === 'pending' &&
      String(task?.transferredToManagerId || '') === currentManagerId;
    if (isPendingTransferRecipient) return true;

    if (String(task?.assignedTo || '') !== currentManagerId) return false;

    const assignerRole = getTaskAssignerRole(task);
    return assignerRole === 'admin' || assignerRole === 'manager';
  };

  const openIncomingComment = (task) => {
    if (!task) return;
    setIncomingCommentTaskId(task.id || task._id || null);
    setIncomingCommentText(task.employeeComment || '');
    setIncomingCommentOpen(true);
  };

  const openCompletionModal = (task) => {
    if (!task) return;
    setCompletionTaskId(task.id || task._id || null);
    setCompletionDescription('');
    setCompletionFiles([]);
    setCompletionModalOpen(true);
  };

  const handleIncomingCommentSubmit = async () => {
    if (!incomingCommentTaskId) return;
    const trimmed = String(incomingCommentText || '').trim();
    if (!trimmed) {
      addToast('Comment is required.', 'error');
      return;
    }

    try {
      setSubmittingIncomingComment(true);
      await api.post(`/tasks/${incomingCommentTaskId}/employee-comment`, { comment: trimmed });
      await refreshTasks();
      setIncomingCommentOpen(false);
      setIncomingCommentTaskId(null);
      setIncomingCommentText('');
      addToast('Comment sent successfully. Task remains pending.', 'success');
    } catch (error) {
      addToast(error.response?.data?.message || error.message || 'Failed to send comment.', 'error');
    } finally {
      setSubmittingIncomingComment(false);
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
      addToast('Task submitted for review.', 'success');
    } catch (error) {
      addToast(error.response?.data?.message || error.message || 'Failed to submit completion.', 'error');
    } finally {
      setSubmittingCompletion(false);
    }
  };

  const myDeptTasks = useMemo(() => {
    const normalizedManagerDepts = (currentUser?.department || []).map(d => String(d).toLowerCase());
    const currentManagerId = String(currentUser?._id || '');
    
    return tasks.filter(t => {
      const deptMatch = viewDept === 'All' 
        ? normalizedManagerDepts.includes(String(t.department).toLowerCase())
        : String(t.department).toLowerCase() === String(viewDept).toLowerCase();
      const isAssignedToMe = String(t.assignedTo || '') === currentManagerId;
      const isTransferRecipient = String(t.transferredToManagerId || '') === currentManagerId;
      const isTransferSender = String(t.transferredFromManagerId || '') === currentManagerId;
      const isPendingTransfer = String(t.transferStatus || '').toLowerCase() === 'pending';

      if (isAssignedToMe || isTransferRecipient || isTransferSender) {
        return true;
      }

      if (isPendingTransfer && (isTransferRecipient || isTransferSender)) {
        return true;
      }

      return deptMatch;
    });
  }, [tasks, viewDept, currentUser]);

  const isTaskWithinSelectedDateRange = (task) => {
    if (!taskFilters.dateFrom && !taskFilters.dateTo) return true;
    const taskDate = getTaskDeadline(task);
    if (!taskDate) return false;

    if (taskFilters.dateFrom) {
      const fromDate = parseISO(`${taskFilters.dateFrom}T00:00:00`);
      if (taskDate < fromDate) return false;
    }

    if (taskFilters.dateTo) {
      const toDate = parseISO(`${taskFilters.dateTo}T23:59:59`);
      if (taskDate > toDate) return false;
    }

    return true;
  };

  const dateFilteredMyDeptTasks = useMemo(
    () => myDeptTasks.filter(isTaskWithinSelectedDateRange),
    [myDeptTasks, taskFilters.dateFrom, taskFilters.dateTo]
  );
  const hasActiveDateFilter = Boolean(taskFilters.dateFrom || taskFilters.dateTo);

  const managedEmployees = useMemo(() => {
    const managerDepts = new Set((currentUser?.department || []).map((dept) => String(dept).toLowerCase()));
    return employees
      .filter((employee) => {
        const employeeDepts = (employee.department || []).map((dept) => String(dept).toLowerCase());
        return employeeDepts.some((dept) => managerDepts.has(dept));
      })
      .sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));
  }, [employees, currentUser]);

  const employeeTaskSummaries = useMemo(() => {
    const sourceTasks = hasActiveDateFilter ? dateFilteredMyDeptTasks : myDeptTasks;
    return managedEmployees.map((employee) => {
      const employeeTasks = sourceTasks.filter((task) => String(task.assignedTo) === String(employee._id));
      const pendingCount = employeeTasks.filter((task) => task.status === 'Pending').length;
      const inProgressCount = employeeTasks.filter((task) => task.status === 'In Progress').length;
      const completedCount = employeeTasks.filter((task) => task.status === 'Completed').length;
      const overdueCount = employeeTasks.filter((task) => {
        const deadline = getTaskDeadline(task);
        return task.status !== 'Completed' && deadline && isBefore(deadline, new Date());
      }).length;

      return {
        id: String(employee._id),
        employee,
        total: employeeTasks.length,
        pending: pendingCount,
        inProgress: inProgressCount,
        completed: completedCount,
        overdue: overdueCount,
      };
    }).filter((summary) => (hasActiveDateFilter ? summary.total > 0 : true));
  }, [managedEmployees, dateFilteredMyDeptTasks, myDeptTasks, hasActiveDateFilter]);

  const stats = useMemo(() => {
    const overdueCount = dateFilteredMyDeptTasks.filter(t => {
      const deadline = getTaskDeadline(t);
      return t.status !== 'Completed' && deadline && isBefore(deadline, new Date());
    }).length;
    return {
      active: dateFilteredMyDeptTasks.filter(t => t.status === 'In Progress').length,
      pending: dateFilteredMyDeptTasks.filter(t => t.status === 'Pending').length,
      completed: dateFilteredMyDeptTasks.filter(t => t.status === 'Completed').length,
      overdue: overdueCount,
    };
  }, [dateFilteredMyDeptTasks]);

  const departmentAnalytics = useMemo(() => {
    const completedOnTime = dateFilteredMyDeptTasks.filter((task) => isCompletedOnTime(task)).length;
    const completedOverTime = dateFilteredMyDeptTasks.filter((task) => isCompletedOverTime(task)).length;
    const completed = completedOnTime + completedOverTime;
    const overdue = dateFilteredMyDeptTasks.filter((task) => {
      const status = String(task.status || '').toLowerCase();
      const deadline = getTaskDeadline(task);
      return status !== 'completed' && !!deadline && isBefore(deadline, new Date());
    }).length;
    const inProgress = dateFilteredMyDeptTasks.filter((task) => {
      const status = String(task.status || '').toLowerCase();
      const deadline = getTaskDeadline(task);
      return status === 'in progress' && !(deadline && isBefore(deadline, new Date()));
    }).length;
    const pending = dateFilteredMyDeptTasks.filter((task) => {
      const status = String(task.status || '').toLowerCase();
      const deadline = getTaskDeadline(task);
      return status === 'pending' && !(deadline && isBefore(deadline, new Date()));
    }).length;

    const remaining = Math.max(dateFilteredMyDeptTasks.length - completed, 0);

    return {
      total: dateFilteredMyDeptTasks.length,
      completed,
      completedOnTime,
      completedOverTime,
      pending,
      inProgress,
      overdue,
      remaining,
      segments: [
        { label: 'On Time', count: completedOnTime, color: '#10b981' },
        { label: 'Over Time', count: completedOverTime, color: '#f97316' },
        { label: 'In Progress', count: inProgress, color: '#22d3ee' },
        { label: 'Pending', count: pending, color: '#f59e0b' },
        { label: 'Overdue', count: overdue, color: '#ef4444' },
      ].filter((segment) => segment.count > 0),
    };
  }, [dateFilteredMyDeptTasks]);

  const managerPersonalAnalytics = useMemo(() => {
    const currentManagerId = String(currentUser?._id || '');
    const currentManagerRole = String(currentUser?.role || '').toLowerCase();

    const managerTasks = dateFilteredMyDeptTasks.filter((task) => {
      if (!currentManagerId || currentManagerRole !== 'manager') return false;

      const assignedToMe = String(task.assignedTo || '') === currentManagerId;
      const transferPendingToMe =
        String(task.transferStatus || '').toLowerCase() === 'pending' &&
        String(task.transferredToManagerId || '') === currentManagerId;
      if (!assignedToMe && !transferPendingToMe) return false;

      const assignerRole = getTaskAssignerRole(task);
      return assignerRole === 'admin' || assignerRole === 'manager' || transferPendingToMe;
    });

    const completedOnTime = managerTasks.filter((task) => isCompletedOnTime(task)).length;
    const completedOverTime = managerTasks.filter((task) => isCompletedOverTime(task)).length;
    const completed = completedOnTime + completedOverTime;
    const overdue = managerTasks.filter((task) => {
      const status = String(task.status || '').toLowerCase();
      const deadline = getTaskDeadline(task);
      return status !== 'completed' && !!deadline && isBefore(deadline, new Date());
    }).length;
    const inProgress = managerTasks.filter((task) => String(task.status || '').toLowerCase() === 'in progress').length;
    const pending = managerTasks.filter((task) => String(task.status || '').toLowerCase() === 'pending').length;
    const remaining = Math.max(managerTasks.length - completed, 0);

    return {
      total: managerTasks.length,
      completed,
      completedOnTime,
      completedOverTime,
      pending,
      inProgress,
      overdue,
      remaining,
      segments: [
        { label: 'On Time', count: completedOnTime, color: '#10b981' },
        { label: 'Over Time', count: completedOverTime, color: '#f97316' },
        { label: 'In Progress', count: inProgress, color: '#22d3ee' },
        { label: 'Pending', count: pending, color: '#f59e0b' },
        { label: 'Overdue', count: overdue, color: '#ef4444' },
      ].filter((segment) => segment.count > 0),
    };
  }, [currentUser, dateFilteredMyDeptTasks, departmentDirectory, adminDirectory]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const term = teamSearch.toLowerCase();
      return e.name.toLowerCase().includes(term) || e.email.toLowerCase().includes(term);
    });
  }, [employees, teamSearch]);

  const filteredTasks = useMemo(() => {
    const taskSource = isMyTasksRoute
      ? dateFilteredMyDeptTasks.filter((task) => {
          const currentManagerId = String(currentUser?._id || '');
          const transferStatus = String(task.transferStatus || '').toLowerCase();
          const isAssignedToMe = String(task.assignedTo || '') === currentManagerId;
          const isTransferRecipient = String(task.transferredToManagerId || '') === currentManagerId;
          const isPendingTransferToMe = transferStatus === 'pending' && isTransferRecipient;
          return isAssignedToMe || isTransferRecipient || isPendingTransferToMe;
        })
      : dateFilteredMyDeptTasks;

    return taskSource.filter(t => {
      const assignedEmployee = employees.find(e => String(e._id) === String(t.assignedTo) || String(e.id) === String(t.assignedTo));
      const assigneeName = assignedEmployee ? assignedEmployee.name : '';
      const searchTarget = `${t.title} ${assigneeName}`.toLowerCase();
      
      const matchesSearch = searchTarget.includes(String(taskFilters.search).toLowerCase());
      
      let matchesStatus = false;
      if (taskFilters.status === 'All') {
        matchesStatus = true;
      } else if (taskFilters.status === 'Overdue') {
        const deadline = getTaskDeadline(t);
        matchesStatus = t.status !== 'Completed' && deadline && isBefore(deadline, new Date());
      } else {
        matchesStatus = String(t.status).toLowerCase() === String(taskFilters.status).toLowerCase();
      }

      const matchesAssignee = taskFilters.assignee === 'All' || String(t.assignedTo) === String(taskFilters.assignee);
      const matchesDept = taskFilters.department === 'All' || String(t.department).toLowerCase() === String(taskFilters.department).toLowerCase();
      return matchesSearch && matchesStatus && matchesAssignee && matchesDept;
    });
  }, [dateFilteredMyDeptTasks, taskFilters, employees, isMyTasksRoute, currentUser]);

  if (loading) {
    return (
      <div className="p-8">
        <DashboardSkeleton />
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats - restored here since they fit the "Overview" theme */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatPanel 
          title={t('stat_pending_queue')} 
          value={stats.pending} 
          color="var(--status-pending)" 
          glow="var(--accent-glow)" 
          icon={Clock} 
          onClick={() => setActiveStatDetail('Pending')}
        />
        <StatPanel 
          title={t('stat_active')} 
          value={stats.active} 
          color="var(--status-active)" 
          glow="var(--accent-glow)" 
          icon={ActivityIcon} 
          onClick={() => setActiveStatDetail('In Progress')}
        />
        <StatPanel 
          title={t('stat_completed')} 
          value={stats.completed} 
          color="var(--status-done)" 
          glow="var(--accent-glow)" 
          icon={CheckCircle} 
          onClick={() => setActiveStatDetail('Completed')}
        />
        <StatPanel 
          title={t('stat_total_tasks')} 
          value={dateFilteredMyDeptTasks.length} 
          color="#00d4ff" 
          glow="#00d4ff" 
          icon={Zap} 
          onClick={() => setActiveStatDetail('All')}
        />
      </div>

      <div
        className="rounded-3xl border p-4 md:p-5 holo-card"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
          backdropFilter: 'blur(22px)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
          <div>
            <p className="text-[10px] font-mono font-bold tracking-[0.22em] uppercase text-indigo-600 dark:text-purple-300/70">
              Team Status Board
            </p>
            <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              Each employee breakdown
            </h3>
          </div>
          <div className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-slate-500 dark:text-slate-400">
            {employeeTaskSummaries.length} Members
          </div>
        </div>

        {employeeTaskSummaries.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {employeeTaskSummaries.map((summary) => (
              <div
                key={summary.id}
                className="rounded-2xl border p-4 bg-white/80 dark:bg-white/5"
                style={{
                  borderColor: 'var(--border-subtle)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate text-sm font-bold text-slate-900 dark:text-white uppercase">
                        {summary.employee.name}
                      </h4>
                      <span className="rounded-full border px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        Employee
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {summary.employee.department?.join(', ') || 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {summary.total}
                    </div>
                    <div className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase text-slate-400">
                      Tasks
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveEmployeeDetail({ employee: summary.employee, status: 'Pending' })}
                    className="rounded-xl border px-3 py-3 text-left transition-all hover:-translate-y-0.5"
                    style={{ borderColor: 'rgba(245,158,11,0.18)', background: 'rgba(245,158,11,0.08)' }}
                  >
                    <div className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase text-amber-500">Pending</div>
                    <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{summary.pending}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveEmployeeDetail({ employee: summary.employee, status: 'In Progress' })}
                    className="rounded-xl border px-3 py-3 text-left transition-all hover:-translate-y-0.5"
                    style={{ borderColor: 'rgba(34,211,238,0.18)', background: 'rgba(34,211,238,0.08)' }}
                  >
                    <div className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase text-cyan-500">In Progress</div>
                    <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{summary.inProgress}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveEmployeeDetail({ employee: summary.employee, status: 'Completed' })}
                    className="rounded-xl border px-3 py-3 text-left transition-all hover:-translate-y-0.5"
                    style={{ borderColor: 'rgba(16,185,129,0.18)', background: 'rgba(16,185,129,0.08)' }}
                  >
                    <div className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase text-emerald-500">Completed</div>
                    <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{summary.completed}</div>
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between text-[9px] font-mono font-bold tracking-[0.18em] uppercase text-slate-500 dark:text-slate-400">
                  <span>Overdue {summary.overdue}</span>
                  <span>Click a status to open tasks</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed px-4 py-10 text-center text-[10px] font-mono font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400" style={{ borderColor: 'var(--border-subtle)' }}>
            No employee tasks found in your department.
          </div>
        )}
      </div>

      <Modal 
        isOpen={!!activeStatDetail} 
        onClose={() => {
          setActiveStatDetail(null);
          setCompletedTimingFilter('All');
        }} 
        title={
          activeStatDetail === 'All' ? t('stat_total_tasks') :
          activeStatDetail === 'In Progress' ? t('stat_active_cycles') :
          activeStatDetail === 'Pending' ? t('stat_pending_queue') :
          activeStatDetail === 'Completed' ? t('stat_completed') :
          activeStatDetail === 'Overdue' ? t('stat_critical_overdue') : 
          t('title_directives')
        }
        size="lg"
      >
        {activeStatDetail === 'Completed' && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {['All', 'On Time', 'Over Time'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setCompletedTimingFilter(key)}
                className={`px-3 py-1.5 rounded-full border text-[10px] font-mono font-bold tracking-widest uppercase transition-all ${
                  completedTimingFilter === key
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
          {dateFilteredMyDeptTasks
            .filter(t => {
              if (activeStatDetail === 'All') return true;
              if (activeStatDetail === 'Overdue') {
                const deadline = getTaskDeadline(t);
                return t.status !== 'Completed' && deadline && isBefore(deadline, new Date());
              }
              if (activeStatDetail === 'Completed') {
                if (completedTimingFilter === 'On Time') return isCompletedOnTime(t);
                if (completedTimingFilter === 'Over Time') return isCompletedOverTime(t);
                return t.status === 'Completed';
              }
              return t.status === activeStatDetail;
            })
            .map((task, idx) => (
              <TaskCard 
                key={task.id}
                task={task} 
                showAssignee={true}
                assigneeName={employees.find(e => String(e._id) === String(task.assignedTo))?.name || t('msg_unassigned')}
                onStatusUpdate={handleStatusUpdate}
                onTransferResponse={handleTransferResponse}
                onEmployeeComment={isManagerIncomingTask(task) ? openIncomingComment : undefined}
                onCompleteTask={isManagerIncomingTask(task) ? openCompletionModal : undefined}
                statusActionMode={isManagerIncomingTask(task) ? 'employee' : 'default'}
                onEdit={(taskItem) => { setEditingTask(taskItem); setEditOpen(true); }}
                onDelete={deleteTask}
                highlighted={String(selectedTaskId) === String(task.id || task._id)}
              />
            ))}
          {dateFilteredMyDeptTasks.filter(t => {
            if (activeStatDetail === 'All') return true;
            if (activeStatDetail === 'Overdue') {
              const deadline = getTaskDeadline(t);
              return t.status !== 'Completed' && deadline && isBefore(deadline, new Date());
            }
            if (activeStatDetail === 'Completed') {
              if (completedTimingFilter === 'On Time') return isCompletedOnTime(t);
              if (completedTimingFilter === 'Over Time') return isCompletedOverTime(t);
              return t.status === 'Completed';
            }
            return t.status === activeStatDetail;
          }).length === 0 && (
            <div className="col-span-full py-12 text-center opacity-50 font-mono text-xs uppercase tracking-widest">
              {t('msg_no_tasks_found')}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={!!activeEmployeeDetail}
        onClose={() => setActiveEmployeeDetail(null)}
        title={
          activeEmployeeDetail
            ? `${activeEmployeeDetail.employee?.name || 'Employee'} - ${activeEmployeeDetail.status || 'Tasks'}`
            : 'Employee Tasks'
        }
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto p-1 custom-scrollbar">
          {dateFilteredMyDeptTasks
            .filter((task) => {
              if (!activeEmployeeDetail) return false;
              const matchesEmployee = String(task.assignedTo) === String(activeEmployeeDetail.employee?._id);
              if (!matchesEmployee) return false;
              if (activeEmployeeDetail.status === 'All') return true;
              return task.status === activeEmployeeDetail.status;
            })
            .map((task, idx) => (
              <TaskCard
                key={task.id}
                task={task}
                showAssignee={true}
                assigneeName={activeEmployeeDetail?.employee?.name || t('msg_unassigned')}
                index={idx}
                onTransferResponse={handleTransferResponse}
                onEdit={(taskItem) => { setEditingTask(taskItem); setEditOpen(true); }}
                onDelete={deleteTask}
                highlighted={String(selectedTaskId) === String(task.id || task._id)}
              />
            ))}
          {activeEmployeeDetail && dateFilteredMyDeptTasks.filter((task) => {
            const matchesEmployee = String(task.assignedTo) === String(activeEmployeeDetail.employee?._id);
            if (!matchesEmployee) return false;
            if (activeEmployeeDetail.status === 'All') return true;
            return task.status === activeEmployeeDetail.status;
          }).length === 0 && (
            <div className="col-span-full py-12 text-center opacity-50 font-mono text-xs uppercase tracking-widest">
              {t('msg_no_tasks_found')}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );

  const renderTeam = () => (
    <div className="space-y-8">
      <div
        className="rounded-3xl border p-6 md:p-7 holo-card"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
          backdropFilter: 'blur(22px)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-4">
              <p className="text-[11px] font-mono font-bold tracking-[0.2em] text-indigo-600 dark:text-purple-300/70 uppercase">{t('nav_team')}</p>
              <div className="h-4 w-[1px] bg-slate-200 dark:bg-white/10 hidden sm:block" />
            </div>
            
            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                <span className="text-indigo-500 dark:text-purple-400 font-bold">{employees.length}</span>
                {employees.length === 1 ? t('label_total_emp') : t('label_total_emps')}
              </span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50/50 dark:bg-purple-500/5 border border-indigo-100 dark:border-purple-500/10 text-indigo-600/70 dark:text-purple-300/70">
                <span className="font-bold">{filteredEmployees.length}</span>
                {t('label_visible')}
              </span>
            </div>
          </div>

          <div className="relative w-full md:max-w-md group">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-600 dark:group-focus-within:text-purple-400" />
            <input 
              value={teamSearch}
              onChange={e => setTeamSearch(e.target.value)}
              placeholder={t('ph_search_ems')}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#030812] px-11 py-2.5 text-[13px] text-slate-900 dark:text-white shadow-sm transition-all focus:border-indigo-500/30 dark:focus:border-purple-500/30 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((e, idx) => (
          <motion.div 
            key={e._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
            className="rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/30 dark:hover:border-purple-500/30 shadow-md group/emp-card"
            style={{ 
              background: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-lg overflow-hidden relative"
                  style={{
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  }}
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/emp-card:opacity-100 transition-opacity duration-500" />
                  {e.name.substring(0, 2).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold tracking-tight text-slate-900 dark:text-white uppercase transition-colors group-hover/emp-card:text-indigo-600 dark:group-hover/emp-card:text-purple-300">{e.name}</h3>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">{e.email}</p>
                </div>
              </div>
 

              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 group-hover/emp-card:border-indigo-500/20 dark:group-hover/emp-card:border-purple-500/20 transition-all duration-300">
                <div className={`h-1.5 w-1.5 rounded-full ${e.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`} />
                <span className={`text-[9px] font-mono font-bold uppercase tracking-widest ${e.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {e.isActive ? t('status_active_label').toUpperCase() : t('status_disabled_label').toUpperCase()}
                </span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-3">
                  <Building2 size={14} className="text-slate-400 dark:text-slate-500" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('task_department')}</span>
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">{e.department?.join(', ') || t('msg_unassigned')}</span>
              </div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleToggleAccess(e._id)}
              disabled={togglingEmployeeId === e._id}
              className={`mt-6 w-full rounded-2xl border py-3 text-[10px] font-mono font-bold tracking-[0.2em] transition-all duration-300 shadow-sm uppercase ${
                e.isActive 
                ? 'bg-red-500/5 text-red-600 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30' 
                : 'bg-emerald-500/5 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/30'
              }`}
            >
              {togglingEmployeeId === e._id ? t('btn_update') : (e.isActive ? t('btn_disable_emp') : t('btn_enable_emp'))}
            </motion.button>
          </motion.div>
        ))}

        {filteredEmployees.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-black/10 py-24">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/5 bg-white/5 text-slate-700">
              <Users size={32} />
            </div>
            <p className="text-center text-sm font-medium text-white">{t('msg_no_ems_found')}</p>
            <p className="mt-2 text-xs text-slate-500">{t('msg_no_ems_found_desc')}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderTasks = () => (
    <div className="space-y-6">
      {isMyTasksRoute && (
        <div className="rounded-3xl border p-4 md:p-5 holo-card" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-[10px] font-mono font-bold tracking-[0.22em] uppercase text-indigo-600 dark:text-cyan-300/70">
                My Tasks
              </p>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Tasks assigned to you or waiting for your response
              </h3>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-slate-500 dark:text-slate-400">
              <span className="rounded-full border px-3 py-1" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-input)' }}>
                {filteredTasks.length} Records
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 1. Main Directives Grid (Priority One) */}
      <div className="flex flex-col gap-4">
        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-2.5 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 backdrop-blur-md shadow-sm" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
            <input 
              value={taskFilters.search} onChange={e => setTaskFilters(f => ({ ...f, search: e.target.value }))}
              placeholder={t('ph_search_directives')}
              className="input-cyber !pl-10 !py-2.5 text-[11px] font-bold uppercase tracking-wider w-full"
            />
          </div>
          
          <div className="relative">
            <select 
              value={taskFilters.status} onChange={e => setTaskFilters(f => ({ ...f, status: e.target.value }))}
              className="input-cyber py-2 text-[10px] font-mono appearance-none w-full"
            >
              <option value="All">{t('all_statuses')}</option>
              <option value="Pending">{t('status_pending')}</option>
              <option value="In Progress">{t('status_active')}</option>
              <option value="Completed">{t('status_done')}</option>
              <option value="Overdue">{t('status_overdue')}</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">âŒ„</div>
          </div>

          <div className="relative">
            <select 
              value={taskFilters.assignee} onChange={e => setTaskFilters(f => ({ ...f, assignee: e.target.value }))}
              className="input-cyber py-2 text-[10px] font-mono appearance-none w-full"
            >
              <option value="All">{t('all_employees')}</option>
              {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">âŒ„</div>
          </div>

          <div className="relative">
            <select 
              value={taskFilters.department} onChange={e => setTaskFilters(f => ({ ...f, department: e.target.value }))}
              className="input-cyber py-2 text-[10px] font-mono appearance-none w-full"
            >
              <option value="All">{t('all_depts_filter')}</option>
              {availableDepartments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">âŒ„</div>
          </div>
        </div>

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredTasks.map((task, idx) => (
              <motion.div key={task.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: idx * 0.05 }}>
                <TaskCard 
                  task={task} 
                  showAssignee={true}
                  assigneeName={employees.find(e => String(e._id) === String(task.assignedTo))?.name || t('msg_unassigned')}
                  onStatusUpdate={handleStatusUpdate}
                  onTransferResponse={handleTransferResponse}
                  onEmployeeComment={isManagerIncomingTask(task) ? openIncomingComment : undefined}
                  onCompleteTask={isManagerIncomingTask(task) ? openCompletionModal : undefined}
                  statusActionMode={isManagerIncomingTask(task) ? 'employee' : 'default'}
                  onEdit={(item) => { setEditingTask(item); setEditOpen(true); }}
                  onDelete={deleteTask}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          {filteredTasks.length === 0 && (
            <div className="col-span-full py-20 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/5 opacity-80 backdrop-blur-sm">
              <div className="w-16 h-16 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Target size={24} className="text-slate-300 dark:text-slate-600" />
              </div>
              <p className="font-mono text-[10px] tracking-[0.2em] text-slate-500 dark:text-slate-400 font-bold uppercase">{t('msg_no_tasks_criteria')}</p>
            </div>
          )}
        </div>
      </div>

      </div>
    );

  const renderSection = (title, status, iconColor) => {
    const sectionTasks = dateFilteredMyDeptTasks.filter(t => t.status === status);
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-5 last:mb-0">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/50 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full shadow-lg" style={{ background: iconColor, boxShadow: `0 0 10px ${iconColor}40` }} />
            <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white uppercase">
              {t(title)}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-white/5 text-slate-500 dark:text-slate-400" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-input)' }}>
            <span className="text-[9px] font-mono font-bold">{sectionTasks.length}</span>
            <span className="text-[7.5px] font-mono uppercase tracking-[0.14em] opacity-50">{t('label_records_caps') || 'RECORDS'}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {sectionTasks.map((task, idx) => {
              return (
                <motion.div key={task.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: idx * 0.05 }}>
                  <TaskCard 
                    task={task} 
                    onEmployeeComment={isManagerIncomingTask(task) ? openIncomingComment : undefined}
                    onCompleteTask={isManagerIncomingTask(task) ? openCompletionModal : undefined}
                    statusActionMode={isManagerIncomingTask(task) ? 'employee' : 'default'}
                    onEdit={(taskItem) => { setEditingTask(taskItem); setEditOpen(true); }}
                    onTransferResponse={handleTransferResponse}
                    onDelete={deleteTask}
                    highlighted={String(selectedTaskId) === String(task.id || task._id)}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
          {sectionTasks.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-16 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-white/5 dark:bg-black/20">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-transform hover:scale-110" style={{ background: 'var(--bg-input)', border: `1px solid var(--border-subtle)`, boxShadow: `0 0 20px var(--accent-glow)` }}>
                <Target size={24} style={{ color: iconColor }} />
              </div>
              <p className="text-xs font-mono tracking-widest text-slate-500">{t('msg_no_tasks_dept')}</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  };

  const filteredHelpRequests = helpStatusFilter === 'All'
    ? helpRequests
    : helpRequests.filter((request) => String(request.status || '').toLowerCase() === helpStatusFilter.toLowerCase());

  const helpStats = {
    total: helpRequests.length,
    open: helpRequests.filter((request) => String(request.status || '').toLowerCase() === 'open').length,
    replied: helpRequests.filter((request) => String(request.status || '').toLowerCase() === 'replied').length,
  };

  const renderRequests = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatPanel title="TOTAL REQUESTS" value={helpStats.total} color="#a855f7" glow="#a855f7" icon={MessageSquare} delay={0} compact />
        <StatPanel title="OPEN" value={helpStats.open} color="#f59e0b" glow="#f59e0b" icon={Clock} delay={0.05} compact />
        <StatPanel title="REPLIED" value={helpStats.replied} color="#10b981" glow="#10b981" icon={CheckCircle} delay={0.1} compact />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {['All', 'Open', 'Replied'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setHelpStatusFilter(status)}
            className={`cyber-tab flex-shrink-0 ${helpStatusFilter === status ? 'active' : ''}`}
          >
            {status.toUpperCase()}
          </button>
        ))}
        <button
          type="button"
          onClick={fetchHelpRequests}
          className="ml-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 px-4 py-2 text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-slate-600 dark:text-slate-300"
        >
          Refresh
        </button>
      </div>

      {loadingHelpRequests ? (
        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-white/60 dark:bg-black/20 py-20 text-center text-xs font-mono uppercase tracking-widest text-slate-500">
          Loading help requests...
        </div>
      ) : filteredHelpRequests.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-white/60 dark:bg-black/20 py-20 text-center">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No help requests found.</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Employee help messages will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredHelpRequests.map((request) => (
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
                    From {request.requesterName || 'Employee'} {request.department ? `- ${request.department}` : ''}
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
                  onClick={() => openHelpReply(request)}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-4 py-2 text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-black shadow-md"
                >
                  {request.reply ? 'Edit Reply' : 'Reply'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal
        isOpen={helpReplyOpen}
        onClose={() => {
          if (submittingHelpReply) return;
          setHelpReplyOpen(false);
          setSelectedHelpRequest(null);
          setHelpReplyText('');
        }}
        title="Reply To Help Request"
        size="md"
      >
        <form onSubmit={handleHelpReplySubmit} className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3">
            <p className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-slate-500 dark:text-slate-400">
              Request
            </p>
            <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{selectedHelpRequest?.subject}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {selectedHelpRequest?.requesterName} {selectedHelpRequest?.department ? `- ${selectedHelpRequest.department}` : ''}
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">
              // REPLY
            </label>
            <textarea
              value={helpReplyText}
              onChange={(e) => setHelpReplyText(e.target.value)}
              rows={5}
              className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#030812] px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 dark:focus:border-cyan-500/50 resize-none"
              placeholder="Write your reply here..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (submittingHelpReply) return;
                setHelpReplyOpen(false);
                setSelectedHelpRequest(null);
                setHelpReplyText('');
              }}
              className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 py-3 text-xs font-mono font-bold tracking-widest uppercase text-slate-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingHelpReply}
              className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 py-3 text-xs font-mono font-bold tracking-widest uppercase text-black shadow-lg disabled:opacity-60"
            >
              {submittingHelpReply ? 'Sending...' : 'Send Reply'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="max-w-7xl mx-auto"
    >
      {/* Premium Sci-Fi Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <motion.div 
            initial={{ width: 0 }} animate={{ width: '40px' }} transition={{ duration: 0.7, delay: 0.2 }}
            className="h-[2px] mb-3" style={{ background: 'linear-gradient(90deg, var(--primary), transparent)' }} 
          />

          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <span className={`${isDark ? 'neon-text-purple' : 'text-slate-900'} flex items-center gap-2 uppercase`}>
              {t('badge_manager')} {currentUser?.name}
              <Users size={20} className="text-indigo-600 dark:text-purple-400 animate-pulse"/>
            </span>
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(currentUser?.department?.length ? currentUser.department : ['UNASSIGNED']).map((department) => (
              <span
                key={department}
                className="rounded-full px-3 py-1 text-[10px] font-mono font-bold tracking-[0.18em]"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--primary)',
                  boxShadow: isDark ? '0 0 16px var(--accent-glow)' : 'var(--shadow-sm)',
                }}
              >
                {department.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 w-full md:w-auto md:flex md:items-center md:gap-4">
           <motion.button 
             onClick={openCreateEmployeeModal}
             whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} 
             className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-xl font-mono text-[9px] sm:text-[11px] font-bold shadow-2xl relative overflow-hidden group transition-all" 
             style={{ 
                border: '1px solid var(--border-glow)', 
                background: 'var(--bg-input)', 
                color: 'var(--primary)',
                boxShadow: 'var(--shadow-md)'
              }}>
             <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
             <Plus size={isDark ? 12 : 14} style={{ filter: 'drop-shadow(0 0 3px #bf00ff)' }} /> <span className="truncate">{t('btn_add_emp')}</span>
           </motion.button>
           
           <motion.button 
             onClick={() => navigate('/manager/create')} 
             whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} 
             className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-xl font-mono text-[9px] sm:text-[11px] font-bold shadow-2xl relative overflow-hidden group transition-all" 
             style={{ 
               background: 'linear-gradient(135deg, var(--secondary), var(--primary))', 
               color: '#fff', 
               boxShadow: '0 0 15px var(--accent-glow)' 
             }}>
             <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
             <Zap size={14} /> <span className="truncate">{t('btn_deploy_task_caps')}</span>
           </motion.button>

          <div className="relative" ref={dateFilterRef}>
            {!showDateFilterOpen ? (
              <motion.button
                type="button"
                aria-label="Open date filter"
                onClick={() => setShowDateFilterOpen(true)}
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="flex h-10 w-10 items-center justify-center rounded-xl border shadow-lg transition-all"
                style={{
                  background: taskFilters.dateFrom || taskFilters.dateTo ? 'rgba(0,212,255,0.12)' : 'var(--bg-input)',
                  borderColor: taskFilters.dateFrom || taskFilters.dateTo ? 'var(--secondary)' : 'var(--border-subtle)',
                  color: taskFilters.dateFrom || taskFilters.dateTo ? 'var(--secondary)' : 'var(--text-secondary)',
                }}
              >
                <Filter size={15} />
              </motion.button>
            ) : (
              <div
                className="absolute right-0 top-0 z-50 w-[300px] rounded-2xl border p-3 shadow-2xl holo-card"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="mb-1 text-[9px] font-mono font-bold tracking-[0.22em] uppercase text-slate-500 dark:text-slate-400">
                      Start Date
                    </div>
                    <div className="relative">
                      <input
                        ref={dateFromInputRef}
                        type="date"
                        value={taskFilters.dateFrom}
                        onChange={(e) => setTaskFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                        className="input-cyber py-2 pr-10 text-[11px] appearance-none"
                        style={{ colorScheme: 'light dark' }}
                      />
                      <button
                        type="button"
                        aria-label="Open start date picker"
                        onClick={() => dateFromInputRef.current?.showPicker?.()}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-500 transition-transform hover:scale-110"
                      >
                        <CalendarDays size={15} className="drop-shadow-[0_0_6px_rgba(34,211,238,0.45)]" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-[9px] font-mono font-bold tracking-[0.22em] uppercase text-slate-500 dark:text-slate-400">
                      End Date
                    </div>
                    <div className="relative">
                      <input
                        ref={dateToInputRef}
                        type="date"
                        value={taskFilters.dateTo}
                        onChange={(e) => setTaskFilters((f) => ({ ...f, dateTo: e.target.value }))}
                        className="input-cyber py-2 pr-10 text-[11px] appearance-none"
                        style={{ colorScheme: 'light dark' }}
                      />
                      <button
                        type="button"
                        aria-label="Open end date picker"
                        onClick={() => dateToInputRef.current?.showPicker?.()}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-500 transition-transform hover:scale-110"
                      >
                        <CalendarDays size={15} className="drop-shadow-[0_0_6px_rgba(34,211,238,0.45)]" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTaskFilters((f) => ({ ...f, dateFrom: '', dateTo: '' }));
                      window.setTimeout(() => dateFromInputRef.current?.showPicker?.(), 0);
                    }}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 py-2 text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-white"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDateFilterOpen(false)}
                    className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 py-2 text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-white shadow-lg"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Header */}
      <div className="flex gap-1 mb-6 p-1 rounded-2xl border border-white/5 bg-black/5 dark:bg-black/20 w-full md:w-fit overflow-x-auto scrollbar-hide" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
        {VIEW_TABS.map(tab => (
          <button 
            key={tab.id}
            onClick={() => handleViewTabChange(tab.id)}
            className={`relative px-4 py-1.5 rounded-xl flex items-center gap-1.5 transition-all duration-300 group`}
          >
            {activeTab === tab.id && (
              <motion.div 
                layoutId="active-tab-glow" 
                className="absolute inset-0 rounded-xl" 
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }} 
              />
            )}
            <tab.icon size={12} className={activeTab === tab.id ? 'text-indigo-600 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-purple-300'} />
            <span className={`text-[9px] font-mono font-bold tracking-widest relative z-10 transition-colors ${activeTab === tab.id ? 'text-indigo-600 dark:text-white' : 'text-slate-500 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-purple-300'}`}>
              {tab.id === 'ANALYTICS' || tab.id === 'REQUESTS' ? tab.label : t(tab.label).toUpperCase()}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, x: -10 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: 10 }}
           transition={{ duration: 0.3 }}
        >
          {activeTab === 'OVERVIEW' && renderOverview()}
          {activeTab === 'TEAM' && renderTeam()}
          {activeTab === 'TASKS' && renderTasks()}
          {activeTab === 'ANALYTICS' && (
            <div className="space-y-6 mb-6">
              <DonutAnalytics
                title="DEPARTMENT ANALYTICS"
                subtitle="Employee task breakdown"
                totalLabel="Tasks"
                total={departmentAnalytics.total}
                segments={departmentAnalytics.segments}
              />
              <DonutAnalytics
                title="MANAGER ANALYTICS"
                subtitle="Personal task breakdown"
                totalLabel="Tasks"
                total={managerPersonalAnalytics.total}
                segments={managerPersonalAnalytics.segments}
              />
            </div>
          )}
          {activeTab === 'REQUESTS' && renderRequests()}
        </motion.div>
      </AnimatePresence>

      {/* Floating Create Task Button */}
      {location.pathname === '/manager' && (
        <motion.button
          type="button"
          aria-label="Create task"
          onClick={() => navigate('/manager/create')}
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
      )}



      {/* Create Task Modal */}
      <Modal isOpen={deployOpen} onClose={() => navigate('/manager')} title={t('title_deploy_directive')} size="md">
        <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-2 gap-5 px-1 py-2">
          <div className="md:col-span-2">
            <label className="label-cyber">{t('label_directive_desig')}</label>
            <input 
              required 
              value={taskForm.title} 
              onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} 
              className="input-cyber" 
              placeholder={t('ph_example_directive')} 
            />
          </div>
          <div className="md:col-span-2">
            <label className="label-cyber">{t('label_parameters_opt')}</label>
            <textarea 
              value={taskForm.description} 
              onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} 
              className="input-cyber min-h-[100px] resize-none" 
              placeholder={t('ph_mission_details')} 
            />
          </div>
          <div className="md:col-span-2">
            <label className="label-cyber">{t('label_attachments_optional') || 'ATTACHMENTS (OPTIONAL)'}</label>
            <input
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.webp,.pdf,.xls,.xlsx"
              onChange={(e) => setTaskFiles(Array.from(e.target.files || []))}
              className="input-cyber text-xs"
            />
            {taskFiles.length > 0 && (
              <p className="mt-2 text-[10px] text-slate-400">{taskFiles.length} file(s) selected</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="label-cyber">// ASSIGNEE TYPE</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'manager', label: 'MANAGER' },
                { id: 'admin', label: 'ADMIN' },
                { id: 'employee', label: 'EMPLOYEE' },
              ].map((option) => {
                const isActive = taskForm.assigneeRole === option.id;
                return (
                  <button
                    type="button"
                    key={option.id}
                    onClick={() => setTaskForm((f) => ({ ...f, assigneeRole: option.id, assignedTo: '' }))}
                    className="py-3 rounded-xl text-xs font-mono font-bold tracking-widest transition-all"
                    style={{
                      background: isActive ? 'rgba(0,212,255,0.1)' : 'var(--bg-input)',
                      border: `1px solid ${isActive ? 'var(--secondary)' : 'var(--border-subtle)'}`,
                      color: isActive ? 'var(--secondary)' : 'var(--text-secondary)',
                      boxShadow: isActive ? '0 0 18px rgba(0,212,255,0.1)' : 'none',
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="label-cyber">// ASSIGN TO</label>
            <div className="relative group" ref={employeeBoxRef}>
              <input
                required
                value={employeeSearch}
                onFocus={() => setShowEmployeeSuggestions(true)}
                onChange={(e) => {
                  setEmployeeSearch(e.target.value);
                  setShowEmployeeSuggestions(true);
                }}
                placeholder={
                  taskForm.assigneeRole === 'manager'
                    ? 'Search manager by name or email'
                    : taskForm.assigneeRole === 'admin'
                      ? 'Search admin by name or email'
                      : 'Search employee by name or email'
                }
                className="input-cyber pr-10"
              />
              <Users size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-cyan-500/50" />

              {showEmployeeSuggestions && (
                <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-white/12 bg-white dark:bg-[#050a14] shadow-2xl">
                  {assignableRecipients.length === 0 && (
                    <div className="px-4 py-3 text-xs font-mono text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{t('msg_no_results')}</div>
                  )}
                  <ul className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                    {assignableRecipients.map((e) => (
                      <li
                        key={e._id}
                        onMouseDown={(evt) => evt.preventDefault()}
                        onClick={() => {
                          setTaskForm((f) => ({
                            ...f,
                            assignedTo: e._id,
                          }));
                          setEmployeeSearch(`${e.name} (${e.email})`);
                          setShowEmployeeSuggestions(false);
                        }}
                        className={`px-4 py-3 text-sm text-slate-700 dark:text-slate-100 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/5 ${
                          String(taskForm.assignedTo) === String(e._id) ? 'bg-indigo-500/10 dark:bg-purple-500/10 text-indigo-600 dark:text-purple-200' : ''
                        }`}
                      >
                        <div className="font-bold text-slate-900 dark:text-white">{e.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{e.email}</div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-500 mt-1 font-bold">
                          {taskForm.assigneeRole === 'employee'
                            ? `${t('label_department')}: ${(e.department || []).join(', ')}`
                            : taskForm.assigneeRole === 'admin'
                              ? 'Admin access'
                              : `${t('label_department')}: ${(e.department || []).join(', ')}`
                          }
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="label-cyber">{t('label_target_dept')}</label>
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {taskForm.department || currentUser?.department?.[0] || 'Department not set'}
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Manager tasks stay locked to your department.
              </div>
            </div>
          </div>
          {availableDepartments.length > 1 ? (
            <div>
              <label className="label-cyber">{t('label_target_dept')}</label>
              <div className="relative">
                <select required value={taskForm.department} onChange={e => setTaskForm(f => ({ ...f, department: e.target.value, assignedTo: '' }))} className="input-cyber font-mono appearance-none pr-10">
                  <option value="" disabled>Select Department</option>
                  {availableDepartments.map(d => <option key={d.id} value={d.name} className="bg-white dark:bg-[#0a0a1a] text-slate-900 dark:text-white">{d.name}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">âŒ„</div>
              </div>
            </div>
          ) : (
            <div className="hidden">
              <input type="hidden" value={taskForm.department} />
            </div>
          )}
          <div>
            <label className="label-cyber">{t('label_start_cycle')}</label>
            <div className="relative">
              <input id="manager-start-date" required type="date" value={taskForm.startDate} onChange={e => setTaskForm(f => ({ ...f, startDate: e.target.value }))} className="input-cyber font-mono pr-10 appearance-none" style={{ colorScheme: 'light dark' }} />
              <button type="button" onClick={() => document.getElementById('manager-start-date')?.showPicker?.()} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-500 dark:text-cyan-300 transition-transform hover:scale-110" aria-label="Open start date picker">
                <CalendarDays size={16} className="drop-shadow-[0_0_6px_rgba(34,211,238,0.45)]" />
              </button>
            </div>
          </div>
          <div>
            <label className="label-cyber">{t('label_deadline_cycle')}</label>
            <div className="relative">
              <input id="manager-due-date" required type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} className="input-cyber font-mono pr-10 appearance-none" style={{ colorScheme: 'light dark' }} />
              <button type="button" onClick={() => document.getElementById('manager-due-date')?.showPicker?.()} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-500 dark:text-cyan-300 transition-transform hover:scale-110" aria-label="Open due date picker">
                <CalendarDays size={16} className="drop-shadow-[0_0_6px_rgba(34,211,238,0.45)]" />
              </button>
            </div>
          </div>
          <div>
            <label className="label-cyber">// DUE TIME</label>
            <div className="relative">
              <input id="manager-due-time" required type="time" value={taskForm.dueTime} onChange={e => setTaskForm(f => ({ ...f, dueTime: e.target.value }))} className="input-cyber font-mono pr-10 appearance-none" style={{ colorScheme: 'light dark' }} />
              <button type="button" onClick={() => document.getElementById('manager-due-time')?.showPicker?.()} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-500 dark:text-cyan-300 transition-transform hover:scale-110" aria-label="Open due time picker">
                <Clock size={16} className="drop-shadow-[0_0_6px_rgba(34,211,238,0.45)]" />
              </button>
            </div>
          </div>
          <div>
            <label className="label-cyber">{t('label_priority_level')}</label>
            <div className="relative">
              <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))} className="input-cyber font-mono appearance-none pr-10">
                <option value="Low"  className="bg-white dark:bg-[#0a0a1a]">{t('priority_low')}</option>
                <option value="Medium" className="bg-white dark:bg-[#0a0a1a]">{t('priority_medium')}</option>
                <option value="High" className="bg-white dark:bg-[#0a0a1a]">{t('priority_high')}</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">âŒ„</div>
            </div>
          </div>
          <div className="md:col-span-2 flex gap-4 pt-4 mt-2 border-t border-white/5">
            <button type="button" onClick={() => navigate('/manager')} className="flex-1 py-3 rounded-xl font-mono text-xs font-bold transition-all hover:bg-white/5 text-slate-400">{t('btn_abort')}</button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="flex-1 py-3 rounded-xl font-mono text-xs font-bold tracking-widest" style={{ background: 'linear-gradient(135deg, #00d4ff, #bf00ff)', color: '#000', boxShadow: '0 0 20px rgba(191,0,255,0.3)' }}>{t('btn_transmit_caps')}</motion.button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={incomingCommentOpen}
        onClose={() => {
          if (submittingIncomingComment) return;
          setIncomingCommentOpen(false);
          setIncomingCommentTaskId(null);
          setIncomingCommentText('');
        }}
        title="Comment for Assigner"
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleIncomingCommentSubmit();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-[11px] font-mono font-bold tracking-wider uppercase mb-2 text-slate-600 dark:text-slate-300">
              Comment
            </label>
            <textarea
              value={incomingCommentText}
              onChange={(e) => setIncomingCommentText(e.target.value)}
              placeholder="Write your note for the person who assigned this task..."
              className="w-full min-h-[120px] rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                if (submittingIncomingComment) return;
                setIncomingCommentOpen(false);
                setIncomingCommentTaskId(null);
                setIncomingCommentText('');
              }}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingIncomingComment}
              className="rounded-lg bg-amber-500 dark:bg-amber-400 px-5 py-2 text-xs font-bold text-white dark:text-black shadow-lg transition-all hover:opacity-90 disabled:opacity-50"
            >
              {submittingIncomingComment ? 'Sending...' : 'Send Comment'}
            </button>
          </div>
        </form>
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmitCompletion();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-[11px] font-mono font-bold tracking-wider uppercase mb-2 text-slate-600 dark:text-slate-300">
              Completion Description
            </label>
            <textarea
              value={completionDescription}
              onChange={(e) => setCompletionDescription(e.target.value)}
              placeholder="Write what you completed and any notes for the assigner..."
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
              type="submit"
              disabled={submittingCompletion}
              className="rounded-lg bg-indigo-600 dark:bg-cyan-500 px-5 py-2 text-xs font-bold text-white dark:text-black shadow-lg transition-all hover:opacity-90 disabled:opacity-50"
            >
              {submittingCompletion ? 'Submitting...' : 'Submit To Assigner'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Employee Modal */}
      <Modal isOpen={createEmpOpen} onClose={() => setCreateEmpOpen(false)} title={t('title_create_emp')} size="sm">
        <form onSubmit={handleCreateEmployee} className="space-y-5 px-1 py-2" autoComplete="off">
          <input type="text" name="employee_create_dummy_u" autoComplete="username" style={{ display: 'none' }} tabIndex="-1" aria-hidden="true" />
          <input type="password" name="employee_create_dummy_p" autoComplete="current-password" style={{ display: 'none' }} tabIndex="-1" aria-hidden="true" />
          <div>
            <label className="label-cyber">{t('label_full_name_caps')}</label>
            <input required value={empForm.name} onChange={e => setEmpForm(f => ({ ...f, name: e.target.value }))} autoComplete="off" data-lpignore="true" data-1p-ignore="true" className="input-cyber" placeholder={t('ph_full_name')} />
          </div>
          <div>
            <label className="label-cyber">{t('label_email_caps')}</label>
            <input required type="text" value={empForm.email} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))} autoComplete="off" data-lpignore="true" data-1p-ignore="true" spellCheck={false} autoCapitalize="none" className="input-cyber" placeholder={t('ph_email')} />
          </div>
          <div>
            <label className="label-cyber">{t('label_password_caps')}</label>
            <input required type="password" minLength={6} value={empForm.password} onChange={e => setEmpForm(f => ({ ...f, password: e.target.value }))} autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" className="input-cyber" placeholder={t('ph_min_6_char')} />
          </div>
          <div className="rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 px-4 py-3">
            <div className="text-[10px] font-mono font-bold tracking-[0.25em] uppercase text-slate-500 dark:text-slate-400">
              {t('label_assign_dept_caps')}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
              {empForm.department || currentUser?.department?.[0] || 'Department not set'}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Employee will be created in your own department automatically.
            </div>
          </div>
          <div className="flex gap-4 pt-4 mt-2 border-t border-white/5">
            <button type="button" onClick={() => setCreateEmpOpen(false)} className="flex-1 py-3 rounded-xl text-xs font-mono font-bold text-slate-400 hover:bg-white/5 transition-colors">{t('btn_cancel')}</button>
            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 py-3 rounded-xl text-xs font-mono font-bold tracking-widest shadow-[0_0_20px_rgba(191,0,255,0.3)] text-black" style={{ background: 'linear-gradient(135deg, #bf00ff, #00d4ff)' }}>{t('btn_create_emp_caps')}</motion.button>
          </div>
        </form>
      </Modal>

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditingTask(null);
        }}
        task={editingTask}
      />
    </motion.div>
  );
}
