import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis, Legend } from 'recharts';
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
  Settings, KeyRound, Building2, UserPlus,
  ListTodo, AlertTriangle, Info, Edit, Activity, Trash2, PieChart as PieChartIcon, Send
} from 'lucide-react';
import { format } from 'date-fns';

const VIEWS = ['OVERVIEW', 'ALL TASKS', 'USER MANAGEMENT', 'DEPARTMENTS', 'ANALYTICS'];

// ... (StatWidget, RingProgress, CustomTooltip components remain the same)
function StatWidget({ label, value, color, glow, icon: Icon, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay, duration: 0.5, type: 'spring' }}
      whileHover={{ y: -5, scale: 1.02 }}
      className="rounded-2xl p-6 relative overflow-hidden group cursor-default transition-all duration-300"
      style={{ 
        background: 'rgba(5, 10, 20, 0.7)', 
        border: `1px solid rgba(255,255,255,0.05)`, 
        backdropFilter: 'blur(24px)', 
        boxShadow: `0 8px 30px rgba(0,0,0,0.6)` 
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-[11px] font-mono tracking-widest font-semibold" style={{ color: 'rgba(148,163,184,0.6)' }}>{label}</span>
        <div className="p-2 rounded-xl transition-all duration-300 group-hover:scale-110" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          <Icon size={16} style={{ color, filter: `drop-shadow(0 0 8px ${color})` }} />
        </div>
      </div>
      <motion.p
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: delay + 0.2, type: 'spring' }}
        className="text-4xl font-bold tracking-tight" style={{ color: '#fff', textShadow: `0 0 30px ${glow}` }}
      >{value}</motion.p>
      
      {/* Interactive Hover Background Glow */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-[50px] transition-all duration-500 opacity-50 group-hover:opacity-100 group-hover:scale-150" style={{ background: glow }} />
      <div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)`, boxShadow: `0 0 15px ${color}` }} />
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
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={8} />
          <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
            strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1.4, delay: 0.3, ease: 'easeOut' }}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold" style={{ color }}>{value}%</span>
        </div>
      </div>
      <span className="text-[10px] font-mono text-center" style={{ color: 'rgba(148,163,184,0.5)' }}>{label}</span>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl text-xs font-mono"
      style={{ background: 'rgba(3,10,24,0.95)', border: '1px solid rgba(0,212,255,0.2)', backdropFilter: 'blur(12px)', boxShadow: '0 8px 30px rgba(0,0,0,0.7)' }}>
      <p style={{ color: 'rgba(0,212,255,0.7)' }} className="mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey}: <span className="font-bold text-white">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const { getAllTasks, refreshTasks } = useTask();
  const { t } = useLanguage();
  const { addToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [view, setView] = useState('OVERVIEW');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
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
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignedTo: '', department: '', dueDate: format(new Date(), 'yyyy-MM-dd'), priority: 'Medium', assigneeRole: 'manager' });
  const [assignSearch, setAssignSearch] = useState('');
  const [showAssignSuggestions, setShowAssignSuggestions] = useState(false);

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

  useEffect(() => {
    fetchUsers();
    refreshTasks();
    fetchManagers();
    fetchDepartments();
  }, []);

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
      addToast(t('msg_task_purged_success') || 'Task securely purged', 'success');
    } catch (err) {
      addToast(t('err_purge_failed') || 'Deletion failed', 'error');
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
      if (form.department.length === 0) throw new Error(t('msg_select_dept_err') || 'Select at least one department');
      if (form.role === 'employee' && !form.managerId) throw new Error(t('ph_select_manager') || 'Select a manager for the employee');
      if (!form.password || form.password.length < 6) throw new Error(t('err_password_length') || 'Password must be at least 6 characters');
      const res = await api.post('/users', form);
      addToast(res.data.message || t('msg_user_created_success')?.replace('{role}', form.role) || `${form.role} created successfully!`, 'success');
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

  const isOverdue = (t) => t.status !== 'Completed' && isBefore(parseISO(t.dueDate + 'T23:59:59'), new Date());

  const stats = useMemo(() => ({
    total:       allTasks.length,
    completed:   allTasks.filter(t => t.status === 'Completed').length,
    inProgress:  allTasks.filter(t => t.status === 'In Progress').length,
    pending:     allTasks.filter(t => t.status === 'Pending').length,
    overdue:     allTasks.filter(isOverdue).length,
  }), [allTasks]);

  const deptChartData = useMemo(() => departments.map((dept, i) => ({
    name: dept.name.substring(0, 4).toUpperCase(),
    Completed: allTasks.filter(t => t.department === dept.name && t.status === 'Completed').length,
    Active:    allTasks.filter(t => t.department === dept.name && t.status === 'In Progress').length,
    Pending:   allTasks.filter(t => t.department === dept.name && t.status === 'Pending').length,
  })), [allTasks, departments]);

  const pieData = useMemo(() => [
    { name: 'Completed',   value: stats.completed,  color: '#00ff88' },
    { name: 'In Progress', value: stats.inProgress,  color: '#00d4ff' },
    { name: 'Pending',     value: stats.pending,     color: '#eab308' },
    { name: 'Overdue',     value: stats.overdue,     color: '#ff4444' },
  ].filter(d => d.value > 0), [stats]);

  const deptProgress = useMemo(() => departments.map((dept, i) => {
    const total = allTasks.filter(t => t.department === dept.name).length;
    const done  = allTasks.filter(t => t.department === dept.name && t.status === 'Completed').length;
    return { dept: dept.name, total, done, pct: total ? Math.round((done/total)*100) : 0 };
  }), [allTasks, departments]);

  const filteredTasks = useMemo(() => {
    let list = allTasks;
    if (search) list = list.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
    if (deptFilter !== 'All') list = list.filter(t => t.department === deptFilter);
    return list;
  }, [allTasks, search, deptFilter]);

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
      .filter(u => {
        if (taskForm.assigneeRole === 'employee' && taskForm.department) {
          return (u.department || []).includes(taskForm.department);
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, taskForm.assigneeRole, taskForm.department]);

  const filteredAssignableUsers = useMemo(() => {
    const term = assignSearch.trim().toLowerCase();
    if (!term) return assignableUsers;
    return assignableUsers.filter((u) =>
      u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
    );
  }, [assignableUsers, assignSearch]);

  useEffect(() => {
    // Reset selection if current user no longer fits the filter
    if (taskForm.assignedTo && !assignableUsers.some((u) => String(u._id) === String(taskForm.assignedTo))) {
      setTaskForm((f) => ({ ...f, assignedTo: '' }));
    }
  }, [assignableUsers]);

  useEffect(() => {
    setAssignSearch('');
    setShowAssignSuggestions(false);
  }, [taskForm.assigneeRole, taskForm.department]);

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


  const handleAssignTask = async (e) => {
    e.preventDefault();
    try {
      if (!taskForm.assignedTo) throw new Error(t('err_select_user') || 'Select a user');
      if (!taskForm.title) throw new Error(t('err_title_required') || 'Title is required');
      if (!taskForm.department) throw new Error(t('err_select_dept') || 'Select a department');
      if (!taskForm.assigneeRole) throw new Error(t('err_select_role') || 'Select a role');
      await api.post('/tasks', taskForm);
      addToast(t('msg_task_assigned_success') || 'Task assigned successfully!', 'success');
      setAssignOpen(false);
      setTaskForm({ title: '', description: '', assignedTo: '', department: '', dueDate: format(new Date(), 'yyyy-MM-dd'), priority: 'Medium', assigneeRole: 'manager' });
      refreshTasks();
    } catch (err) {
      addToast(err.response?.data?.message || err.message || t('err_generic') || 'Operation failed', 'error');
    }
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
            className="h-[2px] mb-3" style={{ background: 'linear-gradient(90deg, #00d4ff, transparent)' }} 
          />
          <p className="text-[10px] font-mono tracking-widest mb-1.5 uppercase" style={{ color: 'rgba(0,212,255,0.6)' }}>// {t('root_access')}</p>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 uppercase">
            {t('system_control').split(' ')[0]} <span className="neon-text-cyan flex items-center gap-2">{t('system_control').split(' ')[1]}<Zap size={20} className="text-cyan-400 animate-pulse"/></span>
          </h1>
          <p className="text-[11px] font-mono mt-2 uppercase" style={{ color: 'rgba(148,163,184,0.5)' }}>{t('global_metrics')}</p>
        </div>
        
        {view === 'USER MANAGEMENT' && (
          <div className="flex gap-3">
            <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
              onClick={() => setAssignOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-mono font-bold transition-all shadow-2xl relative overflow-hidden group uppercase"
              style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff', boxShadow: '0 0 20px rgba(0,212,255,0.1)' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/10 to-cyan-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Send size={14} style={{ filter: 'drop-shadow(0 0 5px #00d4ff)' }} /> {t('assign_task_btn')}
            </motion.button>
            <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-mono font-bold transition-all shadow-2xl relative overflow-hidden group uppercase"
              style={{ background: 'linear-gradient(135deg, #00ff88, #00d4ff)', color: '#000', boxShadow: '0 0 30px rgba(0,255,136,0.25)' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Plus size={14} /> {t('create_user_btn')}
            </motion.button>
          </div>
        )}
      </div>
      {/* High-End Glass Tabs */}
      <div className="flex gap-1 w-full md:w-fit overflow-x-auto scrollbar-hide mb-6" style={{ background: 'rgba(0,0,0,0.5)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              {[
                { id: 'OVERVIEW', key: 'nav_overview' },
                { id: 'ALL TASKS', key: 'nav_all_tasks' },
                { id: 'USER MANAGEMENT', key: 'user_mgmt_tab' },
                { id: 'DEPARTMENTS', key: 'nav_departments' },
                { id: 'ANALYTICS', key: 'nav_analytics' }
              ].map(tab => {
                const isActive = view === tab.id;
                const routes = {
                  'OVERVIEW': '/admin',
                  'ALL TASKS': '/admin/tasks',
                  'USER MANAGEMENT': '/admin/users',
                  'DEPARTMENTS': '/admin/departments',
                  'ANALYTICS': '/admin/analytics'
                };
                return (
                  <button 
              key={tab.id} 
              onClick={() => {
                navigate(routes[tab.id]);
              }} 
              className={`relative px-6 py-2.5 rounded-xl text-[11px] font-mono font-bold tracking-widest transition-all duration-300 ${isActive ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {isActive && (
                <motion.div layoutId="admin-tab-bubble" className="absolute inset-0 rounded-xl" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', boxShadow: '0 0 15px rgba(0,212,255,0.1)' }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} />
              )}
              <span className="relative z-10">{t(tab.key)}</span>
            </button>
          );
        })}
      </div>

      {/* ─── OVERVIEW ─── */}
      {view === 'OVERVIEW' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
             <StatWidget label={t('stat_total_tasks')}  value={stats.total}      icon={ClipboardList} color="#00d4ff" glow="rgba(0,212,255,0.3)" delay={0} />
             <StatWidget label={t('stat_completed')}    value={stats.completed}  icon={TrendingUp}    color="#00ff88" glow="rgba(0,255,136,0.3)" delay={0.06} />
             <StatWidget label={t('stat_active')}  value={stats.inProgress} icon={Zap}           color="#bf00ff" glow="rgba(191,0,255,0.3)" delay={0.12} />
             <StatWidget label={t('overdue_alert')} value={stats.overdue}   icon={BarChart3}     color="#ff4444" glow="rgba(255,68,68,0.3)" delay={0.18} />
          </div>

          <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(8,18,36,0.7)', border: '1px solid rgba(0,212,255,0.1)', backdropFilter: 'blur(20px)' }}>
            <div className="flex items-center gap-2 mb-6">
              <Zap size={13} className="text-cyan-400" />
              <span className="text-xs font-mono font-bold tracking-widest uppercase" style={{ color: 'rgba(0,212,255,0.7)' }}>{t('dept_comp_rates')}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {deptProgress.map((d, i) => (
                <div key={d.dept} className="flex flex-col items-center gap-3">
                  <RingProgress value={d.pct} color={DEPT_COLORS[i]} size={110} label={d.dept.substring(0,4).toUpperCase() + ` ${d.done}/${d.total}`} />
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
          className="rounded-2xl overflow-hidden shadow-2xl relative" 
          style={{ background: 'rgba(5, 12, 25, 0.7)', border: '1px solid rgba(0,212,255,0.1)', backdropFilter: 'blur(24px)' }}
        >
          {/* Subtle top glow */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          
          <div className="px-4 md:px-6 py-5 flex flex-col md:flex-row gap-4 items-start md:items-center relative z-10" style={{ borderBottom: '1px solid rgba(0,212,255,0.08)', background: 'linear-gradient(to bottom, rgba(0,212,255,0.03), transparent)' }}>
            <SearchBar value={search} onChange={setSearch} className="w-full md:w-64" />
            <div className="cyber-tab-bar w-full md:w-auto overflow-x-auto scrollbar-hide py-1">
              <button onClick={() => setDeptFilter('All')} className={`cyber-tab flex-shrink-0 ${deptFilter === 'All' ? 'active' : ''}`}>{t('all_depts_filter').toUpperCase()}</button>
              {departmentNames.map(d => (
                <button key={d} onClick={() => setDeptFilter(d)} className={`cyber-tab flex-shrink-0 ${deptFilter === d ? 'active' : ''}`}>{d.substring(0,4).toUpperCase()}</button>
              ))}
            </div>
            <span className="text-[10px] hidden md:block font-mono ml-auto font-bold tracking-widest px-3 py-1.5 rounded-lg border uppercase" style={{ color: 'rgba(0,212,255,0.8)', borderColor: 'rgba(0,212,255,0.2)', background: 'rgba(0,212,255,0.05)' }}>{filteredTasks.length} {t('records_label')}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <th className="px-6 py-4 text-[10px] font-mono tracking-widest text-slate-500 font-semibold border-b border-white/5 uppercase">{t('task_directive_label')}</th>
                  <th className="px-6 py-4 text-[10px] font-mono tracking-widest text-slate-500 font-semibold border-b border-white/5 uppercase">{t('assignee_label')}</th>
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
                    const user = users.find(u => u._id === task.assignedTo);
                    return (
                      <motion.tr 
                        key={task.id} 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.03 }}
                        className="group transition-colors duration-200"
                        style={{ 
                          background: overdueTask ? 'rgba(255,68,68,0.05)' : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.03)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = overdueTask ? 'rgba(255,68,68,0.05)' : 'transparent'}
                      >
                        <td className="px-6 py-4 text-slate-200 font-medium max-w-[220px] truncate flex items-center gap-2">
                          {overdueTask && <AlertCircle size={14} className="text-red-500 shrink-0" />}
                          {task.title}
                        </td>
                        <td className="px-6 py-4 font-mono text-[11px] text-slate-400">{user?.name || '—'}</td>
                        <td className="px-6 py-4"><span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-white/5 border border-white/10 text-cyan-400 uppercase">{t(task.department.toLowerCase())}</span></td>
                        <td className="px-6 py-4"><span className={`text-[10px] font-mono font-bold px-2 py-1 rounded border shadow-lg uppercase ${task.priority === 'High' ? 'text-red-400 border-red-500/30 shadow-red-500/20 bg-red-500/10' : task.priority === 'Medium' ? 'text-yellow-400 border-yellow-500/30 shadow-yellow-500/20 bg-yellow-500/10' : 'text-emerald-400 border-emerald-500/30 shadow-emerald-500/20 bg-yellow-500/10'}`}>{t(`priority_${task.priority.toLowerCase().substring(0,3)}`)}</span></td>
                        <td className="px-6 py-4"><span className={`text-[10px] font-mono font-bold px-2 py-1 flex items-center gap-1 w-fit rounded uppercase ${task.status === 'Completed' ? 'text-emerald-400' : task.status === 'In Progress' ? 'text-cyan-400' : 'text-yellow-400'}`}>{task.status === 'Completed' ? <CheckCircle2 size={12}/> : task.status === 'In Progress' ? <Activity size={12}/> : <Clock size={12}/>}{t(`status_${task.status === 'In Progress' ? 'active' : task.status === 'Completed' ? 'done' : 'pending'}`)}</span></td>
                        <td className="px-6 py-4 flex justify-end gap-2">
                          <motion.button 
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            onClick={() => { setEditingTask(task); setEditOpen(true); }}
                            className="p-2 rounded-lg text-cyan-400/50 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all border border-transparent hover:border-cyan-500/30"
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
          className="rounded-2xl overflow-hidden shadow-2xl relative" 
          style={{ background: 'rgba(5, 12, 25, 0.7)', border: '1px solid rgba(0,255,136,0.1)', backdropFilter: 'blur(24px)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

          {/* Header with search + role sub-tabs */}
          <div className="px-4 md:px-6 py-5 relative z-10" style={{ borderBottom: '1px solid rgba(0,255,136,0.08)', background: 'linear-gradient(to bottom, rgba(0,255,136,0.03), transparent)' }}>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-emerald-400" />
                <span className="text-[10px] md:hidden font-mono font-bold tracking-widest text-emerald-400">{filteredUsers.length} {t('records_label')}</span>
              </div>
              <SearchBar value={userSearch} onChange={setUserSearch} className="w-full md:w-64" />
              <span className="text-[10px] hidden md:inline-block font-mono flex-1 font-bold tracking-widest" style={{ color: 'rgba(0,255,136,0.5)' }}>{filteredUsers.length} {t('records_label')}</span>
              <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-lg border border-emerald-400/20">
                {t('status_active_label').toUpperCase()}: {filteredUsers.filter(u => u.isActive).length}
              </span>
            </div>
            {/* Role Sub-Tabs */}
            <div className="flex gap-1 p-1 rounded-xl w-full md:w-fit overflow-x-auto scrollbar-hide" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)' }}>
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
                <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <th className="px-6 py-4 text-[10px] font-mono tracking-widest text-slate-500 font-semibold border-b border-white/5 uppercase">{t('user_label') || 'USER'}</th>
                  <th className="px-6 py-4 text-[10px] font-mono tracking-widest text-slate-500 font-semibold border-b border-white/5 uppercase">{t('role_label') || 'ROLE'}</th>
                  <th className="px-6 py-4 text-[10px] font-mono tracking-widest text-slate-500 font-semibold border-b border-white/5 uppercase">{t('nav_departments')}</th>
                  <th className="px-6 py-4 text-[10px] font-mono tracking-widest text-slate-500 font-semibold border-b border-white/5 uppercase">{t('nav_status')}</th>
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
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.03 }}
                        className="group transition-colors duration-200 cursor-pointer"
                        style={{ opacity: u.isActive ? 1 : 0.6, borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        onClick={() => fetchUserTasks(u)}
                      >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold text-black flex-shrink-0 shadow-lg"
                            style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[u.role]||'#00d4ff'}, rgba(255,255,255,0.2))` }}>
                            {u.name.substring(0,2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-200">{u.name}</p>
                            <p className="text-[10px] font-mono tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className="text-[10px] font-mono font-bold uppercase px-2 py-1.5 rounded-lg shadow-lg"
                        style={{ background: `${ROLE_COLORS[u.role]||'#00d4ff'}15`, color: ROLE_COLORS[u.role]||'#00d4ff', border: `1px solid ${ROLE_COLORS[u.role]||'#00d4ff'}30` }}>{t(`role_${u.role}`)}</span></td>
                      <td className="px-6 py-4 font-mono text-[11px] text-slate-400 uppercase">{u.department?.map(d => t(d.toLowerCase())).join(', ') || '—'}</td>
                      <td className="px-6 py-4">
                        {u.isActive 
                          ? <span className="text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1 uppercase"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" /> {t('online_status') || 'ONLINE'}</span>
                          : <span className="text-red-400 text-[10px] font-mono font-bold flex items-center gap-1 uppercase"><div className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_8px_#f87171]" /> {t('revoked_status')}</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            onClick={() => fetchUserTasks(u)}
                            className="p-2 rounded-lg text-cyan-400/50 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all border border-transparent hover:border-cyan-500/30"
                            title={t('view_tasks') || 'View Tasks'}>
                            <Eye size={14} />
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.stopPropagation(); openResetPasswordModal(u); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all uppercase"
                            style={{ background: 'rgba(234,179,8,0.1)', color: '#fbbf24', border: '1px solid rgba(234,179,8,0.3)' }}>
                            <KeyRound size={12} /> {t('reset_btn')}
                          </motion.button>
                          {u.role !== 'admin' && (
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.stopPropagation(); handleToggleAccess(u._id); }} 
                              disabled={togglingUserId === u._id}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all uppercase ${togglingUserId === u._id ? 'cursor-not-allowed opacity-60' : ''}`}
                              style={{ background: u.isActive ? 'rgba(255,68,68,0.1)' : 'rgba(0,255,136,0.1)', color: u.isActive ? '#ff4444' : '#00ff88', border: `1px solid ${u.isActive ? 'rgba(255,68,68,0.3)' : 'rgba(0,255,136,0.3)'}` }}>
                              {togglingUserId === u._id ? t('updating') || 'UPDATING...' : u.isActive ? <><ShieldOff size={12} /> {t('revoke_btn')}</> : <><Shield size={12} /> {t('grant_btn')}</>}
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
          className="rounded-2xl overflow-hidden shadow-2xl relative" 
          style={{ background: 'rgba(5, 12, 25, 0.7)', border: '1px solid rgba(0,212,255,0.1)', backdropFilter: 'blur(24px)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          
          <div className="px-6 py-6 border-b border-white/5 bg-white/5">
            <h3 className="text-sm font-mono font-bold tracking-widest text-cyan-400 mb-4">// {t('title_create_dept')}</h3>
            <form onSubmit={handleCreateDept} className="flex gap-2">
              <input 
                type="text" 
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder={t('ph_enter_dept_name')}
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all font-mono"
              />
              <motion.button 
                whileHover={{ scale: creatingDepartment ? 1 : 1.02 }} whileTap={{ scale: creatingDepartment ? 1 : 0.98 }}
                type="submit"
                disabled={creatingDepartment}
                className="px-6 py-3 rounded-xl bg-cyan-500 text-black font-bold text-xs font-mono tracking-widest hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingDepartment ? t('btn_creating') : t('btn_create')}
              </motion.button>
            </form>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase">{t('label_active_depts')}</span>
              <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-500/60 bg-cyan-500/5 px-2 py-1 rounded border border-cyan-500/10">{departments.length} {t('records_label')}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map((dept, idx) => {
                const headCount = users.filter(u => u.department?.includes(dept.name)).length;
                const taskCount = allTasks.filter(t => t.department === dept.name).length;
                return (
                  <motion.div 
                    key={dept.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                    className="p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <h4 className="font-bold text-white tracking-wide mb-1">{dept.name}</h4>
                        <div className="flex gap-3 mt-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                            <Users size={12} className="text-cyan-500/50" /> {headCount} {t('records_label')}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                            <ClipboardList size={12} className="text-cyan-500/50" /> {taskCount} {t('stat_total_tasks')}
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
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 blur-3xl rounded-full translate-x-12 -translate-y-12" />
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setSelectedUser(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl p-6 relative"
              style={{ background: 'rgba(5,12,25,0.95)', border: '1px solid rgba(0,212,255,0.15)', backdropFilter: 'blur(24px)' }}
              onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-black" style={{ background: 'linear-gradient(135deg, #00d4ff, #bf00ff)' }}>
                  {selectedUser.name.substring(0,2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedUser.name}</h3>
                  <p className="text-[10px] font-mono text-slate-400">{selectedUser.email} • {selectedUser.role.toUpperCase()}</p>
                </div>
              </div>
              <p className="text-[10px] font-mono font-bold tracking-widest mb-4" style={{ color: 'rgba(0,212,255,0.7)' }}>// {t('label_assigned_tasks')} ({userTasks.length})</p>
              {loadingUserTasks ? (
                <p className="text-slate-500 text-center py-10 font-mono text-xs">{t('label_loading')}</p>
              ) : userTasks.length === 0 ? (
                <p className="text-slate-500 text-center py-10 font-mono text-xs tracking-widest uppercase">{t('msg_no_tasks_assigned')}</p>
              ) : (
                <div className="space-y-3">
                  {userTasks.map(t_history => {
                    const STATUS_C = { Pending: '#eab308', 'In Progress': '#00d4ff', Completed: '#00ff88' };
                    return (
                      <div key={t_history._id} className="p-4 rounded-xl border border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white mb-1">{t_history.title}</p>
                            <p className="text-[10px] font-mono text-slate-500">{t('label_due')}: {t_history.dueDate} • {t_history.department}</p>
                          </div>
                          <span className="text-[9px] font-mono font-bold px-2 py-1 rounded-md" style={{ color: STATUS_C[t_history.status] || '#eab308', background: `${STATUS_C[t_history.status] || '#eab308'}15`, border: `1px solid ${STATUS_C[t_history.status] || '#eab308'}30` }}>
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
              className="rounded-3xl p-8 relative overflow-hidden" 
              style={{ background: 'rgba(5, 12, 25, 0.7)', border: '1px solid rgba(0,212,255,0.1)', backdropFilter: 'blur(24px)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />
              <p className="text-[11px] font-mono font-bold tracking-widest mb-6 flex items-center gap-2" style={{ color: 'rgba(0,212,255,0.7)' }}>
                <Activity size={14} /> {t('label_dept_workload')}
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={deptChartData} barSize={12} barGap={4}>
                  <XAxis dataKey="name" tick={{ fill: 'rgba(148,163,184,0.5)', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(148,163,184,0.5)', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Legend formatter={(v) => <span style={{ color: 'rgba(148,163,184,0.6)', fontSize: 10, fontFamily: 'monospace', paddingLeft: '4px' }}>{v}</span>} />
                  <Bar dataKey="Completed" stackId="a" fill="#00ff88" radius={[0,0,4,4]} />
                  <Bar dataKey="Active"    stackId="a" fill="#00d4ff" />
                  <Bar dataKey="Pending"   stackId="a" fill="#eab308" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
            
            <motion.div 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
              className="rounded-3xl p-8 relative overflow-hidden" 
              style={{ background: 'rgba(5, 12, 25, 0.7)', border: '1px solid rgba(191,0,255,0.1)', backdropFilter: 'blur(24px)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
            >
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />
              <p className="text-[11px] font-mono font-bold tracking-widest mb-6 flex items-center gap-2" style={{ color: 'rgba(191,0,255,0.7)' }}>
                <PieChartIcon size={14} /> {t('label_global_split')}
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={8}
                    label={({ name, percent }) => `${Math.round(percent*100)}%`} labelLine={false} stroke="rgba(0,0,0,0.1)" strokeWidth={2}>
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} style={{ filter: `drop-shadow(0 0 15px ${entry.color}60)` }} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(v) => <span style={{ color: 'rgba(148,163,184,0.6)', fontSize: 10, fontFamily: 'monospace', paddingLeft: '4px' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        </motion.div>
      )}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={t('title_create_user')} size="sm">
        <form onSubmit={handleCreateUser} className="space-y-5 px-1 py-2">
          {/* Role Selector */}
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-3 tracking-widest" style={{ color: 'rgba(0,255,136,0.7)' }}>// SELECT ROLE</label>
            <div className="flex gap-2">
              {['manager', 'employee'].map(r => (
                <button type="button" key={r}
                  onClick={() => setForm(f => ({ ...f, role: r, managerId: '', department: [] }))}
                  className="flex-1 py-3 rounded-xl text-xs font-mono font-bold tracking-widest transition-all duration-300"
                  style={{
                    background: form.role === r ? (r === 'manager' ? 'rgba(191,0,255,0.15)' : 'rgba(0,212,255,0.15)') : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${form.role === r ? (r === 'manager' ? 'rgba(191,0,255,0.5)' : 'rgba(0,212,255,0.5)') : 'rgba(255,255,255,0.05)'}`,
                    color: form.role === r ? (r === 'manager' ? '#bf00ff' : '#00d4ff') : 'rgba(148,163,184,0.6)',
                    boxShadow: form.role === r ? `0 0 15px ${r === 'manager' ? 'rgba(191,0,255,0.15)' : 'rgba(0,212,255,0.15)'}` : 'none'
                  }}>
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {/* Name */}
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(0,255,136,0.7)' }}>// {t('label_full_name_caps')}</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors rounded-xl placeholder:text-slate-700 shadow-inner" placeholder={t('ph_full_name')} />
          </div>
          {/* Email */}
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(0,255,136,0.7)' }}>// EMAIL</label>
            <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors rounded-xl placeholder:text-slate-700 shadow-inner" placeholder="user@company.com" />
          </div>
          {/* Password */}
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(0,255,136,0.7)' }}>// PASSWORD</label>
            <input required type="password" minLength={6} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors rounded-xl placeholder:text-slate-700 shadow-inner" placeholder="Min 6 characters" />
          </div>
          {/* Manager Dropdown (only for Employee) */}
          {form.role === 'employee' && (
            <div>
              <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(0,212,255,0.7)' }}>// ASSIGN MANAGER</label>
              <select required value={form.managerId} onChange={e => setForm(f => ({ ...f, managerId: e.target.value }))}
                className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-cyan-500/50 transition-colors rounded-xl appearance-none cursor-pointer">
                <option value="" disabled>Select Manager...</option>
                {managersList.map(m => (
                  <option key={m._id} value={m._id} className="bg-[#0a0a1a] text-white">{m.name} ({m.email})</option>
                ))}
              </select>
            </div>
          )}
          {/* Departments */}
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-3 tracking-widest" style={{ color: 'rgba(0,255,136,0.7)' }}>// DEPARTMENTS</label>
            <div className="flex flex-wrap gap-2">
              {loadingDepartments && (
                <div className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-[10px] font-mono tracking-widest text-slate-500">
                  {t('label_loading_depts')}
                </div>
              )}
              {!loadingDepartments && departments.map((dep) => {
                const isSelected = form.department.includes(dep.name);
                return (
                  <button type="button" key={dep.id} onClick={() => toggleDept(dep.name)} 
                    className="px-4 py-2 rounded-lg text-[10px] font-mono font-bold tracking-widest transition-all duration-300" 
                    style={{ 
                      background: isSelected ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isSelected ? 'rgba(0,255,136,0.4)' : 'rgba(255,255,255,0.05)'}`,
                      color: isSelected ? '#00ff88' : 'rgba(148,163,184,0.6)',
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
          <div className="flex gap-4 pt-4 mt-2 border-t border-white/5">
            <button type="button" onClick={() => setCreateOpen(false)} className="flex-1 py-3 rounded-xl text-xs font-mono font-bold transition-colors hover:bg-white/5 text-slate-400">{t('btn_cancel').toUpperCase()}</button>
            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 py-3 rounded-xl text-xs font-mono font-bold tracking-widest shadow-[0_0_20px_rgba(0,255,136,0.2)] text-black" style={{ background: 'linear-gradient(135deg, #00ff88, #00d4ff)' }}>⚡ {t('btn_create_user_caps')}</motion.button>
          </div>
        </form>
      </Modal>

      {/* Assign Task Modal */}
      <Modal isOpen={assignOpen} onClose={() => setAssignOpen(false)} title={t('title_assign_new_task') || 'ASSIGN NEW TASK'} size="sm">
        <form onSubmit={handleAssignTask} className="space-y-5 px-1 py-2">
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(0,212,255,0.7)' }}>// ASSIGNEE TYPE</label>
            <div className="grid grid-cols-2 gap-2">
              {['manager', 'employee'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setTaskForm((f) => ({ ...f, assigneeRole: role, assignedTo: '' }))}
                  className="py-3 rounded-xl text-xs font-mono font-bold tracking-widest transition-all"
                  style={{
                    background: taskForm.assigneeRole === role ? 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(191,0,255,0.12))' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${taskForm.assigneeRole === role ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.06)'}`,
                    color: taskForm.assigneeRole === role ? '#00d4ff' : 'rgba(148,163,184,0.7)',
                    boxShadow: taskForm.assigneeRole === role ? '0 0 18px rgba(0,212,255,0.25)' : 'none',
                  }}
                >
                  {role.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div ref={assignBoxRef}>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(0,212,255,0.7)' }}>// ASSIGN TO</label>
            <div
              className="relative flex items-center rounded-xl border border-white/12 bg-[#030812] shadow-inner focus-within:border-cyan-500/40 transition-colors px-3 py-2.5"
              onClick={() => setShowAssignSuggestions(true)}
            >
              <Search size={16} className="text-slate-600" />
              <input
                type="text"
                value={assignSearch}
                onChange={(e) => {
                  setAssignSearch(e.target.value);
                  setShowAssignSuggestions(true);
                }}
                onFocus={() => setShowAssignSuggestions(true)}
                placeholder={`Search ${taskForm.assigneeRole === 'employee' ? 'employee' : 'manager'} by name or email`}
                className="flex-1 bg-transparent text-white text-sm pl-3 focus:outline-none placeholder:text-slate-600"
              />
              <span className="text-xs font-mono text-slate-500">⌄</span>
            </div>
            {showAssignSuggestions && (
              <div className="relative">
                <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-white/12 bg-[#050a14] shadow-2xl max-h-64">
                  {filteredAssignableUsers.length === 0 && (
                    <div className="px-4 py-3 text-xs font-mono text-slate-400">{t('msg_no_results')}</div>
                  )}
                  <ul className="divide-y divide-white/5 overflow-y-auto max-h-64">
                    {filteredAssignableUsers.map((u) => (
                      <li
                        key={u._id}
                        onMouseDown={(evt) => evt.preventDefault()}
                        onClick={() => {
                          setTaskForm((f) => ({ ...f, assignedTo: u._id }));
                          setAssignSearch(`${u.name} (${u.email})`);
                          setShowAssignSuggestions(false);
                        }}
                        className={`px-4 py-3 text-sm cursor-pointer hover:bg-white/5 ${
                          String(taskForm.assignedTo) === String(u._id) ? 'bg-cyan-500/10 text-cyan-200' : 'text-slate-100'
                        }`}
                      >
                        <div className="font-semibold">{u.name}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-1">Role: {u.role} · Dept: {(u.department || []).join(', ') || 'N/A'}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(0,212,255,0.7)' }}>// TASK TITLE</label>
            <input required value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-cyan-500/50 transition-colors rounded-xl placeholder:text-slate-700 shadow-inner" placeholder="Task title" />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(0,212,255,0.7)' }}>// {t('label_description_caps')}</label>
            <textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-cyan-500/50 transition-colors rounded-xl placeholder:text-slate-700 shadow-inner resize-none" placeholder={t('ph_brief_description')} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(0,212,255,0.7)' }}>// DEPARTMENT</label>
              <select required value={taskForm.department} onChange={e => setTaskForm(f => ({ ...f, department: e.target.value }))}
                className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-cyan-500/50 transition-colors rounded-xl appearance-none cursor-pointer">
                <option value="" disabled>Select...</option>
                {departmentNames.map(d => <option key={d} value={d} className="bg-[#0a0a1a] text-white">{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(0,212,255,0.7)' }}>// DUE DATE</label>
              <input required type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-cyan-500/50 transition-colors rounded-xl" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-3 tracking-widest" style={{ color: 'rgba(0,212,255,0.7)' }}>// PRIORITY</label>
            <div className="flex gap-2">
              {['Low', 'Medium', 'High'].map(p => (
                <button type="button" key={p} onClick={() => setTaskForm(f => ({ ...f, priority: p }))}
                  className="flex-1 py-2.5 rounded-lg text-[10px] font-mono font-bold tracking-widest transition-all duration-300"
                  style={{
                    background: taskForm.priority === p ? (p === 'High' ? 'rgba(255,68,68,0.15)' : p === 'Medium' ? 'rgba(234,179,8,0.15)' : 'rgba(0,255,136,0.15)') : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${taskForm.priority === p ? (p === 'High' ? 'rgba(255,68,68,0.4)' : p === 'Medium' ? 'rgba(234,179,8,0.4)' : 'rgba(0,255,136,0.4)') : 'rgba(255,255,255,0.05)'}`,
                    color: taskForm.priority === p ? (p === 'High' ? '#ff4444' : p === 'Medium' ? '#eab308' : '#00ff88') : 'rgba(148,163,184,0.6)'
                  }}>
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-4 pt-4 mt-2 border-t border-white/5">
            <button type="button" onClick={() => setAssignOpen(false)} className="flex-1 py-3 rounded-xl text-xs font-mono font-bold transition-colors hover:bg-white/5 text-slate-400">{t('btn_cancel').toUpperCase()}</button>
            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 py-3 rounded-xl text-xs font-mono font-bold tracking-widest shadow-[0_0_20px_rgba(0,212,255,0.2)] text-black" style={{ background: 'linear-gradient(135deg, #00d4ff, #bf00ff)' }}>⚡ {t('btn_assign_task_caps')}</motion.button>
          </div>
        </form>
      </Modal>

      {/* ─── DEPARTMENT DELETE CONFIRMATION ─── */}
      <Modal isOpen={resetPasswordOpen} onClose={closeResetPasswordModal} title={t('title_reset_password_caps')} size="sm">
        <form onSubmit={handleResetPassword} className="space-y-5 px-1 py-2">
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
            <p className="text-[10px] font-mono tracking-[0.2em] text-amber-300/80">TARGET USER</p>
            <p className="mt-2 text-sm font-semibold text-white">{resetPasswordTarget?.name || 'Unknown user'}</p>
            <p className="text-xs text-slate-400">{resetPasswordTarget?.email || ''}</p>
            <p className="mt-3 text-[10px] font-mono text-slate-500">Existing password is never shown. Only a new password can be set.</p>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(251,191,36,0.8)' }}>// NEW PASSWORD</label>
            <input
              required
              type="password"
              minLength={6}
              value={resetPasswordForm.newPassword}
              onChange={(e) => setResetPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-amber-400/50 transition-colors rounded-xl placeholder:text-slate-700 shadow-inner"
              placeholder={t('ph_min_6_char')}
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(251,191,36,0.8)' }}>// CONFIRM PASSWORD</label>
            <input
              required
              type="password"
              minLength={6}
              value={resetPasswordForm.confirmPassword}
              onChange={(e) => setResetPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-amber-400/50 transition-colors rounded-xl placeholder:text-slate-700 shadow-inner"
              placeholder={t('ph_reenter_password')}
            />
          </div>

          <div className="flex gap-4 pt-4 mt-2 border-t border-white/5">
            <button type="button" onClick={closeResetPasswordModal} className="flex-1 py-3 rounded-xl text-xs font-mono font-bold transition-colors hover:bg-white/5 text-slate-400">CANCEL</button>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={resettingPassword}
              className={`flex-1 py-3 rounded-xl text-xs font-mono font-bold tracking-widest text-black ${resettingPassword ? 'opacity-60 cursor-not-allowed' : 'shadow-[0_0_20px_rgba(251,191,36,0.2)]'}`}
              style={{ background: 'linear-gradient(135deg, #f59e0b, #facc15)' }}
            >
              {resettingPassword ? t('btn_resetting') : t('btn_reset_password_caps')}
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
