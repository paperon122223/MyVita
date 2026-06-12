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
  SyncQueue,
} from '../types';
import { API_BASE_URL, API_ENDPOINTS, RETRY_CONFIG } from '../utils/constants';

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

  // Sync with server
  async syncData(userId: string): Promise<SyncResponse> {
    try {
      const [medicamentos, alarmas, tomas, cuidadores] = await Promise.all([
        databaseService.getNoSincronizados('medicamentos', userId),
        databaseService.getNoSincronizados('alarmas', userId),
        databaseService.getNoSincronizados('tomas', userId),
        databaseService.getNoSincronizados('cuidadores', userId),
      ]);

      const payload: SyncPayload = {
        medicamentos,
        alarmas,
        tomas,
        cuidadores,
        timestamp: new Date().toISOString(),
      };

      const response = await this.retryWithBackoff(async () =>
        this.client.post<SyncResponse>(API_ENDPOINTS.SYNC, payload),
      );

      // Mark as synced
      for (const med of medicamentos) {
        await databaseService.marcarComoSincronizado('medicamentos', med.id);
      }
      for (const alarm of alarmas) {
        await databaseService.marcarComoSincronizado('alarmas', alarm.id);
      }
      for (const toma of tomas) {
        await databaseService.marcarComoSincronizado('tomas', toma.id);
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
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

  // Offline queue management
  async addToSyncQueue(
    tabla: string,
    operacion: 'INSERT' | 'UPDATE' | 'DELETE',
    recordId: string,
    datos: Record<string, any>,
  ): Promise<void> {
    const queue: SyncQueue = {
      id: `${tabla}_${recordId}_${Date.now()}`,
      tabla,
      operacion,
      recordId,
      datos,
      intentos: 0,
      created_at: new Date().toISOString(),
    };
    // Store in database for persistence
    // TODO: Implement database storage of sync queue
    console.log('Added to sync queue:', queue);
  }

  async processSyncQueue(userId: string): Promise<void> {
    try {
      // TODO: Fetch queue from database
      // TODO: Process each item with retries
      await this.syncData(userId);
    } catch (error) {
      console.error('Error processing sync queue:', error);
    }
  }

  private async retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error = new Error('Unknown error');
    for (let attempt = 0; attempt < RETRY_CONFIG.MAX_ATTEMPTS; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
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
