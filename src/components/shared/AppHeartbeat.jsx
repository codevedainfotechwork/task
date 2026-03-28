import { useEffect } from 'react';
import { BASE_URL } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useTask } from '../../contexts/TaskContext';

const HEARTBEAT_MS = 20000;

export default function AppHeartbeat() {
  const { currentUser, refreshSession } = useAuth();
  const { refreshNotifications } = useNotification();
  const { refreshSettings } = useSettings();
  const { refreshTasks } = useTask();

  useEffect(() => {
    const isWorkspaceRoute = () => /^\/(employee|manager|admin)(\/|$)/.test(window.location.pathname);

    const pulse = async () => {
      try {
        await fetch(`${BASE_URL}/health`, { cache: 'no-store' });
      } catch {
        // Silent heartbeat failure: the app keeps running and will retry.
      }

      try {
        await refreshSettings();
      } catch {
        // Settings already logs failures internally.
      }

      if (currentUser) {
        try {
          await refreshSession?.();
        } catch {
          // Session refresh handles invalid tokens internally.
        }

        if (isWorkspaceRoute()) {
          try {
            await refreshTasks?.();
          } catch {
            // Task refresh handles failures internally.
          }

          try {
            await refreshNotifications?.({ allowPopup: false });
          } catch {
            // Notification refresh handles failures internally.
          }
        }
      }
    };

    void pulse();
    const intervalId = window.setInterval(pulse, HEARTBEAT_MS);

    return () => window.clearInterval(intervalId);
  }, [currentUser, refreshNotifications, refreshSettings, refreshSession, refreshTasks]);

  return null;
}
