import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../api';

const TaskContext = createContext();

export function useTask() {
  return useContext(TaskContext);
}

export function TaskProvider({ children }) {
  const { currentUser } = useAuth();
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
      setTasks(prev => [{ ...createdTask, id: createdTask._id }, ...prev]);
      return createdTask;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  };

  const editTask = async (id, updates) => {
    try {
      const res = await api.patch(`/tasks/${id}`, updates);
      const updatedTask = res.data.task || res.data;
      setTasks(prev => prev.map(t => t.id === id ? { ...updatedTask, id: updatedTask._id } : t));
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
      setTasks(prev => prev.map(t => t._id === id ? { ...updatedTask, id: updatedTask._id || updatedTask.id } : t));
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
      return res.data.task || res.data;
    } catch (error) {
      console.error('Error transferring task to manager:', error);
      throw error;
    }
  };

  const getAllTasks = () => tasks;
  
  const getTasksForUser = (role, userId, departments) => {
    if (role === 'admin') return tasks;
    if (role === 'manager') return tasks.filter(t => departments.includes(t.department));
    return tasks.filter(t => t.assignedTo === userId);
  };

  const value = {
    tasks,
    loading,
    refreshTasks: fetchTasks,
    createTask,
    editTask,
    updateTask,
    transferTask,
    transferTaskToManager,
    getAllTasks,
    getTasksForUser,
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
}
