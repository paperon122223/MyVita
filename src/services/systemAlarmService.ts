// ================================================================
// systemAlarmService.ts — Alarmas en el reloj del sistema (Google Clock)
//
// Usa el intent oficial de Android ACTION_SET_ALARM para registrar la
// alarma en la app de reloj del teléfono. Así la alarma suena aunque
// MyVita esté cerrada o el teléfono se reinicie — doble respaldo.
// Requiere el permiso com.android.alarm.permission.SET_ALARM (app.json).
// ================================================================

import { Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

const ACTION_SET_ALARM = 'android.intent.action.SET_ALARM';

export const SystemAlarmService = {
  /**
   * Registrar una alarma en el reloj del sistema.
   * @param hora    formato HH:mm
   * @param mensaje etiqueta visible en Google Clock
   * @param silencioso true = se crea sin abrir la app de reloj (SKIP_UI)
   * @returns true si el intent se lanzó correctamente
   */
  async guardarEnReloj(hora: string, mensaje: string, silencioso = true): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    const [h, m] = hora.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return false;

    try {
      await IntentLauncher.startActivityAsync(ACTION_SET_ALARM, {
        extra: {
          'android.intent.extra.alarm.HOUR': h,
          'android.intent.extra.alarm.MINUTES': m,
          'android.intent.extra.alarm.MESSAGE': mensaje,
          'android.intent.extra.alarm.SKIP_UI': silencioso,
          'android.intent.extra.alarm.VIBRATE': true,
        },
      });
      console.log(`⏰ Alarma registrada en el reloj del sistema: ${hora} — ${mensaje}`);
      return true;
    } catch (error) {
      console.warn('No se pudo registrar la alarma en el reloj del sistema:', error);
      // Reintentar abriendo la UI del reloj (no necesita SKIP_UI ni permiso)
      if (silencioso) {
        try {
          await IntentLauncher.startActivityAsync(ACTION_SET_ALARM, {
            extra: {
              'android.intent.extra.alarm.HOUR': h,
              'android.intent.extra.alarm.MINUTES': m,
              'android.intent.extra.alarm.MESSAGE': mensaje,
            },
          });
          return true;
        } catch (e) {
          console.warn('Tampoco se pudo abrir la app de reloj:', e);
        }
      }
      return false;
    }
  },

  /**
   * Abrir la lista de alarmas del reloj del sistema
   */
  async verAlarmasDelReloj(): Promise<void> {
    if (Platform.OS !== 'android') return;
    try {
      await IntentLauncher.startActivityAsync('android.intent.action.SHOW_ALARMS');
    } catch (error) {
      console.warn('No se pudo abrir la app de reloj:', error);
    }
  },
};

export default SystemAlarmService;
