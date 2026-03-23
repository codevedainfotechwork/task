import { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useTask } from '../../contexts/TaskContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api';
import TaskCard from '../../components/shared/TaskCard';
import Modal from '../../components/shared/Modal';
import EditTaskModal from '../../components/shared/EditTaskModal';
import { DashboardSkeleton } from '../../components/shared/LoadingSkeleton';
import { format, parseISO, isBefore } from 'date-fns';
import { Target, AlertTriangle, CheckCircle, Clock, Plus, Users, Zap, Search, Building2, ArrowRightLeft } from 'lucide-react';

const VIEW_TABS = [
  { id: 'OVERVIEW', label: 'tab_overview', icon: Zap },
  { id: 'TEAM', label: 'tab_team', icon: Users },
  { id: 'TASKS', label: 'tab_tasks', icon: Target }
];

function StatPanel({ title, value, color, icon: Icon, glow, delay = 0 }) {
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
        <span className="text-[11px] font-mono tracking-widest font-semibold" style={{ color: 'rgba(148,163,184,0.6)' }}>{title}</span>
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

export default function ManagerDashboard() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const { tasks, loading, refreshTasks, createTask, editTask, transferTaskToManager } = useTask();
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
  
  // Task Filters
  const [taskFilters, setTaskFilters] = useState({ search: '', status: 'All', assignee: 'All', department: 'All' });
  const [teamSearch, setTeamSearch] = useState('');
  const [togglingEmployeeId, setTogglingEmployeeId] = useState(null);
  
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignedTo: '', department: viewDept==='All' ? currentUser?.department?.[0] : viewDept, startDate: format(new Date(), 'yyyy-MM-dd'), dueDate: format(new Date(), 'yyyy-MM-dd'), priority: 'Medium' });
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeSuggestions, setShowEmployeeSuggestions] = useState(false);
  const employeeBoxRef = useRef(null);
  const [empForm, setEmpForm] = useState({ name: '', email: '', password: '', role: 'employee', department: '' });
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferModalTask, setTransferModalTask] = useState(null);
  const [transferForm, setTransferForm] = useState({ taskId: '', department: '', managerId: '' });
  const [transferringTaskId, setTransferringTaskId] = useState(null);
  const [showTransferList, setShowTransferList] = useState(false);
  
  const [editingTask, setEditingTask] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    fetchEmployees();
    refreshTasks();
    fetchDepartments();
    fetchDirectory();
  }, []);

  useEffect(() => {
    if (location.pathname === '/manager/create') {
      setDeployOpen(true);
      setActiveTab('TASKS');
    } else {
      setDeployOpen(false);
    }

    if (location.pathname === '/manager/team') {
      setActiveTab('TEAM');
    }

    if (location.pathname !== '/manager/team') {
      setCreateEmpOpen(false);
    }
  }, [location.pathname]);

  const availableDepartments = useMemo(
    () => departments.filter((department) => currentUser?.department?.includes(department.name)),
    [departments, currentUser]
  );

  const assignableEmployees = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase();
    return employees
      .filter((e) => e.department.includes(taskForm.department))
      .filter((e) => {
        if (!term) return true;
        return (
          e.name.toLowerCase().includes(term) ||
          e.email.toLowerCase().includes(term)
        );
    });
  }, [employees, employeeSearch, taskForm.department]);

  // Reset search when department changes to avoid empty lists from stale filters
  useEffect(() => {
    setEmployeeSearch('');
    setShowEmployeeSuggestions(false);
  }, [taskForm.department]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (employeeBoxRef.current && !employeeBoxRef.current.contains(event.target)) {
        setShowEmployeeSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleToggleAccess = async (userId) => {
    setTogglingEmployeeId(userId);
    try {
      const res = await api.patch(`/manager/employee/${userId}/toggle-access`);
      const updatedEmployee = res.data.employee;

      setEmployees((prev) => prev.map((employee) => (
        employee._id === userId ? updatedEmployee : employee
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
      await createTask(taskForm);
      setDeployOpen(false);
      setTaskForm({ ...taskForm, title: '', description: '' });
      addToast(t('msg_task_deployed_success') || 'Task assigned successfully.', 'cyber');
      navigate('/manager');
    } catch (err) {
      addToast(err.response?.data?.message || err.message, 'error');
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    try {
      if (!empForm.department) throw new Error(t('msg_select_dept_err') || 'Select a department for the employee');
      if (!empForm.password || empForm.password.length < 6) throw new Error(t('err_pass_short') || 'Password must be at least 6 characters');
      // Backend expects department as array for consistency
      await api.post('/users', { ...empForm, department: [empForm.department] });
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

  const openCreateEmployeeModal = () => {
    setActiveTab('TEAM');
    setCreateEmpOpen(true);

    if (location.pathname !== '/manager/team') {
      navigate('/manager/team');
    }
  };

  const handleViewTabChange = (tabId) => {
    setActiveTab(tabId);

    if (tabId === 'TEAM') {
      navigate('/manager/team');
      return;
    }

    if (location.pathname === '/manager/team') {
      navigate('/manager');
    }
  };

  // toggleDept no longer needed — single select now

  const getTransferableTasksFromList = (taskList = []) => {
    return taskList.filter((task) => {
      const managerOwnsTask =
        String(task.assignedBy) === String(currentUser?._id) ||
        String(task.assignedTo) === String(currentUser?._id);

      return managerOwnsTask && (currentUser?.department || []).includes(task.department);
    });
  };

  const getTransferDepartmentsFromList = (directoryList = []) => {
    return directoryList.filter((department) =>
      department.managers?.some((manager) => String(manager._id) !== String(currentUser?._id))
    );
  };

  const transferableTasks = useMemo(
    () => getTransferableTasksFromList(tasks),
    [tasks, currentUser]
  );

  const transferDepartments = useMemo(
    () => getTransferDepartmentsFromList(departmentDirectory),
    [departmentDirectory, currentUser]
  );

  const directoryCards = useMemo(() => {
    if (viewDept === 'All') {
      return departmentDirectory;
    }

    return departmentDirectory.filter((department) => department.name === viewDept);
  }, [departmentDirectory, viewDept]);

  const transferManagerOptions = useMemo(() => {
    const selectedDepartment = transferDepartments.find((department) => department.name === transferForm.department);
    return (selectedDepartment?.managers || []).filter((manager) => String(manager._id) !== String(currentUser?._id));
  }, [transferDepartments, transferForm.department, currentUser]);

  const selectedTransferTask = useMemo(
    () => transferableTasks.find((task) => String(task.id) === String(transferForm.taskId)) || null,
    [transferableTasks, transferForm.taskId]
  );

  const selectedTransferManager = useMemo(
    () => transferManagerOptions.find((manager) => String(manager._id) === String(transferForm.managerId)) || null,
    [transferManagerOptions, transferForm.managerId]
  );

  const transferredTaskList = useMemo(() => {
    return tasks
      .filter((task) => {
        if (!task.isTransferred) {
          return false;
        }

        const relatesToCurrentManager =
          String(task.assignedTo) === String(currentUser?._id) ||
          String(task.transferredFromManagerId) === String(currentUser?._id) ||
          String(task.transferredToManagerId) === String(currentUser?._id);

        if (!relatesToCurrentManager) {
          return false;
        }

        if (viewDept !== 'All' && task.department !== viewDept) {
          return false;
        }

        return true;
      })
      .sort((left, right) => {
        const leftTime = left.transferredAt ? new Date(left.transferredAt).getTime() : 0;
        const rightTime = right.transferredAt ? new Date(right.transferredAt).getTime() : 0;
        return rightTime - leftTime;
      });
  }, [tasks, currentUser, viewDept]);

  const buildTransferDefaults = (task = null, preferredDepartment = '', taskOptions = transferableTasks, departmentOptions = transferDepartments) => {
    const defaultTaskId = task?.id || taskOptions[0]?.id || '';
    const defaultDepartment =
      departmentOptions.find((department) => department.name === preferredDepartment)?.name ||
      departmentOptions.find((department) => department.name === task?.department)?.name ||
      departmentOptions[0]?.name ||
      '';
    const defaultManagers = (departmentOptions.find((department) => department.name === defaultDepartment)?.managers || [])
      .filter((manager) => String(manager._id) !== String(currentUser?._id));

    return {
      taskId: defaultTaskId,
      department: defaultDepartment,
      managerId: defaultManagers[0]?._id || '',
    };
  };

  const openTransferModal = async (task = null, preferredDepartment = '') => {
    let nextTasks = task
      ? [task, ...transferableTasks.filter((queueTask) => String(queueTask.id) !== String(task.id))]
      : transferableTasks;
    let nextDepartments = transferDepartments;

    if (!nextTasks.length) {
      try {
        const latestTasks = await refreshTasks();
        nextTasks = getTransferableTasksFromList(latestTasks || []);
      } catch (err) {
        addToast(t('err_failed_refresh') || 'Unable to refresh tasks right now.', 'error');
      }
    }

    if (!nextDepartments.length) {
      const latestDirectory = await fetchDirectory();
      nextDepartments = getTransferDepartmentsFromList(latestDirectory || []);
    }

    setTransferModalTask(task);
    setTransferForm(buildTransferDefaults(task, preferredDepartment, nextTasks, nextDepartments));
    setTransferOpen(true);
  };

  const closeTransferModal = () => {
    setTransferOpen(false);
    setTransferModalTask(null);
    setTransferForm({ taskId: '', department: '', managerId: '' });
    setTransferringTaskId(null);
  };

  const handleTransferTask = async (e) => {
    e.preventDefault();

    if (!transferForm.taskId || !transferForm.department || !transferForm.managerId) {
      addToast(t('msg_tfr_params_err') || 'Select a task, department, and manager before transferring.', 'error');
      return;
    }

    setTransferringTaskId(transferForm.taskId);
    try {
      await transferTaskToManager(transferForm.taskId, {
        targetDepartment: transferForm.department,
        targetManagerId: transferForm.managerId,
      });
      
      const mgrName = selectedTransferManager?.name || t('role_manager');
      addToast(t('msg_tfr_success')?.replace('{manager}', mgrName) || `Task transferred to ${mgrName} successfully.`, 'success');
      closeTransferModal();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to transfer task.', 'error');
    } finally {
      setTransferringTaskId(null);
    }
  };

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      await editTask(taskId, { status: newStatus });
      addToast(t('msg_task_updated_success') || 'Task status updated successfully', 'success');
      refreshTasks();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to update task status', 'error');
    }
  };

  useEffect(() => {
    if (!transferOpen) {
      return;
    }

    if (!transferDepartments.some((department) => department.name === transferForm.department)) {
      const nextDefaults = buildTransferDefaults(transferModalTask, '');
      const shouldReset =
        String(nextDefaults.taskId) !== String(transferForm.taskId) ||
        nextDefaults.department !== transferForm.department ||
        String(nextDefaults.managerId) !== String(transferForm.managerId);

      if (shouldReset) {
        setTransferForm(nextDefaults);
      }
      return;
    }

    if (!transferManagerOptions.some((manager) => String(manager._id) === String(transferForm.managerId))) {
      const nextManagerId = transferManagerOptions[0]?._id || '';

      if (String(nextManagerId) !== String(transferForm.managerId)) {
        setTransferForm((current) => ({
          ...current,
          managerId: nextManagerId,
        }));
      }
    }
  }, [transferOpen, transferDepartments, transferManagerOptions, transferForm.department, transferForm.managerId, transferModalTask]);

  const myDeptTasks = useMemo(() => {
    if (viewDept === 'All') return tasks.filter(t => currentUser?.department?.includes(t.department));
    return tasks.filter(t => t.department === viewDept);
  }, [tasks, viewDept, currentUser]);

  const stats = useMemo(() => {
    const overdueCount = myDeptTasks.filter(t => t.status !== 'Completed' && isBefore(parseISO(t.dueDate + 'T23:59:59'), new Date())).length;
    return {
      active: myDeptTasks.filter(t => t.status === 'In Progress').length,
      pending: myDeptTasks.filter(t => t.status === 'Pending').length,
      completed: myDeptTasks.filter(t => t.status === 'Completed').length,
      overdue: overdueCount,
    };
  }, [myDeptTasks]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const term = teamSearch.toLowerCase();
      return e.name.toLowerCase().includes(term) || e.email.toLowerCase().includes(term);
    });
  }, [employees, teamSearch]);

  const filteredTasks = useMemo(() => {
    return myDeptTasks.filter(t => {
      const assignedEmployee = employees.find(e => String(e._id) === String(t.assignedTo));
      const assigneeName = assignedEmployee ? assignedEmployee.name : '';
      const searchTarget = `${t.title} ${assigneeName}`.toLowerCase();
      
      const matchesSearch = searchTarget.includes(taskFilters.search.toLowerCase());
      const matchesStatus = taskFilters.status === 'All' || String(t.status) === String(taskFilters.status);
      const matchesAssignee = taskFilters.assignee === 'All' || String(t.assignedTo) === String(taskFilters.assignee);
      const matchesDept = taskFilters.department === 'All' || String(t.department) === String(taskFilters.department);
      return matchesSearch && matchesStatus && matchesAssignee && matchesDept;
    });
  }, [myDeptTasks, taskFilters, employees]);

  if (loading) {
    return (
      <div className="p-8">
        <DashboardSkeleton />
      </div>
    );
  }

  const renderOverview = () => (
    <>
      {/* Department Tabs */}
      <div className="flex gap-2 mb-10 p-1.5 rounded-2xl w-full md:w-fit overflow-x-auto scrollbar-hide" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }}>
        <button
          onClick={() => setViewDept('All')}
          className={`relative px-6 py-2.5 rounded-xl text-[11px] font-mono font-bold tracking-widest transition-all duration-300 ${viewDept === 'All' ? 'text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          {viewDept === 'All' && <motion.div layoutId="manager-tab-bubble" className="absolute inset-0 rounded-xl" style={{ background: 'rgba(191,0,255,0.1)', border: '1px solid rgba(191,0,255,0.3)', boxShadow: '0 0 15px rgba(191,0,255,0.1)' }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} />}
          <span className="relative z-10">{t('all_depts')}</span>
        </button>
        {availableDepartments.map(d => (
          <button
            key={d.id} onClick={() => setViewDept(d.name)}
            className={`relative px-6 py-2.5 rounded-xl text-[11px] font-mono font-bold tracking-widest transition-all duration-300 ${viewDept === d.name ? 'text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {viewDept === d.name && <motion.div layoutId="manager-tab-bubble" className="absolute inset-0 rounded-xl" style={{ background: 'rgba(191,0,255,0.1)', border: '1px solid rgba(191,0,255,0.3)', boxShadow: '0 0 15px rgba(191,0,255,0.1)' }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} />}
            <span className="relative z-10">{d.name.toUpperCase()}</span>
          </button>
        ))}
      </div>

      <div className="mb-10 rounded-3xl border p-6 md:p-7" style={{ background: 'linear-gradient(140deg, rgba(5,10,20,0.85), rgba(10,15,28,0.78))', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)' }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-mono font-bold tracking-[0.28em] text-cyan-300/70 uppercase">{t('cross_dept_cmd')}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white uppercase">
              {viewDept === 'All' ? t('dept_mgr_dir') : `${viewDept} ${t('cmd_roster')}`}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {t('dept_mgr_desc')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowTransferList((current) => !current)}
              className="rounded-2xl border border-purple-500/20 bg-purple-500/8 px-4 py-3 text-xs font-mono font-bold tracking-[0.16em] text-purple-200 transition hover:border-purple-400/35 hover:bg-purple-500/12"
            >
              {showTransferList ? t('hide_tfr_list') : t('open_tfr_list')}
            </button>
            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3 text-xs text-cyan-100 uppercase">
              {transferableTasks.length} {t('tfr_task_ready')}
            </div>
          </div>
        </div>

        {loadingDirectory ? (
          <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center text-sm text-slate-400">
            Loading department manager network...
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
            {directoryCards.map((department) => {
              const transferTargets = (department.managers || []).filter((manager) => String(manager._id) !== String(currentUser?._id));

              return (
                <motion.div
                  key={department.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border p-5"
                  style={{ background: 'rgba(3,7,18,0.72)', borderColor: 'rgba(255,255,255,0.08)', boxShadow: '0 16px 40px rgba(0,0,0,0.28)' }}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-mono tracking-[0.2em] text-slate-400">
                        <Building2 size={12} className="text-cyan-300" />
                        {t('label_department')}
                      </div>
                      <h3 className="mt-3 text-xl font-semibold tracking-tight text-white">{department.name}</h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => openTransferModal(null, department.name)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-mono font-bold tracking-[0.18em] transition hover:border-purple-400/40 hover:bg-purple-500/12"
                      style={{ borderColor: 'rgba(191,0,255,0.25)', color: '#d8b4fe', background: 'rgba(191,0,255,0.08)' }}
                    >
                      <ArrowRightLeft size={14} />
                      {t('btn_transfer_caps')}
                    </button>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
                    <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-slate-500">{t('label_managers')}</p>
                    <div className="mt-3 space-y-3">
                      {department.managers?.length ? department.managers.map((manager) => (
                        <div key={manager._id} className="flex items-start justify-between gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {manager.name}
                              {manager.isCurrentManager && <span className="ml-2 text-xs font-mono text-purple-300">{t('you')}</span>}
                            </p>
                            <p className="truncate text-xs text-slate-400">{manager.email}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${manager.isActive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
                            {manager.isActive ? t('status_active_label') : t('status_disabled_label')}
                          </span>
                        </div>
                      )) : (
                        <p className="text-sm text-slate-500">{t('msg_no_mgr_dept')}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {!directoryCards.length && (
              <div className="col-span-full rounded-3xl border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center text-sm text-slate-500">
                {t('msg_no_mgr_mapping')}
              </div>
            )}
          </div>
        )}

        {showTransferList && (
          <div className="mt-6 rounded-3xl border border-white/8 bg-black/20 p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[10px] font-mono font-bold tracking-[0.24em] text-purple-300/70">{t('tfr_task_list')}</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{t('tfr_directives')}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {t('msg_tfr_desc')}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
                {transferredTaskList.length} {transferredTaskList.length === 1 ? t('label_tfr_record') : t('label_tfr_records')}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
              {transferredTaskList.map((task) => {
                const isIncomingTransfer = String(task.transferredToManagerId) === String(currentUser?._id);
                const transferTimestamp = task.transferredAt
                  ? new Date(task.transferredAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : 'Unknown';

                return (
                  <div
                    key={`transfer-${task.id}`}
                    className="rounded-3xl border border-white/8 bg-[rgba(3,7,18,0.75)] p-5"
                    style={{ boxShadow: '0 16px 40px rgba(0,0,0,0.22)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold text-white">{task.title}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {t('task_department')}: <span className="text-slate-200">{task.department}</span>
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-mono font-bold tracking-[0.16em] ${isIncomingTransfer ? 'bg-emerald-500/10 text-emerald-300' : 'bg-cyan-500/10 text-cyan-300'}`}>
                        {isIncomingTransfer ? t('tfr_incoming') : t('tfr_sent')}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">{t('tfr_from')}</p>
                        <p className="mt-2 text-sm font-medium text-white">{task.transferredFromManagerName || 'Unknown'}</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">{t('tfr_to')}</p>
                        <p className="mt-2 text-sm font-medium text-white">{task.transferredToManagerName || 'Unknown'}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{t('task_status')}: {task.status}</span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{t('tfr_timestamp')}: {transferTimestamp}</span>
                    </div>
                  </div>
                );
              })}

              {transferredTaskList.length === 0 && (
                <div className="col-span-full rounded-3xl border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center text-sm text-slate-500">
                  {t('msg_no_results')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatPanel title={t('stat_active_cycles')} value={stats.active} color="#00d4ff" glow="rgba(0,212,255,0.3)" icon={ActivityIcon} />
        <StatPanel title={t('stat_pending_queue')} value={stats.pending} color="#eab308" glow="rgba(234,179,8,0.3)" icon={Clock} />
        <StatPanel title={t('stat_completed')} value={stats.completed} color="#00ff88" glow="rgba(0,255,136,0.3)" icon={CheckCircle} />
        <StatPanel title={t('stat_critical_overdue')} value={stats.overdue} color="#ff4444" glow="rgba(255,68,68,0.3)" icon={AlertTriangle} />
      </div>

      {/* Task Sections */}
      {renderSection('ACTIVE DIRECTIVES', 'In Progress', '#00d4ff')}
      {renderSection('QUEUED DIRECTIVES', 'Pending', '#eab308')}
      {renderSection('COMPLETED ARCHIVES', 'Completed', '#00ff88')}
    </>
  );



  const renderTeam = () => (
    <div className="space-y-8">
      <div
        className="rounded-3xl border p-6 md:p-7"
        style={{
          background: 'linear-gradient(135deg, rgba(191,0,255,0.08), rgba(0,212,255,0.04))',
          borderColor: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(22px)',
        }}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-mono font-bold tracking-[0.3em] text-purple-300/70">{t('nav_team')}</p>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white">{t('label_assigned_ems')}</h2>
              <p className="text-sm text-slate-400">{t('label_assigned_ems_desc')}</p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 md:flex-row xl:w-auto">
            <div className="relative w-full md:min-w-[320px] group">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-purple-400" />
              <input 
                value={teamSearch}
                onChange={e => setTeamSearch(e.target.value)}
                placeholder={t('ph_search_ems')}
                className="w-full rounded-2xl border border-white/10 bg-[#030812] px-12 py-3.5 text-sm text-white shadow-inner transition-all focus:border-purple-500/30 focus:outline-none"
              />
            </div>

            <motion.button
              type="button"
              onClick={openCreateEmployeeModal}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold tracking-wide text-black shadow-[0_0_24px_rgba(191,0,255,0.25)]"
              style={{ background: 'linear-gradient(135deg, #bf00ff, #00d4ff)' }}
            >
              <Plus size={16} />
              {t('btn_add_emp')}
            </motion.button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            {employees.length} {employees.length === 1 ? t('label_total_emp') : t('label_total_emps')}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            {filteredEmployees.length} {t('label_visible')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((e, idx) => (
          <motion.div 
            key={e._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
            className="rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/20"
            style={{ background: 'rgba(5,10,20,0.55)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white"
                  style={{
                    background: 'linear-gradient(135deg, rgba(191,0,255,0.85), rgba(0,212,255,0.85))',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
                  }}
                >
                  {e.name.substring(0, 2).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold tracking-tight text-white">{e.name}</h3>
                  <p className="truncate text-sm text-slate-400">{e.email}</p>
                </div>
              </div>
 
              <div className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${e.isActive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
                {e.isActive ? t('status_active_label') : t('status_disabled_label')}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">{t('task_department')}</p>
                <p className="mt-2 text-sm font-medium text-white">{e.department?.join(', ') || t('msg_unassigned')}</p>
              </div>
 
              <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">{t('task_status')}</p>
                <p className={`mt-2 text-sm font-medium ${e.isActive ? 'text-emerald-300' : 'text-red-300'}`}>
                  {e.isActive ? t('status_active_label') : t('status_disabled_label')}
                </p>
              </div>
            </div>

            <button 
              onClick={() => handleToggleAccess(e._id)}
              disabled={togglingEmployeeId === e._id}
              className={`mt-6 w-full rounded-2xl border py-3 text-sm font-semibold transition-all duration-300 ${e.isActive ? 'text-red-300 hover:bg-red-500/10' : 'text-emerald-300 hover:bg-emerald-500/10'}`}
              style={{ borderColor: e.isActive ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)' }}
            >
              {togglingEmployeeId === e._id ? t('btn_update') : (e.isActive ? t('btn_disable_emp') : t('btn_enable_emp'))}
            </button>
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
      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-2xl border border-white/5 bg-black/20 backdrop-blur-md">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            value={taskFilters.search} onChange={e => setTaskFilters(f => ({ ...f, search: e.target.value }))}
            placeholder={t('search_directives')}
            className="w-full bg-[#030812] border border-white/5 text-white text-xs px-10 py-2.5 rounded-xl focus:outline-none focus:border-purple-500/30 transition-all font-mono"
          />
        </div>
        <select 
          value={taskFilters.status} onChange={e => setTaskFilters(f => ({ ...f, status: e.target.value }))}
          className="bg-[#030812] border border-white/5 text-white text-xs px-4 py-2.5 rounded-xl focus:outline-none focus:border-purple-500/30 transition-all font-mono uppercase"
        >
          <option value="All">{t('all_statuses')}</option>
          <option value="Pending">{t('status_pending')}</option>
          <option value="In Progress">{t('status_active')}</option>
          <option value="Completed">{t('status_done')}</option>
        </select>
        <select 
          value={taskFilters.assignee} onChange={e => setTaskFilters(f => ({ ...f, assignee: e.target.value }))}
          className="bg-[#030812] border border-white/5 text-white text-xs px-4 py-2.5 rounded-xl focus:outline-none focus:border-purple-500/30 transition-all font-mono"
        >
          <option value="All">{t('all_employees')}</option>
          {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
        </select>
        <select 
          value={taskFilters.department} onChange={e => setTaskFilters(f => ({ ...f, department: e.target.value }))}
          className="bg-[#030812] border border-white/5 text-white text-xs px-4 py-2.5 rounded-xl focus:outline-none focus:border-purple-500/30 transition-all font-mono uppercase"
        >
          <option value="All">{t('all_depts_filter')}</option>
          {availableDepartments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredTasks.map((task, idx) => {
            return (
              <motion.div key={task.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: idx * 0.05 }}>
                <TaskCard 
                  task={task} 
                  showAssignee={true}
                  assigneeName={employees.find(e => String(e._id) === String(task.assignedTo))?.name || t('msg_unassigned')}
                  onStatusUpdate={handleStatusUpdate}
                  onEdit={(taskItem) => { setEditingTask(taskItem); setEditOpen(true); }}
                  onTransfer={() => openTransferModal(task)} 
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filteredTasks.length === 0 && (
          <div className="col-span-full py-20 text-center rounded-2xl border border-dashed border-white/5 opacity-50">
            <p className="font-mono text-[10px] tracking-widest">{t('msg_no_tasks_criteria')}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderSection = (title, status, iconColor) => {
    const sectionTasks = myDeptTasks.filter(t => t.status === status);
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-14 last:mb-0">
        <div className="flex items-center gap-4 mb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
          <div className="w-2 h-8 rounded-full shadow-lg" style={{ background: iconColor, boxShadow: `0 0 15px ${iconColor}60` }} />
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            {t(title)}
            <span className="text-[11px] font-mono px-3 py-1 rounded-full border" style={{ color: iconColor, borderColor: `${iconColor}40`, background: `${iconColor}10` }}>
              {sectionTasks.length} {t('label_records_caps')}
            </span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {sectionTasks.map((task, idx) => {
              return (
                <motion.div key={task.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: idx * 0.05 }}>
                  <TaskCard 
                    task={task} 
                    onEdit={(taskItem) => { setEditingTask(taskItem); setEditOpen(true); }}
                    onTransfer={() => openTransferModal(task)} 
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
          {sectionTasks.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-16 flex flex-col items-center justify-center rounded-2xl border border-dashed" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-transform hover:scale-110" style={{ background: `${iconColor}10`, border: `1px solid ${iconColor}30`, boxShadow: `0 0 20px ${iconColor}20` }}>
                <Target size={24} style={{ color: iconColor }} />
              </div>
              <p className="text-xs font-mono tracking-widest text-slate-500">{t('msg_no_tasks_dept')}</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  };

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
            className="h-[2px] mb-3" style={{ background: 'linear-gradient(90deg, #bf00ff, transparent)' }} 
          />
          <p className="text-[10px] font-mono tracking-widest mb-1.5" style={{ color: 'rgba(191,0,255,0.6)' }}>{t('label_regional_cmd')}</p>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <span className="neon-text-purple flex items-center gap-2">{t('label_mgr_overview')}<Users size={20} className="text-purple-400 animate-pulse"/></span>
          </h1>
          <p className="mt-3 text-sm text-slate-300">
            {t('msg_managing_intro')}
            <span className="mx-2 font-semibold text-purple-300">
              {(currentUser?.department?.length ? currentUser.department : [t('msg_unassigned')]).join(', ')}
            </span>
            {currentUser?.department?.length > 1 ? t('msg_managing_depts') : t('msg_managing_dept')}.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-mono tracking-[0.22em] text-slate-400">
              {t('label_managing_depts')}
            </span>
            {(currentUser?.department?.length ? currentUser.department : ['UNASSIGNED']).map((department) => (
              <span
                key={department}
                className="rounded-full px-3 py-1 text-[10px] font-mono font-bold tracking-[0.18em]"
                style={{
                  background: 'rgba(191,0,255,0.1)',
                  border: '1px solid rgba(191,0,255,0.25)',
                  color: '#d8b4fe',
                  boxShadow: '0 0 16px rgba(191,0,255,0.08)',
                }}
              >
                {department.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
           <motion.button 
             onClick={openCreateEmployeeModal}
             whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} 
             className="flex items-center gap-2 px-6 py-3 rounded-xl font-mono text-sm font-bold shadow-2xl relative overflow-hidden group transition-all" 
             style={{ 
               border: '1px solid rgba(191,0,255,0.4)', 
               background: 'linear-gradient(135deg, rgba(191,0,255,0.1), rgba(0,212,255,0.1))', 
               color: '#bf00ff',
               boxShadow: '0 0 30px rgba(191,0,255,0.15)'
             }}>
             <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
             <Plus size={16} style={{ filter: 'drop-shadow(0 0 5px #bf00ff)' }} /> {t('btn_add_emp')}
           </motion.button>
           
           <motion.button 
             onClick={() => navigate('/manager/create')} 
             whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} 
             className="flex items-center gap-2 px-6 py-3 rounded-xl font-mono text-sm font-bold shadow-2xl relative overflow-hidden group transition-all" 
             style={{ 
               background: 'linear-gradient(135deg, #00d4ff, #bf00ff)', 
               color: '#000', 
               boxShadow: '0 0 30px rgba(191,0,255,0.4)' 
             }}>
             <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
             <Zap size={16} /> {t('btn_deploy_task_caps')}
           </motion.button>
        </div>
      </div>

      {/* Navigation Sub-Header */}
      <div className="flex gap-2 mb-10 p-1 rounded-2xl border border-white/5 bg-black/20 w-full md:w-fit overflow-x-auto scrollbar-hide">
        {VIEW_TABS.map(tab => (
          <button 
            key={tab.id}
            onClick={() => handleViewTabChange(tab.id)}
            className={`relative px-6 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 group`}
          >
            {activeTab === tab.id && (
              <motion.div 
                layoutId="active-tab-glow" 
                className="absolute inset-0 rounded-xl" 
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }} 
              />
            )}
            <tab.icon size={14} className={activeTab === tab.id ? 'text-purple-400' : 'text-slate-500 group-hover:text-slate-300'} />
            <span className={`text-[10px] font-mono font-bold tracking-widest relative z-10 ${activeTab === tab.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
              {t(tab.label)}
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
        </motion.div>
      </AnimatePresence>



      {/* Create Task Modal */}
      <Modal isOpen={deployOpen} onClose={() => navigate('/manager')} title={t('title_deploy_directive')} size="md">
        <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-2 gap-5 px-1 py-2">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(0,212,255,0.7)' }}>{t('label_directive_desig')}</label>
            <input required value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-cyan-500/50 transition-colors rounded-xl placeholder:text-slate-700 shadow-inner" placeholder={t('ph_example_directive')} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(0,212,255,0.7)' }}>{t('label_parameters_opt')}</label>
            <textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-cyan-500/50 transition-colors rounded-xl placeholder:text-slate-700 shadow-inner min-h-[80px]" placeholder={t('ph_mission_details')} />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(0,212,255,0.7)' }}>// ASSIGN EMPLOYEE</label>
            <div className="relative" ref={employeeBoxRef}>
              <div
                className="flex w-full items-center rounded-xl border border-white/12 bg-[#030812] shadow-inner focus-within:border-cyan-500/40 transition-colors px-3 py-2.5"
              >
                <Search size={16} className="text-slate-600" />
                <input
                  type="text"
                  value={employeeSearch}
                  onFocus={() => setShowEmployeeSuggestions(true)}
                  onChange={(e) => {
                    setEmployeeSearch(e.target.value);
                    setShowEmployeeSuggestions(true);
                  }}
                  placeholder={t('ph_search_name_email')}
                  className="flex-1 bg-transparent text-white text-sm pl-3 focus:outline-none placeholder:text-slate-600"
                />
                <span className="text-xs font-mono text-slate-500">⌄</span>
              </div>

              {showEmployeeSuggestions && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-white/12 bg-[#050a14] shadow-2xl">
                  {assignableEmployees.length === 0 && (
                    <div className="px-4 py-3 text-xs font-mono text-slate-400">{t('msg_no_results')}</div>
                  )}
                  <ul className="max-h-56 overflow-y-auto divide-y divide-white/5">
                    {assignableEmployees.map((e) => (
                      <li
                        key={e._id}
                        onMouseDown={(evt) => evt.preventDefault()}
                        onClick={() => {
                          setTaskForm((f) => ({ ...f, assignedTo: e._id }));
                          setEmployeeSearch(`${e.name} (${e.email})`);
                          setShowEmployeeSuggestions(false);
                        }}
                        className={`px-4 py-3 text-sm text-slate-100 cursor-pointer hover:bg-white/5 ${
                          String(taskForm.assignedTo) === String(e._id) ? 'bg-purple-500/10 text-purple-200' : ''
                        }`}
                      >
                        <div className="font-semibold">{e.name}</div>
                        <div className="text-xs text-slate-400">{e.email}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-1">{t('label_department')}: {(e.department || []).join(', ')}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(0,212,255,0.7)' }}>{t('label_target_dept')}</label>
            <select required value={taskForm.department} onChange={e => setTaskForm(f => ({ ...f, department: e.target.value, assignedTo: '' }))} className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-cyan-500/50 transition-colors rounded-xl font-mono text-slate-300">
              {availableDepartments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(0,212,255,0.7)' }}>{t('label_start_cycle')}</label>
            <input required type="date" value={taskForm.startDate} onChange={e => setTaskForm(f => ({ ...f, startDate: e.target.value }))} className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-cyan-500/50 transition-colors rounded-xl font-mono text-slate-300" />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(0,212,255,0.7)' }}>{t('label_deadline_cycle')}</label>
            <input required type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-cyan-500/50 transition-colors rounded-xl font-mono text-slate-300" />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(0,212,255,0.7)' }}>{t('label_priority_level')}</label>
            <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))} className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-cyan-500/50 transition-colors rounded-xl font-mono text-slate-300">
              <option value="Low">{t('priority_low')}</option>
              <option value="Medium">{t('priority_medium')}</option>
              <option value="High">{t('priority_high')}</option>
            </select>
          </div>
          <div className="md:col-span-2 flex gap-4 pt-4 mt-2 border-t border-white/5">
            <button type="button" onClick={() => navigate('/manager')} className="flex-1 py-3 rounded-xl font-mono text-xs font-bold transition-all hover:bg-white/5 text-slate-400">{t('btn_abort')}</button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="flex-1 py-3 rounded-xl font-mono text-xs font-bold tracking-widest" style={{ background: 'linear-gradient(135deg, #00d4ff, #bf00ff)', color: '#000', boxShadow: '0 0 20px rgba(191,0,255,0.3)' }}>{t('btn_transmit_caps')}</motion.button>
          </div>
        </form>
      </Modal>

      {/* Create Employee Modal */}
      <Modal isOpen={createEmpOpen} onClose={() => setCreateEmpOpen(false)} title={t('title_create_emp')} size="sm">
        <form onSubmit={handleCreateEmployee} className="space-y-5 px-1 py-2">
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(191,0,255,0.7)' }}>{t('label_full_name_caps')}</label>
            <input required value={empForm.name} onChange={e => setEmpForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-purple-500/50 transition-colors rounded-xl placeholder:text-slate-700 shadow-inner" placeholder={t('ph_full_name')} />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(191,0,255,0.7)' }}>{t('label_email_caps')}</label>
            <input required type="email" value={empForm.email} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))} className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-purple-500/50 transition-colors rounded-xl placeholder:text-slate-700 shadow-inner" placeholder={t('ph_email')} />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(191,0,255,0.7)' }}>{t('label_password_caps')}</label>
            <input required type="password" minLength={6} value={empForm.password} onChange={e => setEmpForm(f => ({ ...f, password: e.target.value }))} className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-purple-500/50 transition-colors rounded-xl placeholder:text-slate-700 shadow-inner" placeholder={t('ph_min_6_char')} />
          </div>
          <div>
             <label className="block text-[10px] font-mono font-semibold mb-3 tracking-widest" style={{ color: 'rgba(191,0,255,0.7)' }}>{t('label_assign_dept_caps')}</label>
             <div className="flex flex-wrap gap-2">
                {availableDepartments.map(d => {
                   const isSelected = empForm.department === d.name;
                   return (
                     <button type="button" key={d.id} onClick={() => setEmpForm(f => ({ ...f, department: d.name }))} 
                       className="px-4 py-2 rounded-lg text-[10px] font-mono font-bold tracking-widest transition-all duration-300" 
                       style={{ 
                         background: isSelected ? 'rgba(191,0,255,0.1)' : 'rgba(255,255,255,0.02)',
                         border: `1px solid ${isSelected ? 'rgba(191,0,255,0.4)' : 'rgba(255,255,255,0.05)'}`,
                         color: isSelected ? '#bf00ff' : 'rgba(148,163,184,0.6)',
                         boxShadow: isSelected ? '0 0 15px rgba(191,0,255,0.15)' : 'none'
                       }}>
                       {d.name.toUpperCase()}
                     </button>
                   )
                })}
             </div>
             {!empForm.department && (
               <p className="text-[10px] font-mono mt-2 text-red-400/80 tracking-wider">⚠ {t('msg_select_dept_err')}</p>
             )}
          </div>
          <div className="flex gap-4 pt-4 mt-2 border-t border-white/5">
            <button type="button" onClick={() => setCreateEmpOpen(false)} className="flex-1 py-3 rounded-xl text-xs font-mono font-bold text-slate-400 hover:bg-white/5 transition-colors">{t('btn_cancel')}</button>
            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 py-3 rounded-xl text-xs font-mono font-bold tracking-widest shadow-[0_0_20px_rgba(191,0,255,0.3)] text-black" style={{ background: 'linear-gradient(135deg, #bf00ff, #00d4ff)' }}>{t('btn_create_emp_caps')}</motion.button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={transferOpen} onClose={closeTransferModal} title={t('title_tfr_directive')} size="md">
        <form onSubmit={handleTransferTask} className="space-y-5 px-1 py-2">
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-slate-500">{t('label_selected_task')}</p>
            <p className="mt-2 text-lg font-semibold text-white">{selectedTransferTask?.title || t('msg_select_task_queue')}</p>
            <p className="mt-2 text-sm text-slate-400">
              {selectedTransferTask
                ? `${t('task_department')}: ${selectedTransferTask.department} | ${t('task_status')}: ${selectedTransferTask.status}`
                : t('msg_tfr_instruction')}
            </p>
          </div>

          {transferableTasks.length === 0 && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100">
              {t('msg_no_tfr_ready')}
            </div>
          )}

          {transferableTasks.length > 0 && transferDepartments.length === 0 && (
            <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-100">
              {t('msg_no_mgr_avail')}
            </div>
          )}

          {!transferModalTask && (
            <div>
              <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(0,212,255,0.7)' }}>{t('label_choose_task')}</label>
              <select
                required
                disabled={transferableTasks.length === 0}
                value={transferForm.taskId}
                onChange={(e) => setTransferForm((current) => ({ ...current, taskId: e.target.value }))}
                className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-cyan-500/50 transition-colors rounded-xl font-mono text-slate-300"
              >
                <option value="">{t('ph_select_task')}</option>
                {transferableTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title} ({task.department})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(0,212,255,0.7)' }}>{t('label_target_dept')}</label>
            <select
              required
              disabled={transferDepartments.length === 0}
              value={transferForm.department}
              onChange={(e) => setTransferForm((current) => ({ ...current, department: e.target.value, managerId: '' }))}
              className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-cyan-500/50 transition-colors rounded-xl font-mono text-slate-300"
            >
              <option value="">{t('ph_select_dept')}</option>
              {transferDepartments.map((department) => (
                <option key={department.id} value={department.name}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest" style={{ color: 'rgba(0,212,255,0.7)' }}>{t('label_target_mgr')}</label>
            <select
              required
              disabled={transferManagerOptions.length === 0}
              value={transferForm.managerId}
              onChange={(e) => setTransferForm((current) => ({ ...current, managerId: e.target.value }))}
              className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-cyan-500/50 transition-colors rounded-xl font-mono text-slate-300"
            >
              <option value="">{t('ph_select_mgr')}</option>
              {transferManagerOptions.map((manager) => (
                <option key={manager._id} value={manager._id}>
                  {manager.name} ({manager.email})
                </option>
              ))}
            </select>
            {transferForm.department && transferManagerOptions.length === 0 && (
              <p className="mt-2 text-xs text-red-300">{t('msg_no_mgr_dept')}</p>
            )}
          </div>

          {selectedTransferManager && (
            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
              <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-purple-300/70">{t('label_receiving_mgr')}</p>
              <p className="mt-2 text-base font-semibold text-white">{selectedTransferManager.name}</p>
              <p className="mt-1 text-sm text-slate-400">{selectedTransferManager.email}</p>
              <p className="mt-2 text-xs text-slate-500">
                {t('label_depts_list')}: {(selectedTransferManager.department || []).join(', ') || t('msg_unassigned')}
              </p>
            </div>
          )}

          <div className="flex gap-4 pt-4 mt-2 border-t border-white/5">
            <button type="button" onClick={closeTransferModal} className="flex-1 py-3 rounded-xl text-xs font-mono font-bold text-slate-400 hover:bg-white/5 transition-colors">
              {t('btn_cancel')}
            </button>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={!selectedTransferTask || !transferForm.department || !transferForm.managerId || transferringTaskId === transferForm.taskId}
              className="flex-1 py-3 rounded-xl text-xs font-mono font-bold tracking-widest shadow-[0_0_20px_rgba(191,0,255,0.3)] text-black disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #bf00ff)' }}
            >
              {transferringTaskId === transferForm.taskId ? t('btn_transferring') : t('btn_transfer_caps')}
            </motion.button>
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

function ActivityIcon(props) {
  return <Zap {...props} />;
}
