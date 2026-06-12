# 🚀 MyVita - Quick Start (Expo)

El proyecto ahora corre sobre **Expo SDK 56** — no necesitas Android Studio.

## Ejecutar la app

```bash
npx expo start
```

Luego:

| Opción | Cómo |
|--------|------|
| **Tu teléfono** (recomendado) | Instala **Expo Go** (Play Store / App Store) y escanea el QR de la terminal |
| Emulador Android | Presiona `a` en la terminal |
| Navegador web | Presiona `w` |

## Teclas útiles en la terminal de Expo

- `r` → recargar la app
- `j` → abrir debugger
- `m` → menú de desarrollo
- `c` → mostrar QR de nuevo
- `Ctrl+C` → salir

## Probar la app (sin backend todavía)

1. **Regístrate** con cualquier email/contraseña — se guarda en SQLite local del dispositivo.
2. Inicia sesión con esas mismas credenciales.
3. Dashboard, alarmas, medicinas y diario funcionan 100% offline.
4. El Chat IA y la sincronización necesitan backend real (pendiente — `src/utils/constants.ts` → `API_BASE_URL`).

## Verificar sin dispositivo

```bash
npx tsc --noEmit                       # chequeo de tipos
npx expo export --platform android    # compila el bundle completo
```

## Si algo falla

```bash
npx expo start --clear      # limpia la caché de Metro
```

Si los módulos se corrompen:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Notas

- Las carpetas nativas viejas (RN CLI) están en `native_backup/` — ya no se usan. Si algún día necesitas un build nativo: `npx expo prebuild`.
- BLE (pastillero ESP32) requiere un **dev build** (`npx expo run:android`), no funciona en Expo Go.
