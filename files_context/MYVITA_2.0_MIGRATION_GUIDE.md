# 🔄 MyVita 2.0 - Guía Completa de Migración Cordova → React Native

## 📊 Análisis de Código Cordova

### Estructura Actual (Cordova)
```
www/
├── js/
│   ├── db.js (853 líneas) - SQLite
│   ├── alarm.js (1109 líneas) - Sistema de alarmas
│   ├── sos-system.js (767 líneas) - SOS
│   ├── settings.js (958 líneas) - Configuración
│   ├── map.js (605 líneas) - Mapas
│   ├── scan.js (602 líneas) - OCR
│   ├── chat-ai.js (529 líneas) - IA
│   ├── caregiver.js (577 líneas) - Cuidadores
│   ├── Diary.js (394 líneas) - Diario
│   ├── voice-commands.js (400 líneas) - Voz
│   ├── ai-medication-assistant.js (406 líneas)
│   ├── ai-analyzer.js (405 líneas)
│   └── ... (20+ archivos más)
├── css/ (20+ estilos)
├── html/ (15+ pantallas)
└── plugins/ (Cordova plugins)
```

### Componentes Clave a Migrar

#### 1. **Base de Datos (db.js - 853 líneas)**
- **Actual:** window.sqlitePlugin + Cordova SQLite Storage
- **Nuevo:** react-native-sqlite-storage
- **Tablas:** usuarios, medicamentos, prescripciones, alarmas, tomas, etc.
- **Migración:** Copiar esquema SQL directamente, adaptar Promise/callback

#### 2. **Sistema de Alarmas (alarm.js - 1109 líneas)**
- **Crítico:** Debe ser 100% robusto
- **Actual:** setInterval + SQLite + Notificaciones
- **Nuevo:** react-native-push-notification + react-native-background-task
- **Requisitos:** Persistencia offline, funcionamiento tras reinicio
- **Migración:** Extraer lógica pura, usar Redux para estado

#### 3. **BLE/Bluetooth (implícito en caregiver.js)**
- **Actual:** Cordova BLE Central plugin
- **Nuevo:** react-native-ble-plx
- **Funcionalidad:** Comunicar con pastillero IoT (ESP32)

#### 4. **Notificaciones (implícito en alarm.js)**
- **Actual:** cordova-plugin-local-notification
- **Nuevo:** react-native-push-notification + react-native-background-timer
- **Mejora:** Notificaciones más confiables

#### 5. **Geolocalización & Mapas**
- **Actual:** cordova-plugin-geolocation + Google Maps
- **Nuevo:** react-native-maps + @react-native-camera/camera
- **Uso:** SOS, farmacias cercanas

#### 6. **Cámara & OCR (scan.js - 602 líneas)**
- **Actual:** cordova-plugin-camera
- **Nuevo:** @react-native-camera/camera + react-native-ml-kit
- **OCR:** Reconocer recetas y medicamentos

#### 7. **IA Conversacional (chat-ai.js - 529 líneas)**
- **Actual:** API GROQ/LLaMA 3.1
- **Nuevo:** Mismo endpoint, usar Axios/Fetch
- **Mejora:** Mejor manejo de contexto

#### 8. **Autenticación**
- **Actual:** LocalStorage + SQLite
- **Nuevo:** Firebase Auth + encriptación nativa

---

## 🏗️ Estructura React Native 2.0

```
MyVita-RN/
├── src/
│   ├── screens/
│   │   ├── Auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   ├── Main/
│   │   │   ├── DashboardScreen.tsx
│   │   │   ├── AlarmScreen.tsx
│   │   │   ├── ChatScreen.tsx
│   │   │   ├── SOSScreen.tsx
│   │   │   ├── DiaryScreen.tsx
│   │   │   ├── SettingsScreen.tsx
│   │   │   └── MedicationsScreen.tsx
│   │   └── Modals/
│   ├── components/
│   │   ├── AlarmCard.tsx
│   │   ├── MedicationItem.tsx
│   │   ├── ChatBubble.tsx
│   │   └── ... (reutilizables)
│   ├── services/
│   │   ├── database.ts (SQLite)
│   │   ├── alarmService.ts (Lógica crítica)
│   │   ├── bleService.ts (Bluetooth)
│   │   ├── notificationService.ts
│   │   ├── apiService.ts (GROQ, Sync)
│   │   ├── syncService.ts (Offline-first)
│   │   └── authService.ts
│   ├── redux/
│   │   ├── slices/
│   │   │   ├── alarmSlice.ts
│   │   │   ├── userSlice.ts
│   │   │   ├── medicationSlice.ts
│   │   │   └── uiSlice.ts
│   │   └── store.ts
│   ├── hooks/
│   │   ├── useAlarms.ts
│   │   ├── useBLE.ts
│   │   ├── useDatabase.ts
│   │   └── useNotifications.ts
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   └── spacing.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   ├── App.tsx
│   └── index.ts
├── android/
├── ios/
├── package.json
└── tsconfig.json
```

---

## 📦 Dependencias Principales

```json
{
  "dependencies": {
    "react-native": "0.73.0",
    "@react-navigation/native": "^6.1.8",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "@react-navigation/stack": "^6.3.17",
    "react-native-screens": "^3.26.0",
    "react-native-safe-area-context": "^4.7.2",
    
    "@reduxjs/toolkit": "^1.9.7",
    "react-redux": "^8.1.3",
    
    "react-native-sqlite-storage": "^6.0.0",
    "react-native-ble-plx": "^3.1.0",
    "@react-native-camera/camera": "^5.6.1",
    "react-native-push-notification": "^8.1.1",
    "react-native-maps": "^1.7.1",
    "react-native-geolocation-service": "^5.3.1",
    
    "react-native-paper": "^5.11.4",
    "react-native-vector-icons": "^10.0.0",
    
    "axios": "^1.6.2",
    "zustand": "^4.4.1",
    
    "@react-native-async-storage/async-storage": "^1.21.0",
    "react-native-mmkv": "^2.13.1"
  },
  "devDependencies": {
    "@react-native/metro-config": "^0.73.8",
    "@testing-library/react-native": "^12.4.0",
    "jest": "^29.7.0",
    "typescript": "^5.3.3",
    "@types/react-native": "^0.73.0"
  }
}
```

---

## 🔑 Puntos Clave de Migración

### ✅ Garantías de No Romperse

1. **Alarmas (CRÍTICO)**
   - Persistencia con WorkManager (Android) + APScheduler (iOS)
   - Notificaciones con canal de alta prioridad
   - Sincronización cada 30 segundos
   - Test exhaustivos: 100+ casos

2. **Base de Datos**
   - Transacciones atómicas
   - Versionado automático
   - Backup automático
   - Recuperación ante crashes

3. **Sincronización**
   - Queue local para operaciones offline
   - Conflicto resolution automático
   - WebSocket para real-time

4. **BLE (Pastillero IoT)**
   - Reconexión automática
   - Heartbeat cada 5s
   - Timeout handling
   - Fallback a modo manual

### 📱 Accesibilidad

- **TalkBack/VoiceOver:** 100% compatible
- **Contraste:** WCAG AA (4.5:1 mínimo)
- **Tamaño mínimo:** 48dp para toques
- **Teclado:** Navegación completa
- **Modo oscuro:** Automático + Manual

---

## 🚀 Próximos Pasos

1. **Crear estructura base React Native** ✓ (Ya hecho)
2. **Implementar Services críticos** (Alarmas, BD, BLE)
3. **Migrar UI/UX** (Screens, Components)
4. **Testing exhaustivo** (Unit + Integration)
5. **Compilar APK** (Release)

---

**Última actualización:** 2026-06-12  
**Estado:** Listo para migración completa
