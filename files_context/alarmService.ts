// ================================================================
// alarmService.ts — Sistema de Alarmas (CRÍTICO)
// Migrado de alarm.js (1109 líneas)
// Maneja: persistencia, notificaciones, sincronización
// ================================================================

import { Alert, AppState } from 'react-native';
import PushNotification from 'react-native-push-notification';
import DatabaseService from './database';

export interface Alarma {
  id: string;
  usuarioId: string;
  medicamentoId?: string;
  medicamentoNombre: string;
  dosis?: string;
  horaToma: string;
  fecha: string;
  tono?: string;
  volumen?: number;
  estaActiva: number;
  recordatorioSilenciado: number;
  tomado: number;
  createdAt: string;
  updatedAt: string;
}

class AlarmService {
  private alarmas: Alarma[] = [];
  private checkInterval: NodeJS.Timer | null = null;
  private appState = AppState.currentState;
  private usuarioId: string | null = null;
  private watchdogInterval: NodeJS.Timer | null = null;

  /**
   * Inicializar servicio
   */
  async init(usuarioId: string): Promise<void> {
    this.usuarioId = usuarioId;
    
    try {
      // Cargar alarmas desde BD
      await this.cargarAlarmasDelDia();

      // Configurar notificaciones push
      this.configurarNotificaciones();

      // Iniciar monitor de alarmas
      this.iniciarMonitor();

      // Escuchar cambios de estado de app
      AppState.addEventListener('change', this.handleAppStateChange);

      // Iniciar watchdog (verifica cada 30 segundos)
      this.iniciarWatchdog();

      console.log('✅ AlarmService inicializado');
    } catch (error) {
      console.error('❌ Error inicializando AlarmService:', error);
      throw error;
    }
  },

  /**
   * Cargar alarmas del día desde BD
   */
  private async cargarAlarmasDelDia(): Promise<void> {
    if (!this.usuarioId) return;

    const hoy = new Date().toISOString().split('T')[0];
    const db = await DatabaseService.getDB();
    
    const results = await db.executeSql(
      `SELECT * FROM alarmas 
       WHERE usuario_id = ? AND fecha = ? AND deleted_at IS NULL
       ORDER BY hora_toma ASC`,
      [this.usuarioId, hoy]
    );

    this.alarmas = results[0].rows._array;
    console.log(`📋 ${this.alarmas.length} alarmas cargadas para hoy`);
  },

  /**
   * Configurar canal de notificaciones
   */
  private configurarNotificaciones(): void {
    PushNotification.createChannel(
      {
        channelId: 'myvita-alarmas',
        channelName: 'MyVita Alarmas',
        channelDescription: 'Notificaciones de toma de medicamentos',
        soundName: 'alarm.mp3',
        importance: 4, // MAX
        vibrate: true,
        playSound: true,
      },
      (created) => console.log('Canal creado:', created)
    );
  },

  /**
   * Iniciar monitor de alarmas
   */
  private iniciarMonitor(): void {
    // Limpiar interval anterior
    if (this.checkInterval) clearInterval(this.checkInterval);

    // Verificar cada 30 segundos (crítico para reliability)
    this.checkInterval = setInterval(() => {
      this.verificarAlarmas();
    }, 30000);

    // Primera verificación inmediata
    this.verificarAlarmas();
  },

  /**
   * Verificar si alguna alarma debe sonar
   */
  private async verificarAlarmas(): Promise<void> {
    const ahora = new Date();
    const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;

    for (const alarma of this.alarmas) {
      // Condiciones para sonar:
      // 1. Hora coincide
      // 2. Alarma activa
      // 3. No silenciada
      // 4. No tomada aún
      // 5. Dentro de ventana de ±2 minutos

      const [h, m] = alarma.horaToma.split(':').map(Number);
      const minutosAlarma = h * 60 + m;
      const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
      const diferencia = Math.abs(minutosActuales - minutosAlarma);

      if (
        diferencia <= 2 &&
        alarma.estaActiva === 1 &&
        alarma.recordatorioSilenciado === 0 &&
        alarma.tomado === 0
      ) {
        await this.sonarAlarma(alarma);
      }
    }
  },

  /**
   * Sonar alarma (notificación)
   */
  private async sonarAlarma(alarma: Alarma): Promise<void> {
    console.log(`🔔 ¡Alarma! ${alarma.medicamentoNombre} a las ${alarma.horaToma}`);

    try {
      PushNotification.localNotification({
        channelId: 'myvita-alarmas',
        title: `💊 ${alarma.medicamentoNombre}`,
        message: `Es hora de tomar: ${alarma.medicamentoNombre}${alarma.dosis ? ' (' + alarma.dosis + ')' : ''}`,
        bigText: `Hora programada: ${alarma.horaToma}\n\nToca para confirmar que tomaste el medicamento.`,
        notificationId: alarma.id,
        playSound: true,
        soundName: alarma.tono || 'alarm.mp3',
        volume: (alarma.volumen || 80) / 100,
        vibrate: [0, 500, 250, 500],
        vibration: 300,
        priority: 'high',
        importance: 'max',
        userInteraction: true,
        actions: ['Tomar', 'Recordar después'],
        data: { 
          alarmaId: alarma.id,
          usuarioId: alarma.usuarioId,
          medicamentoNombre: alarma.medicamentoNombre,
        },
      });

      // Guardardatos en BD para auditoría
      const db = await DatabaseService.getDB();
      await db.executeSql(
        `UPDATE alarmas SET updated_at = ? WHERE id = ?`,
        [new Date().toISOString(), alarma.id]
      );
    } catch (error) {
      console.error('❌ Error sonando alarma:', error);
    }
  },

  /**
   * Marcar alarma como tomada
   */
  async marcarComoTomada(alarmaId: string): Promise<void> {
    try {
      await DatabaseService.marcarAlamaComoTomada(alarmaId);

      // Actualizar estado local
      const alarma = this.alarmas.find((a) => a.id === alarmaId);
      if (alarma) {
        alarma.tomado = 1;
      }

      console.log('✅ Alarma marcada como tomada:', alarmaId);
    } catch (error) {
      console.error('❌ Error marcando alarma:', error);
      throw error;
    }
  },

  /**
   * Crear nueva alarma
   */
  async crearAlarma(alarma: Partial<Alarma>): Promise<string> {
    if (!this.usuarioId) throw new Error('Usuario no identificado');

    const id = await DatabaseService.crearAlarma({
      usuarioId: this.usuarioId,
      ...alarma,
    });

    // Recargar alarmas
    await this.cargarAlarmasDelDia();

    // Programar notificación si es para hoy
    await this.programarNotificacionLocal(id);

    console.log('✅ Alarma creada:', id);
    return id;
  },

  /**
   * Programar notificación local (para después de X minutos)
   */
  private async programarNotificacionLocal(alarmaId: string): Promise<void> {
    const alarma = this.alarmas.find((a) => a.id === alarmaId);
    if (!alarma) return;

    const [h, m] = alarma.horaToma.split(':').map(Number);
    const fecha = new Date();
    fecha.setHours(h, m, 0, 0);

    // Si la hora ya pasó, programar para mañana
    if (fecha < new Date()) {
      fecha.setDate(fecha.getDate() + 1);
    }

    PushNotification.localNotificationSchedule({
      channelId: 'myvita-alarmas',
      id: parseInt(alarmaId.replace(/\D/g, '')) || Date.now(),
      title: `💊 ${alarma.medicamentoNombre}`,
      message: `Es hora de tomar: ${alarma.medicamentoNombre}${alarma.dosis ? ' (' + alarma.dosis + ')' : ''}`,
      date: fecha,
      playSound: true,
      soundName: alarma.tono || 'alarm.mp3',
      vibrate: true,
      importance: 'max',
      priority: 'high',
      data: {
        alarmaId: alarma.id,
        usuarioId: alarma.usuarioId,
      },
    });
  },

  /**
   * Silenciar alarma
   */
  async silenciarAlarma(alarmaId: string): Promise<void> {
    const db = await DatabaseService.getDB();
    const now = new Date().toISOString();

    await db.executeSql(
      `UPDATE alarmas SET recordatorio_silenciado = 1, updated_at = ? WHERE id = ?`,
      [now, alarmaId]
    );

    const alarma = this.alarmas.find((a) => a.id === alarmaId);
    if (alarma) {
      alarma.recordatorioSilenciado = 1;
    }

    console.log('🔇 Alarma silenciada:', alarmaId);
  },

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
  },

  /**
   * Watchdog: Verificar que las alarmas sigan siendo procesadas
   */
  private iniciarWatchdog(): void {
    if (this.watchdogInterval) clearInterval(this.watchdogInterval);

    this.watchdogInterval = setInterval(async () => {
      try {
        await this.cargarAlarmasDelDia();
        console.log('🐕 Watchdog: Alarmas sincronizadas');
      } catch (error) {
        console.error('❌ Error en watchdog:', error);
      }
    }, 60000); // Cada minuto
  },

  /**
   * Manejar cambios de estado de la app
   */
  private handleAppStateChange = (state: string) => {
    if (state === 'active') {
      console.log('📱 App en foreground - Reiniciar monitor');
      this.iniciarMonitor();
    } else if (state === 'background') {
      console.log('📱 App en background - Mantener watchdog');
    }
  };

  /**
   * Limpiar recursos
   */
  destroy(): void {
    if (this.checkInterval) clearInterval(this.checkInterval);
    if (this.watchdogInterval) clearInterval(this.watchdogInterval);
    AppState.removeEventListener('change', this.handleAppStateChange);
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
