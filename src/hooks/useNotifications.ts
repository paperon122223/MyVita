import { useEffect, useState, useCallback } from 'react';
import notificationService from '../services/notificationService';
import { NotificationPayload } from '../types';

type NotificationHandler = (notification: any) => void;

interface UseNotificationsResult {
  initialized: boolean;
  permissionsGranted: boolean;
  error: string | null;
  showNotification: (payload: NotificationPayload) => void;
  scheduleNotification: (
    title: string,
    message: string,
    delayInSeconds: number,
  ) => void;
  onNotification: (handler: NotificationHandler) => () => void;
  cancelNotification: (id: string) => void;
  cancelAll: () => void;
}

export const useNotifications = (): UseNotificationsResult => {
  const [initialized, setInitialized] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Request permissions and initialize on mount
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        setError(null);
        const granted = await notificationService.requestPermissions();
        setPermissionsGranted(granted);
        setInitialized(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize notifications';
        setError(message);
        setInitialized(true);
      }
    };

    initializeNotifications();

    return () => {
      notificationService.destroy();
    };
  }, []);

  const showNotification = useCallback((payload: NotificationPayload) => {
    try {
      notificationService.showLocalNotification(payload);
    } catch (err) {
      console.error('Error showing notification:', err);
      setError(err instanceof Error ? err.message : 'Failed to show notification');
    }
  }, []);

  const scheduleNotification = useCallback(
    (title: string, message: string, delayInSeconds: number) => {
      try {
        notificationService.scheduleLocalNotification(title, message, delayInSeconds);
      } catch (err) {
        console.error('Error scheduling notification:', err);
        setError(err instanceof Error ? err.message : 'Failed to schedule notification');
      }
    },
    [],
  );

  const onNotification = useCallback((handler: NotificationHandler) => {
    notificationService.registerNotificationCallback(handler);
    return () => {
      notificationService.unregisterNotificationCallback(handler);
    };
  }, []);

  const cancelNotification = useCallback((id: string) => {
    try {
      notificationService.cancelNotification(id);
    } catch (err) {
      console.error('Error canceling notification:', err);
    }
  }, []);

  const cancelAll = useCallback(() => {
    try {
      notificationService.cancelAllNotifications();
    } catch (err) {
      console.error('Error canceling all notifications:', err);
    }
  }, []);

  return {
    initialized,
    permissionsGranted,
    error,
    showNotification,
    scheduleNotification,
    onNotification,
    cancelNotification,
    cancelAll,
  };
};

// Hook for handling notification taps
export const useNotificationHandler = (callback: NotificationHandler) => {
  const { onNotification } = useNotifications();

  useEffect(() => {
    const unsubscribe = onNotification(callback);
    return unsubscribe;
  }, [callback, onNotification]);
};
