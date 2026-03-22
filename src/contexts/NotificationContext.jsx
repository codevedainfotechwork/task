import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useTask } from './TaskContext';
import { io } from 'socket.io-client';
import api, { BASE_URL } from '../api';
import TaskNotificationPopup from '../components/shared/TaskNotificationPopup';

const NotificationContext = createContext();

function normalizeNotification(notification = {}) {
  const rawMessage = notification.message || '';
  const derivedTaskTitle = rawMessage.replace(/^New task assigned:\s*/i, '').trim();

  return {
    id: notification.id ?? notification._id,
    taskId: notification.taskId,
    title: notification.title || 'New Task Assigned',
    message: rawMessage,
    taskTitle: notification.taskTitle || derivedTaskTitle || rawMessage || 'Assigned task',
    description: notification.description || 'Open the task board to review the full assignment details.',
    dueDate: notification.dueDate || null,
    type: notification.type || 'task-assigned',
    transferMeta: notification.transferMeta || null,
    isRead: Boolean(notification.isRead),
    createdAt: notification.createdAt,
  };
}

function getSurfacedStorageKey(userId) {
  return `task-popup-surfaced:${userId}`;
}

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const { refreshTasks } = useTask();
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);
  const [taskPopup, setTaskPopup] = useState(null);
  const knownNotificationIdsRef = useRef(new Set());
  const surfacedNotificationIdsRef = useRef(new Set());
  const hasHydratedNotificationsRef = useRef(false);
  const isDashboardRoute = /^\/(employee|manager|admin)(\/|$)/.test(location.pathname);

  const rememberNotificationIds = (items = []) => {
    knownNotificationIdsRef.current = new Set(items.map((item) => item.id).filter(Boolean));
  };

  const persistSurfacedIds = (idsSet = surfacedNotificationIdsRef.current) => {
    if (!currentUser?._id) {
      return;
    }

    try {
      sessionStorage.setItem(getSurfacedStorageKey(currentUser._id), JSON.stringify(Array.from(idsSet)));
    } catch (_) {
      // sessionStorage can be unavailable in hardened browser contexts
    }
  };

  const markNotificationRead = async (notificationId) => {
    if (!notificationId) {
      return;
    }

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId ? { ...notification, isRead: true } : notification
      )
    );

    try {
      await api.patch(`/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const surfaceNotification = (notification) => {
    if (!notification) {
      return;
    }

    if (notification.id) {
      const nextSurfacedIds = new Set(surfacedNotificationIdsRef.current);
      nextSurfacedIds.add(notification.id);
      surfacedNotificationIdsRef.current = nextSurfacedIds;
      persistSurfacedIds(nextSurfacedIds);
    }

    setTaskPopup(notification);
  };

  const syncNotifications = (incomingNotifications = [], { allowPopup = false, allowInitialPopup = false } = {}) => {
    const normalized = incomingNotifications.map(normalizeNotification);
    setNotifications(normalized);

    const shouldSurfacePopup = hasHydratedNotificationsRef.current ? allowPopup : allowInitialPopup;

    if (shouldSurfacePopup) {
      const unseenNotifications = normalized.filter(
        (notification) =>
          notification.id &&
          ['task-assigned', 'task-transferred', 'transfer-request', 'transfer-response'].includes(notification.type) &&
          !notification.isRead &&
          !knownNotificationIdsRef.current.has(notification.id) &&
          !surfacedNotificationIdsRef.current.has(notification.id)
      );

      if (unseenNotifications.length > 0) {
        surfaceNotification(unseenNotifications[0]);
      }
    }

    rememberNotificationIds(normalized);
    hasHydratedNotificationsRef.current = true;
  };

  const openNotification = (notification) => {
    if (!notification) {
      return;
    }

    surfaceNotification(notification);
  };

  const closeTaskPopup = async () => {
    const popupToClose = taskPopup;
    setTaskPopup(null);

    if (popupToClose?.id && !popupToClose.isRead) {
      await markNotificationRead(popupToClose.id);
    }
  };

  // Initialize socket and fetch notifications
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (currentUser?._id) {
      try {
        const storedIds = JSON.parse(sessionStorage.getItem(getSurfacedStorageKey(currentUser._id)) || '[]');
        surfacedNotificationIdsRef.current = new Set(Array.isArray(storedIds) ? storedIds : []);
      } catch (_) {
        surfacedNotificationIdsRef.current = new Set();
      }
    } else {
      surfacedNotificationIdsRef.current = new Set();
      hasHydratedNotificationsRef.current = false;
    }
  }, [currentUser?._id]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (currentUser && token && isDashboardRoute) {
      // 1. Fetch initial notifications
      fetchNotifications({ allowInitialPopup: true });

      // 2. Connect Socket.io to dynamic host
      const newSocket = io(BASE_URL, {
        auth: { token },
        transports: ['polling', 'websocket'],
        tryAllTransports: true,
        upgrade: true,
        reconnection: true,
      });

      newSocket.on('connect', () => console.log('Socket.io connected'));
      newSocket.on('connect_error', (error) => {
        console.error('Socket.io connection error:', error?.message || error);
      });
      newSocket.io.on('reconnect', () => {
        fetchNotifications({ allowPopup: true });
      });

      newSocket.on('new-task', (notif) => {
        const incoming = normalizeNotification({
          ...notif,
          isRead: false,
        });

        setNotifications((prev) => [incoming, ...prev.filter((item) => item.id !== incoming.id)]);
        if (incoming.id) {
          knownNotificationIdsRef.current.add(incoming.id);
        }
        surfaceNotification(incoming);
        refreshTasks();
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } else {
      setTaskPopup(null);
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }

      if (!currentUser) {
        setNotifications([]);
        knownNotificationIdsRef.current = new Set();
        surfacedNotificationIdsRef.current = new Set();
        hasHydratedNotificationsRef.current = false;
      }
    }
  }, [currentUser, isDashboardRoute]);

  useEffect(() => {
    if (!currentUser || !isDashboardRoute) {
      return undefined;
    }

    const syncFromServer = () => {
      fetchNotifications({ allowPopup: true });
    };

    const intervalId = window.setInterval(syncFromServer, 3000);
    const handleFocus = () => syncFromServer();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncFromServer();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, isDashboardRoute]);

  const fetchNotifications = async ({ allowPopup = false, allowInitialPopup = false } = {}) => {
    try {
      const res = await api.get(`/notifications?t=${Date.now()}`);
      syncNotifications(res.data, { allowPopup, allowInitialPopup });
    } catch (error) {
      if (error.response && error.response.status === 401) return; // Silent catch for old token
      console.error('Error fetching notifications:', error);
    }
  };

  const markAllRead = async () => {
    if (notifications.every(n => n.isRead)) return;
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all read:', error);
    }
  };

  // derived state
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const value = {
    notifications,
    unreadCount,
    markAllRead,
    openNotification,
    refreshNotifications: fetchNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <TaskNotificationPopup notification={taskPopup} onClose={closeTaskPopup} />
    </NotificationContext.Provider>
  );
}
