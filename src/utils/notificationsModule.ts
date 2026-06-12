// ================================================================
// notificationsModule.ts — Carga condicional de expo-notifications
//
// Desde el SDK 53, expo-notifications LANZA UN ERROR al importarse
// dentro de Expo Go (Android). En builds nativos (APK / dev build)
// funciona normal. Por eso el módulo se carga dinámicamente solo
// cuando NO estamos en Expo Go.
// ================================================================

import Constants from 'expo-constants';
import type * as NotificationsT from 'expo-notifications';

declare const require: any;

export const isExpoGo = Constants.executionEnvironment === 'storeClient';

export const Notifications: typeof NotificationsT | null = isExpoGo
  ? null
  : require('expo-notifications');

if (isExpoGo) {
  console.log(
    '🔕 Notificaciones deshabilitadas en Expo Go. ' +
      'Funcionarán en el APK final o dev build (npx expo run:android).',
  );
}
