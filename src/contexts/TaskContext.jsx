import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useSound } from './SoundContext';
import api from '../api';

const TaskContext = createContext();

export function useTask() {
  return useContext(TaskContext);
}

export function TaskProvider({ children }) {
  const { currentUser } = useAuth();
  const { playTaskNotification, playCompletion, playDelete, playTransfer, playSuccess } = useSound();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch tasks on load if user is logged in
  useEffect(() => {
    if (currentUser) {
      fetchTasks();
    } else {
      setTasks([]);
      setLoading(false);
    }
  }, [currentUser]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tasks?t=${Date.now()}`);
      // Format _id to id for frontend compatibility
      const formatted = res.data.map(t => ({ ...t, id: t._id }));
      setTasks(formatted);
      return formatted;
    } catch (error) {
      if (error.response && error.response.status === 401) return; // Silent catch for old token
      console.error('Error fetching tasks:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (taskData) => {
    try {
      const res = await api.post('/tasks', taskData);
      const createdTask = res.data.task || res.data;
      const normalized = { ...createdTask, id: createdTask._id || createdTask.id };
      setTasks(prev => [normalized, ...prev]);
      playTaskNotification();
      return normalized;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  };

  const deleteTask = async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(prev => prev.filter(t => t.id !== id && t._id !== id));
      playDelete();
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  const editTask = async (id, updates) => {
    try {
      const res = await api.patch(`/tasks/${id}`, updates);
      const updatedTask = res.data.task || res.data;
      const previousTask = tasks.find((task) => String(task.id || task._id) === String(id));
      setTasks(prev => prev.map(t => t.id === id ? { ...updatedTask, id: updatedTask._id } : t));
      if (String(updatedTask.status || '').toLowerCase() === 'completed' && String(previousTask?.status || '').toLowerCase() !== 'completed') {
        playCompletion();
      } else {
        playSuccess();
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  };

  const updateTask = async (id, taskData) => {
    try {
      console.log("Updating Task ID:", id, "Data:", taskData);
      console.log("Token in localStorage:", localStorage.getItem('token') ? "Present" : "Missing");
      const res = await api.put(`/tasks/${id}`, taskData);
      const updatedTask = res.data.task || res.data;
      const previousTask = tasks.find((task) => String(task.id || task._id) === String(id));
      setTasks(prev => prev.map(t => t._id === id ? { ...updatedTask, id: updatedTask._id || updatedTask.id } : t));
      if (String(updatedTask.status || '').toLowerCase() === 'completed' && String(previousTask?.status || '').toLowerCase() !== 'completed') {
        playCompletion();
      } else {
        playSuccess();
      }
      return updatedTask;
    } catch (error) {
      console.error('Error updating task details:', error);
      throw error;
    }
  };

  const transferTask = async (taskId, newAssigneeId) => {
    return editTask(taskId, { assignedTo: newAssigneeId });
  };

  const transferTaskToManager = async (taskId, transferData) => {
    try {
      const res = await api.patch(`/tasks/${taskId}/transfer-manager`, transferData);
      await fetchTasks();
      playTransfer();
      return res.data.task || res.data;
    } catch (error) {
      console.error('Error transferring task to manager:', error);
      throw error;
    }
  };

  const respondToTransfer = async (taskId, action) => {
    try {
      const res = await api.post(`/tasks/${taskId}/transfer-response`, { action });
      await fetchTasks();
      playSuccess();
      return res.data;
    } catch (error) {
      console.error('Error responding to transfer:', error);
      throw error;
    }
  };

  const cancelTransfer = async (taskId) => {
    try {
      const res = await api.post(`/tasks/${taskId}/cancel-transfer`);
      await fetchTasks();
      playSuccess();
      return res.data;
    } catch (error) {
      console.error('Error canceling transfer:', error);
      throw error;
    }
  };

  const getAllTasks = () => tasks;
  
  const getTasksForUser = (role, userId, departments = []) => {
    if (!userId) return [];
    const uid = String(userId);
    if (role === 'admin') return tasks;
    if (role === 'manager') {
      const normalizedDepts = (departments || []).map(d => String(d).toLowerCase());
      return tasks.filter((task) => {
        const taskDept = String(task.department || '').toLowerCase();
        const isDepartmentMatch = normalizedDepts.includes(taskDept);
        const isAssignedToMe = String(task.assignedTo || '') === uid;
        const isTransferRecipient = String(task.transferredToManagerId || '') === uid;
        const isTransferSender = String(task.transferredFromManagerId || '') === uid;
        return isDepartmentMatch || isAssignedToMe || isTransferRecipient || isTransferSender;
      });
    }
    return tasks.filter(t => String(t.assignedTo) === uid || String(t.id) === uid || String(t._id) === uid);
  };

  const value = {
    tasks,
    loading,
    refreshTasks: fetchTasks,
    createTask,
    editTask,
    updateTask,
    deleteTask,
    transferTask,
    transferTaskToManager,
    respondToTransfer,
    cancelTransfer,
    getAllTasks,
    getTasksForUser,
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
}
