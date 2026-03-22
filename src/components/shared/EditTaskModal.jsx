import { useState, useEffect, useRef, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Search, Save, X, AlertCircle } from 'lucide-react';
import { useTask } from '../../contexts/TaskContext';
import { useToast } from '../../contexts/ToastContext';
import Modal from './Modal';
import api from '../../api';
import { useLanguage } from '../../contexts/LanguageContext';

export default function EditTaskModal({ isOpen, onClose, task }) {
  const { updateTask } = useTask();
  const { addToast } = useToast();
  const { t } = useLanguage();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    priority: 'Medium',
    department: '',
    assignedTo: '',
    assigneeName: ''
  });

  const [departments, setDepartments] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    if (task && isOpen) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        dueDate: task.dueDate || format(new Date(), 'yyyy-MM-dd'),
        priority: task.priority || 'Medium',
        department: task.department || '',
        assignedTo: task.assignedTo || '',
        assigneeName: task.assigneeName || ''
      });
      setUserSearch(task.assigneeName || '');
      fetchDepartments();
      fetchAssignableUsers(task.department || '');
    }
  }, [task, isOpen]);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (err) {
      console.error('Failed to load departments');
    }
  };

  const fetchAssignableUsers = async (dept) => {
    try {
      const res = await api.get('/users');
      // Filter by department if needed, or allow all for admin
      // For now, let's fetch all and filter in useMemo
      setAssignableUsers(res.data);
    } catch (err) {
      console.error('Failed to load users');
    }
  };

  const filteredUsers = useMemo(() => {
    const term = userSearch.toLowerCase().trim();
    return assignableUsers.filter(u => 
      (u.isActive !== false) && 
      (u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)) &&
      (formData.department ? (u.department || []).includes(formData.department) : true)
    );
  }, [assignableUsers, userSearch, formData.department]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) {
      addToast(t('msg_title_required'), 'error');
      return;
    }
    if (!formData.assignedTo) {
      addToast(t('msg_assignee_required'), 'error');
      return;
    }

    console.log("Submitting Task Update. ID:", task.id, "Data:", formData);
    setSubmitting(true);
    try {
      await updateTask(task.id, formData);
      addToast(t('msg_task_updated'), 'success');
      onClose();
    } catch (err) {
      addToast(err.response?.data?.message || t('msg_failed_update'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!task) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('title_edit_directive')} size="sm">
      <form onSubmit={handleSubmit} className="space-y-5 px-1 py-1">
        {/* Title */}
        <div>
          <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-cyan-400">{t('label_directive_desig')}</label>
          <input
            required
            value={formData.title}
            onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
            className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-cyan-500/50 transition-colors rounded-xl shadow-inner placeholder:text-slate-700"
            placeholder={t('ph_sys_update')}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-cyan-400">{t('label_description')}</label>
          <textarea
            value={formData.description}
            onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
            className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-cyan-500/50 transition-colors rounded-xl shadow-inner placeholder:text-slate-700 h-24 resize-none"
            placeholder={t('ph_mission_details')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Priority */}
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-cyan-400">{t('label_priority')}</label>
            <select
              value={formData.priority}
              onChange={e => setFormData(f => ({ ...f, priority: e.target.value }))}
              className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-cyan-500/50 transition-colors rounded-xl appearance-none cursor-pointer"
            >
              <option value="Low">{t('priority_low')}</option>
              <option value="Medium">{t('priority_med')}</option>
              <option value="High">{t('priority_high')}</option>
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-cyan-400">{t('label_due_date')}</label>
            <input
              type="date"
              required
              value={formData.dueDate}
              onChange={e => setFormData(f => ({ ...f, dueDate: e.target.value }))}
              className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-cyan-500/50 transition-colors rounded-xl shadow-inner"
            />
          </div>
        </div>

        {/* Department */}
        <div>
          <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-cyan-400">{t('label_department')}</label>
          <select
            required
            value={formData.department}
            onChange={e => setFormData(f => ({ ...f, department: e.target.value, assignedTo: '', assigneeName: '' }))}
            className="w-full bg-[#030812] border border-white/10 text-white text-sm px-4 py-3 focus:outline-none focus:border-cyan-500/50 transition-colors rounded-xl appearance-none cursor-pointer"
          >
            <option value="" disabled>{t('ph_select_dept')}</option>
            {departments.map(d => (
              <option key={d.id} value={d.name}>{t(`dept_${d.name.toLowerCase()}`) || d.name.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Assignee Search */}
        <div className="relative" ref={suggestionsRef}>
          <label className="block text-[10px] font-mono font-semibold mb-2 tracking-widest text-cyan-400">{t('label_assign_to')}</label>
          <div className="relative flex items-center px-4 py-3 bg-[#030812] border border-white/10 rounded-xl focus-within:border-cyan-500/50 transition-colors">
            <Search size={16} className="text-slate-600 mr-2" />
            <input
              type="text"
              value={userSearch}
              onChange={e => {
                setUserSearch(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder={t('ph_search_user')}
              className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder:text-slate-700"
            />
          </div>
          
          {showSuggestions && (
            <div className="absolute z-50 w-full mt-2 bg-[#050a14] border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="px-4 py-3 text-xs text-slate-500">{t('msg_no_users')}</div>
              ) : (
                filteredUsers.map(u => (
                  <div
                    key={u._id}
                    onClick={() => {
                      setFormData(f => ({ ...f, assignedTo: u._id, assigneeName: u.name }));
                      setUserSearch(u.name);
                      setShowSuggestions(false);
                    }}
                    className="px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0"
                  >
                    <div className="text-sm font-semibold text-white">{u.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{u.email} • {u.role}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-xs font-mono font-bold text-slate-400 hover:bg-white/5 transition-colors"
          >
            {t('btn_cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-3 rounded-xl text-xs font-mono font-bold tracking-widest bg-cyan-500 text-black hover:bg-cyan-400 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {submitting ? t('btn_updating') : <><Save size={14} /> {t('btn_save')}</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}
