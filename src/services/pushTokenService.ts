// ================================================================
// pushTokenService.ts — Registro del token de notificaciones push
//
// Permite que el backend le avise al teléfono (push silenciosa) cuando
// algo cambió del lado del servidor (por ejemplo, una alarma creada por
// el futuro skill de Alexa), para disparar un pull-sync casi al instante.
// Si falla (sin permisos, sin proyecto EAS vinculado, etc.) no debe
// romper nada más: el watchdog local sigue jalando cambios cada minuto
// como respaldo.
// ================================================================

import * as Device from 'expo-device';
import Constants from 'expo-constants';
import axios from 'axios';
import { Notifications } from '../utils/notificationsModule';
import { API_BASE_URL } from '../utils/constants';
import authService from './authService';
import { TOKEN_SESION_OFFLINE } from './offlineAuthService';

class PushTokenService {
  private registrado = false;

  /** Pide permiso, obtiene el token de Expo y lo manda al backend. */
  async registrar(usuarioId: string): Promise<void> {
    if (this.registrado || !Notifications || !Device.isDevice) return;

    try {
      const { status: existente } = await Notifications.getPermissionsAsync();
      let status = existente;
      if (status !== 'granted') {
        const solicitado = await Notifications.requestPermissionsAsync();
        status = solicitado.status;
      }
      if (status !== 'granted') return;

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) {
        console.warn('[push] Sin projectId de EAS — no se puede obtener el push token');
        return;
      }

      // El backend ahora exige JWT (identidad viene del token, no del
      // body) — en sesión offline no hay uno real, así que no hay nada
      // que registrar todavía (se reintentará en el próximo login online).
      const authToken = await authService.getStoredToken();
      if (!authToken || authToken === TOKEN_SESION_OFFLINE) return;

      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

      await axios.post(
        `${API_BASE_URL}/auth/push-token`,
        { push_token: token },
        { headers: { Authorization: `Bearer ${authToken}` } },
      );

      this.registrado = true;
      console.log('✅ Push token registrado');
    } catch (error) {
      console.warn('[push] No se pudo registrar el push token:', error);
    }
  }
}

export default new PushTokenService();
