// ================================================================
// notificationService.ts — Notificaciones locales (expo-notifications)
//
// - Canal de alarmas con prioridad MAX (variante sin vibración)
// - Categoría con botones de acción: "✓ Ya lo tomé" / "⏰ En 10 min"
//   que funcionan sin abrir la app
// - Preferencias de sonido/vibración persistidas en AsyncStorage
//
// En Expo Go las notificaciones están deshabilitadas (el módulo ni
// se carga — ver utils/notificationsModule.ts).
// ================================================================

import { Platform, AppState, AppStateStatus, NativeEventSubscription } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Notifications, isExpoGo } from '../utils/notificationsModule';
import {
  NOTIFICATION_CHANNEL_HIGH,
  NOTIFICATION_CHANNEL_DEFAULT,
  STORAGE_KEYS,
} from '../utils/constants';
import { NotificationPayload } from '../types';
import DatabaseService from './database';

type NotificationCallback = (notification: any) => void;

const CHANNEL_ALARMAS = 'myvita-alarmas';
const CHANNEL_ALARMAS_SIN_VIBRAR = 'myvita-alarmas-sv';
const CATEGORIA_ALARMA = 'alarma-medicamento';
const ACCION_TOMAR = 'TOMAR';
const ACCION_POSPONER = 'POSPONER';

export interface NotifPrefs {
  sonido: boolean;
  vibrar: boolean;
}

interface AlarmaNotif {
  id: string;
  usuarioId: string;
  medicamentoNombre: string;
  dosis?: string;
}

interface AlarmaProgramada {
  alarma: AlarmaNotif;
  fecha: Date;
}

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
  private setupReady = false;

  constructor() {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    if (Notifications) {
      // Notificación recibida con app abierta
      this.receivedSubscription = Notifications.addNotificationReceivedListener(
        (notification) => {
          this.callbacks.forEach((cb) => cb(notification));
        },
      );

      // Usuario tocó la notificación o uno de sus botones de acción
      this.responseSubscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          this.handleResponse(response).catch((e) =>
            console.warn('Error manejando acción de notificación:', e),
          );
          this.callbacks.forEach((cb) => cb(response.notification));
        },
      );
    }
  }

  /** Manejar botones de acción de la notificación de alarma */
  private async handleResponse(response: any): Promise<void> {
    if (!Notifications) return;

    const data = response?.notification?.request?.content?.data ?? {};
    const alarmaId: string | undefined = data.alarmaId;
    if (!alarmaId) return;

    if (response.actionIdentifier === ACCION_TOMAR) {
      // Marcar como tomada directo desde la notificación
      await DatabaseService.init();
      await DatabaseService.marcarAlamaComoTomada(alarmaId);
      await Notifications.dismissNotificationAsync(response.notification.request.identifier);
      console.log('✅ Toma confirmada desde la notificación:', alarmaId);
    } else if (response.actionIdentifier === ACCION_POSPONER) {
      // Re-programar la misma notificación dentro de 10 minutos
      const contenido = response.notification.request.content;
      await Notifications.dismissNotificationAsync(response.notification.request.identifier);
      await Notifications.scheduleNotificationAsync({
        identifier: `snooze_${alarmaId}_${Date.now()}`,
        content: {
          title: contenido.title ?? '💊 Recordatorio',
          body: contenido.body ?? 'Es hora de tomar tu medicamento',
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          categoryIdentifier: CATEGORIA_ALARMA,
          data,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 600,
          channelId: await this.canalSegunPrefs(),
        } as any,
      });
      console.log('⏰ Alarma pospuesta 10 minutos:', alarmaId);
    }
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    this.appState = nextAppState;
  };

  // ── Preferencias de notificación ────────────────────────────────
  async getPrefs(): Promise<NotifPrefs> {
    try {
      const [sonido, vibrar] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.NOTIF_SOUND),
        AsyncStorage.getItem(STORAGE_KEYS.NOTIF_VIBRATE),
      ]);
      return {
        sonido: sonido !== 'false',
        vibrar: vibrar !== 'false',
      };
    } catch {
      return { sonido: true, vibrar: true };
    }
  }

  async setPrefs(prefs: Partial<NotifPrefs>): Promise<void> {
    if (prefs.sonido !== undefined) {
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIF_SOUND, String(prefs.sonido));
    }
    if (prefs.vibrar !== undefined) {
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIF_VIBRATE, String(prefs.vibrar));
    }
  }

  /** En Android la vibración es por canal: elegir según preferencia */
  private async canalSegunPrefs(): Promise<string> {
    const prefs = await this.getPrefs();
    return prefs.vibrar ? CHANNEL_ALARMAS : CHANNEL_ALARMAS_SIN_VIBRAR;
  }

  // ── Setup: canales + categoría con acciones ─────────────────────
  private async ensureSetup(): Promise<void> {
    if (this.setupReady || !Notifications) {
      this.setupReady = true;
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ALARMAS, {
        name: 'Alarmas de Medicamentos',
        description: 'Recordatorios de toma de medicamentos',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        sound: 'default',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });

      await Notifications.setNotificationChannelAsync(CHANNEL_ALARMAS_SIN_VIBRAR, {
        name: 'Alarmas (sin vibración)',
        description: 'Recordatorios de toma sin vibración',
        importance: Notifications.AndroidImportance.MAX,
        enableVibrate: false,
        sound: 'default',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

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
    }

    // Botones de acción en la notificación de alarma
    await Notifications.setNotificationCategoryAsync(CATEGORIA_ALARMA, [
      {
        identifier: ACCION_TOMAR,
        buttonTitle: '✓ Ya lo tomé',
        options: { opensAppToForeground: false },
      },
      {
        identifier: ACCION_POSPONER,
        buttonTitle: '⏰ En 10 min',
        options: { opensAppToForeground: false },
      },
    ]);

    this.setupReady = true;
  }

  async requestPermissions(): Promise<boolean> {
    if (!Notifications) {
      if (isExpoGo) {
        console.log('🔕 Permisos de notificación omitidos (Expo Go)');
      }
      return false;
    }

    try {
      await this.ensureSetup();

      const settings = await Notifications.getPermissionsAsync();
      if (settings.granted) return true;

      const result = await Notifications.requestPermissionsAsync();
      return result.granted;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // ── Notificaciones de alarma (usadas por alarmService) ──────────

  private contenidoAlarma(alarma: AlarmaNotif, sonido: boolean): any {
    return {
      title: `💊 ${alarma.medicamentoNombre || 'Medicamento'}`,
      body: `Es hora de tomar: ${alarma.medicamentoNombre}${
        alarma.dosis ? ' (' + alarma.dosis + ')' : ''
      }`,
      sound: sonido ? 'default' : undefined,
      priority: Notifications!.AndroidNotificationPriority.MAX,
      categoryIdentifier: CATEGORIA_ALARMA,
      data: {
        alarmaId: alarma.id,
        usuarioId: alarma.usuarioId,
        medicamentoNombre: alarma.medicamentoNombre,
      },
    };
  }

  /** Notificación de alarma inmediata */
  async mostrarNotificacionAlarma(alarma: AlarmaNotif): Promise<void> {
    if (!Notifications) return;
    await this.ensureSetup();
    const prefs = await this.getPrefs();

    await Notifications.scheduleNotificationAsync({
      identifier: alarma.id,
      content: this.contenidoAlarma(alarma, prefs.sonido),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        channelId: await this.canalSegunPrefs(),
      } as any,
    });
  }

  /** Notificación de alarma programada para una fecha exacta */
  async programarNotificacionAlarma(alarma: AlarmaNotif, fecha: Date): Promise<void> {
    if (!Notifications) return;
    await this.ensureSetup();
    const prefs = await this.getPrefs();

    const identifier = `scheduled_${alarma.id}`;
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: this.contenidoAlarma(alarma, prefs.sonido),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fecha,
        channelId: await this.canalSegunPrefs(),
      } as any,
    });
  }

  /** Programa en lote las instancias futuras sin recalcular preferencias por cada una. */
  async programarNotificacionesAlarmas(items: AlarmaProgramada[]): Promise<void> {
    if (!Notifications) return;
    const notifications = Notifications;
    await this.ensureSetup();
    const prefs = await this.getPrefs();
    const channelId = await this.canalSegunPrefs();

    // Quitar instancias que fueron eliminadas, tomadas o silenciadas desde
    // la última reconciliación, sin tocar recordatorios genéricos ni snoozes.
    const desiredIds = new Set(items.map(({ alarma }) => `scheduled_${alarma.id}`));
    const scheduled = await notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .map((request) => request.identifier)
        .filter((identifier) => identifier.startsWith('scheduled_') && !desiredIds.has(identifier))
        .map((identifier) =>
          notifications.cancelScheduledNotificationAsync(identifier).catch(() => {}),
        ),
    );

    await Promise.all(
      items.map(async ({ alarma, fecha }) => {
        const identifier = `scheduled_${alarma.id}`;
        await notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
        await notifications.scheduleNotificationAsync({
          identifier,
          content: this.contenidoAlarma(alarma, prefs.sonido),
          trigger: {
            type: notifications.SchedulableTriggerInputTypes.DATE,
            date: fecha,
            channelId,
          } as any,
        });
      }),
    );
  }

  /** Cancelar las notificaciones (inmediata + programada) de una alarma */
  async cancelarNotificacionAlarma(alarmaId: string): Promise<void> {
    if (!Notifications) return;
    await Notifications.cancelScheduledNotificationAsync(alarmaId).catch(() => {});
    await Notifications.cancelScheduledNotificationAsync(`scheduled_${alarmaId}`).catch(() => {});
    await Notifications.dismissNotificationAsync(alarmaId).catch(() => {});
  }

  /** Notificación de prueba (Config → Notificaciones) */
  async enviarNotificacionPrueba(): Promise<boolean> {
    if (!Notifications) return false;
    await this.ensureSetup();
    const prefs = await this.getPrefs();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 MyVita — Notificación de prueba',
        body: 'Así se verán tus recordatorios de medicamentos ✅',
        sound: prefs.sonido ? 'default' : undefined,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        channelId: await this.canalSegunPrefs(),
      } as any,
    });
    return true;
  }

  // ── API genérica ────────────────────────────────────────────────

  async showLocalNotification(payload: NotificationPayload & { id?: string }): Promise<void> {
    if (!Notifications) return;

    await this.ensureSetup();
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

    await this.ensureSetup();
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
