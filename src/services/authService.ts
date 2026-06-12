import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { User, AuthTokens } from '../types';
import { API_BASE_URL, STORAGE_KEYS, RETRY_CONFIG } from '../utils/constants';
import DatabaseService from './database';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  nombre: string;
  email: string;
  password: string;
  edad: number;
  genero: string;
}

interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

class AuthService {
  private baseURL = API_BASE_URL;
  private client = axios.create({
    baseURL: this.baseURL,
    timeout: 30000,
  });

  constructor() {
    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      async (config) => {
        const token = await this.getStoredToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            await this.refreshAccessToken();
            const token = await this.getStoredToken();
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            await this.logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  async login(request: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await this.client.post('/auth/login', request);
      const data = response.data as AuthResponse;
      await this.storeTokens(data.tokens);
      await this.storeUserId(data.user.id);
      return data;
    } catch (error: any) {
      // Sin backend disponible → autenticación local offline (SQLite)
      if (!error?.response) {
        return this.loginLocal(request);
      }
      throw this.handleError(error);
    }
  }

  async register(request: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await this.client.post('/auth/register', request);
      const data = response.data as AuthResponse;
      await this.storeTokens(data.tokens);
      await this.storeUserId(data.user.id);
      return data;
    } catch (error: any) {
      // Sin backend disponible → registro local offline (SQLite)
      if (!error?.response) {
        return this.registerLocal(request);
      }
      throw this.handleError(error);
    }
  }

  /**
   * Login local contra SQLite (modo offline / sin backend).
   */
  private async loginLocal(request: LoginRequest): Promise<AuthResponse> {
    const row = await DatabaseService.getUsuarioPorEmail(request.email.trim().toLowerCase());
    if (!row || row.password !== request.password) {
      throw new Error('Email o contraseña incorrectos');
    }

    const data = this.buildLocalAuthResponse(row);
    await this.storeTokens(data.tokens);
    await this.storeUserId(data.user.id);
    return data;
  }

  /**
   * Registro local en SQLite (modo offline / sin backend).
   */
  private async registerLocal(request: RegisterRequest): Promise<AuthResponse> {
    const email = request.email.trim().toLowerCase();
    const existing = await DatabaseService.getUsuarioPorEmail(email);
    if (existing) {
      throw new Error('Ya existe una cuenta con ese email');
    }

    const id = await DatabaseService.crearUsuario({
      nombre: request.nombre,
      email,
      password: request.password,
    });

    const row = await DatabaseService.getUsuarioPorEmail(email);
    const data = this.buildLocalAuthResponse(row ?? { id, nombre: request.nombre, email });
    await this.storeTokens(data.tokens);
    await this.storeUserId(data.user.id);
    return data;
  }

  private buildLocalAuthResponse(row: any): AuthResponse {
    const now = new Date().toISOString();
    const user: User = {
      id: row.id,
      nombre: row.nombre ?? '',
      email: row.email ?? '',
      edad: 0,
      genero: 'Otro',
      created_at: row.created_at ?? now,
      updated_at: row.updated_at ?? now,
    };
    const tokens: AuthTokens = {
      access_token: `local_${row.id}_${Date.now()}`,
      expires_at: Date.now() + 1000 * 60 * 60 * 24 * 365,
    };
    return { user, tokens };
  }

  async logout(): Promise<void> {
    try {
      const token = await this.getStoredToken();
      // Las sesiones locales no necesitan avisar al backend
      if (token && !token.startsWith('local_')) {
        await this.client.post('/auth/logout');
      }
    } catch (error) {
      console.warn('Logout API failed, clearing local tokens anyway', error);
    } finally {
      await this.deleteStoredToken();
      await this.deleteStoredUserId();
    }
  }

  async refreshAccessToken(): Promise<void> {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.client.post('/auth/refresh', {
        refresh_token: refreshToken,
      });

      const tokens: AuthTokens = response.data.tokens;
      await this.storeTokens(tokens);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async storeTokens(tokens: AuthTokens): Promise<void> {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, tokens.access_token),
      tokens.refresh_token
        ? AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token)
        : Promise.resolve(),
    ]);
  }

  async getStoredToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  async deleteStoredToken(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  async storeUserId(userId: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
  }

  async getStoredUserId(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
  }

  async deleteStoredUserId(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_ID);
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getStoredToken();
    return !!token;
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
    if (error.response?.data?.error) {
      return new Error(error.response.data.error);
    }
    if (error.message === 'Network Error') {
      return new Error('No hay conexión de red');
    }
    return error instanceof Error ? error : new Error('Error desconocido');
  }
}

export default new AuthService();
