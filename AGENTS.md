# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Expo dev server (Metro bundler)
npm run android    # Build + install on connected Android device (expo run:android)
npm run ios        # Build + install on iOS simulator
npm run web        # Web mode via Expo
```

**This app is NOT compatible with Expo Go** — it uses native plugins (expo-sqlite, expo-notifications, datetimepicker) that require a full development build. Always use `npm run android`.

To run on a physical Android device, ADB must be in PATH. On this machine the SDK is at:
`C:\Users\edaga\AppData\Local\Android\Sdk\platform-tools\adb.exe`

There are no linting or test scripts configured in package.json. TypeScript is checked implicitly by the Expo build (`tsconfig.json` uses `strict: true`). Files excluded from type-checking: `src/services/bleService.ts`, `src/hooks/useBLE.ts`, `__tests__/`.

## Architecture

### Stack
React Native 0.85 / Expo ~56 / TypeScript strict / Redux Toolkit / SQLite (local) / Axios (Railway backend).

### Data flow
**Offline-first:** All writes go to SQLite first via `DatabaseService` (`src/services/database.ts`). The sync layer (`src/services/apiService.ts`) pushes to the Railway backend asynchronously. The `synced_at` column on every table tracks sync state.

### Services (singletons)
- **`DatabaseService`** (`src/services/database.ts`) — Single `SQLiteDatabase` instance guarded by an `initPromise` to prevent concurrent init. All screens reach the DB through it. Custom SQL can be run via `DatabaseService.ejecutar(sql, params)`.
- **`alarmService`** (`src/services/alarmService.ts`) — Singleton class instance. Owns the in-memory alarm array for today, a 30-second poll interval, and a 1-minute watchdog that re-reads the DB. Currently only loads `fecha = today` — alarm recurrence is not yet implemented.
- **`NotificationService`** (`src/services/notificationService.ts`) — Singleton. Sets up Android notification channels (`myvita-alarmas`, `myvita-alarmas-sv`) and the `alarma-medicamento` category with "Ya lo tomé" / "En 10 min" action buttons. The snooze (ACCION_POSPONER) path is implemented; the TOMAR path marks the alarm in SQLite directly without opening the app.
- **`notificationsModule`** (`src/utils/notificationsModule.ts`) — Guards against Expo Go: exports `Notifications = null` when running in Expo Go so all callers just skip notification logic with `if (!Notifications) return`.

### Hooks
Screens do not call services directly — they go through hooks:
- **`useAlarms`** (`src/hooks/useAlarms.ts`) — Calls `alarmService.init()` on mount, returns `{ alarms, statistics, markTaken, silenceAlarm, createAlarm, refreshAlarms }`. Also dispatches to Redux (`alarmSlice`).
- **`useDatabase`** (`src/hooks/useDatabase.ts`) — Generic data hooks: `useMedicamentos`, `useContactosEmergencia`, etc.
- **`useDarkMode`** (`src/hooks/useDarkMode.ts`) — Returns `{ isDark, mode, setThemeMode, toggle }`. Persists to AsyncStorage and Redux (`uiSlice`).

### Redux store (`src/redux/store.ts`)
Four slices: `user`, `alarm`, `medication`, `ui`. Serializable check ignores token fields in `user`.

### Design system (`src/theme/designSystem.ts`)
Single source of truth for colors, fonts, spacing, border radii, shadows, and gradients. Always import as `DesignSystem as DS` or `DesignSystem`.

**Critical for Android:** Poppins is loaded as separate weight families. Use `fontFamily: DS.fonts.bold` (etc.), never bare `fontWeight: '700'` — on Android the latter won't activate the loaded font.

**Dark mode pattern:** Colors that depend on the theme must be applied inline, not in `StyleSheet.create`. Common pattern:
```ts
const bg = isDark ? DS.colors.surfaceDark : DS.colors.surface;
const cardBg = isDark ? DS.colors.cardDark : DS.colors.card;
const textColor = isDark ? DS.colors.textDark : DS.colors.text;
const mutedColor = isDark ? DS.colors.mutedDark : DS.colors.muted;
```
Modal `TextInput` borders must also be set inline: `borderColor: isDark ? DS.colors.borderDark : DS.colors.border`.

### Navigation (`src/navigation/RootNavigator.tsx`)
`NavigationContainer` → `RootStack` (Auth or Main). Main is a `BottomTabNavigator` with 7 tabs: Dashboard, Medications, Alarms, Chat, Diary, SOS, Settings. Tab names are `DashboardTab`, `MedicationsTab`, etc. Navigate between tabs with `navigation.navigate('ChatTab')`.

### Backend
Railway: `https://myvita-backend-production-a84d.up.railway.app/api`. Configured in `src/utils/constants.ts` as `API_BASE_URL`. For local development, change to the LAN IP commented in that file.

### SQLite schema
Tables: `usuarios`, `medicamentos`, `prescripciones`, `alarmas`, `tomas`, `cuidadores`, `diario_entradas`, `contactos_emergencia`, `eventos_sos`, `chat_history`, `inventario`. All have `synced_at` and `deleted_at` for soft-delete and sync tracking. **Several tables exist but have no UI yet:** `prescripciones`, `inventario`, `cuidadores`, `tomas` (historial visible).

### BLE (dispensador inteligente)
`src/services/bleService.ts` and `src/hooks/useBLE.ts` are excluded from the TypeScript build. The code exists as a skeleton for future integration with a Vita Dispenser (ESP32-C3 over Nordic UART Service).
