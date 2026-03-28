import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useTask } from './TaskContext';
import { useSound } from './SoundContext';
import { io } from 'socket.io-client';
import api, { BASE_URL } from '../api';
import TaskNotificationPopup from '../components/shared/TaskNotificationPopup';
import HelpRequestPopup from '../components/shared/HelpRequestPopup';

const NotificationContext = createContext();

function normalizeNotification(notification = {}) {
  const rawMessage = notification.message || '';
  const derivedTaskTitle = rawMessage.replace(/^New task assigned:\s*/i, '').trim();
  const transferMeta = notification.transferMeta || null;

  return {
    id: notification.id ?? notification._id,
    taskId: notification.taskId,
    helpRequestId: notification.helpRequestId || transferMeta?.requestId || null,
    title: notification.title || 'New Task Assigned',
    message: rawMessage,
    taskTitle: notification.taskTitle || derivedTaskTitle || rawMessage || 'Assigned task',
    description: notification.description || 'Open the task board to review the full assignment details.',
    dueDate: notification.dueDate || null,
    type: notification.type || 'task-assigned',
    transferMeta,
    isRead: Boolean(notification.isRead),
    createdAt: notification.createdAt,
  };
}

const TASK_REFRESH_NOTIFICATION_TYPES = new Set([
  'task-assigned',
  'task-transferred',
  'transfer-request',
  'transfer-response',
  'task-status-updated',
  'task-completion-submitted',
  'task-completion-review',
  'task-employee-comment',
]);

const HELPDESK_NOTIFICATION_TYPES = new Set([
  'help-request',
  'help-response',
]);

const PUSH_PERMISSION_KEY = 'taskflow:push-permission-asked';
const PUSH_ENABLED_KEY = 'taskflow:push-enabled';

function getSurfacedStorageKey(userId) {
  return `task-popup-surfaced:${userId}`;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function readInitialPushEnabled() {
  try {
    const stored = window.localStorage.getItem(PUSH_ENABLED_KEY);
    return stored === null ? true : stored !== 'false';
  } catch {
    return true;
  }
}

function getDashboardPath(role) {
  if (role === 'admin') {
    return '/admin/tasks';
  }

  if (role === 'manager') {
    return '/manager/my-tasks';
  }

  if (role === 'employee') {
    return '/employee';
  }

  return '/';
}

function buildNotificationTargetUrl(notification, role, options = {}) {
  const basePath = getDashboardPath(role);
  const params = new URLSearchParams();

  if (notification?.taskId) {
    params.set('taskId', String(notification.taskId));
  }

  if (notification?.id) {
    params.set('notificationId', String(notification.id));
  }

  if (options.markRead) {
    params.set('markRead', '1');
  }

  if (!params.toString()) {
    return basePath;
  }

  return `${basePath}?${params.toString()}`;
}

function getNotificationDisplayInfo(notification = {}) {
  const baseTitle = notification.title || 'TaskFlow';
  const taskTitle = notification.taskTitle || 'task';

  switch (notification.type) {
    case 'task-assigned':
      return {
        title: 'New Task Assigned',
        body: `You received "${taskTitle}".`,
      };
    case 'task-transferred':
      return {
        title: 'Task Transferred',
        body: `"${taskTitle}" was transferred to you.`,
      };
    case 'transfer-request':
      return {
        title: 'Transfer Request',
        body: `A transfer request is waiting for "${taskTitle}".`,
      };
    case 'transfer-response':
      return {
        title: 'Transfer Response',
        body: `A transfer was responded to for "${taskTitle}".`,
      };
    case 'task-status-updated':
      return {
        title: 'Task Updated',
        body: `The status of "${taskTitle}" changed.`,
      };
    case 'task-completion-submitted':
      return {
        title: 'Task Completion Submitted',
        body: `Completion was submitted for "${taskTitle}".`,
      };
    case 'task-completion-review':
      return {
        title: 'Task Completion Review',
        body: `A completion review is ready for "${taskTitle}".`,
      };
    case 'task-employee-comment':
      return {
        title: 'Task Comment',
        body: `A comment was added to "${taskTitle}".`,
      };
    case 'help-request':
      return {
        title: 'Help Request',
        body: notification.message || `Help is needed for "${taskTitle}".`,
      };
    case 'help-response':
      return {
        title: 'Help Response',
        body: notification.message || `A help response is ready for "${taskTitle}".`,
      };
    default:
      return {
        title: baseTitle,
        body: notification.message || notification.description || 'You have a new notification.',
      };
  }
}

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshTasks } = useTask();
  const { playForNotification } = useSound();
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);
  const [taskPopup, setTaskPopup] = useState(null);
  const [helpPopup, setHelpPopup] = useState(null);
  const [pushEnabled, setPushEnabled] = useState(readInitialPushEnabled);
  const knownNotificationIdsRef = useRef(new Set());
  const surfacedNotificationIdsRef = useRef(new Set());
  const hasHydratedNotificationsRef = useRef(false);
  const pushSubscriptionRef = useRef(null);
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
    } catch {
      // sessionStorage can be unavailable in hardened browser contexts
    }
  };

  const persistPushEnabled = (nextValue) => {
    try {
      window.localStorage.setItem(PUSH_ENABLED_KEY, String(nextValue));
    } catch {
      // ignore
    }
  };

  const canShowBrowserNotification = () =>
    pushEnabled &&
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted' &&
    document.visibilityState !== 'visible';

  const showBrowserNotification = (notification) => {
    if (!notification || !canShowBrowserNotification()) {
      return false;
    }

    const targetUrl = buildNotificationTargetUrl(notification, currentUser?.role);
    const { title, body } = getNotificationDisplayInfo(notification);

    try {
      const browserNotification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id ? `taskflow-${notification.id}` : undefined,
        renotify: true,
        data: {
          link: targetUrl,
          notificationId: notification.id || null,
          actions: [
            { action: 'open', title: 'Open Task' },
            { action: 'mark-read', title: 'Mark Read', link: buildNotificationTargetUrl(notification, currentUser?.role, { markRead: true }) },
          ],
        },
      });

      browserNotification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        navigate(targetUrl);
        browserNotification.close();

        if (notification.id && !notification.isRead) {
          void markNotificationRead(notification.id);
        }
      };

      return true;
    } catch (error) {
      console.error('Error showing browser notification:', error);
      return false;
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

    if (HELPDESK_NOTIFICATION_TYPES.has(notification.type)) {
      setHelpPopup(notification);
      return;
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
          ['task-assigned', 'task-transferred', 'transfer-request', 'transfer-response', 'task-status-updated', 'task-completion-submitted', 'task-completion-review', 'help-request', 'help-response'].includes(notification.type) &&
          !notification.isRead &&
          !knownNotificationIdsRef.current.has(notification.id) &&
          !surfacedNotificationIdsRef.current.has(notification.id)
      );

      if (unseenNotifications.length > 0) {
        playForNotification(unseenNotifications[0].type);

        const notifiedInBrowser = showBrowserNotification(unseenNotifications[0]);
        if (!notifiedInBrowser) {
          surfaceNotification(unseenNotifications[0]);
        }

        if (unseenNotifications.some((notification) => TASK_REFRESH_NOTIFICATION_TYPES.has(notification.type))) {
          refreshTasks();
        }
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

  useEffect(() => {
    if (!currentUser?._id || !isDashboardRoute) {
      return;
    }

    const searchParams = new URLSearchParams(location.search);
    const taskId = searchParams.get('taskId');
    const notificationId = searchParams.get('notificationId');
    const markRead = searchParams.get('markRead') === '1';

    if (!taskId && !notificationId) {
      return;
    }

    const matchedNotification = notifications.find((notification) => {
      if (notificationId && String(notification.id) === String(notificationId)) {
        return true;
      }

      if (taskId && String(notification.taskId) === String(taskId)) {
        return true;
      }

      return false;
    });

    if (matchedNotification) {
      openNotification(matchedNotification);
      if (markRead && matchedNotification.id && !matchedNotification.isRead) {
        void markNotificationRead(matchedNotification.id);
      }
    }
  }, [currentUser?._id, isDashboardRoute, location.search, notifications]);

  const closeTaskPopup = async () => {
    const popupToClose = taskPopup;
    setTaskPopup(null);

    if (popupToClose?.id && !popupToClose.isRead) {
      await markNotificationRead(popupToClose.id);
    }
  };

  const closeHelpPopup = async () => {
    const popupToClose = helpPopup;
    setHelpPopup(null);

    if (popupToClose?.id && !popupToClose.isRead) {
      await markNotificationRead(popupToClose.id);
    }
  };

  const unregisterPushSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration('/push-sw.js');
      const subscription = pushSubscriptionRef.current || (registration ? await registration.pushManager.getSubscription() : null);
      if (subscription) {
        await api.delete('/push/unsubscribe', { data: { endpoint: subscription.endpoint } });
        await subscription.unsubscribe();
      }
      pushSubscriptionRef.current = null;
    } catch (error) {
      console.error('Error disabling push notifications:', error);
    }
  };

  const registerPushSubscription = async (force = false) => {
    if (!pushEnabled && !force) {
      return;
    }

    if (!currentUser?._id || !isDashboardRoute) {
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'denied') {
      return;
    }

    let permission = Notification.permission;
    if (permission === 'default') {
      const askedBefore = (() => {
        try {
          return window.localStorage.getItem(PUSH_PERMISSION_KEY) === 'true';
        } catch {
          return false;
        }
      })();

      if (askedBefore) {
        return;
      }

      try {
        permission = await Notification.requestPermission();
        window.localStorage.setItem(PUSH_PERMISSION_KEY, 'true');
      } catch {
        return;
      }
    }

    if (permission !== 'granted') {
      return;
    }

    const registration = await navigator.serviceWorker.register('/push-sw.js');
    const existingSubscription = await registration.pushManager.getSubscription();
    let subscription = existingSubscription;

    if (!subscription) {
      const vapidResponse = await api.get('/push/vapid-public-key');
      const applicationServerKey = urlBase64ToUint8Array(vapidResponse.data.publicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    pushSubscriptionRef.current = subscription;
    await api.post('/push/subscribe', {
      subscription: subscription.toJSON(),
    });
  };

  const togglePushNotifications = async (nextValue) => {
    const enabled = typeof nextValue === 'boolean' ? nextValue : !pushEnabled;
    setPushEnabled(enabled);
    persistPushEnabled(enabled);

    if (enabled) {
      await registerPushSubscription(true);
      return;
    }

    await unregisterPushSubscription();
  };

  // Initialize socket and fetch notifications
  useEffect(() => {
    if (currentUser?._id) {
      try {
        const storedIds = JSON.parse(sessionStorage.getItem(getSurfacedStorageKey(currentUser._id)) || '[]');
        surfacedNotificationIdsRef.current = new Set(Array.isArray(storedIds) ? storedIds : []);
      } catch {
        surfacedNotificationIdsRef.current = new Set();
      }
    } else {
      surfacedNotificationIdsRef.current = new Set();
      hasHydratedNotificationsRef.current = false;
    }
  }, [currentUser?._id]);

  useEffect(() => {
    if (!currentUser?._id || !isDashboardRoute) {
      return undefined;
    }

    if (pushEnabled && 'Notification' in window && Notification.permission === 'granted') {
      void registerPushSubscription();
    }

    return undefined;
  }, [currentUser?._id, isDashboardRoute, pushEnabled]);

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
        playForNotification(incoming.type);

        const notifiedInBrowser = showBrowserNotification(incoming);
        if (!notifiedInBrowser) {
          surfaceNotification(incoming);
        }

        if (TASK_REFRESH_NOTIFICATION_TYPES.has(incoming.type)) {
          refreshTasks();
        }
      });

      newSocket.on('task-deleted', () => {
        refreshTasks();
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } else {
      setTaskPopup(null);
      setHelpPopup(null);
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
      } else {
        fetchNotifications({ allowPopup: true });
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
    refreshNotifications: fetchNotifications,
    pushEnabled,
    togglePushNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <TaskNotificationPopup notification={taskPopup} onClose={closeTaskPopup} onRefresh={refreshTasks} />
      <HelpRequestPopup notification={helpPopup} onClose={closeHelpPopup} />
    </NotificationContext.Provider>
  );
}
