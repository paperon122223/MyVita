# MyVita 2.0 - Guía de Implementación

## ✅ Estado Actual

Se ha completado la **migración base de Cordova → React Native 2.0** con:
- Arquitectura completa (services, redux, hooks, navigation)
- 39 archivos TypeScript implementados
- Todas las pantallas principales creadas
- Sistema de autenticación
- Base de datos SQLite
- Notificaciones locales
- Sistema de alarmas
- Chat con IA
- Diario personal
- Botón SOS
- Soporte para dark mode

## 🚀 Próximos Pasos

### 1. **Compilar y Probar**
```bash
# Limpiar build
cd android && ./gradlew clean && cd ..

# Ejecutar en Android
npm run android

# O en iOS
npm run ios
```

### 2. **Implementar Componentes Faltantes (Phase 6)**
Crear componentes especializados en `src/components/`:
- `AlarmCard.tsx` - Tarjeta de alarma
- `MedicationCard.tsx` - Tarjeta de medicamento
- `ChatBubble.tsx` - Burbuja de mensaje
- `TimePickerInput.tsx` - Selector de hora
- `LoadingIndicator.tsx` - Indicador de carga

### 3. **Crear Sub-Screens Modal**
```
src/screens/Main/
├── CreateAlarmModal.tsx (time picker + medication selector)
├── MedicationDetailScreen.tsx (edit/delete)
└── ProfileScreen.tsx (edit user info)
```

### 4. **Conectar Real Backend**
En `src/utils/constants.ts`, actualizar:
```typescript
export const API_BASE_URL = 'https://tu-api.com'; // Reemplazar
```

Endpoints esperados:
- `POST /auth/login` - Autenticación
- `POST /auth/register` - Registro
- `GET /medications` - Obtener medicinas
- `GET /alarms` - Obtener alarmas
- `POST /sync` - Sincronización

### 5. **Configurar Notificaciones**
- Android: Crear canales en Firebase Cloud Messaging (FCM)
- iOS: Configurar Apple Push Notification (APN)
- Actualizar tokens en `notificationService.ts`

### 6. **Configurar BLE (IoT Pastillero)**
En `src/services/bleService.ts`, actualizar UUIDs:
```typescript
const SERVICE_UUID = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'; // Tu servicio
const CHARACTERISTIC_UUID = 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy'; // Tu característica
```

### 7. **Testing (Phase 8)**
```bash
# Ejecutar tests
npm test

# Con cobertura
npm test -- --coverage
```

Agregar tests en `__tests__/` para:
- Servicios (database, auth, API)
- Hooks (useAlarms, useDatabase, etc)
- Componentes (screens principales)
- Redux (actions, reducers)

### 8. **Build Release**
```bash
# Android APK
cd android && ./gradlew assembleRelease && cd ..

# Android Bundle
cd android && ./gradlew bundleRelease && cd ..

# iOS
cd ios && xcodebuild -workspace MyVita.xcworkspace -scheme MyVita -configuration Release && cd ..
```

## 📁 Estructura de Archivos

```
MyVita/
├── src/
│   ├── services/          ✅ (6 servicios core)
│   ├── redux/             ✅ (store + 4 slices)
│   ├── hooks/             ✅ (7 hooks)
│   ├── screens/           ✅ (Auth + 7 main)
│   ├── navigation/        ✅ (RootNavigator)
│   ├── components/        ⚠️ (Básicos solamente)
│   ├── types/             ✅ (Interfaces centralizadas)
│   ├── theme/             ✅ (Design system)
│   └── utils/             ✅ (Constants, validators)
├── android/               ⚠️ (Necesita config)
├── ios/                   ⚠️ (Necesita config)
├── App.tsx                ✅ (Listo)
└── package.json           ✅ (Listo)
```

## 🔧 Configuración Important

### Android
Editar `android/build.gradle`:
```gradle
allprojects {
    repositories {
        google()
        mavenCentral()
        // Agregar: maven { url 'https://maven.google.com' }
    }
}
```

### iOS
```bash
cd ios && pod install && cd ..
```

## 🎯 Checklist Final

- [ ] npm install sin errores
- [ ] npm run android compila exitosamente
- [ ] App abre sin crashes
- [ ] Login/Register funciona
- [ ] Dashboard muestra datos
- [ ] Dark mode toggle funciona
- [ ] Todas las tabs navegan
- [ ] Notificaciones se envían
- [ ] Base de datos persiste datos
- [ ] Redux devtools funciona (dev mode)

## 📝 Notas Importantes

1. **Base de Datos**: SQLite ya tiene todas las tablas definidas. Los datos persisten después de cerrar la app.

2. **Alarmas**: El `alarmService` corre cada 30 segundos. En producción, necesitas WorkManager (Android) y BGTask (iOS).

3. **Autenticación**: Actualmente usa AsyncStorage. Para producción, considera Firebase Authentication o backend seguro.

4. **Offline**: El app tiene soporte offline-first. Los cambios se sincronizan automáticamente cuando hay conexión.

5. **IA Chat**: Conecta con GROQ/LLaMA 3.1 vía `apiService`. Requiere API key válida.

## 🐛 Troubleshooting

### "Build failed: jcenter()"
✅ Solucionado - se removió react-native-camera

### "Cannot find module"
```bash
npm install --legacy-peer-deps
npm start -- --reset-cache
```

### "Red Box de Error"
1. Revisa la consola de Metro
2. Verifica que todos los servicios estén inicializados en `App.tsx`
3. Revisa Redux devtools para estado

### "Alarmas no funcionan"
1. Verifica notificationService esté inicializado
2. Comprueba que alarmService.init() se llamó
3. Revisa permisos de notificaciones en settings

## 📚 Recursos Útiles

- [React Native Docs](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)

## 👨‍💻 Desarrollo Futuro

Prioritario:
1. Implement modal screens (CreateAlarm, MedicationDetail)
2. Connect real backend API
3. Setup FCM/APN para notificaciones
4. Configure BLE pill dispenser
5. Add comprehensive testing

Nice to have:
- Offline map caching
- Voice commands
- Health insurance integration
- Doctor consultation booking
- Medication refill reminders

---

**Última Actualización**: 2026-06-12  
**Versión**: 1.0.0-beta  
**Estado**: Listo para development & testing
