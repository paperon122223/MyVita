# MyVita

Aplicación móvil en español para gestionar medicamentos, recordatorios, historial de tomas, diario personal, cuidadores y contactos de emergencia. Incluye un asistente y sincronización con un backend.

## Desarrollo

Proyecto React Native con Expo y TypeScript. Usa SQLite para almacenamiento local, Redux para estado y React Navigation para navegación.

```bash
npm ci
npm start
```

Para compilar e instalar en Android, con Android SDK y un emulador o dispositivo conectado:

```bash
npm run android
```

Para iOS se necesita macOS y Xcode: `npm run ios`. Las funciones nativas deben verificarse con una compilación de desarrollo; el empaquetado de JavaScript no comprueba permisos, alarmas ni comportamiento del sistema operativo.

## Verificación

```bash
npm test
npm run typecheck
npx expo export --platform android --output-dir /tmp/myvita-export
```

Las pruebas de `tests/core.test.cjs` usan el ejecutor integrado de Node y SQLite en memoria (requieren Node 22.13 o posterior). Ejecutan los servicios reales sustituyendo los puentes nativos. Cubren fechas, validación, persistencia, inventario, recurrencias, respaldos y solicitudes de notificación. No sustituyen las pruebas en Android. `__tests__` contiene una prueba React heredada que no forma parte de esta suite.

## Estructura

- `App.tsx`: fuentes, inicialización, temas y proveedores.
- `src/screens`: pantallas de acceso y funciones principales.
- `src/components/ui`: componentes visuales compartidos.
- `src/services`: almacenamiento, autenticación, alarmas y sincronización.
- `src/hooks`: formularios y acceso a datos.
- `src/theme`: estilos y colores.
- `src/utils/constants.ts`: configuración de API y servicios.

## Comprobación en dispositivo

Antes de publicar, comprobar acceso y reinicio de sesión, creación y edición de medicamentos, recordatorios con la app cerrada, confirmación de tomas, operación sin conexión y posterior sincronización. Revisar permisos denegados, texto grande, lector de pantalla y temas claro/oscuro. Las acciones SOS deben probarse con contactos de prueba que hayan aceptado participar.
