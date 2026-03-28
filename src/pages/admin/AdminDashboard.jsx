import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, PieChart, Pie, Cell, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { useTask } from '../../contexts/TaskContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api';
import SearchBar from '../../components/shared/SearchBar';
import Modal from '../../components/shared/Modal';
import EditTaskModal from '../../components/shared/EditTaskModal';
import { parseISO, isBefore } from 'date-fns';
import { BarChart3, Users, ClipboardList, Zap, TrendingUp, Plus, Shield, ShieldOff, Search, LayoutGrid, CheckCircle2, Clock, 
  AlertCircle, X, ChevronRight, Eye, Briefcase, 
  Settings, KeyRound, Building2, UserPlus, Fingerprint,
  ListTodo, AlertTriangle, Info, Edit, Activity, Trash2, PieChart as PieChartIcon, Send, CalendarDays, Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { useSettings } from '../../contexts/SettingsContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useSound } from '../../contexts/SoundContext';
import { resolveAssetUrl } from '../../utils/assetUrl';

const VIEWS = ['OVERVIEW', 'ALL TASKS', 'USER MANAGEMENT', 'DEPARTMENTS', 'ANALYTICS', 'SETTINGS'];

// ... (StatWidget, RingProgress, CustomTooltip components remain the same)
function StatWidget({ label, value, color, glow, icon: Icon, delay = 0, onClick }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay, duration: 0.5, type: 'spring' }}
      whileHover={{ y: -5, scale: 1.02 }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      className={`rounded-2xl p-6 relative overflow-hidden group transition-all duration-300 holo-card ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ 
        borderColor: `var(--border-subtle)`, 
        boxShadow: `0 8px 30px rgba(0,0,0,0.1)` 
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-[11px] font-mono tracking-widest font-semibold text-slate-500 dark:text-slate-400/60">{label}</span>
        <div className="p-2 rounded-xl transition-all duration-300 group-hover:scale-110" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          <Icon size={16} style={{ color, filter: `drop-shadow(0 0 8px ${color})` }} />
        </div>
      </div>
      <motion.p
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: delay + 0.2, type: 'spring' }}
        className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white" 
        style={{ textShadow: isDark ? `0 0 30px ${glow}40` : 'none' }}
      >{value}</motion.p>
      
      {/* Interactive Hover Background Glow */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-[50px] transition-all duration-500 opacity-20 group-hover:opacity-50 group-hover:scale-150" style={{ background: glow }} />
      <div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)`, boxShadow: isDark ? `0 0 15px ${color}` : 'none' }} />
    </motion.div>
  );
}

function RingProgress({ value, label, color, size = 100 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={8} />
          <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
            strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1.4, delay: 0.3, ease: 'easeOut' }}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-slate-900 dark:text-white">{value}%</span>
        </div>
      </div>
      <span className="text-[10px] font-mono text-center text-slate-500 dark:text-slate-400/50">{label}</span>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl text-xs font-mono shadow-2xl"
      style={{ 
        background: 'var(--bg-card)', 
        border: '1px solid var(--border-glow)', 
        backdropFilter: 'blur(12px)',
        color: 'var(--text-primary)'
      }}>
      <p style={{ color: 'rgba(0,212,255,0.7)' }} className="mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey}: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const { getAllTasks, refreshTasks, respondToTransfer } = useTask();
  const { t } = useLanguage();
  const { addToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [view, setView] = useState('OVERVIEW');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [taskDateFilter, setTaskDateFilter] = useState({ dateFrom: '', dateTo: '' });
  const [showDateFilterOpen, setShowDateFilterOpen] = useState(false);
  const [showOverviewTasks, setShowOverviewTasks] = useState(false);
  const [activeOverviewTaskFilter, setActiveOverviewTaskFilter] = useState(null);
  const [completedTimingFilter, setCompletedTimingFilter] = useState('All');
  const [userSearch, setUserSearch] = useState('');
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  // Derived list of department names for backward compatibility in forms/charts
  const departmentNames = departments.map(d => d.name);
  
  // Real API state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [togglingUserId, setTogglingUserId] = useState(null);
  
  // User creation state (dynamic: manager or employee)
  // User creation state
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'manager', department: [], managerId: '' });
  const [managersList, setManagersList] = useState([]);

  // Role filter sub-tabs for USER MANAGEMENT
  const [roleFilter, setRoleFilter] = useState('all');

  // User Task History panel
  const [selectedUser, setSelectedUser] = useState(null);
  const [userTasks, setUserTasks] = useState([]);
  const [loadingUserTasks, setLoadingUserTasks] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetPasswordTarget, setResetPasswordTarget] = useState(null);
  const [resetPasswordForm, setResetPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [resettingPassword, setResettingPassword] = useState(false);

  // Admin Task Assignment modal
  const [assignOpen, setAssignOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignedTo: '', department: '', startDate: format(new Date(), 'yyyy-MM-dd'), dueDate: format(new Date(), 'yyyy-MM-dd'), dueTime: format(new Date(), 'HH:mm'), priority: 'Medium', assigneeRole: 'manager' });
  const [taskFiles, setTaskFiles] = useState([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [showAssignSuggestions, setShowAssignSuggestions] = useState(false);
  const dateFilterRef = useRef(null);
  const dateFromInputRef = useRef(null);
  const dateToInputRef = useRef(null);
  const hasActiveAdminFilters = deptFilter !== 'All' || Boolean(taskDateFilter.dateFrom || taskDateFilter.dateTo);

  const allTasks = getAllTasks();
  const DEPT_COLORS = ['#00d4ff', '#bf00ff', '#00ff88', '#ff6600', '#ff4444', '#00ffcc', '#ffcc00'];

  // Department Management state
  const [newDeptName, setNewDeptName] = useState('');
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(0); // 0: closed, 1: first, 2: final
  const [deptToDelete, setDeptToDelete] = useState(null);
  const [deptConflict, setDeptConflict] = useState(null);
  const [creatingDepartment, setCreatingDepartment] = useState(false);
  const [deletingDepartmentId, setDeletingDepartmentId] = useState(null);

  const [editingTask, setEditingTask] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const { settings, updateSettings, refreshSettings } = useSettings();
  const { pushEnabled, togglePushNotifications } = useNotification();
  const {
    enabled: soundEnabled,
    setEnabled: setSoundEnabled,
    volume: soundVolume,
    setVolume: setSoundVolume,
    categories: soundCategories,
    setCategoryEnabled,
    playStartup,
    playSuccess,
    playWarning,
    playError,
    playClick,
  } = useSound();
  const [newCompanyName, setNewCompanyName] = useState(settings.companyName);
  const [newLogoPreviewUrl, setNewLogoPreviewUrl] = useState(resolveAssetUrl(settings.logoDataUrl || ''));
  const [newLogoFile, setNewLogoFile] = useState(null);
  const [logoFileName, setLogoFileName] = useState('');
  const [clearLogoPending, setClearLogoPending] = useState(false);
  const [adminAccessFile, setAdminAccessFile] = useState(null);
  const [adminAccessFileName, setAdminAccessFileName] = useState('');
  const [verifyingAdminAccessFile, setVerifyingAdminAccessFile] = useState(false);
  const deptChartWrapRef = useRef(null);
  const pieChartWrapRef = useRef(null);
  const [deptChartWidth, setDeptChartWidth] = useState(0);
  const [pieChartWidth, setPieChartWidth] = useState(0);
  useEffect(() => {
    const taskId = new URLSearchParams(location.search).get('taskId');
    if (taskId) {
      setSelectedTaskId(taskId);
      setView('ALL TASKS');
    }
  }, [location.search]);

  useEffect(() => {
    if (!selectedTaskId || view !== 'ALL TASKS') {
      return;
    }

    const row = document.querySelector(`[data-task-id="${CSS?.escape ? CSS.escape(String(selectedTaskId)) : String(selectedTaskId)}"]`);
    row?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }, [selectedTaskId, view]);
  useEffect(() => {
    if (settings?.companyName) {
      setNewCompanyName(settings.companyName);
    }
  }, [settings?.companyName]);
  useEffect(() => {
    setNewLogoPreviewUrl(resolveAssetUrl(settings?.logoDataUrl || ''));
    setClearLogoPending(false);
    setNewLogoFile(null);
    setLogoFileName('');
  }, [settings?.logoDataUrl]);

  useEffect(() => {
    if (view !== 'ANALYTICS') {
      return undefined;
    }

    const observeWidth = (element, setWidth) => {
      if (!element) {
        return () => {};
      }

      const updateWidth = () => {
        const nextWidth = Math.floor(element.getBoundingClientRect().width || 0);
        setWidth(nextWidth > 0 ? nextWidth : 0);
      };

      updateWidth();

      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(updateWidth);
        observer.observe(element);
        return () => observer.disconnect();
      }

      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    };

    const cleanupDept = observeWidth(deptChartWrapRef.current, setDeptChartWidth);
    const cleanupPie = observeWidth(pieChartWrapRef.current, setPieChartWidth);

    return () => {
      cleanupDept?.();
      cleanupPie?.();
    };
  }, [view]);

  useEffect(() => {
    fetchUsers();
    refreshTasks();
    fetchManagers();
    fetchDepartments();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
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
      const targetInput = taskDateFilter.dateFrom ? dateToInputRef.current : dateFromInputRef.current;
      targetInput?.showPicker?.();
      targetInput?.focus?.();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [showDateFilterOpen, taskDateFilter.dateFrom]);

  const fetchDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (err) {
      addToast(t('err_failed_depts') || 'Failed to load departments', 'error');
    } finally {
      setLoadingDepartments(false);
    }
  };

  // Sync view with URL 
  useEffect(() => {
    if (location.pathname === '/admin/tasks') setView('ALL TASKS');
    else if (location.pathname === '/admin/users') setView('USER MANAGEMENT');
    else if (location.pathname === '/admin/departments') setView('DEPARTMENTS');
    else if (location.pathname === '/admin/analytics') setView('ANALYTICS');
    else if (location.pathname === '/admin/settings') setView('SETTINGS');
    else setView('OVERVIEW');
  }, [location.pathname]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      addToast(t('err_failed_users') || 'Failed to load users', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchUserTasks = async (user) => {
    setSelectedUser(user);
    setLoadingUserTasks(true);
    try {
      const res = await api.get(`/admin/user/${user._id}/tasks`);
      setUserTasks(res.data || []);
    } catch (err) {
      addToast(t('err_failed_user_tasks') || 'Failed to retrieve user task history.', 'error');
      console.error('Fetch user tasks error:', err);
    } finally {
      setLoadingUserTasks(false);
    }
  };

  const handleToggleAccess = async (userId) => {
    setTogglingUserId(userId);
    try {
      const res = await api.patch(`/users/${userId}/toggle`);
      const updatedUser = res.data.user;

      setUsers((prev) => prev.map((user) => (
        user._id === userId ? updatedUser : user
      )));
      setSelectedUser((prev) => (prev?._id === userId ? updatedUser : prev));
      setManagersList((prev) => {
        if (updatedUser.role !== 'manager') {
          return prev;
        }

        if (!updatedUser.isActive) {
          return prev.filter((manager) => manager._id !== updatedUser._id);
        }

        const existingManagers = prev.filter((manager) => manager._id !== updatedUser._id);
        return [...existingManagers, updatedUser].sort((left, right) => left.name.localeCompare(right.name));
      });
      addToast(res.data.message, 'cyber');
    } catch (err) {
      addToast(err.response?.data?.message || t('err_toggle_access') || 'Failed to toggle access', 'error');
    } finally {
      setTogglingUserId(null);
    }
  };

  const openResetPasswordModal = (user) => {
    setResetPasswordTarget(user);
    setResetPasswordForm({ newPassword: '', confirmPassword: '' });
    setResetPasswordOpen(true);
  };

  const closeResetPasswordModal = () => {
    setResetPasswordOpen(false);
    setResetPasswordTarget(null);
    setResetPasswordForm({ newPassword: '', confirmPassword: '' });
    setResettingPassword(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!resetPasswordTarget) {
      return;
    }

    if (!resetPasswordForm.newPassword || !resetPasswordForm.confirmPassword) {
      addToast(t('err_password_required') || 'Enter and confirm the new password.', 'error');
      return;
    }

    if (resetPasswordForm.newPassword.length < 6) {
      addToast(t('err_password_length') || 'New password must be at least 6 characters.', 'error');
      return;
    }

    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      addToast(t('err_password_mismatch') || 'Passwords do not match.', 'error');
      return;
    }

    setResettingPassword(true);
    try {
      const res = await api.put(`/admin/reset-password/${resetPasswordTarget._id}`, {
        newPassword: resetPasswordForm.newPassword,
      });
      addToast(res.data.message || t('msg_password_reset_success')?.replace('{user}', resetPasswordTarget.name) || `Password reset for ${resetPasswordTarget.name}.`, 'success');
      closeResetPasswordModal();
    } catch (err) {
      addToast(err.response?.data?.message || t('err_reset_failed') || 'Failed to reset password', 'error');
      setResettingPassword(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm(`${t('irrevocable_action')} ${t('btn_proceed')}?`)) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      refreshTasks();
      const deletedMsg = t('msg_task_purged_success');
      addToast(
        deletedMsg && deletedMsg !== 'msg_task_purged_success'
          ? deletedMsg
          : 'Task deleted successfully',
        'success'
      );
    } catch (err) {
      addToast(t('err_purge_failed') || 'Deletion failed', 'error');
    }
  };

  const handleTransferResponse = async (taskId, action) => {
    try {
      await respondToTransfer(taskId, action);
      addToast(
        action === 'accept'
          ? 'Transfer accepted successfully.'
          : 'Transfer rejected successfully.',
        action === 'accept' ? 'success' : 'info'
      );
      refreshTasks();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to respond to transfer', 'error');
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await api.get('/users/managers');
      setManagersList(res.data);
    } catch (err) {
      console.error('Failed to fetch managers');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      if (form.role !== 'admin' && form.department.length === 0) throw new Error(t('msg_select_dept_err') || 'Select at least one department');
      if (form.role === 'manager' && form.department.length !== 1) throw new Error('Managers must have exactly one department.');
      if (form.role === 'employee' && !form.managerId) throw new Error(t('ph_select_manager') || 'Select a manager for the employee');
      if (!form.password || form.password.length < 6) throw new Error(t('err_password_length') || 'Password must be at least 6 characters');
      const res = await api.post('/users', {
        ...form,
        username: form.email,
      });
      if (res.data.accessFile?.content) {
        const fileBlob = new Blob([res.data.accessFile.content], { type: 'text/plain' });
        const downloadUrl = URL.createObjectURL(fileBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = res.data.accessFile.fileName || `${form.email}.taskauth`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(downloadUrl);
      }

      addToast(
        res.data.message || t('msg_user_created_success')?.replace('{role}', form.role) || `${form.role} created successfully!`,
        'success'
      );
      if (form.role === 'admin' && res.data.accessFile?.fileName) {
        addToast(`Admin access file downloaded: ${res.data.accessFile.fileName}`, 'cyber');
      }
      setCreateOpen(false);
      setForm({ name: '', email: '', password: '', role: 'manager', department: [], managerId: '' });
      fetchUsers();
      fetchManagers();
    } catch (err) {
      addToast(err.response?.data?.message || err.message, 'error');
    }
  };

  const toggleDept = (dept) => {
    setForm(f => ({
      ...f,
      department: f.department.includes(dept)
        ? f.department.filter(d => d !== dept)
        : [...f.department, dept]
    }));
  };

  const summarizeDepartmentDependencies = (departmentName) => {
    const relatedUsers = users.filter((user) => user.department?.includes(departmentName));

    return {
      users: relatedUsers.length,
      employees: relatedUsers.filter((user) => user.role === 'employee').length,
      managers: relatedUsers.filter((user) => user.role === 'manager').length,
      tasks: allTasks.filter((task) => task.department === departmentName).length,
    };
  };

  const handleCreateDept = async (e) => {
    e.preventDefault();
    const trimmedName = newDeptName.trim();

    if (!trimmedName) {
      addToast(t('err_dept_name_required') || 'Department name is required.', 'error');
      return;
    }

    setCreatingDepartment(true);
    try {
      const res = await api.post('/admin/departments', { name: trimmedName });
      const createdDepartment = res.data.department;

      setDepartments((prev) => {
        const nextDepartments = [...prev, createdDepartment];
        return nextDepartments.sort((left, right) => left.name.localeCompare(right.name));
      });
      setNewDeptName('');
      await fetchDepartments();
      addToast(t('msg_dept_created_success') || 'Department created successfully.', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || t('err_creation_failed') || 'Creation failed', 'error');
    } finally {
      setCreatingDepartment(false);
    }
  };

  const handleStartDeleteDept = (dept) => {
    const dependencies = summarizeDepartmentDependencies(dept.name);

    setDeptToDelete({ ...dept, dependencies });
    setDeleteConfirmStep(1);
    setDeptConflict(dependencies.users > 0 || dependencies.tasks > 0 ? dependencies : null);
  };

  const closeDeleteDepartmentModal = () => {
    setDeleteConfirmStep(0);
    setDeptToDelete(null);
    setDeptConflict(null);
    setDeletingDepartmentId(null);
  };

  const handleFinalDeleteDept = async () => {
    if (!deptToDelete) {
      return;
    }

    setDeletingDepartmentId(deptToDelete.id);
    try {
      await api.delete(`/admin/departments/${deptToDelete.id}`);
      setDepartments((prev) => prev.filter((department) => department.id !== deptToDelete.id));
      closeDeleteDepartmentModal();
      await fetchDepartments();
      addToast(t('msg_dept_deleted_success') || 'Department deleted successfully.', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || t('err_deletion_failed') || 'Deletion failed', 'error');
      setDeletingDepartmentId(null);
    }
  };

  const isOverdue = (t) => {
    const deadline = t?.reminderTime ? new Date(t.reminderTime) : (t?.dueDate ? parseISO(`${String(t.dueDate).slice(0, 10)}T23:59:59`) : null);
    return t.status !== 'Completed' && deadline && isBefore(deadline, new Date());
  };

  const getCompletionDeadline = (task) => (
    task?.reminderTime
      ? new Date(task.reminderTime)
      : task?.dueDate
        ? parseISO(`${String(task.dueDate).slice(0, 10)}T23:59:59`)
        : null
  );

  const getCompletionMoment = (task) => {
    if (task?.completedAt) return new Date(task.completedAt);
    if (task?.updatedAt) return new Date(task.updatedAt);
    if (task?.createdAt) return new Date(task.createdAt);
    return null;
  };

  const isCompletedOnTime = (task) => {
    if (String(task?.status || '').toLowerCase() !== 'completed') return false;
    const deadline = getCompletionDeadline(task);
    const completedAt = getCompletionMoment(task);
    if (!deadline || !completedAt) return true;
    return completedAt <= deadline;
  };

  const isCompletedOverTime = (task) => {
    if (String(task?.status || '').toLowerCase() !== 'completed') return false;
    const deadline = getCompletionDeadline(task);
    const completedAt = getCompletionMoment(task);
    if (!deadline || !completedAt) return false;
    return completedAt > deadline;
  };

  const isTaskWithinSelectedDateRange = (task) => {
    if (!taskDateFilter.dateFrom && !taskDateFilter.dateTo) return true;
    const taskDate = task?.reminderTime
      ? new Date(task.reminderTime)
      : task?.dueDate
        ? parseISO(`${String(task.dueDate).slice(0, 10)}T23:59:59`)
        : null;
    if (!taskDate) return false;

    if (taskDateFilter.dateFrom) {
      const fromDate = parseISO(`${taskDateFilter.dateFrom}T00:00:00`);
      if (taskDate < fromDate) return false;
    }

    if (taskDateFilter.dateTo) {
      const toDate = parseISO(`${taskDateFilter.dateTo}T23:59:59`);
      if (taskDate > toDate) return false;
    }

    return true;
  };

  const filteredByDateTasks = useMemo(
    () => allTasks.filter(isTaskWithinSelectedDateRange),
    [allTasks, taskDateFilter.dateFrom, taskDateFilter.dateTo]
  );

  const filteredByDateAndDepartmentTasks = useMemo(() => {
    if (deptFilter === 'All') return filteredByDateTasks;
    return filteredByDateTasks.filter((task) => task.department === deptFilter);
  }, [filteredByDateTasks, deptFilter]);

  const analyticsDepartments = useMemo(() => {
    if (deptFilter === 'All') return departments;
    return departments.filter((dept) => dept.name === deptFilter);
  }, [departments, deptFilter]);

  const stats = useMemo(() => ({
    total:       filteredByDateAndDepartmentTasks.length,
    completed:   filteredByDateAndDepartmentTasks.filter(t => t.status === 'Completed').length,
    completedOnTime: filteredByDateAndDepartmentTasks.filter(isCompletedOnTime).length,
    completedOverTime: filteredByDateAndDepartmentTasks.filter(isCompletedOverTime).length,
    inProgress:  filteredByDateAndDepartmentTasks.filter(t => t.status === 'In Progress').length,
    pending:     filteredByDateAndDepartmentTasks.filter(t => t.status === 'Pending').length,
    overdue:     filteredByDateAndDepartmentTasks.filter(isOverdue).length,
  }), [filteredByDateAndDepartmentTasks]);

  const deptChartData = useMemo(() => analyticsDepartments.map((dept, i) => ({
    name: (dept?.name || 'DEPT').substring(0, 4).toUpperCase(),
    'On Time': filteredByDateAndDepartmentTasks.filter(t => t.department === dept.name && isCompletedOnTime(t)).length,
    'Over Time': filteredByDateAndDepartmentTasks.filter(t => t.department === dept.name && isCompletedOverTime(t)).length,
    Active:    filteredByDateAndDepartmentTasks.filter(t => t.department === dept.name && t.status === 'In Progress').length,
    Pending:   filteredByDateAndDepartmentTasks.filter(t => t.department === dept.name && t.status === 'Pending').length,
    Overdue:   filteredByDateAndDepartmentTasks.filter(t => t.department === dept.name && isOverdue(t)).length,
  })), [filteredByDateAndDepartmentTasks, analyticsDepartments]);

  const pieData = useMemo(() => [
    { name: 'On Time',     value: stats.completedOnTime,    color: '#00ff88' },
    { name: 'Over Time',   value: stats.completedOverTime,  color: '#f97316' },
    { name: 'In Progress', value: stats.inProgress,         color: '#00d4ff' },
    { name: 'Pending',     value: stats.pending,            color: '#eab308' },
    { name: 'Overdue',     value: stats.overdue,            color: '#ff4444' },
  ].filter(d => d.value > 0), [stats]);

  const deptProgress = useMemo(() => analyticsDepartments.map((dept, i) => {
    const total = filteredByDateAndDepartmentTasks.filter(t => t.department === dept.name).length;
    const done  = filteredByDateAndDepartmentTasks.filter(t => t.department === dept.name && t.status === 'Completed').length;
    return { dept: dept.name, total, done, pct: total ? Math.round((done/total)*100) : 0 };
  }), [filteredByDateAndDepartmentTasks, analyticsDepartments]);

  const departmentAnalyticsRows = useMemo(() => analyticsDepartments.map((dept) => {
    const deptTasks = filteredByDateAndDepartmentTasks.filter((task) => task.department === dept.name);
    const completedOnTime = deptTasks.filter((task) => isCompletedOnTime(task)).length;
    const completedOverTime = deptTasks.filter((task) => isCompletedOverTime(task)).length;
    const completed = completedOnTime + completedOverTime;
    const active = deptTasks.filter((task) => task.status === 'In Progress').length;
    const pending = deptTasks.filter((task) => task.status === 'Pending').length;
    const overdue = deptTasks.filter((task) => isOverdue(task)).length;
    const total = deptTasks.length;

    return {
      name: dept.name,
      total,
      completed,
      completedOnTime,
      completedOverTime,
      active,
      pending,
      overdue,
      donePct: total ? Math.round((completed / total) * 100) : 0,
    };
  }), [analyticsDepartments, filteredByDateAndDepartmentTasks]);

  const filteredTasks = useMemo(() => {
    let list = filteredByDateAndDepartmentTasks;
    if (search) list = list.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter === 'Overdue') list = list.filter(isOverdue);
    if (statusFilter !== 'All' && statusFilter !== 'Overdue') list = list.filter(t => t.status === statusFilter);
    return list;
  }, [filteredByDateAndDepartmentTasks, search, statusFilter]);

  const overviewTasksToShow = useMemo(() => {
    let list = filteredTasks;
    if (statusFilter === 'Completed' && completedTimingFilter !== 'All') {
      list = list.filter((task) => (
        completedTimingFilter === 'On Time' ? isCompletedOnTime(task) : isCompletedOverTime(task)
      ));
    }
    return list;
  }, [filteredTasks, statusFilter, completedTimingFilter]);

  const userById = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      map.set(String(u._id || u.id), u);
    });
    return map;
  }, [users]);

  const formatRole = (role) => {
    if (String(role).toLowerCase() === 'admin') return 'Admin';
    if (String(role).toLowerCase() === 'manager') return 'Manager';
    if (String(role).toLowerCase() === 'employee') return 'Employee';
    return 'User';
  };

  const formatUserWithRole = (user, fallbackLabel = 'User') => {
    if (!user) return fallbackLabel;
    const roleLabel = formatRole(user.role);
    const name = user.name || fallbackLabel;
    return `${roleLabel} - ${name}`;
  };

  const jumpToTasks = (nextStatus = 'All') => {
    if (showOverviewTasks && activeOverviewTaskFilter === nextStatus) {
      setShowOverviewTasks(false);
      setActiveOverviewTaskFilter(null);
      setStatusFilter('All');
      setView('OVERVIEW');
      return;
    }

    setStatusFilter(nextStatus);
    setActiveOverviewTaskFilter(nextStatus);
    setShowOverviewTasks(true);
    setView('OVERVIEW');
  };

  const filteredUsers = useMemo(() => {
    let list = users;
    if (roleFilter !== 'all') list = list.filter(u => u.role === roleFilter);
    if (userSearch) list = list.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()));
    return list;
  }, [users, userSearch, roleFilter]);

  const assignableUsers = useMemo(() => {
    return users
      .filter(u => u.isActive !== false)
      .filter(u => taskForm.assigneeRole ? u.role === taskForm.assigneeRole : true)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, taskForm.assigneeRole, taskForm.department]);

  const filteredAssignableUsers = useMemo(() => {
    const term = assignSearch.trim().toLowerCase();
    if (!term) return assignableUsers;
    return assignableUsers.filter((u) =>
      u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
    );
  }, [assignableUsers, assignSearch]);

  const getPrimaryDepartment = (user) => {
    if (!user) return '';
    if (Array.isArray(user.department)) {
      return user.department.find((dept) => String(dept || '').trim()) || '';
    }
    return String(user.department || '').trim();
  };

  const selectedAssignableUser = useMemo(() => {
    if (!taskForm.assignedTo) return null;
    return users.find((user) => String(user._id) === String(taskForm.assignedTo)) || null;
  }, [taskForm.assignedTo, users]);

  useEffect(() => {
    if (!taskForm.assignedTo) {
      if (taskForm.department) {
        setTaskForm((f) => ({ ...f, department: '' }));
      }
      return;
    }

    const nextDepartment = getPrimaryDepartment(selectedAssignableUser);
    if (nextDepartment && taskForm.department !== nextDepartment) {
      setTaskForm((f) => ({ ...f, department: nextDepartment }));
    }
  }, [taskForm.assignedTo, taskForm.assigneeRole, selectedAssignableUser]);

  useEffect(() => {
    // Reset selection if current user no longer fits the filter
    if (taskForm.assignedTo && !assignableUsers.some((u) => String(u._id) === String(taskForm.assignedTo))) {
      setTaskForm((f) => ({ ...f, assignedTo: '' }));
    }
  }, [assignableUsers]);

  useEffect(() => {
    if (!taskForm.assignedTo) {
      setAssignSearch('');
      setShowAssignSuggestions(false);
      return;
    }

    if (selectedAssignableUser) {
      setAssignSearch(`${selectedAssignableUser.name} (${selectedAssignableUser.email})`);
    }
  }, [taskForm.assignedTo, selectedAssignableUser]);

  const assignBoxRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(e) {
      if (assignBoxRef.current && !assignBoxRef.current.contains(e.target)) {
        setShowAssignSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const handleUpdateCompanyName = async (e) => {
    e.preventDefault();
    if (!newCompanyName.trim()) {
      addToast('Company name cannot be empty', 'error');
      return;
    }

    const payload = new FormData();
    payload.append('companyName', newCompanyName.trim());
    if (clearLogoPending) {
      payload.append('clearLogo', '1');
    } else if (newLogoFile) {
      payload.append('logo', newLogoFile);
    }

    const success = await updateSettings(payload);
    if (success) {
      addToast('Company name updated successfully', 'success');
      refreshSettings();
    } else {
      addToast('Failed to update company name', 'error');
    }
  };

  const handleLogoChange = (file) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file for the logo.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setNewLogoPreviewUrl(String(reader.result || ''));
      setNewLogoFile(file);
      setClearLogoPending(false);
      setLogoFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setNewLogoPreviewUrl('');
    setNewLogoFile(null);
    setLogoFileName('');
    setClearLogoPending(true);
  };

  const handleAdminAccessFileChange = (file) => {
    if (!file) {
      return;
    }

    setAdminAccessFile(file);
    setAdminAccessFileName(file.name);
  };

  const handleVerifyAdminAccessFile = async () => {
    if (!adminAccessFile) {
      addToast('Please choose an admin access file first.', 'error');
      return;
    }

    try {
      setVerifyingAdminAccessFile(true);
      const formData = new FormData();
      formData.append('adminAuthFile', adminAccessFile);

      const res = await api.post('/admin/access-file/verify', formData);
      addToast(res.data?.message || 'Admin access file verified successfully.', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to verify admin access file.', 'error');
    } finally {
      setVerifyingAdminAccessFile(false);
    }
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    try {
      if (!taskForm.assignedTo) throw new Error(t('err_select_user') || 'Select a user');
      if (!taskForm.title) throw new Error(t('err_title_required') || 'Title is required');
      if (!taskForm.department) throw new Error(t('err_select_dept') || 'Select a department');
      if (!taskForm.assigneeRole) throw new Error(t('err_select_role') || 'Select a role');
      const reminderTime = taskForm.dueDate && taskForm.dueTime ? `${taskForm.dueDate}T${taskForm.dueTime}:00` : null;
      const res = await api.post('/tasks', { ...taskForm, reminderTime });
      const createdTask = res.data?.task || res.data;
      const createdTaskId = createdTask?._id || createdTask?.id;

      if (taskFiles.length && createdTaskId) {
        const formData = new FormData();
        taskFiles.forEach((file) => formData.append('files', file));
        await api.post(`/tasks/${createdTaskId}/attachments`, formData);
      } else if (taskFiles.length) {
        addToast('Task created, but attachment upload skipped (missing task id).', 'error');
      }
      addToast(t('msg_task_assigned_success') || 'Task assigned successfully!', 'success');
      setAssignOpen(false);
      setTaskForm({ title: '', description: '', assignedTo: '', department: '', startDate: format(new Date(), 'yyyy-MM-dd'), dueDate: format(new Date(), 'yyyy-MM-dd'), dueTime: format(new Date(), 'HH:mm'), priority: 'Medium', assigneeRole: 'manager' });
      setTaskFiles([]);
      refreshTasks();
    } catch (err) {
      addToast(err.response?.data?.message || err.message || t('err_generic') || 'Operation failed', 'error');
    }
  };

  const openQuickAssignForUser = (user) => {
    const role = String(user?.role || '').toLowerCase() === 'employee' ? 'employee' : 'manager';
    const department = getPrimaryDepartment(user);
    setTaskForm({
      title: '',
      description: '',
      assignedTo: user?._id || '',
      department,
      startDate: format(new Date(), 'yyyy-MM-dd'),
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      dueTime: format(new Date(), 'HH:mm'),
      priority: 'Medium',
      assigneeRole: role,
    });
    setAssignSearch(user ? `${user.name} (${user.email})` : '');
    setShowAssignSuggestions(false);
    setAssignOpen(true);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="max-w-7xl mx-auto"
    >
      {/* Premium Sci-Fi Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
        <div>
          <motion.div 
            initial={{ width: 0 }} animate={{ width: '40px' }} transition={{ duration: 0.7, delay: 0.2 }}
            className="h-[2px] mb-3" style={{ background: 'linear-gradient(90deg, var(--secondary), transparent)' }} 
          />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3 uppercase">
            {t('system_control').split(' ')[0]} <span className="text-indigo-600 dark:text-cyan-400 flex items-center gap-2">{t('system_control').split(' ')[1]}<Zap size={20} className="text-indigo-600 dark:text-cyan-400 animate-pulse"/></span>
          </h1>
        </div>
        
        {view === 'USER MANAGEMENT' && (
          <div className="flex gap-3">
            <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
              onClick={() => setAssignOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-mono font-bold transition-all shadow-lg relative overflow-hidden group uppercase"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--secondary)' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/10 to-cyan-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Send size={14} /> {t('btn_assign_task')}
            </motion.button>
            <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-mono font-bold transition-all shadow-lg relative overflow-hidden group uppercase"
              style={{ background: 'linear-gradient(135deg, var(--status-done), var(--secondary))', color: '#fff' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Plus size={14} /> {t('btn_create_user')}
            </motion.button>
          </div>
        )}

        {view !== 'USER MANAGEMENT' && (
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
                  background: hasActiveAdminFilters ? 'rgba(0,212,255,0.12)' : 'var(--bg-input)',
                  borderColor: hasActiveAdminFilters ? 'var(--secondary)' : 'var(--border-subtle)',
                  color: hasActiveAdminFilters ? 'var(--secondary)' : 'var(--text-secondary)',
                }}
              >
                <Filter size={15} />
              </motion.button>
            ) : (
              <div
                className="absolute right-0 top-[calc(100%+10px)] z-50 w-[300px] rounded-2xl border p-3 shadow-2xl holo-card"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 text-[9px] font-mono font-bold tracking-[0.22em] uppercase text-slate-500 dark:text-slate-400">
                      Department
                    </div>
                    <div className="relative">
                      <select
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value || 'All')}
                        className="input-cyber py-2 pr-10 text-[11px] appearance-none"
                      >
                        <option value="All">All Departments</option>
                        {departmentNames.map((department) => (
                          <option key={department} value={department}>
                            {department}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">
                        ▾
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                      Leave it on All Departments to see the mixed view.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="mb-1 text-[9px] font-mono font-bold tracking-[0.22em] uppercase text-slate-500 dark:text-slate-400">
                      Start Date
                    </div>
                    <div className="relative">
                      <input
                        ref={dateFromInputRef}
                        type="date"
                        value={taskDateFilter.dateFrom}
                        onChange={(e) => setTaskDateFilter((f) => ({ ...f, dateFrom: e.target.value }))}
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
                        value={taskDateFilter.dateTo}
                        onChange={(e) => setTaskDateFilter((f) => ({ ...f, dateTo: e.target.value }))}
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
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDeptFilter('All');
                      setTaskDateFilter({ dateFrom: '', dateTo: '' });
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
        )}
      </div>

      {location.pathname === '/admin' && (
        <motion.button
          type="button"
          aria-label="Assign task"
          onClick={() => setAssignOpen(true)}
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
      {/* High-End Glass Tabs */}
      <div className="flex gap-1 w-full md:w-fit overflow-x-auto scrollbar-hide mb-6 p-1 rounded-[14px] border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-black/50">
              {[
                { id: 'OVERVIEW', key: 'nav_overview' },
                { id: 'ALL TASKS', key: 'nav_all_tasks' },
                { id: 'USER MANAGEMENT', key: 'user_mgmt_tab' },
                { id: 'DEPARTMENTS', key: 'nav_departments' },
                { id: 'ANALYTICS', key: 'nav_analytics' },
                { id: 'SETTINGS', key: 'nav_settings' }
              ].map(tab => {
                const isActive = view === tab.id;
                const routes = {
                  'OVERVIEW': '/admin',
                  'ALL TASKS': '/admin/tasks',
                  'USER MANAGEMENT': '/admin/users',
                  'DEPARTMENTS': '/admin/departments',
                  'ANALYTICS': '/admin/analytics',
                  'SETTINGS': '/admin/settings'
                };
                return (
                  <button 
              key={tab.id} 
              onClick={() => {
                navigate(routes[tab.id]);
              }} 
              className={`relative px-6 py-2.5 rounded-xl text-[11px] font-mono font-bold tracking-widest transition-all duration-300 ${isActive ? 'text-indigo-600 dark:text-cyan-400' : 'text-slate-500 hover:text-slate-400'}`}
            >
              {isActive && (
                <motion.div layoutId="admin-tab-bubble" className="absolute inset-0 rounded-xl" style={{ background: 'var(--accent-glow)', border: '1px solid var(--border-glow)', boxShadow: '0 0 15px var(--accent-glow)' }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} />
              )}
              <span className="relative z-10">{t(tab.key)}</span>
            </button>
          );
        })}
      </div>

      {/* ─── OVERVIEW ─── */}
      {view === 'OVERVIEW' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
             <StatWidget label={t('stat_pending_queue')} value={stats.pending}    icon={Clock}         color="var(--status-pending)" glow="var(--accent-glow)" delay={0} onClick={() => jumpToTasks('Pending')} />
             <StatWidget label={t('stat_active')}        value={stats.inProgress} icon={Activity}      color="var(--primary)" glow="var(--accent-glow)" delay={0.06} onClick={() => jumpToTasks('In Progress')} />
             <StatWidget label={t('stat_completed')}     value={stats.completed}  icon={CheckCircle2}  color="var(--status-done)" glow="var(--accent-glow)" delay={0.12} onClick={() => jumpToTasks('Completed')} />
             <StatWidget label={t('stat_total_tasks')}   value={stats.total}       icon={Zap}           color="#00d4ff" glow="var(--accent-glow)" delay={0.18} onClick={() => jumpToTasks('All')} />
          </div>

          {showOverviewTasks && (
          <div className="rounded-2xl p-5 mb-6 holo-card" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <ClipboardList size={14} className="text-indigo-600 dark:text-cyan-400" />
                <span className="text-xs font-mono font-bold tracking-widest uppercase text-indigo-600 dark:text-cyan-300">
                  {statusFilter === 'All' ? 'ALL TASKS' : `SHOWING: ${statusFilter.toUpperCase()}`}
                </span>
              </div>
              {statusFilter !== 'All' && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('All')}
                  className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-600"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="space-y-3 max-h-[320px] overflow-y-auto">
              {statusFilter === 'Completed' && (
                <div className="flex flex-wrap items-center gap-2 pb-1">
                  {['All', 'On Time', 'Over Time'].map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCompletedTimingFilter(key)}
                      className={`px-3 py-1.5 rounded-full border text-[10px] font-mono font-bold tracking-widest uppercase transition-all ${
                        completedTimingFilter === key
                          ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-cyan-300'
                          : 'border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              )}
              {overviewTasksToShow.slice(0, 12).map((task) => (
                <div key={task._id || task.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 dark:border-white/10 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{task.title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {(() => {
                        const assigneeUser = userById.get(String(task.assignedTo));
                        const assignedByUser = userById.get(String(task.assignedBy));
                        const fallbackManager = assigneeUser?.managerId ? userById.get(String(assigneeUser.managerId)) : null;
                        const assigneeText = task.assignedToName || task.assigneeName || formatUserWithRole(assigneeUser, 'Assignee');
                        const assignedByText = task.assignedByName || formatUserWithRole(assignedByUser || fallbackManager, 'Manager/Admin');
                        return `${task.department} • To: ${assigneeText} • By: ${assignedByText}`;
                      })()}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
                    {task.status}
                  </span>
                </div>
              ))}
              {overviewTasksToShow.length === 0 && (
                <div className="text-xs text-slate-500 dark:text-slate-400">No tasks found for this filter.</div>
              )}
            </div>
          </div>
          )}

          <div className="rounded-2xl p-6 mb-6 holo-card" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
            <div className="flex items-center gap-2 mb-6">
              <Zap size={13} className="text-indigo-600 dark:text-cyan-400" />
              <span className="text-xs font-mono font-bold tracking-widest uppercase text-indigo-600 dark:text-cyan-300">{t('dept_comp_rates')}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {deptProgress.map((d, i) => (
                <div key={d.dept} className="flex flex-col items-center gap-3">
                  <RingProgress value={d.pct} color={DEPT_COLORS[i]} size={110} label={(d.dept || 'DEPT').substring(0,4).toUpperCase() + ` ${d.done}/${d.total}`} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ─── ALL TASKS ─── */}
      {view === 'ALL TASKS' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="rounded-2xl overflow-hidden shadow-xl relative holo-card" 
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {/* Subtle top glow */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 dark:via-cyan-500/50 to-transparent" />
          
          <div className="px-4 md:px-6 py-5 flex flex-col md:flex-row gap-4 items-start md:items-center relative z-10" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'linear-gradient(to bottom, var(--accent-glow), transparent)' }}>
            <SearchBar value={search} onChange={setSearch} className="w-full md:w-64" />
            <div className="cyber-tab-bar w-full md:w-auto overflow-x-auto scrollbar-hide py-1">
              <button onClick={() => setDeptFilter('All')} className={`cyber-tab flex-shrink-0 ${deptFilter === 'All' ? 'active' : ''}`}>{t('all_depts_filter').toUpperCase()}</button>
              {departmentNames.map(d => (
                <button key={d} onClick={() => setDeptFilter(d)} className={`cyber-tab flex-shrink-0 ${deptFilter === d ? 'active' : ''}`}>{(d || 'DEPT').substring(0,4).toUpperCase()}</button>
              ))}
            </div>
            <span className="text-[10px] hidden md:block font-mono ml-auto font-bold tracking-widest px-3 py-1.5 rounded-lg border uppercase" style={{ color: 'var(--secondary)', borderColor: 'var(--border-subtle)', background: 'var(--bg-input)' }}>{filteredTasks.length} {t('records_label')}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-black/30">
                  <th className="px-6 py-4 text-[10px] font-mono tracking-widest text-slate-500 font-semibold border-b border-white/5 uppercase">{t('task_directive_label')}</th>
                  <th className="px-6 py-4 text-[10px] font-mono tracking-widest text-slate-500 font-semibold border-b border-white/5 uppercase">{t('assignee_label')}</th>
                  <th className="px-6 py-4 text-[10px] font-mono tracking-widest text-slate-500 font-semibold border-b border-white/5 uppercase">Assigned By</th>
                  <th className="px-6 py-4 text-[10px] font-mono tracking-widest text-slate-500 font-semibold border-b border-white/5 uppercase">{t('nav_departments')}</th>
                  <th className="px-6 py-4 text-[10px] font-mono tracking-widest text-slate-500 font-semibold border-b border-white/5 uppercase">{t('level_label')}</th>
                  <th className="px-6 py-4 text-[10px] font-mono tracking-widest text-slate-500 font-semibold border-b border-white/5 uppercase">{t('nav_status')}</th>
                  <th className="px-6 py-4 text-[10px] font-mono tracking-widest text-slate-500 font-semibold border-b border-white/5 flex justify-end uppercase">{t('actions_label')}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <AnimatePresence>
                  {filteredTasks.map((task, idx) => {
                    const overdueTask = isOverdue(task);
                    const assigneeUser = userById.get(String(task.assignedTo));
                    const assignedByUser = userById.get(String(task.assignedBy));
                    const fallbackManager = assigneeUser?.managerId ? userById.get(String(assigneeUser.managerId)) : null;
                    const assigneeName = task.assignedToName || task.assigneeName || formatUserWithRole(assigneeUser, 'Assignee');
                    const assignedByName = task.assignedByName || formatUserWithRole(assignedByUser || fallbackManager, 'Manager/Admin');
                    return (
                      <motion.tr 
                        key={task.id} 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.03 }}
                        data-task-id={task.id}
                        className={`group transition-colors duration-200 border-b border-slate-100 dark:border-white/5 ${overdueTask ? 'bg-red-500/5 dark:bg-red-500/10' : ''} ${String(selectedTaskId) === String(task.id || task._id) ? 'bg-cyan-500/10 dark:bg-cyan-400/10 ring-1 ring-cyan-400/40' : ''}`}
                      >
                        <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium max-w-[220px] truncate flex items-center gap-2">
                          {overdueTask && <AlertCircle size={14} className="text-red-500 shrink-0" />}
                          {task.title}
                        </td>
                        <td className="px-6 py-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">{assigneeName}</td>
                        <td className="px-6 py-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">{assignedByName}</td>
                        <td className="px-6 py-4"><span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-indigo-600 dark:text-cyan-400 uppercase">{t(task.department.toLowerCase())}</span></td>
                        <td className="px-6 py-4"><span className={`text-[10px] font-mono font-bold px-2 py-1 rounded border shadow-lg uppercase ${task.priority === 'High' ? 'text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10' : task.priority === 'Medium' ? 'text-yellow-600 dark:text-yellow-400 border-yellow-500/30 bg-yellow-500/10' : 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10'}`}>{t(`priority_${(task.priority || 'Medium').toLowerCase().substring(0,3)}`)}</span></td>
                        <td className="px-6 py-4"><span className={`text-[10px] font-mono font-bold px-2 py-1 flex items-center gap-1 w-fit rounded uppercase ${task.status === 'Completed' ? 'text-emerald-600 dark:text-emerald-400' : task.status === 'In Progress' ? 'text-indigo-600 dark:text-cyan-400' : 'text-yellow-600 dark:text-yellow-400'}`}>{task.status === 'Completed' ? <CheckCircle2 size={12}/> : task.status === 'In Progress' ? <Activity size={12}/> : <Clock size={12}/>}{t(`status_${task.status === 'In Progress' ? 'active' : task.status === 'Completed' ? 'done' : 'pending'}`)}</span></td>
                        <td className="px-6 py-4 flex justify-end gap-2">
                          {currentUser?.role === 'admin'
                            && String(task.transferStatus || '').toLowerCase() === 'pending'
                            && String(task.transferredToManagerId || '') === String(currentUser?._id) && (
                              <>
                                <motion.button
                                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                  onClick={() => handleTransferResponse(task.id, 'accept')}
                                  className="px-3 py-2 rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-all"
                                >
                                  Accept
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                  onClick={() => handleTransferResponse(task.id, 'reject')}
                                  className="px-3 py-2 rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase border border-rose-500/20 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-all"
                                >
                                  Reject
                                </motion.button>
                              </>
                            )
                          }
                          <motion.button 
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            onClick={() => { setEditingTask(task); setEditOpen(true); }}
                            className="p-2 rounded-lg text-indigo-400/50 dark:text-cyan-400/50 hover:text-indigo-600 dark:hover:text-cyan-400 hover:bg-indigo-500/10 dark:hover:bg-cyan-500/10 transition-all border border-transparent hover:border-indigo-500/30 dark:hover:border-cyan-500/30"
                            title={t('edit_task_tooltip') || 'Edit Task'}
                          >
                            <Edit size={14} />
                          </motion.button>
                          <motion.button 
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeleteTask(task.id)} 
                            className="p-2 rounded-lg text-red-500/50 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/30"
                            title={t('purge_task_tooltip') || 'Purge Task'}
                          >
                            <Trash2 size={14} />
                          </motion.button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ─── USER MANAGEMENT ─── */}
      {view === 'USER MANAGEMENT' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="rounded-2xl overflow-hidden shadow-xl relative holo-card" 
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 dark:via-emerald-500/50 to-transparent" />

          {/* Header with search + role sub-tabs */}
          <div className="px-4 md:px-6 py-5 relative z-10" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'linear-gradient(to bottom, var(--accent-glow), transparent)' }}>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-emerald-500 dark:text-emerald-400" />
                <span className="text-[10px] md:hidden font-mono font-bold tracking-widest text-emerald-600 dark:text-emerald-400">{filteredUsers.length} {t('records_label')}</span>
              </div>
              <SearchBar value={userSearch} onChange={setUserSearch} className="w-full md:w-64" />
              <span className="text-[10px] hidden md:inline-block font-mono flex-1 font-bold tracking-widest text-slate-500 dark:text-slate-400/50">{filteredUsers.length} {t('records_label')}</span>
            </div>
            {/* Role Sub-Tabs */}
            <div className="flex gap-1 p-1 rounded-xl w-full md:w-fit overflow-x-auto scrollbar-hide bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/5">
              {[{ id: 'all', label: t('all_statuses') }, { id: 'manager', label: t('role_manager') }, { id: 'employee', label: t('role_employee') }, { id: 'admin', label: t('role_admin') }].map(tab => (
                <button key={tab.id} onClick={() => setRoleFilter(tab.id)}
                  className={`relative px-5 py-1.5 rounded-lg text-[10px] font-mono font-bold tracking-widest transition-all duration-300 ${roleFilter === tab.id ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
                  {roleFilter === tab.id && <motion.div layoutId="role-tab-bg" className="absolute inset-0 rounded-lg" style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} />}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto relative z-10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-black/30">
                  <th className="px-6 py-4 text-[10px] font-mono tracking-widest text-slate-500 font-semibold border-b border-white/5 uppercase">{t('user_label') || 'USER'}</th>
                  <th className="px-6 py-4 text-[10px] font-mono tracking-widest text-slate-500 font-semibold border-b border-white/5 uppercase">{t('role_label') || 'ROLE'}</th>
                  <th className="px-6 py-4 text-[10px] font-mono tracking-widest text-slate-500 font-semibold border-b border-white/5 uppercase">{t('nav_departments')}</th>
                  <th className="px-6 py-4 text-[10px] font-mono tracking-widest text-slate-500 font-semibold border-b border-white/5 text-right uppercase">{t('actions_label')}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <AnimatePresence>
                {filteredUsers.map((u, idx) => {
                  const ROLE_COLORS = { employee: '#00d4ff', manager: '#bf00ff', admin: '#00ff88' };
                  return (
                       <motion.tr 
                        key={u._id} 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: u.isActive ? 1 : 0.6, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.02 }}
                        className={`group border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-all ${!u.isActive ? 'bg-slate-50/50 dark:bg-red-500/5' : ''}`}
                      >
                         <td className="px-6 py-4">
                          <div className={`flex items-center gap-3 ${!u.isActive ? 'grayscale opacity-80' : ''}`}>
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 shadow-sm"
                              style={{ 
                                background: u.isActive 
                                  ? `linear-gradient(135deg, ${ROLE_COLORS[u.role]||'var(--primary)'}, var(--secondary))`
                                  : 'linear-gradient(135deg, #94a3b8, #64748b)' 
                              }}>
                              {u.name.substring(0,2).toUpperCase()}
                            </div>
                            <div>
                               <p className={`text-[13px] font-semibold ${!u.isActive ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{u.name}</p>
                               <p className="text-[10px] font-mono tracking-wider text-slate-500 dark:text-slate-400/60">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-600 dark:text-cyan-400 bg-indigo-500/5 dark:bg-cyan-500/5 px-2 py-1 rounded border border-indigo-500/10 dark:border-cyan-500/10">
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {(u.department || []).map(d => (
                              <span key={d} className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10">{d}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 justify-end">
                            {u.role !== 'admin' && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openQuickAssignForUser(u);
                                }}
                                className="p-2 rounded-lg text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all border border-transparent hover:border-cyan-500/30"
                                title={`Assign task to ${u.name}`}
                              >
                                <Plus size={16} />
                              </motion.button>
                            )}
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={() => fetchUserTasks(u)}
                              className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-cyan-500/10 transition-all"
                              title={t('view_tasks') || 'View Tasks'}>
                              <Eye size={16} />
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={(e) => { e.stopPropagation(); openResetPasswordModal(u); }}
                              className="p-2 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-amber-500/10 transition-all"
                              title={t('reset_btn') || 'Reset Password'}>
                              <KeyRound size={16} />
                            </motion.button>
                            {u.role !== 'admin' && (
                              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                onClick={(e) => { e.stopPropagation(); handleToggleAccess(u._id); }} 
                                disabled={togglingUserId === u._id}
                                className={`p-2 rounded-lg transition-all ${togglingUserId === u._id ? 'cursor-not-allowed opacity-60' : u.isActive ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                title={u.isActive ? t('revoke_btn') : t('grant_btn')}>
                                {u.isActive ? <ShieldOff size={16} /> : <Shield size={16} />}
                              </motion.button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                  );
                })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ─── DEPARTMENTS ─── */}
      {view === 'DEPARTMENTS' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl overflow-hidden shadow-xl relative holo-card" 
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 dark:via-cyan-500/50 to-transparent" />
          
          <div className="px-6 py-6 border-b dark:border-white/5 bg-slate-50 dark:bg-white/5" style={{ borderBottomColor: 'var(--border-subtle)' }}>
            <h3 className="text-sm font-mono font-bold tracking-widest text-indigo-600 dark:text-cyan-400 mb-4">// {t('title_create_dept')}</h3>
            <form onSubmit={handleCreateDept} className="flex gap-2">
              <input 
                type="text" 
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder={t('ph_enter_dept_name')}
                className="flex-1 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500/50 dark:focus:border-cyan-500/50 transition-all font-mono"
              />
              <motion.button 
                whileHover={{ scale: creatingDepartment ? 1 : 1.02 }} whileTap={{ scale: creatingDepartment ? 1 : 0.98 }}
                type="submit"
                disabled={creatingDepartment}
                className="px-6 py-3 rounded-xl bg-indigo-600 dark:bg-cyan-500 text-white dark:text-black font-bold text-xs font-mono tracking-widest hover:bg-indigo-500 dark:hover:bg-cyan-400 transition-all shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingDepartment ? t('btn_creating') : t('btn_create')}
              </motion.button>
            </form>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">{t('label_active_depts')}</span>
              <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-600 dark:text-cyan-500/60 bg-indigo-500/5 dark:bg-cyan-500/5 px-2 py-1 rounded border border-indigo-500/10 dark:border-cyan-500/10">{departments.length} {t('records_label')}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map((dept, idx) => {
                const headCount = users.filter(u => u.department?.includes(dept.name)).length;
                const taskCount = allTasks.filter(t => t.department === dept.name).length;
                return (
                  <motion.div 
                    key={dept.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                    className="p-4 rounded-xl border border-slate-100 dark:border-white/5 hover:border-indigo-500/20 dark:hover:border-white/10 transition-all group relative overflow-hidden bg-slate-50/50 dark:bg-white/02"
                  >
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-white tracking-wide mb-1">{dept.name}</h4>
                        <div className="flex gap-3 mt-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                            <Users size={12} className="text-indigo-600 dark:text-cyan-500/50" /> {headCount} {t('records_label')}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                            <ClipboardList size={12} className="text-indigo-600 dark:text-cyan-500/50" /> {taskCount} {t('stat_total_tasks')}
                          </div>
                        </div>
                      </div>
                      <motion.button 
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => handleStartDeleteDept(dept)}
                        className="p-2 rounded-lg text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    </div>
                    {/* Background accent */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 dark:bg-cyan-500/5 blur-3xl rounded-full translate-x-12 -translate-y-12" />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── USER TASK HISTORY PANEL ─── */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setSelectedUser(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl p-6 relative holo-card"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors"><X size={20} /></button>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
                  {selectedUser.name.substring(0,2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedUser.name}</h3>
                  <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{selectedUser.email} • {selectedUser.role.toUpperCase()}</p>
                </div>
              </div>
              <p className="text-[10px] font-mono font-bold tracking-widest mb-4 uppercase text-indigo-600 dark:text-cyan-400/70">// {t('label_assigned_tasks')} ({userTasks.length})</p>
              {loadingUserTasks ? (
                <p className="text-slate-500 text-center py-10 font-mono text-xs">{t('label_loading')}</p>
              ) : userTasks.length === 0 ? (
                <p className="text-slate-500 text-center py-10 font-mono text-xs tracking-widest uppercase">{t('msg_no_tasks_assigned')}</p>
              ) : (
                <div className="space-y-3">
                  {userTasks.map(t_history => {
                    const STATUS_C = { Pending: 'var(--status-pending)', 'In Progress': 'var(--primary)', Completed: 'var(--status-done)' };
                    const assigneeUser = userById.get(String(t_history.assignedTo));
                    const assignedByUser = userById.get(String(t_history.assignedBy));
                    const assigneeText = t_history.assignedToName || formatUserWithRole(assigneeUser, 'Assignee');
                    const assignedByText = t_history.assignedByName || formatUserWithRole(assignedByUser, 'Manager/Admin');
                    return (
                      <div key={t_history._id} className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/02">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">{t_history.title}</p>
                            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400/50">{t('label_due')}: {t_history.dueDate} • {t_history.department}</p>
                            <p className="mt-1 text-[10px] font-mono text-slate-500 dark:text-slate-400/70">
                              To: {assigneeText} • By: {assignedByText}
                            </p>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-md bg-white/5 shadow-sm" style={{ color: STATUS_C[t_history.status] || 'var(--status-pending)', border: `1px solid ${STATUS_C[t_history.status] || 'var(--status-pending)' }30` }}>
                            {t_history.status?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── ANALYTICS ─── */}
      {view === 'ANALYTICS' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Workload Distribution */}
            <motion.div 
              initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}
            className="rounded-2xl p-5 relative overflow-hidden shadow-lg holo-card group min-w-0" 
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-mono font-bold tracking-widest flex items-center gap-2 uppercase text-indigo-600 dark:text-cyan-400/70">
                  <Activity size={12} /> {t('label_dept_workload')}
                </p>
                <div className="px-1.5 py-0.5 rounded border border-indigo-500/10 bg-indigo-500/5 text-[8px] font-mono text-indigo-400 dark:text-cyan-400/40 uppercase tracking-tighter">Live</div>
              </div>
              
              <div ref={deptChartWrapRef} className="h-[220px] w-full mt-2 min-w-0 min-h-0">
                {deptChartWidth > 0 && (
                  <BarChart width={deptChartWidth} height={220} data={deptChartData} barSize={12} barGap={4} margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGradientOnTime" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00ff88" stopOpacity={0.6}/>
                        <stop offset="100%" stopColor="#00ff88" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="barGradientOverTime" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.6}/>
                        <stop offset="100%" stopColor="#f97316" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="barGradientActive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.6}/>
                        <stop offset="100%" stopColor="#00d4ff" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="barGradientPending" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#eab308" stopOpacity={0.6}/>
                        <stop offset="100%" stopColor="#eab308" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="barGradientOverdue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff4444" stopOpacity={0.6}/>
                        <stop offset="100%" stopColor="#ff4444" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 8, fontFamily: 'monospace' }} axisLine={false} tickLine={false} height={20} />
                    <YAxis
                      width={32}
                      tick={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      tickMargin={8}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.01)' }} />
                    <Bar dataKey="On Time" stackId="a" fill="url(#barGradientOnTime)" radius={[0,0,2,2]} />
                    <Bar dataKey="Over Time" stackId="a" fill="url(#barGradientOverTime)" />
                    <Bar dataKey="Active"    stackId="a" fill="url(#barGradientActive)" />
                    <Bar dataKey="Pending"   stackId="a" fill="url(#barGradientPending)" radius={[2,2,0,0]} />
                    <Bar dataKey="Overdue"   stackId="a" fill="url(#barGradientOverdue)" radius={[2,2,0,0]} />
                  </BarChart>
                )}
              </div>
              <div className="flex gap-4 justify-center mt-3 border-t border-slate-100 dark:border-white/5 pt-2">
                {['On Time', 'Over Time', 'Active', 'Pending', 'Overdue'].map((key) => {
                   const COLORS = { 'On Time': '#00ff88', 'Over Time': '#f97316', Active: '#00d4ff', Pending: '#eab308', Overdue: '#ff4444' };
                   return (
                     <div key={key} className="flex items-center gap-1.5 opacity-50">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS[key] }} />
                        <span className="text-[8px] font-mono font-bold text-slate-500 uppercase">{key}</span>
                     </div>
                   );
                })}
              </div>
            </motion.div>
            
            {/* Status Breakdown */}
            <motion.div 
              initial={{ x: 10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="rounded-2xl p-5 relative overflow-hidden shadow-lg holo-card group min-w-0" 
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-mono font-bold tracking-widest flex items-center gap-2 uppercase text-purple-600 dark:text-purple-400/70">
                  <PieChartIcon size={12} /> {t('label_global_split')}
                </p>
                <div className="px-1.5 py-0.5 rounded border border-purple-500/10 bg-purple-500/5 text-[8px] font-mono text-purple-400 dark:text-purple-400/40 uppercase tracking-tighter">Stats</div>
              </div>

              <div ref={pieChartWrapRef} className="h-[220px] w-full mt-2 min-w-0 min-h-0">
                {pieChartWidth > 0 && (
                  <PieChart width={pieChartWidth} height={220}>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={6}
                      label={({ name, percent }) => `${Math.round(percent*100)}%`} labelLine={false} stroke="rgba(0,0,0,0.02)" strokeWidth={2}>
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} style={{ filter: `drop-shadow(0 0 10px ${entry.color}20)` }} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                )}
              </div>
              <div className="flex gap-4 justify-center mt-3 border-t border-slate-100 dark:border-white/5 pt-2">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5 opacity-50">
                     <div className="w-1.5 h-1.5 rounded-full" style={{ background: entry.color }} />
                     <span className="text-[8px] font-mono font-bold text-slate-500 uppercase">{entry.name}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl p-5 relative overflow-hidden shadow-lg holo-card min-w-0"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-[10px] font-mono font-bold tracking-widest uppercase text-cyan-600 dark:text-cyan-400/70">
                  Department Mix
                </p>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Every department, separated
                </h3>
              </div>
              <div className="px-1.5 py-0.5 rounded border border-cyan-500/10 bg-cyan-500/5 text-[8px] font-mono text-cyan-400/60 uppercase tracking-tighter">
                {departmentAnalyticsRows.length} depts
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 min-w-0">
              {departmentAnalyticsRows.map((dept) => (
                <div
                  key={dept.name}
                  className="rounded-2xl border px-4 py-4 bg-white/70 dark:bg-white/5"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-mono font-bold tracking-[0.22em] uppercase text-slate-500 dark:text-slate-400">
                        {dept.name}
                      </div>
                      <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {dept.total}
                      </div>
                      <div className="mt-1 text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-slate-400">
                        Total Tasks
                      </div>
                    </div>
                    <div className="rounded-full px-2.5 py-1 text-[9px] font-mono font-bold tracking-[0.2em] uppercase border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
                      {dept.donePct}% done
                    </div>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${dept.donePct}%` }} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-mono font-bold tracking-widest uppercase">
                    <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 px-2 py-2 text-emerald-500">
                      On Time {dept.completedOnTime}
                    </div>
                    <div className="rounded-xl border border-orange-500/10 bg-orange-500/5 px-2 py-2 text-orange-500">
                      Over Time {dept.completedOverTime}
                    </div>
                    <div className="rounded-xl border border-cyan-500/10 bg-cyan-500/5 px-2 py-2 text-cyan-500">
                      In Progress {dept.active}
                    </div>
                    <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 px-2 py-2 text-amber-500">
                      Pending {dept.pending}
                    </div>
                    <div className="rounded-xl border border-red-500/10 bg-red-500/5 px-2 py-2 text-red-500">
                      Overdue {dept.overdue}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ─── SETTINGS ─── */}
      {view === 'SETTINGS' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          className="rounded-2xl p-5 relative overflow-hidden shadow-lg holo-card max-w-2xl" 
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 dark:via-cyan-500/50 to-transparent" />
          
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <Building2 size={18} className="text-indigo-600 dark:text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Organization Settings</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Brand name visible to all users.</p>
              </div>
            </div>

            <form onSubmit={handleUpdateCompanyName} className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3 px-1">Brand Logo</label>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center justify-center w-20 h-20 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 overflow-hidden shadow-sm">
                    {newLogoPreviewUrl ? (
                      <img
                        src={newLogoPreviewUrl}
                        alt="Brand logo preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-[10px] font-mono font-bold tracking-[0.2em] text-slate-400 uppercase text-center px-2">
                        No Logo
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <label className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer hover:border-indigo-500/40 dark:hover:border-cyan-500/40 transition-colors">
                        <Plus size={16} className="text-indigo-600 dark:text-cyan-400" />
                        Upload Logo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoChange(e.target.files?.[0])}
                          className="hidden"
                        />
                      </label>
                      {newLogoPreviewUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="px-4 py-3 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 text-sm font-semibold text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                        >
                          Remove Logo
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
                      Upload a logo image to show it in the header and sidebar for all users.
                    </p>
                    {logoFileName && (
                      <p className="text-[11px] font-mono text-indigo-600 dark:text-cyan-400 px-1 break-all">
                        Selected: {logoFileName}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3 px-1">Brand Name</label>
                
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within/input:text-indigo-500 dark:group-focus-within/input:text-cyan-400 text-slate-400">
                    <Zap size={16} />
                  </div>
                  <input 
                    type="text" 
                    value={newCompanyName} 
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl pl-11 pr-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500/50 dark:focus:border-cyan-500/50 transition-all placeholder:text-slate-400"
                    placeholder="Enter company name"
                  />
                </div>
                
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 px-1">
                  This name and logo appear in the header for all managers and employees.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 px-1">Admin Access File</label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
                    Upload the `.taskauth` file for this admin account to verify it from the panel.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer hover:border-indigo-500/40 dark:hover:border-cyan-500/40 transition-colors">
                    <Fingerprint size={16} className="text-indigo-600 dark:text-cyan-400" />
                    Choose Access File
                    <input
                      type="file"
                      accept=".taskauth,.txt,.json"
                      onChange={(e) => handleAdminAccessFileChange(e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>

                  {adminAccessFileName && (
                    <p className="text-[11px] font-mono text-indigo-600 dark:text-cyan-400 px-1 break-all">
                      Selected: {adminAccessFileName}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleVerifyAdminAccessFile}
                    disabled={verifyingAdminAccessFile}
                    className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {verifyingAdminAccessFile ? 'Verifying...' : 'Upload & Verify Access File'}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 px-1">Sound Feedback</label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
                      Control task alerts, success cues, and startup playback.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSoundEnabled((prev) => !prev)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full border transition-colors ${
                      soundEnabled
                        ? 'bg-emerald-500/20 border-emerald-500/30'
                        : 'bg-slate-200 dark:bg-white/10 border-slate-300 dark:border-white/10'
                    }`}
                    aria-pressed={soundEnabled}
                    aria-label="Toggle sound feedback"
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
                        soundEnabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200/80 dark:border-white/5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 px-1">Browser Push</label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
                      Receive task alerts even when the tab is closed.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => togglePushNotifications(!pushEnabled)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full border transition-colors ${
                      pushEnabled
                        ? 'bg-cyan-500/20 border-cyan-500/30'
                        : 'bg-slate-200 dark:bg-white/10 border-slate-300 dark:border-white/10'
                    }`}
                    aria-pressed={pushEnabled}
                    aria-label="Toggle browser push notifications"
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
                        pushEnabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: 'task', label: 'Task Alerts', hint: 'Assigned task, folder cue.' },
                    { key: 'transfer', label: 'Transfers', hint: 'Task transfer alerts.' },
                    { key: 'help', label: 'Help Requests', hint: 'Help and reply cues.' },
                    { key: 'completion', label: 'Completion', hint: 'Task done and review cues.' },
                  ].map((item) => {
                    const isOn = soundCategories?.[item.key] !== false;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setCategoryEnabled(item.key, !isOn)}
                        className={`rounded-xl border px-3 py-3 text-left transition-all ${
                          isOn
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold">{item.label}</span>
                          <span className="text-[10px] font-mono font-bold tracking-widest uppercase">
                            {isOn ? 'On' : 'Off'}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] text-current/75">{item.hint}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Volume</span>
                    <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">
                      {Math.round(soundVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={soundVolume}
                    onChange={(e) => setSoundVolume(e.target.value)}
                    className="w-full accent-cyan-500"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => playStartup(true)}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-500/30 hover:text-indigo-600 dark:hover:text-cyan-300 transition-colors"
                  >
                    Test Startup
                  </button>
                  <button
                    type="button"
                    onClick={playSuccess}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-500/30 hover:text-emerald-600 transition-colors"
                  >
                    Success
                  </button>
                  <button
                    type="button"
                    onClick={playWarning}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-amber-500/30 hover:text-amber-600 transition-colors"
                  >
                    Warning
                  </button>
                  <button
                    type="button"
                    onClick={playError}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-red-500/30 hover:text-red-600 transition-colors"
                  >
                    Error
                  </button>
                  <button
                    type="button"
                    onClick={playClick}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-500/30 hover:text-cyan-600 transition-colors"
                  >
                    Click
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-indigo-600 dark:bg-cyan-500 text-white dark:text-black font-semibold text-xs hover:bg-indigo-500 dark:hover:bg-cyan-400 transition-all shadow-lg flex items-center gap-2 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  <Shield size={14} /> Update Branding
                </motion.button>
              </div>
            </form>

            {currentUser?.role === 'admin' && (
              <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 px-1">Admin Password</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
                      Change your own password without affecting any other account.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openResetPasswordModal(currentUser)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-700 dark:text-amber-200 text-xs font-semibold hover:bg-amber-400/20 transition-colors"
                  >
                    <KeyRound size={14} />
                    Change My Password
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Background Decorative Element */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/5 dark:bg-cyan-500/5 blur-[100px] rounded-full pointer-events-none" />
        </motion.div>
      )}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={t('title_create_user')} size="sm">
        <form onSubmit={handleCreateUser} className="space-y-5 px-1 py-2" autoComplete="off">
          <input type="text" name="create_dummy_u" autoComplete="username" style={{ display: 'none' }} tabIndex="-1" aria-hidden="true" />
          <input type="password" name="create_dummy_p" autoComplete="current-password" style={{ display: 'none' }} tabIndex="-1" aria-hidden="true" />
          {/* Role Selector */}
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-3 tracking-widest text-emerald-600 dark:text-emerald-400/70">// SELECT ROLE</label>
            <div className="flex gap-2">
              {['admin', 'manager', 'employee'].map(r => (
                <button type="button" key={r}
                  onClick={() => setForm(f => ({
                    ...f,
                    role: r,
                    managerId: r === 'employee' ? f.managerId : '',
                    department: r === 'admin' ? [] : r === 'manager' ? f.department.slice(0, 1) : f.department,
                  }))}
                  className="flex-1 py-3 rounded-xl text-xs font-mono font-bold tracking-widest transition-all duration-300"
                  style={{
                    background: form.role === r ? (r === 'admin' ? 'rgba(0,255,136,0.1)' : r === 'manager' ? 'rgba(191,0,255,0.1)' : 'rgba(0,212,255,0.1)') : 'var(--bg-input)',
                    border: `1px solid ${form.role === r ? (r === 'admin' ? '#00ff8880' : r === 'manager' ? '#bf00ff80' : '#00d4ff80') : 'var(--border-subtle)'}`,
                    color: form.role === r ? (r === 'admin' ? '#00ff88' : r === 'manager' ? '#bf00ff' : '#00d4ff') : 'var(--text-secondary)',
                    boxShadow: form.role === r ? `0 0 15px ${r === 'admin' ? 'rgba(0,255,136,0.1)' : r === 'manager' ? 'rgba(191,0,255,0.1)' : 'rgba(0,212,255,0.1)'}` : 'none'
                  }}>
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {/* Name */}
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-emerald-600 dark:text-emerald-400/70">// {t('label_full_name_caps')}</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoComplete="off" data-lpignore="true" data-1p-ignore="true" className="w-full bg-slate-100 dark:bg-[#030812] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm px-4 py-3 focus:outline-none focus:border-indigo-500/50 dark:focus:border-emerald-500/50 transition-colors rounded-xl placeholder:text-slate-400" placeholder={t('ph_full_name')} />
          </div>
          {/* Email */}
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-emerald-600 dark:text-emerald-400/70">// USERNAME</label>
            <input required type="text" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} autoComplete="off" data-lpignore="true" data-1p-ignore="true" spellCheck={false} autoCapitalize="none" className="w-full bg-slate-100 dark:bg-[#030812] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm px-4 py-3 focus:outline-none focus:border-indigo-500/50 dark:focus:border-emerald-500/50 transition-colors rounded-xl placeholder:text-slate-400" placeholder="username" />
          </div>
          {/* Password */}
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-emerald-600 dark:text-emerald-400/70">// PASSWORD</label>
            <input required type="password" minLength={6} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" className="w-full bg-slate-100 dark:bg-[#030812] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm px-4 py-3 focus:outline-none focus:border-indigo-500/50 dark:focus:border-emerald-500/50 transition-colors rounded-xl placeholder:text-slate-400" placeholder="Min 6 characters" />
          </div>
          {/* Manager Dropdown (only for Employee) */}
          {form.role === 'employee' && (
            <div>
              <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">// ASSIGN MANAGER</label>
              <select required value={form.managerId} onChange={e => setForm(f => ({ ...f, managerId: e.target.value }))}
                className="w-full bg-slate-100 dark:bg-[#030812] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm px-4 py-3 focus:outline-none focus:border-indigo-500/50 dark:focus:border-cyan-500/50 transition-colors rounded-xl appearance-none cursor-pointer">
                <option value="" disabled>Select Manager...</option>
                {managersList.map(m => (
                  <option key={m._id} value={m._id} className="bg-slate-100 dark:bg-[#0a0a1a] text-slate-900 dark:text-white">{m.name} ({m.email})</option>
                ))}
              </select>
            </div>
          )}
          {/* Departments */}
          {form.role !== 'admin' && (
            <div>
              <label className="block text-[10px] font-mono font-semibold mb-3 tracking-widest text-emerald-600 dark:text-emerald-400/70">// DEPARTMENTS</label>
              <div className="flex flex-wrap gap-2">
                {loadingDepartments && (
                  <div className="w-full rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/[0.02] px-4 py-3 text-[10px] font-mono tracking-widest text-slate-500">
                    {t('label_loading_depts')}
                  </div>
                )}
                {!loadingDepartments && departments.map((dep) => {
                  const isSelected = form.department.includes(dep.name);
                  return (
                    <button type="button" key={dep.id} onClick={() => toggleDept(dep.name)} 
                      className="px-4 py-2 rounded-lg text-[10px] font-mono font-bold tracking-widest transition-all duration-300" 
                      style={{ 
                        background: isSelected ? 'rgba(0,255,136,0.1)' : 'var(--bg-input)',
                        border: `1px solid ${isSelected ? 'rgba(0,255,136,0.4)' : 'var(--border-subtle)'}`,
                        color: isSelected ? 'var(--status-done)' : 'var(--text-secondary)',
                        boxShadow: isSelected ? '0 0 15px rgba(0,255,136,0.1)' : 'none'
                      }}>
                      {dep.name.toUpperCase()}
                    </button>
                  )
                })}
              </div>
              {!loadingDepartments && departments.length === 0 && (
                <p className="text-[10px] font-mono mt-2 text-slate-500 tracking-wider">{t('msg_no_depts_avail')}</p>
              )}
              {!loadingDepartments && departments.length > 0 && form.department.length === 0 && (
                <p className="text-[10px] font-mono mt-2 text-red-400/80 tracking-wider">⚠ {t('msg_select_dept_err')}</p>
              )}
            </div>
          )}
          <div className="flex gap-4 pt-4 mt-2 border-t border-slate-200 dark:border-white/5">
            <button type="button" onClick={() => setCreateOpen(false)} className="flex-1 py-3 rounded-xl text-xs font-mono font-bold transition-colors hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500">{t('btn_cancel').toUpperCase()}</button>
            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 py-3 rounded-xl text-xs font-mono font-bold tracking-widest shadow-lg text-white dark:text-black" style={{ background: 'linear-gradient(135deg, var(--status-done), var(--secondary))' }}>⚡ {t('btn_create_user_caps')}</motion.button>
          </div>
        </form>
      </Modal>

      {/* Assign Task Modal */}
      <Modal isOpen={assignOpen} onClose={() => setAssignOpen(false)} title={t('title_assign_new_task') || 'ASSIGN NEW TASK'} size="sm">
        <form onSubmit={handleAssignTask} className="space-y-5 px-1 py-2">
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">// ASSIGNEE TYPE</label>
            <div className="grid grid-cols-2 gap-2">
              {['manager', 'employee'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setTaskForm((f) => ({ ...f, assigneeRole: role, assignedTo: '' }))}
                  className="py-3 rounded-xl text-xs font-mono font-bold tracking-widest transition-all"
                  style={{
                    background: taskForm.assigneeRole === role ? 'rgba(0,212,255,0.1)' : 'var(--bg-input)',
                    border: `1px solid ${taskForm.assigneeRole === role ? 'var(--secondary)' : 'var(--border-subtle)'}`,
                    color: taskForm.assigneeRole === role ? 'var(--secondary)' : 'var(--text-secondary)',
                    boxShadow: taskForm.assigneeRole === role ? '0 0 18px rgba(0,212,255,0.1)' : 'none',
                  }}
                >
                  {role.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div ref={assignBoxRef}>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">// ASSIGN TO</label>
            <div
              className="relative flex items-center rounded-xl border border-slate-200 dark:border-white/12 bg-slate-100 dark:bg-[#030812] focus-within:border-indigo-500/40 dark:focus-within:border-cyan-500/40 transition-colors px-3 py-2.5"
              onClick={() => setShowAssignSuggestions(true)}
            >
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                value={assignSearch}
                onChange={(e) => {
                  setAssignSearch(e.target.value);
                  setShowAssignSuggestions(true);
                }}
                onFocus={() => setShowAssignSuggestions(true)}
                placeholder={`Search ${taskForm.assigneeRole === 'employee' ? 'employee' : 'manager'} by name or username`}
                className="flex-1 bg-transparent text-slate-900 dark:text-white text-sm pl-3 focus:outline-none placeholder:text-slate-400"
              />
              <span className="text-xs font-mono text-slate-400">⌄</span>
            </div>
            {showAssignSuggestions && (
              <div className="relative">
                <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-white/12 bg-white dark:bg-[#050a14] shadow-2xl max-h-64">
                  {filteredAssignableUsers.length === 0 && (
                    <div className="px-4 py-3 text-xs font-mono text-slate-400">{t('msg_no_results')}</div>
                  )}
                  <ul className="divide-y divide-white/5 overflow-y-auto max-h-64">
                    {filteredAssignableUsers.map((u) => (
                      <li
                        key={u._id}
                        onMouseDown={(evt) => evt.preventDefault()}
                        onClick={() => {
                          setTaskForm((f) => ({
                            ...f,
                            assignedTo: u._id,
                            department: getPrimaryDepartment(u),
                          }));
                          setAssignSearch(`${u.name} (${u.email})`);
                          setShowAssignSuggestions(false);
                        }}
                        className={`px-4 py-3 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 ${
                          String(taskForm.assignedTo) === String(u._id) ? 'bg-indigo-500/10 dark:bg-cyan-500/10 text-indigo-600 dark:text-cyan-200' : 'text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        <div className="font-semibold">{u.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{u.email}</div>
                        <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1">Role: {u.role} · Dept: {(u.department || []).join(', ') || 'N/A'}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">// TASK TITLE</label>
            <input required value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-slate-100 dark:bg-[#030812] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm px-4 py-3 focus:outline-none focus:border-indigo-500/50 dark:focus:border-cyan-500/50 transition-colors rounded-xl placeholder:text-slate-400" placeholder="Task title" />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">// {t('label_description_caps')}</label>
            <textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full bg-slate-100 dark:bg-[#030812] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm px-4 py-3 focus:outline-none focus:border-indigo-500/50 dark:focus:border-cyan-500/50 transition-colors rounded-xl placeholder:text-slate-400 resize-none" placeholder={t('ph_brief_description')} />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">// ATTACHMENTS (OPTIONAL)</label>
            <input
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.webp,.pdf,.xls,.xlsx"
              onChange={(e) => setTaskFiles(Array.from(e.target.files || []))}
              className="w-full bg-slate-100 dark:bg-[#030812] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-200 text-xs px-4 py-2.5 rounded-xl"
            />
            {taskFiles.length > 0 && (
              <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                {taskFiles.length} file(s) selected
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">// START DATE</label>
            <div className="relative">
              <input
                id="admin-start-date"
                required
                type="date"
                value={taskForm.startDate}
                onChange={e => setTaskForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full bg-slate-100 dark:bg-[#030812] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm px-4 py-3 pr-10 focus:outline-none focus:border-indigo-500/50 dark:focus:border-cyan-500/50 transition-colors rounded-xl appearance-none"
                style={{ colorScheme: 'light dark' }}
              />
              <button type="button" onClick={() => document.getElementById('admin-start-date')?.showPicker?.()} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-500 dark:text-cyan-300 transition-transform hover:scale-110" aria-label="Open start date picker">
                <CalendarDays size={16} className="drop-shadow-[0_0_6px_rgba(34,211,238,0.45)]" />
              </button>
            </div>
          </div>
            <div>
              <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">// DEPARTMENT</label>
              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#030812] px-4 py-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {taskForm.department || (taskForm.assignedTo ? 'Auto-filled from selected user' : 'Select a manager or employee first')}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Department comes from the selected assignee.
                </div>
              </div>
            </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">// DUE DATE</label>
            <div className="relative">
              <input id="admin-due-date" required type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full bg-slate-100 dark:bg-[#030812] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm px-4 py-3 pr-10 focus:outline-none focus:border-indigo-500/50 dark:focus:border-cyan-500/50 transition-colors rounded-xl appearance-none" style={{ colorScheme: 'light dark' }} />
              <button type="button" onClick={() => document.getElementById('admin-due-date')?.showPicker?.()} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-500 dark:text-cyan-300 transition-transform hover:scale-110" aria-label="Open due date picker">
                <CalendarDays size={16} className="drop-shadow-[0_0_6px_rgba(34,211,238,0.45)]" />
              </button>
            </div>
          </div>
          <div>
              <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-indigo-600 dark:text-cyan-400/70">// DUE TIME</label>
              <div className="relative">
                <input
                  id="admin-due-time"
                  required
                  type="time"
                  value={taskForm.dueTime}
                  onChange={e => setTaskForm(f => ({ ...f, dueTime: e.target.value }))}
                  className="w-full bg-slate-100 dark:bg-[#030812] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm px-4 py-3 pr-10 focus:outline-none focus:border-indigo-500/50 dark:focus:border-cyan-500/50 transition-colors rounded-xl appearance-none"
                  style={{ colorScheme: 'light dark' }}
                />
                <button type="button" onClick={() => document.getElementById('admin-due-time')?.showPicker?.()} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-500 dark:text-cyan-300 transition-transform hover:scale-110" aria-label="Open due time picker">
                  <Clock size={16} className="drop-shadow-[0_0_6px_rgba(34,211,238,0.45)]" />
                </button>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-3 tracking-widest text-indigo-600 dark:text-cyan-400/70">// PRIORITY</label>
            <div className="flex gap-2">
              {['Low', 'Medium', 'High'].map(p => (
                <button type="button" key={p} onClick={() => setTaskForm(f => ({ ...f, priority: p }))}
                  className="flex-1 py-2.5 rounded-lg text-[10px] font-mono font-bold tracking-widest transition-all duration-300"
                  style={{
                    background: taskForm.priority === p ? (p === 'High' ? 'rgba(255,68,68,0.1)' : p === 'Medium' ? 'rgba(234,179,8,0.1)' : 'rgba(0,255,136,0.1)') : 'var(--bg-input)',
                    border: `1px solid ${taskForm.priority === p ? (p === 'High' ? '#ef444480' : p === 'Medium' ? '#eab30880' : '#10b98180') : 'var(--border-subtle)'}`,
                    color: taskForm.priority === p ? (p === 'High' ? '#ef4444' : p === 'Medium' ? '#eab308' : '#10b981') : 'var(--text-secondary)'
                  }}>
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-4 pt-4 mt-2 border-t border-slate-200 dark:border-white/5">
            <button type="button" onClick={() => setAssignOpen(false)} className="flex-1 py-3 rounded-xl text-xs font-mono font-bold transition-colors hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500">{t('btn_cancel').toUpperCase()}</button>
            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 py-3 rounded-xl text-xs font-mono font-bold tracking-widest shadow-lg text-white dark:text-black" style={{ background: 'linear-gradient(135deg, var(--secondary), var(--primary))' }}>⚡ {t('btn_assign_task_caps')}</motion.button>
          </div>
        </form>
      </Modal>

      {/* ─── RESET PASSWORD MODAL ─── */}
      <Modal isOpen={resetPasswordOpen} onClose={closeResetPasswordModal} title={t('title_reset_password_caps')} size="sm">
        <form onSubmit={handleResetPassword} className="space-y-5 px-1 py-2">
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
            <p className="text-[10px] font-mono tracking-[0.2em] text-amber-600 dark:text-amber-300/80 uppercase">TARGET USER</p>
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{resetPasswordTarget?.name || 'Unknown user'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{resetPasswordTarget?.email || ''}</p>
            <p className="mt-3 text-[10px] font-mono text-slate-400 dark:text-slate-500">Existing password is never shown. Only a new password can be set.</p>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-amber-600 dark:text-amber-400/80 uppercase">// NEW PASSWORD</label>
            <input
              required
              type="password"
              minLength={6}
              value={resetPasswordForm.newPassword}
              onChange={(e) => setResetPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              className="w-full bg-slate-100 dark:bg-[#030812] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm px-4 py-3 focus:outline-none focus:border-amber-400/50 transition-colors rounded-xl placeholder:text-slate-400"
              placeholder={t('ph_min_6_char')}
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-amber-600 dark:text-amber-400/80 uppercase">// CONFIRM PASSWORD</label>
            <input
              required
              type="password"
              minLength={6}
              value={resetPasswordForm.confirmPassword}
              onChange={(e) => setResetPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full bg-slate-100 dark:bg-[#030812] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm px-4 py-3 focus:outline-none focus:border-amber-400/50 transition-colors rounded-xl placeholder:text-slate-400"
              placeholder={t('ph_reenter_password')}
            />
          </div>

          <div className="flex gap-4 pt-6 mt-4 border-t border-slate-200 dark:border-white/5">
            <button type="button" onClick={closeResetPasswordModal} 
              className="flex-1 py-3.5 rounded-2xl text-[10px] font-mono font-bold tracking-widest transition-all hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 uppercase">
              {t('btn_cancel')}
            </button>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)' }}
              whileTap={{ scale: 0.98 }}
              disabled={resettingPassword}
              className={`flex-1 py-3.5 rounded-2xl text-[10px] font-mono font-bold tracking-widest text-white transition-all shadow-xl ${resettingPassword ? 'opacity-60 cursor-not-allowed' : ''}`}
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              ⚡ {resettingPassword ? t('btn_updating') : t('btn_reset_password_caps')}
            </motion.button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={deleteConfirmStep > 0} onClose={closeDeleteDepartmentModal} title={t('title_sys_auth_req')} size="xs">
        <div className="p-1">
          {deleteConfirmStep === 1 && (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-500 animate-pulse">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base mb-1 uppercase tracking-tight">{t('title_delete_dept_q')}</h3>
                  <p className="text-slate-400 text-[10px] font-mono leading-relaxed">{t('msg_confirm_dept_deletion')}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={closeDeleteDepartmentModal} className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-400 font-mono text-[9px] font-bold tracking-widest hover:bg-white/10 transition-colors border border-white/5">{t('btn_abort')}</button>
                <button onClick={() => setDeleteConfirmStep(2)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-mono text-[9px] font-bold tracking-widest hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)]">{t('btn_proceed')}</button>
              </div>
            </div>
          )}

          {deleteConfirmStep === 2 && (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center border-4 border-red-500/20 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                  <ShieldOff size={24} />
                </div>
                <div className="w-full">
                  <h3 className="text-white font-bold text-base mb-2 uppercase tracking-tight">Final Authorization</h3>
                  {deptConflict && (
                    <div className="text-left px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 mb-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <p className="text-[9px] font-bold text-orange-400 uppercase tracking-widest font-mono mb-1.5 flex items-center gap-2">
                        <AlertCircle size={10} /> DETECTED CONFLICTS:
                      </p>
                      <ul className="text-[9px] font-mono text-orange-300 list-disc list-inside space-y-0.5">
                        {deptConflict.employees > 0 && <li>{deptConflict.employees} {t('label_employee_accounts')}</li>}
                        {deptConflict.managers > 0 && <li>{deptConflict.managers} {t('label_manager_accounts')}</li>}
                        {deptConflict.tasks > 0 && <li>{deptConflict.tasks} {t('label_active_tasks')}</li>}
                      </ul>
                    </div>
                  )}
                  <p className="text-[9px] font-mono tracking-tight px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400/90 leading-relaxed">
                    CRITICAL: This action is irreversible.
                  </p>
                </div>
              </div>
 
              <div className="flex gap-3">
                <button onClick={closeDeleteDepartmentModal} className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-400 font-mono text-[9px] font-bold tracking-widest hover:bg-white/10 transition-colors">ABORT</button>
                <button 
                  disabled={deletingDepartmentId === deptToDelete?.id}
                  onClick={handleFinalDeleteDept} 
                  className={`flex-1 py-2.5 rounded-xl font-mono text-[9px] font-bold tracking-widest transition-all ${deletingDepartmentId === deptToDelete?.id ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.4)]'}`}
                >
                  {deletingDepartmentId === deptToDelete?.id ? '...' : deptConflict ? t('btn_bypass_delete') : t('btn_confirm_delete')}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
      <EditTaskModal 
        isOpen={editOpen} 
        onClose={() => { setEditOpen(false); setEditingTask(null); }} 
        task={editingTask} 
      />
    </motion.div>
  );
}

