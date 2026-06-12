// ================================================================
// notificationService.ts — Notificaciones locales (expo-notifications)
//
// En Expo Go las notificaciones están deshabilitadas (el módulo ni
// se carga — ver utils/notificationsModule.ts). En el APK final o
// dev build funcionan completas.
// ================================================================

import { Platform, AppState, AppStateStatus, NativeEventSubscription } from 'react-native';
import { Notifications, isExpoGo } from '../utils/notificationsModule';
import { NOTIFICATION_CHANNEL_HIGH, NOTIFICATION_CHANNEL_DEFAULT } from '../utils/constants';
import { NotificationPayload } from '../types';

type NotificationCallback = (notification: any) => void;

// Mostrar notificaciones también con la app en foreground
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

class NotificationService {
  private callbacks: NotificationCallback[] = [];
  private appState: AppStateStatus = AppState.currentState;
  private appStateSubscription: NativeEventSubscription | null = null;
  private receivedSubscription: { remove: () => void } | null = null;
  private responseSubscription: { remove: () => void } | null = null;
  private channelsReady = false;

  constructor() {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    if (Notifications) {
      // Notificación recibida con app abierta
      this.receivedSubscription = Notifications.addNotificationReceivedListener(
        (notification) => {
          this.callbacks.forEach((cb) => cb(notification));
        },
      );

      // Usuario tocó la notificación
      this.responseSubscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          this.callbacks.forEach((cb) => cb(response.notification));
        },
      );
    }
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    this.appState = nextAppState;
  };

  private async ensureChannels(): Promise<void> {
    if (this.channelsReady || !Notifications || Platform.OS !== 'android') {
      this.channelsReady = true;
      return;
    }

    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_HIGH, {
      name: 'Alarmas Medicamentos',
      description: 'Notificaciones de alarmas de medicamentos',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_DEFAULT, {
      name: 'Mensajes',
      description: 'Mensajes generales de la app',
      importance: Notifications.AndroidImportance.DEFAULT,
    });

    this.channelsReady = true;
  }

  async requestPermissions(): Promise<boolean> {
    if (!Notifications) {
      if (isExpoGo) {
        console.log('🔕 Permisos de notificación omitidos (Expo Go)');
      }
      return false;
    }

    try {
      await this.ensureChannels();

      const settings = await Notifications.getPermissionsAsync();
      if (settings.granted) return true;

      const result = await Notifications.requestPermissionsAsync();
      return result.granted;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  async showLocalNotification(payload: NotificationPayload & { id?: string }): Promise<void> {
    if (!Notifications) return;

    await this.ensureChannels();
    await Notifications.scheduleNotificationAsync({
      identifier: payload.id || String(Date.now()),
      content: {
        title: payload.title,
        body: payload.body,
        sound: payload.playSound === false ? undefined : 'default',
        data: payload.data ?? {},
      },
      trigger: null, // inmediata
    });
  }

  async scheduleLocalNotification(
    title: string,
    message: string,
    delayInSeconds: number,
    payload?: Record<string, any>,
  ): Promise<void> {
    if (!Notifications) return;

    await this.ensureChannels();
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: message,
        sound: 'default',
        data: payload ?? {},
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, delayInSeconds),
      },
    });
  }

  registerNotificationCallback(callback: NotificationCallback): void {
    this.callbacks.push(callback);
  }

  unregisterNotificationCallback(callback: NotificationCallback): void {
    this.callbacks = this.callbacks.filter((cb) => cb !== callback);
  }

  async cancelAllNotifications(): Promise<void> {
    if (!Notifications) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
  }

  async cancelNotification(id: string): Promise<void> {
    if (!Notifications) return;
    await Notifications.cancelScheduledNotificationAsync(id);
  }

  isAppInForeground(): boolean {
    return this.appState === 'active';
  }

  destroy(): void {
    this.appStateSubscription?.remove();
    this.receivedSubscription?.remove();
    this.responseSubscription?.remove();
    this.callbacks = [];
  }
}

export default new NotificationService();
