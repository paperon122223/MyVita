// User & Authentication
export interface User {
  id: string;
  nombre: string;
  email: string;
  usuario?: string;
  telefono?: string;
  edad?: number;
  genero?: 'M' | 'F' | 'Otro';
  telefonoEmergencia?: string;
  direccion?: string;
  foto?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

// Medications & Prescriptions
export interface Medicamento {
  id: string;
  usuarioId: string;
  nombre: string;
  dosis: string;
  presentacion: string;
  cantidad: number;
  descripcion?: string;
  efectosSecundarios?: string;
  contraindicaciones?: string;
  farmaco?: string;
  lote?: string;
  fechaVencimiento?: string;
  created_at: string;
  updated_at: string;
}

export interface Prescripcion {
  id: string;
  usuarioId: string;
  medicamentoId: string;
  medico: string;
  fechaInicio: string;
  fechaFin?: string;
  motivo: string;
  notas?: string;
  created_at: string;
  updated_at: string;
}

export interface Inventario {
  id: string;
  medicamentoId: string;
  cantidad: number;
  fechaUltimaActualizacion: string;
}

// Alarms & Medication History
// (forma alineada con el esquema SQLite y alarmService)
export type FrecuenciaAlarma = 'una_vez' | 'diaria' | 'semanal';

export interface Alarma {
  id: string;
  usuarioId: string;
  medicamentoId?: string;
  medicamentoNombre: string;
  dosis?: string;
  horaToma: string; // HH:mm
  hora: string; // alias de horaToma para las pantallas
  fecha: string; // YYYY-MM-DD
  tono?: string;
  volumen?: number;
  estaActiva: number;
  recordatorioSilenciado: number;
  tomado: number;
  descripcion?: string;
  frecuencia?: FrecuenciaAlarma;
  diasSemana?: number[]; // [0-6] donde 0=Domingo, 1=Lunes … 6=Sábado
  fechaFin?: string; // YYYY-MM-DD, undefined = sin fin
  recurrenciaId?: string; // agrupa todas las instancias de una serie
  silenciada?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Toma {
  id: string;
  usuarioId: string;
  alarmaId: string;
  medicamentoId: string;
  fecha: string; // YYYY-MM-DD
  horaProgramada: string; // HH:mm
  horaRegistrada: string; // HH:mm
  dosis?: string;
  notas?: string;
  tomada: boolean;
  confirmedBy?: string; // who confirmed (manual/ble/notification)
  created_at: string;
  updated_at: string;
}

// Caregivers
export interface Cuidador {
  id: string;
  usuarioId: string;
  nombre: string;
  relacion: string;
  email?: string;
  telefono?: string;
  notificaciones: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactoEmergencia {
  id: string;
  usuarioId: string;
  nombre: string;
  relacion: string;
  telefono: string;
  email?: string;
  prioridad: number; // 1=highest
  created_at: string;
  updated_at: string;
}

// Events
export interface EventoSOS {
  id: string;
  usuarioId: string;
  fechaHora: string;
  ubicacion?: string;
  latitud?: number;
  longitud?: number;
  contactosNotificados: string[]; // array of contact IDs
  estadoResolucion: 'pendiente' | 'en_proceso' | 'resuelto';
  notas?: string;
  created_at: string;
  updated_at: string;
}

// Diary
export interface DiarioEntrada {
  id: string;
  usuarioId: string;
  fecha: string; // YYYY-MM-DD
  titulo: string;
  contenido: string;
  estadoAnimo?: 'muy_bien' | 'bien' | 'normal' | 'mal' | 'muy_mal';
  sintomas?: string;
  created_at: string;
  updated_at: string;
}

// Chat History
export interface ChatMessage {
  id: string;
  usuarioId: string;
  role: 'user' | 'assistant';
  contenido: string;
  tokens?: number;
  created_at: string;
}

// Sync & Offline
export interface SyncQueue {
  id: string;
  tabla: string;
  operacion: 'INSERT' | 'UPDATE' | 'DELETE';
  recordId: string;
  datos: Record<string, any>;
  intentos: number;
  ultimoError?: string;
  created_at: string;
  synced_at?: string;
}

// Alarm Statistics
export interface AlarmStatistics {
  total: number;
  tomadas: number;
  pendientes: number;
  silenciadas: number;
  adherencia: number; // percentage 0-100
}

// Notifications
export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  soundName?: string;
  largeIcon?: string;
  smallIcon?: string;
  playSound?: boolean;
  vibrate?: boolean;
}

// BLE
export interface BLEDevice {
  id: string;
  name: string;
  rssi: number;
  isConnectable: boolean;
}

// API Responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface SyncResponse {
  usuarios?: User[];
  medicamentos?: Medicamento[];
  alarmas?: Alarma[];
  tomas?: Toma[];
  cuidadores?: Cuidador[];
  conflictos?: ConflictResolution[];
}

export interface ConflictResolution {
  tabla: string;
  id: string;
  local: Record<string, any>;
  remote: Record<string, any>;
  resolucion: 'keep_local' | 'keep_remote' | 'merge';
}

// Redux State
export interface UserState {
  currentUser: User | null;
  isAuthenticated: boolean;
  tokens: AuthTokens | null;
  loading: boolean;
  error: string | null;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSync: string | null;
}

export interface AlarmState {
  todayAlarms: Alarma[];
  statistics: AlarmStatistics;
  lastCheck: string | null;
  loading: boolean;
  error: string | null;
}

export interface MedicationState {
  medications: Medicamento[];
  prescriptions: Prescripcion[];
  inventory: Inventario[];
  loading: boolean;
  error: string | null;
}

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface UIState {
  darkMode: boolean;
  themeMode: ThemeMode;
  selectedTab: number;
  navigationReady: boolean;
  loading: Record<string, boolean>;
  errors: Record<string, string>;
}

export interface RootState {
  user: UserState;
  alarm: AlarmState;
  medication: MedicationState;
  ui: UIState;
}
