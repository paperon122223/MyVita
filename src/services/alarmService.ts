// ================================================================
// alarmService.ts — Sistema de Alarmas (CRÍTICO)
// Migrado de alarm.js (1109 líneas)
// Maneja: persistencia, notificaciones (expo-notifications), sincronización
// ================================================================

import { Alert, AppState, AppStateStatus, NativeEventSubscription, Platform } from 'react-native';
import { Notifications } from '../utils/notificationsModule';
import DatabaseService from './database';

export interface Alarma {
  id: string;
  usuarioId: string;
  medicamentoId?: string;
  medicamentoNombre: string;
  dosis?: string;
  horaToma: string;
  hora: string; // alias de horaToma para las pantallas
  fecha: string;
  tono?: string;
  volumen?: number;
  estaActiva: number;
  recordatorioSilenciado: number;
  tomado: number;
  createdAt: string;
  updatedAt: string;
}

const CHANNEL_ID = 'myvita-alarmas';

/** Mapear fila snake_case de SQLite al modelo del servicio */
function mapRow(row: any): Alarma {
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    medicamentoId: row.medicamento_id ?? undefined,
    medicamentoNombre: row.medicamento_nombre ?? '',
    dosis: row.dosis ?? undefined,
    horaToma: row.hora_toma,
    hora: row.hora_toma,
    fecha: row.fecha,
    tono: row.tono ?? undefined,
    volumen: row.volumen ?? 80,
    estaActiva: row.esta_activa ?? 1,
    recordatorioSilenciado: row.recordatorio_silenciado ?? 0,
    tomado: row.tomado ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class AlarmService {
  private alarmas: Alarma[] = [];
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private watchdogInterval: ReturnType<typeof setInterval> | null = null;
  private appStateSubscription: NativeEventSubscription | null = null;
  private usuarioId: string | null = null;
  private notifiedIds = new Set<string>();

  /**
   * Inicializar servicio
   */
  async init(usuarioId: string): Promise<void> {
    this.usuarioId = usuarioId;

    try {
      // Cargar alarmas desde BD
      await this.cargarAlarmasDelDia();

      // Configurar canal de notificaciones (Android)
      await this.configurarNotificaciones();

      // Iniciar monitor de alarmas
      this.iniciarMonitor();

      // Escuchar cambios de estado de app
      this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

      // Iniciar watchdog (re-sincroniza cada minuto)
      this.iniciarWatchdog();

      console.log('✅ AlarmService inicializado');
    } catch (error) {
      console.error('❌ Error inicializando AlarmService:', error);
      throw error;
    }
  }

  /**
   * Cargar alarmas del día desde BD
   */
  private async cargarAlarmasDelDia(): Promise<void> {
    if (!this.usuarioId) return;

    const hoy = new Date().toISOString().split('T')[0];
    const rows = await DatabaseService.getAlarmasDelDia(this.usuarioId, hoy);
    this.alarmas = rows.map(mapRow);
    console.log(`📋 ${this.alarmas.length} alarmas cargadas para hoy`);
  }

  /**
   * Configurar canal de notificaciones (Android)
   */
  private async configurarNotificaciones(): Promise<void> {
    if (Notifications && Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'MyVita Alarmas',
        description: 'Notificaciones de toma de medicamentos',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        sound: 'default',
      });
    }
  }

  /**
   * Iniciar monitor de alarmas
   */
  private iniciarMonitor(): void {
    if (this.checkInterval) clearInterval(this.checkInterval);

    // Verificar cada 30 segundos (crítico para reliability)
    this.checkInterval = setInterval(() => {
      this.verificarAlarmas();
    }, 30000);

    // Primera verificación inmediata
    this.verificarAlarmas();
  }

  /**
   * Verificar si alguna alarma debe sonar
   */
  private async verificarAlarmas(): Promise<void> {
    const ahora = new Date();

    for (const alarma of this.alarmas) {
      const [h, m] = alarma.horaToma.split(':').map(Number);
      const minutosAlarma = h * 60 + m;
      const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
      const diferencia = Math.abs(minutosActuales - minutosAlarma);

      // Condiciones: dentro de ±2 min, activa, no silenciada, no tomada,
      // y no notificada ya en esta sesión
      if (
        diferencia <= 2 &&
        alarma.estaActiva === 1 &&
        alarma.recordatorioSilenciado === 0 &&
        alarma.tomado === 0 &&
        !this.notifiedIds.has(alarma.id)
      ) {
        this.notifiedIds.add(alarma.id);
        await this.sonarAlarma(alarma);
      }
    }
  }

  /**
   * Sonar alarma (notificación inmediata)
   */
  private async sonarAlarma(alarma: Alarma): Promise<void> {
    console.log(`🔔 ¡Alarma! ${alarma.medicamentoNombre} a las ${alarma.horaToma}`);

    try {
      if (Notifications) {
        await Notifications.scheduleNotificationAsync({
          identifier: alarma.id,
          content: {
            title: `💊 ${alarma.medicamentoNombre || 'Medicamento'}`,
            body: `Es hora de tomar: ${alarma.medicamentoNombre}${alarma.dosis ? ' (' + alarma.dosis + ')' : ''}`,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: {
              alarmaId: alarma.id,
              usuarioId: alarma.usuarioId,
              medicamentoNombre: alarma.medicamentoNombre,
            },
          },
          trigger: null, // inmediata
        });
      } else {
        // Expo Go: sin notificaciones nativas → alerta dentro de la app
        Alert.alert(
          `💊 ${alarma.medicamentoNombre || 'Medicamento'}`,
          `Es hora de tomar: ${alarma.medicamentoNombre}${alarma.dosis ? ' (' + alarma.dosis + ')' : ''}`,
        );
      }

      // Registrar intento en BD para auditoría
      await DatabaseService.ejecutar(`UPDATE alarmas SET updated_at = ? WHERE id = ?`, [
        new Date().toISOString(),
        alarma.id,
      ]);
    } catch (error) {
      console.error('❌ Error sonando alarma:', error);
    }
  }

  /**
   * Marcar alarma como tomada
   */
  async marcarComoTomada(alarmaId: string): Promise<void> {
    try {
      await DatabaseService.marcarAlamaComoTomada(alarmaId);

      const alarma = this.alarmas.find((a) => a.id === alarmaId);
      if (alarma) {
        alarma.tomado = 1;
      }

      console.log('✅ Alarma marcada como tomada:', alarmaId);
    } catch (error) {
      console.error('❌ Error marcando alarma:', error);
      throw error;
    }
  }

  /**
   * Crear nueva alarma
   */
  async crearAlarma(alarma: Partial<Alarma> & Record<string, any>): Promise<string> {
    if (!this.usuarioId) throw new Error('Usuario no identificado');

    const id = await DatabaseService.crearAlarma({
      usuarioId: this.usuarioId,
      fecha: new Date().toISOString().split('T')[0],
      ...alarma,
    });

    // Recargar alarmas
    await this.cargarAlarmasDelDia();

    // Programar notificación local
    await this.programarNotificacionLocal(id);

    console.log('✅ Alarma creada:', id);
    return id;
  }

  /**
   * Programar notificación local para la hora de la toma
   */
  private async programarNotificacionLocal(alarmaId: string): Promise<void> {
    if (!Notifications) return; // Expo Go: el monitor en memoria cubre las alarmas

    const alarma = this.alarmas.find((a) => a.id === alarmaId);
    if (!alarma) return;

    const [h, m] = alarma.horaToma.split(':').map(Number);
    const fecha = new Date();
    fecha.setHours(h, m, 0, 0);

    // Si la hora ya pasó, programar para mañana
    if (fecha < new Date()) {
      fecha.setDate(fecha.getDate() + 1);
    }

    await Notifications.scheduleNotificationAsync({
      identifier: `scheduled_${alarma.id}`,
      content: {
        title: `💊 ${alarma.medicamentoNombre || 'Medicamento'}`,
        body: `Es hora de tomar: ${alarma.medicamentoNombre}${alarma.dosis ? ' (' + alarma.dosis + ')' : ''}`,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: { alarmaId: alarma.id, usuarioId: alarma.usuarioId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fecha,
      },
    });
  }

  /**
   * Silenciar alarma
   */
  async silenciarAlarma(alarmaId: string): Promise<void> {
    const now = new Date().toISOString();

    await DatabaseService.ejecutar(
      `UPDATE alarmas SET recordatorio_silenciado = 1, updated_at = ? WHERE id = ?`,
      [now, alarmaId],
    );

    const alarma = this.alarmas.find((a) => a.id === alarmaId);
    if (alarma) {
      alarma.recordatorioSilenciado = 1;
    }

    console.log('🔇 Alarma silenciada:', alarmaId);
  }

  /**
   * Obtener estadísticas del día
   */
  async getEstadisticas(): Promise<{
    total: number;
    tomadas: number;
    pendientes: number;
    silenciadas: number;
    adherencia: number;
  }> {
    const total = this.alarmas.length;
    const tomadas = this.alarmas.filter((a) => a.tomado === 1).length;
    const silenciadas = this.alarmas.filter((a) => a.recordatorioSilenciado === 1).length;
    const pendientes = total - tomadas;
    const adherencia = total > 0 ? Math.round((tomadas / total) * 100) : 0;

    return { total, tomadas, pendientes, silenciadas, adherencia };
  }

  /**
   * Watchdog: re-sincronizar alarmas desde BD cada minuto
   */
  private iniciarWatchdog(): void {
    if (this.watchdogInterval) clearInterval(this.watchdogInterval);

    this.watchdogInterval = setInterval(async () => {
      try {
        await this.cargarAlarmasDelDia();
      } catch (error) {
        console.error('❌ Error en watchdog:', error);
      }
    }, 60000);
  }

  /**
   * Manejar cambios de estado de la app
   */
  private handleAppStateChange = (state: AppStateStatus) => {
    if (state === 'active') {
      console.log('📱 App en foreground - Reiniciar monitor');
      this.iniciarMonitor();
    }
  };

  /**
   * Limpiar recursos
   */
  destroy(): void {
    if (this.checkInterval) clearInterval(this.checkInterval);
    if (this.watchdogInterval) clearInterval(this.watchdogInterval);
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    console.log('🗑️ AlarmService destruido');
  }

  /**
   * Obtener alarmas actuales
   */
  getAlarmas(): Alarma[] {
    return [...this.alarmas];
  }
}

export default new AlarmService();
