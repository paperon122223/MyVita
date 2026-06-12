// API Configuration
export const API_BASE_URL = 'https://api.myvita.example.com'; // TODO: update with real endpoint
export const API_TIMEOUT = 30000; // 30 seconds
export const SYNC_INTERVAL = 300000; // 5 minutes
export const OFFLINE_QUEUE_RETRY_INTERVAL = 60000; // 1 minute

// Alarm & Notification
export const ALARM_CHECK_INTERVAL = 30000; // 30 seconds
export const ALARM_CHECK_WINDOW = 120000; // ±2 minutes
export const ALARM_WATCHDOG_INTERVAL = 60000; // 1 minute
export const NOTIFICATION_CHANNEL_HIGH = 'alarmas_high';
export const NOTIFICATION_CHANNEL_DEFAULT = 'default';
export const ALARM_SOUND_NAME = 'alarm_sound';

// BLE Configuration
export const BLE_SCAN_TIMEOUT = 10000; // 10 seconds
export const BLE_HEARTBEAT_INTERVAL = 5000; // 5 seconds
export const BLE_RECONNECT_INTERVAL = 5000; // 5 seconds
export const BLE_MAX_RECONNECT_ATTEMPTS = 3;

// Database
export const DB_NAME = 'myvita.db';
export const DB_LOCATION = ''; // Use default location

// Storage Keys (AsyncStorage & MMKV)
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@myvita:auth_token',
  REFRESH_TOKEN: '@myvita:refresh_token',
  USER_ID: '@myvita:user_id',
  DARK_MODE: '@myvita:dark_mode',
  LAST_SYNC: '@myvita:last_sync',
  SYNC_QUEUE_VERSION: '@myvita:sync_queue_version',
} as const;

// UI Dimensions
export const UI_DIMENSIONS = {
  TOUCH_TARGET_MIN: 48, // dp
  ICON_SIZE_SMALL: 20,
  ICON_SIZE_MEDIUM: 24,
  ICON_SIZE_LARGE: 32,
  FONT_SIZE_BODY: 14,
  FONT_SIZE_BUTTON: 16,
  FONT_SIZE_HEADING: 28,
  BORDER_RADIUS_SMALL: 4,
  BORDER_RADIUS_MEDIUM: 8,
  BORDER_RADIUS_LARGE: 12,
} as const;

// Tab Navigation
export const TABS = {
  DASHBOARD: 0,
  MEDICATIONS: 1,
  ALARMS: 2,
  CHAT: 3,
  DIARY: 4,
  SOS: 5,
  SETTINGS: 6,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Sin conexión de red. Los cambios se sincronizarán cuando vuelvas a conectar.',
  AUTH_FAILED: 'Falla de autenticación. Por favor inicia sesión de nuevo.',
  INVALID_EMAIL: 'Email inválido.',
  PASSWORD_TOO_SHORT: 'La contraseña debe tener al menos 8 caracteres.',
  PASSWORDS_DONT_MATCH: 'Las contraseñas no coinciden.',
  USER_NOT_FOUND: 'Usuario no encontrado.',
  UNKNOWN_ERROR: 'Ocurrió un error desconocido. Por favor intenta de nuevo.',
  DATABASE_ERROR: 'Error de base de datos. Por favor intenta de nuevo.',
  SYNC_ERROR: 'Error al sincronizar. Por favor verifica tu conexión.',
  NOTIFICATION_ERROR: 'No se pudo enviar la notificación.',
  BLE_CONNECTION_ERROR: 'No se pudo conectar al dispositivo Bluetooth.',
  BLE_NOT_AVAILABLE: 'Bluetooth no disponible en este dispositivo.',
  LOCATION_ERROR: 'No se pudo obtener la ubicación.',
  CAMERA_ERROR: 'No se pudo acceder a la cámara.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  MEDICATION_MARKED: 'Medicamento marcado como tomado.',
  ALARM_CREATED: 'Alarma creada exitosamente.',
  ALARM_UPDATED: 'Alarma actualizada.',
  ALARM_DELETED: 'Alarma eliminada.',
  MEDICATION_CREATED: 'Medicamento agregado.',
  MEDICATION_UPDATED: 'Medicamento actualizado.',
  MEDICATION_DELETED: 'Medicamento eliminado.',
  SOS_SENT: 'Alerta SOS enviada a tus contactos de emergencia.',
  SYNC_SUCCESS: 'Sincronización completada.',
  LOGIN_SUCCESS: 'Bienvenido de vuelta!',
  LOGOUT_SUCCESS: 'Sesión cerrada.',
  PROFILE_UPDATED: 'Perfil actualizado.',
} as const;

// Alarm Frequencies
export const ALARM_FREQUENCIES = ['diaria', 'semanal', 'mensual', 'personalizada'] as const;

// Days of Week
export const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;

// Moods for Diary
export const MOOD_OPTIONS = [
  { value: 'muy_bien', label: '😄 Muy bien', emoji: '😄' },
  { value: 'bien', label: '🙂 Bien', emoji: '🙂' },
  { value: 'normal', label: '😐 Normal', emoji: '😐' },
  { value: 'mal', label: '😞 Mal', emoji: '😞' },
  { value: 'muy_mal', label: '😢 Muy mal', emoji: '😢' },
] as const;

// Gender Options
export const GENDER_OPTIONS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
  { value: 'Otro', label: 'Otro' },
] as const;

// API Endpoints
export const API_ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  REFRESH_TOKEN: '/auth/refresh',
  SYNC: '/sync',
  MEDICATIONS: '/medications',
  ALARMS: '/alarms',
  TOMAS: '/tomas',
  DIARY: '/diary',
  CHAT: '/chat/groq',
  SOS: '/sos',
  USER_PROFILE: '/user/profile',
  CONTACTS: '/contacts',
} as const;

// Retry Configuration
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY: 1000, // 1 second
  MAX_DELAY: 30000, // 30 seconds
  BACKOFF_MULTIPLIER: 2,
} as const;

// Sync Batch Size
export const SYNC_BATCH_SIZE = 100; // number of records to sync at once

// Accessibility
export const A11Y = {
  MIN_CONTRAST_RATIO: 4.5,
  MIN_TOUCH_TARGET: 48,
  FOCUS_OUTLINE_WIDTH: 2,
} as const;
