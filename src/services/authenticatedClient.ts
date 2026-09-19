import axios, { InternalAxiosRequestConfig } from 'axios';
import authService from './authService';
import { TOKEN_SESION_OFFLINE } from './offlineAuthService';
import { API_BASE_URL, API_TIMEOUT } from '../utils/constants';

type SessionRequest = InternalAxiosRequestConfig & {
  _sessionRetry?: boolean;
  _sessionUserId?: string | null;
};

const client = axios.create({ baseURL: API_BASE_URL, timeout: API_TIMEOUT });
let refreshPending: Promise<void> | null = null;

client.interceptors.request.use(async (config: SessionRequest) => {
  const userId = await authService.getStoredUserId();
  if (config._sessionRetry && config._sessionUserId !== userId) {
    throw new Error('La sesión cambió. Vuelve a intentar la operación.');
  }
  const token = await authService.getStoredToken();
  if (!token || token === TOKEN_SESION_OFFLINE) {
    throw new Error('Inicia sesión con internet para sincronizar.');
  }
  config._sessionUserId = userId;
  config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

client.interceptors.response.use(response => response, async error => {
  const request: SessionRequest | undefined = error.config;
  if (error.response?.status !== 401 || !request || request._sessionRetry) throw error;
  request._sessionRetry = true;

  const userId = await authService.getStoredUserId();
  const token = await authService.getStoredToken();
  if (request._sessionUserId !== userId || !token || token === TOKEN_SESION_OFFLINE) throw error;

  // Otra petición puede haber renovado el token mientras esta esperaba.
  if (request.headers.get('Authorization') === `Bearer ${token}`) {
    if (!refreshPending) {
      refreshPending = authService.refreshAccessToken().finally(() => { refreshPending = null; });
    }
    await refreshPending;
  }
  // Solo un reintento; un fallo de red o sesión conserva los datos locales.
  return client(request);
});

export default client;
