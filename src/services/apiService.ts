import axios, { AxiosInstance, AxiosError } from 'axios';
import authService from './authService';
import databaseService from './database';
import {
  Medicamento,
  Alarma,
  Toma,
  Cuidador,
  SyncResponse,
  ApiResponse,
} from '../types';
import {
  API_BASE_URL,
  API_ENDPOINTS,
  CLOUD_BACKEND_ENABLED,
  RETRY_CONFIG,
} from '../utils/constants';

interface SyncPayload {
  usuarios?: any[];
  medicamentos?: Medicamento[];
  alarmas?: Alarma[];
  tomas?: Toma[];
  cuidadores?: Cuidador[];
  timestamp: string;
}

class APIService {
  private client: AxiosInstance;
  private syncInProgress: Promise<void> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      async (config) => {
        const token = await authService.getStoredToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );
  }

  // Tablas locales → tablas del backend (Supabase). Solo se sincronizan
  // las que existen en ambos lados con el mismo esquema.
  private static SYNC_TABLES: { local: string; remote: string }[] = [
    { local: 'medicamentos', remote: 'medicamentos' },
    { local: 'alarmas', remote: 'alarmas' },
  ];

  // Columnas que solo existen localmente y NO deben enviarse a Supabase
  private static LOCAL_ONLY_COLS = ['synced_at'];

  private stripLocalCols(row: Record<string, any>): Record<string, any> {
    const clean = { ...row };
    for (const col of APIService.LOCAL_ONLY_COLS) delete clean[col];
    return clean;
  }

  // Sync offline-first: sube cada registro pendiente a su tabla del backend
  async syncData(userId: string): Promise<SyncResponse> {
    if (!CLOUD_BACKEND_ENABLED) {
      return { success: true, subidos: 0, errores: [] } as unknown as SyncResponse;
    }
    let subidos = 0;
    const errores: string[] = [];

    for (const { local, remote } of APIService.SYNC_TABLES) {
      let pendientes: any[] = [];
      try {
        pendientes = await databaseService.getNoSincronizados(local, userId);
      } catch (e) {
        continue; // la tabla puede no existir aún localmente
      }

      for (const row of pendientes) {
        try {
          if (row.deleted_at) {
            await this.retryWithBackoff(async () => this.client.delete(`/sync/${remote}/${row.id}`));
          } else {
            await this.retryWithBackoff(async () =>
              this.client.post(`/sync/${remote}`, this.stripLocalCols(row)),
            );
          }
          await databaseService.marcarComoSincronizado(local, row.id);
          subidos++;
        } catch (e: any) {
          errores.push(`${remote}/${row.id}: ${e?.response?.data?.error ?? e?.message}`);
          // Una ruta inexistente afecta a toda la tabla; no repetirla por cada fila.
          if (e?.response?.status === 404) break;
        }
      }
    }

    if (errores.length) console.warn('[Sync] errores:', errores);
    return { success: errores.length === 0, subidos, errores } as unknown as SyncResponse;
  }

  // Medications
  async fetchMedications(userId: string): Promise<Medicamento[]> {
    try {
      const response = await this.retryWithBackoff(async () =>
        this.client.get<ApiResponse<Medicamento[]>>(
          `${API_ENDPOINTS.MEDICATIONS}?userId=${userId}`,
        ),
      );
      return response.data.data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createMedication(userId: string, medication: Partial<Medicamento>): Promise<Medicamento> {
    try {
      const response = await this.client.post<ApiResponse<Medicamento>>(
        API_ENDPOINTS.MEDICATIONS,
        { ...medication, usuarioId: userId },
      );
      return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateMedication(medication: Medicamento): Promise<Medicamento> {
    try {
      const response = await this.client.put<ApiResponse<Medicamento>>(
        `${API_ENDPOINTS.MEDICATIONS}/${medication.id}`,
        medication,
      );
      return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteMedication(medicationId: string): Promise<void> {
    try {
      await this.client.delete(`${API_ENDPOINTS.MEDICATIONS}/${medicationId}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Alarms
  async fetchAlarms(userId: string): Promise<Alarma[]> {
    try {
      const response = await this.retryWithBackoff(async () =>
        this.client.get<ApiResponse<Alarma[]>>(`${API_ENDPOINTS.ALARMS}?userId=${userId}`),
      );
      return response.data.data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createAlarm(userId: string, alarm: Partial<Alarma>): Promise<Alarma> {
    try {
      const response = await this.client.post<ApiResponse<Alarma>>(
        API_ENDPOINTS.ALARMS,
        { ...alarm, usuarioId: userId },
      );
      return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateAlarm(alarm: Alarma): Promise<Alarma> {
    try {
      const response = await this.client.put<ApiResponse<Alarma>>(
        `${API_ENDPOINTS.ALARMS}/${alarm.id}`,
        alarm,
      );
      return response.data.data!;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteAlarm(alarmId: string): Promise<void> {
    try {
      await this.client.delete(`${API_ENDPOINTS.ALARMS}/${alarmId}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Chat with AI
  async sendChatMessage(userId: string, message: string): Promise<string> {
    try {
      const response = await this.retryWithBackoff(async () =>
        this.client.post<ApiResponse<{ response: string }>>(
          API_ENDPOINTS.CHAT,
          { usuarioId: userId, mensaje: message },
        ),
      );
      return response.data.data?.response || '';
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Diary
  async fetchDiaryEntry(userId: string, date: string): Promise<any> {
    try {
      const response = await this.client.get(
        `${API_ENDPOINTS.DIARY}?userId=${userId}&date=${date}`,
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async saveDiaryEntry(
    userId: string,
    date: string,
    titulo: string,
    contenido: string,
    estadoAnimo?: string,
  ): Promise<any> {
    try {
      const response = await this.client.post(API_ENDPOINTS.DIARY, {
        usuarioId: userId,
        fecha: date,
        titulo,
        contenido,
        estadoAnimo,
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // SOS
  async sendSOS(
    userId: string,
    latitude?: number,
    longitude?: number,
  ): Promise<any> {
    try {
      const response = await this.client.post(API_ENDPOINTS.SOS, {
        usuarioId: userId,
        latitud: latitude,
        longitud: longitude,
        timestamp: new Date().toISOString(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ── Cuidador ────────────────────────────────────────────────────────────────
  // El backend autentica con el JWT (interceptor) y, como respaldo para cuentas
  // creadas solo localmente, acepta usuario_id. Por eso se envía también el id.

  /**
   * El PACIENTE genera un código de 6 dígitos (válido 10 min) para que su
   * cuidador lo ingrese. Devuelve { codigo, expira_at }.
   */
  async generarCodigoVinculacion(paciente: {
    id: string;
    nombre?: string;
    email?: string;
  }): Promise<{ codigo: string; expira_at: string }> {
    try {
      const res = await this.client.post('/caregiver/codigo', {
        usuario_id: paciente.id,
        nombre: paciente.nombre,
        email: paciente.email,
      });
      return res.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * El CUIDADOR ingresa el código de 6 dígitos del paciente.
   * Devuelve { vinculo, paciente }.
   */
  async vincularConCodigo(codigo: string, cuidadorId: string): Promise<any> {
    try {
      const res = await this.client.post('/caregiver/vincular', {
        codigo,
        usuario_id: cuidadorId,
      });
      return res.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /** Lista de pacientes vinculados a este cuidador. */
  async getPacientes(cuidadorId: string): Promise<any[]> {
    try {
      const res = await this.client.get('/caregiver/pacientes', {
        params: { usuario_id: cuidadorId },
      });
      return res.data.pacientes ?? [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Alarmas de hoy de un paciente (el backend valida el vínculo activo).
   * Se usa para calcular la adherencia del día en el panel del cuidador.
   */
  async getAlarmasPaciente(pacienteId: string, cuidadorId: string): Promise<any[]> {
    try {
      const res = await this.client.get(`/caregiver/alarmas/${pacienteId}`, {
        params: { usuario_id: cuidadorId },
      });
      return res.data.alarmas ?? [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /** Desvincular (lo puede hacer el cuidador o el paciente). */
  async desvincular(vinculoId: string, usuarioId: string): Promise<void> {
    try {
      await this.client.delete(`/caregiver/vinculos/${vinculoId}`, {
        params: { usuario_id: usuarioId },
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Offline queue management
  async addToSyncQueue(
    tabla: string,
    operacion: 'INSERT' | 'UPDATE' | 'DELETE',
    recordId: string,
    datos: Record<string, any>,
  ): Promise<void> {
    await databaseService.encolarCambio(tabla, operacion, recordId, datos);
  }

  async processSyncQueue(userId: string): Promise<void> {
    if (!CLOUD_BACKEND_ENABLED) return;
    if (this.syncInProgress) return this.syncInProgress;
    this.syncInProgress = this.processSyncQueueInternal(userId);
    try {
      await this.syncInProgress;
    } finally {
      this.syncInProgress = null;
    }
  }

  private async processSyncQueueInternal(userId: string): Promise<void> {
    const permitidas = new Map(APIService.SYNC_TABLES.map((item) => [item.local, item.remote]));
    const pendientes = await databaseService.getSyncQueuePendiente(100);

    for (const item of pendientes) {
      const remote = permitidas.get(item.tabla);
      if (!remote) {
        await databaseService.registrarErrorSyncQueue(item.id, `Tabla no sincronizable: ${item.tabla}`);
        continue;
      }

      try {
        const datos = JSON.parse(item.datos || '{}');
        if (item.operacion === 'DELETE') {
          await this.retryWithBackoff(async () => this.client.delete(`/sync/${remote}/${item.record_id}`));
        } else {
          await this.retryWithBackoff(async () =>
            this.client.post(`/sync/${remote}`, this.stripLocalCols(datos)),
          );
        }
        await databaseService.marcarSyncQueueCompleto(item.id);
        await databaseService.marcarComoSincronizado(item.tabla, item.record_id);
      } catch (error: any) {
        const message = error?.response?.data?.error ?? error?.message ?? 'Error de sincronización';
        await databaseService.registrarErrorSyncQueue(item.id, message);
        // Sin red: conservar el resto intacto para el siguiente intento.
        if (!error?.response || error?.response?.status === 404) return;
      }
    }

    // Compatibilidad: recoge cambios creados antes de existir la cola persistente.
    await this.syncData(userId);
  }

  private async retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error = new Error('Unknown error');
    for (let attempt = 0; attempt < RETRY_CONFIG.MAX_ATTEMPTS; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const status = (error as AxiosError)?.response?.status;
        // Los errores de cliente no mejoran con reintentos inmediatos, salvo
        // timeout o límite temporal de solicitudes.
        if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
          throw lastError;
        }
        if (attempt < RETRY_CONFIG.MAX_ATTEMPTS - 1) {
          const delay = Math.min(
            RETRY_CONFIG.INITIAL_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt),
            RETRY_CONFIG.MAX_DELAY,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  private handleError(error: any): Error {
    const axiosError = error as AxiosError;

    if (axiosError.response?.status === 401) {
      return new Error('No autorizado. Por favor inicia sesión de nuevo.');
    }
    if (axiosError.response?.status === 404) {
      return new Error('Recurso no encontrado.');
    }
    if (axiosError.response?.status === 500) {
      return new Error('Error del servidor. Por favor intenta más tarde.');
    }
    if (axiosError.message === 'Network Error') {
      return new Error('Sin conexión de red.');
    }

    return error instanceof Error ? error : new Error('Error en la API');
  }
}

export default new APIService();
