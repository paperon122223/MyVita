import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
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
  usuario?: string;
  email: string;
  telefono?: string;
  password: string;
}

interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

const SECURE_STORAGE_KEYS = {
  AUTH_TOKEN: 'myvita.auth_token',
  REFRESH_TOKEN: 'myvita.refresh_token',
  USER_ID: 'myvita.user_id',
} as const;

/** Sesión que devuelve Supabase a través del backend */
interface SupabaseSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number; // en segundos epoch
}

/** Mapear perfil + sesión del backend al modelo interno */
function mapBackendAuth(raw: any): AuthResponse {
  const perfil = raw.user ?? {};
  const session: SupabaseSession | null = raw.session ?? null;
  if (!session?.access_token) {
    throw new Error('El servidor no devolvió una sesión válida');
  }
  const now = new Date().toISOString();

  const user: User = {
    id: perfil.id,
    nombre: perfil.nombre ?? '',
    email: perfil.email ?? '',
    usuario: perfil.usuario ?? undefined,
    telefono: perfil.telefono ?? undefined,
    created_at: perfil.created_at ?? now,
    updated_at: perfil.updated_at ?? now,
  };

  const tokens: AuthTokens = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at
      ? session.expires_at * 1000
      : Date.now() + 3600_000,
  };

  return { user, tokens };
}

class AuthService {
  private baseURL = API_BASE_URL;
  private client = axios.create({
    baseURL: this.baseURL,
    timeout: 30000,
  });
  private legacySessionMigrated = false;

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

        if (
          error.response?.status === 401 &&
          originalRequest &&
          !originalRequest._retry &&
          originalRequest.url !== '/auth/refresh'
        ) {
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
      const data = mapBackendAuth(response.data);
      await this.storeTokens(data.tokens);
      await this.storeUserId(data.user.id);
      // Sólo se guarda el perfil. La contraseña nunca se copia a SQLite.
      await this.cacheUsuarioLocal(data.user);
      return data;
    } catch (error: any) {
      if (!error?.response) {
        throw new Error('Necesitas conexión a internet para iniciar sesión de forma segura.');
      }
      throw this.handleError(error);
    }
  }

  async register(request: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await this.client.post('/auth/register', request);

      // Supabase puede no devolver sesión si exige confirmar el correo:
      // intentamos iniciar sesión de inmediato para obtener el token.
      if (!response.data.session) {
        try {
          return await this.login({ email: request.email, password: request.password });
        } catch {
          throw new Error('Cuenta creada. Revisa tu correo para confirmarla antes de entrar.');
        }
      }

      const data = mapBackendAuth(response.data);

      await this.storeTokens(data.tokens);
      await this.storeUserId(data.user.id);
      await this.cacheUsuarioLocal(data.user);
      return data;
    } catch (error: any) {
      if (!error?.response) {
        if (error instanceof Error && error.message.startsWith('Cuenta creada.')) throw error;
        throw new Error('Necesitas conexión a internet para crear una cuenta de forma segura.');
      }
      throw this.handleError(error);
    }
  }

  /**
   * Guardar/actualizar el usuario en SQLite tras autenticar con el backend,
   * para que la app siga funcionando offline con el mismo id.
   */
  private async cacheUsuarioLocal(user: User): Promise<void> {
    try {
      const existing = await DatabaseService.getUsuarioPorId(user.id);
      if (!existing) {
        await DatabaseService.crearUsuario({
          id: user.id,
          nombre: user.nombre,
          usuario: user.usuario,
          email: user.email,
          telefono: user.telefono,
          password: '__remote_auth__',
        });
      }
    } catch (e) {
      console.warn('No se pudo cachear el usuario local:', e);
    }
  }

  async logout(): Promise<void> {
    try {
      const token = await this.getStoredToken();
      if (token) {
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
      const refreshToken = await this.getSecureItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.client.post('/auth/refresh', {
        refresh_token: refreshToken,
      });

      // El backend devuelve { session } de Supabase
      const session = response.data.session ?? {};
      const tokens: AuthTokens = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at ? session.expires_at * 1000 : Date.now() + 3600_000,
      };
      await this.storeTokens(tokens);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async storeTokens(tokens: AuthTokens): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(SECURE_STORAGE_KEYS.AUTH_TOKEN, tokens.access_token),
      tokens.refresh_token
        ? SecureStore.setItemAsync(SECURE_STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token)
        : SecureStore.deleteItemAsync(SECURE_STORAGE_KEYS.REFRESH_TOKEN),
    ]);
    await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.REFRESH_TOKEN]);
  }

  async getStoredToken(): Promise<string | null> {
    return this.getSecureItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  async deleteStoredToken(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(SECURE_STORAGE_KEYS.AUTH_TOKEN),
      SecureStore.deleteItemAsync(SECURE_STORAGE_KEYS.REFRESH_TOKEN),
      AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.REFRESH_TOKEN]),
    ]);
  }

  async storeUserId(userId: string): Promise<void> {
    await SecureStore.setItemAsync(SECURE_STORAGE_KEYS.USER_ID, userId);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_ID);
  }

  async getStoredUserId(): Promise<string | null> {
    return this.getSecureItem(STORAGE_KEYS.USER_ID);
  }

  async deleteStoredUserId(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(SECURE_STORAGE_KEYS.USER_ID),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_ID),
    ]);
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getStoredToken();
    return !!token;
  }

  /** Migra una sola vez la sesión existente de AsyncStorage a Android Keystore/Keychain. */
  private async migrateLegacySession(): Promise<void> {
    if (this.legacySessionMigrated) return;

    const pairs = [
      { legacy: STORAGE_KEYS.AUTH_TOKEN, secure: SECURE_STORAGE_KEYS.AUTH_TOKEN },
      { legacy: STORAGE_KEYS.REFRESH_TOKEN, secure: SECURE_STORAGE_KEYS.REFRESH_TOKEN },
      { legacy: STORAGE_KEYS.USER_ID, secure: SECURE_STORAGE_KEYS.USER_ID },
    ];
    const legacyKeys = pairs.map(({ legacy }) => legacy);
    const [secureValues, legacyValues] = await Promise.all([
      Promise.all(pairs.map(({ secure }) => SecureStore.getItemAsync(secure))),
      AsyncStorage.multiGet(legacyKeys),
    ]);

    await Promise.all(
      pairs.map(({ secure }, index) => {
        const legacyValue = legacyValues[index]?.[1];
        return !secureValues[index] && legacyValue
          ? SecureStore.setItemAsync(secure, legacyValue)
          : Promise.resolve();
      }),
    );
    await AsyncStorage.multiRemove(legacyKeys);
    this.legacySessionMigrated = true;
  }

  private async getSecureItem(key: string): Promise<string | null> {
    await this.migrateLegacySession();
    const secureKey =
      key === STORAGE_KEYS.AUTH_TOKEN
        ? SECURE_STORAGE_KEYS.AUTH_TOKEN
        : key === STORAGE_KEYS.REFRESH_TOKEN
          ? SECURE_STORAGE_KEYS.REFRESH_TOKEN
          : SECURE_STORAGE_KEYS.USER_ID;
    return SecureStore.getItemAsync(secureKey);
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
