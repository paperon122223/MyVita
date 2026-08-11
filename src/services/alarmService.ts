// ================================================================
// alarmService.ts — Sistema de Alarmas (CRÍTICO)
// Migrado de alarm.js (1109 líneas)
// Maneja: persistencia, notificaciones (expo-notifications), sincronización
// ================================================================

import { Alert, AppState, AppStateStatus, NativeEventSubscription } from 'react-native';
import { Notifications } from '../utils/notificationsModule';
import DatabaseService from './database';
import NotificationService from './notificationService';
import { addLocalDays, localDateKey, localDateTime } from '../utils/localDate';

export type FrecuenciaAlarma = 'una_vez' | 'diaria' | 'semanal';

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
  frecuencia?: FrecuenciaAlarma;
  diasSemana?: number[];
  fechaFin?: string;
  recurrenciaId?: string;
  createdAt: string;
  updatedAt: string;
}

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
    frecuencia: row.frecuencia ?? 'una_vez',
    diasSemana: row.dias_semana ? JSON.parse(row.dias_semana) : undefined,
    fechaFin: row.fecha_fin ?? undefined,
    recurrenciaId: row.recurrencia_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class AlarmService {
  /** Alarmas visibles: las de hoy más la próxima toma de cada serie futura. */
  private alarmas: Alarma[] = [];
  private alarmasHoy: Alarma[] = [];
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private watchdogInterval: ReturnType<typeof setInterval> | null = null;
  private appStateSubscription: NativeEventSubscription | null = null;
  private usuarioId: string | null = null;
  private notifiedIds = new Set<string>();
  private nativeNotificationsReady = false;
  private lastReconciledDate: string | null = null;

  /**
   * Inicializar servicio
   */
  async init(usuarioId: string): Promise<void> {
    this.usuarioId = usuarioId;

    try {
      // Provisionar instancias recurrentes para los próximos 30 días
      await DatabaseService.generarInstanciasSiFaltan(usuarioId, 30);

      // Cargar alarmas desde BD
      await this.cargarAlarmasDelDia();

      // Configurar canal de notificaciones (Android)
      this.nativeNotificationsReady = await this.configurarNotificaciones();

      // Dejar todas las tomas futuras en manos del sistema operativo para
      // que suenen aunque React Native esté suspendido o la app esté cerrada.
      await this.reconciliarNotificacionesPendientes();

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

    const hoy = localDateKey();
    const hasta = localDateKey(addLocalDays(new Date(), 30));
    const rows = await DatabaseService.getAlarmasDesde(this.usuarioId, hoy, hasta);
    const todas = rows.map(mapRow);

    this.alarmasHoy = todas.filter((alarma) => alarma.fecha === hoy);

    // Si una serie no tiene instancia hoy, mostrar únicamente su próxima toma.
    // Las alarmas de una sola vez se muestran todas dentro de la ventana.
    const seriesVisibles = new Set(
      this.alarmasHoy
        .map((alarma) => alarma.recurrenciaId)
        .filter((id): id is string => Boolean(id)),
    );
    const proximas = todas.filter((alarma) => {
      if (alarma.fecha === hoy) return false;
      if (!alarma.recurrenciaId) return true;
      if (seriesVisibles.has(alarma.recurrenciaId)) return false;
      seriesVisibles.add(alarma.recurrenciaId);
      return true;
    });

    this.alarmas = [...this.alarmasHoy, ...proximas];
    console.log(
      `📋 ${this.alarmasHoy.length} alarmas de hoy y ${proximas.length} próximas cargadas`,
    );
  }

  /**
   * Configurar canales y categorías de notificación
   * (delegado a NotificationService, que maneja prefs y acciones)
   */
  private async configurarNotificaciones(): Promise<boolean> {
    return NotificationService.requestPermissions();
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
    // Con permisos, la notificación ya está programada de forma nativa.
    // El monitor en memoria sólo es el respaldo cuando el usuario los negó.
    if (this.nativeNotificationsReady) return;

    const ahora = new Date();

    for (const alarma of this.alarmasHoy) {
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
      if (this.nativeNotificationsReady && Notifications) {
        // Notificación con botones "✓ Ya lo tomé" / "⏰ En 10 min"
        await NotificationService.mostrarNotificacionAlarma(alarma);
      } else {
        // Sin permiso nativo → alerta mientras la app está abierta.
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
      const alarmaHoy = this.alarmasHoy.find((a) => a.id === alarmaId);
      if (alarmaHoy) alarmaHoy.tomado = 1;

      // Quitar notificaciones pendientes de esta alarma
      await NotificationService.cancelarNotificacionAlarma(alarmaId);

      console.log('✅ Alarma marcada como tomada:', alarmaId);
    } catch (error) {
      console.error('❌ Error marcando alarma:', error);
      throw error;
    }
  }

  /**
   * Crear nueva alarma (soporta una_vez / diaria / semanal)
   */
  async crearAlarma(
    alarma: Partial<Alarma> & Record<string, any>,
    frecuencia: FrecuenciaAlarma = 'una_vez',
    diasSemana?: number[],
    fechaFin?: string,
  ): Promise<string> {
    if (!this.usuarioId) throw new Error('Usuario no identificado');

    const horaToma = alarma.horaToma ?? alarma.hora;
    if (!horaToma) throw new Error('Hora de alarma no especificada');

    const ahora = new Date();
    let primeraFecha = localDateKey(ahora);
    if (localDateTime(primeraFecha, horaToma) <= ahora) {
      primeraFecha = localDateKey(addLocalDays(ahora, 1));
    }

    const baseAlarma = {
      usuarioId: this.usuarioId,
      fecha: primeraFecha,
      ...alarma,
      horaToma,
    };

    let id: string;
    if (frecuencia === 'una_vez') {
      id = await DatabaseService.crearAlarma(baseAlarma);
    } else {
      id = await DatabaseService.crearAlarmaConRecurrencia(
        baseAlarma,
        frecuencia,
        diasSemana,
        fechaFin,
        30,
      );
    }

    // Recargar alarmas del día
    await this.cargarAlarmasDelDia();

    // Programa la toma única o todas las instancias de la serie recién creada.
    await this.reconciliarNotificacionesPendientes(true);

    console.log('✅ Alarma creada:', id, `(${frecuencia})`);
    return id;
  }

  /**
   * Eliminar una sola instancia de alarma (esta toma)
   */
  async eliminarAlarma(alarmaId: string): Promise<void> {
    await DatabaseService.eliminarAlarma(alarmaId);
    this.alarmas = this.alarmas.filter((a) => a.id !== alarmaId);
    this.alarmasHoy = this.alarmasHoy.filter((a) => a.id !== alarmaId);
    await NotificationService.cancelarNotificacionAlarma(alarmaId);
    console.log('🗑️ Alarma eliminada:', alarmaId);
  }

  /**
   * Eliminar todas las instancias futuras de una serie recurrente
   */
  async eliminarSerie(recurrenciaId: string): Promise<void> {
    const hoy = localDateKey();
    const ids = await DatabaseService.getIdsSerieDesde(recurrenciaId, hoy);
    await DatabaseService.eliminarInstanciasFuturas(recurrenciaId, hoy);
    this.alarmas = this.alarmas.filter((a) => a.recurrenciaId !== recurrenciaId);
    this.alarmasHoy = this.alarmasHoy.filter((a) => a.recurrenciaId !== recurrenciaId);
    await Promise.all(ids.map((id) => NotificationService.cancelarNotificacionAlarma(id)));
    console.log('🗑️ Serie de alarmas eliminada:', recurrenciaId);
  }

  /**
   * Reconcilia la ventana móvil de 30 días con las alarmas nativas.
   */
  private async reconciliarNotificacionesPendientes(force = false): Promise<void> {
    if (!Notifications || !this.nativeNotificationsReady || !this.usuarioId) return;

    const hoy = localDateKey();
    if (!force && this.lastReconciledDate === hoy) return;

    await DatabaseService.generarInstanciasSiFaltan(this.usuarioId, 30);
    const hasta = localDateKey(addLocalDays(new Date(), 30));
    const rows = await DatabaseService.getAlarmasProgramables(this.usuarioId, hoy, hasta);
    const ahora = new Date();
    const alarmasFuturas = rows
      .map(mapRow)
      .map((alarma) => ({ alarma, fecha: localDateTime(alarma.fecha, alarma.horaToma) }))
      .filter(({ fecha }) => fecha > ahora);

    await NotificationService.programarNotificacionesAlarmas(alarmasFuturas);
    this.lastReconciledDate = hoy;
    console.log(`⏰ ${alarmasFuturas.length} alarmas nativas reconciliadas`);
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
    const rows = await DatabaseService.ejecutar(`SELECT * FROM alarmas WHERE id = ?`, [alarmaId]);
    if (rows?.[0]) {
      await DatabaseService.encolarCambio('alarmas', 'UPDATE', alarmaId, rows[0]);
    }

    const alarma = this.alarmas.find((a) => a.id === alarmaId);
    if (alarma) {
      alarma.recordatorioSilenciado = 1;
    }
    const alarmaHoy = this.alarmasHoy.find((a) => a.id === alarmaId);
    if (alarmaHoy) alarmaHoy.recordatorioSilenciado = 1;

    // Quitar notificaciones pendientes de esta alarma
    await NotificationService.cancelarNotificacionAlarma(alarmaId);

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
    const total = this.alarmasHoy.length;
    const tomadas = this.alarmasHoy.filter((a) => a.tomado === 1).length;
    const silenciadas = this.alarmasHoy.filter((a) => a.recordatorioSilenciado === 1).length;
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
      this.reconciliarNotificacionesPendientes().catch((error) =>
        console.error('Error reconciliando alarmas:', error),
      );
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
    this.usuarioId = null;
    this.nativeNotificationsReady = false;
    this.alarmas = [];
    this.alarmasHoy = [];
    this.notifiedIds.clear();
    this.lastReconciledDate = null;
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
