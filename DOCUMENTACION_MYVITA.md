# 📱 MyVita — Documentación completa

**App móvil de gestión de medicamentos para adultos mayores.**
Recuérdales sus tomas, lleva su diario de salud, habla con un asistente médico de IA y pide ayuda en emergencias — funcionando con y sin internet.

---

## 1. ¿Qué es MyVita?

MyVita ayuda a personas mayores a:
- **No olvidar sus medicamentos** (alarmas + notificaciones con botones).
- **Llevar control** de medicinas, tomas, adherencia y diario de salud.
- **Consultar dudas** con un asistente médico de IA que conoce su tratamiento.
- **Pedir ayuda** en una emergencia (SOS por WhatsApp/SMS con ubicación).

Está pensada para **baja visión y poca experiencia tecnológica**: letra grande, alto contraste, botones grandes.

---

## 2. Historia del proyecto (de dónde venimos)

| Etapa | Qué pasó |
|-------|----------|
| **Origen** | App vieja hecha en **Cordova** (HTML/JS en `www/`). |
| **Migración fallida** | Se intentó React Native CLI "bare" → nunca compiló (Gradle 9 incompatible, jcenter muerto). |
| **Decisión clave** | Se pasó a **Expo SDK 56** (managed workflow) trasplantando el template oficial. |
| **Reconstrucción** | Servicios reescritos a APIs de Expo (SQLite, notificaciones, etc.). |
| **Backend** | Se desplegó el backend Node/Express (de la app Cordova) en **Railway**. |
| **Rediseño** | Se aplicó un sistema visual nuevo **Material 3 "Premium Wellness"**. |
| **SOS avanzado** | Selector de contactos del teléfono + alerta por WhatsApp/SMS + ubicación. |

---

## 3. Stack tecnológico

### App (móvil)
- **Expo SDK ~56** · React Native 0.85.3 · React 19.2.3 · **TypeScript** (strict)
- **Redux Toolkit** + react-redux (estado global: user, alarm, medication, ui)
- **React Navigation v7** (stack de auth + bottom-tabs de 7 pestañas)
- **react-native-paper** (componentes Material) + sistema de diseño propio
- **Base de datos local: expo-sqlite** (11 tablas, offline-first)
- **Notificaciones: expo-notifications** (canales, acciones, programadas)
- **Fuentes: Poppins** (@expo-google-fonts/poppins)
- **Animaciones: react-native-reanimated** · **Gráficos: react-native-svg**
- **expo-linear-gradient** (gradientes) · **expo-haptics** (vibración)
- **expo-contacts** (agenda) · **expo-sms** · **expo-location** (SOS)
- **expo-intent-launcher** (guardar alarmas en el reloj del sistema)
- **@react-native-community/datetimepicker** (selector de hora)

### Backend (nube)
- **Node.js + Express** desplegado en **Railway**
- **Supabase** (autenticación + base de datos en la nube)
- **GROQ** (IA del chat — modelo llama-3.1-8b-instant)
- **MapTiler** (mapas/geocoding)
- Seguridad: helmet, CORS, rate limiting, validación con Joi

**URL del backend:** `https://myvita-backend-production-a84d.up.railway.app`

---

## 4. Arquitectura

### Flujo de datos (offline-first)
```
Pantalla → Hook → Servicio → SQLite local (siempre)
                                   ↓ (cuando hay internet)
                            apiService → Backend Railway → Supabase
```
Todo se guarda **primero en el teléfono** (SQLite). El backend sincroniza cuando hay red. La app **nunca depende de internet** para funcionar; la red solo agrega sincronización y el chat IA.

### Autenticación (doble vía)
- **Con internet:** registro/login contra **Supabase** (vía backend). Contraseñas cifradas por Supabase. El usuario se crea **ya confirmado** (sin email de verificación).
- **Sin internet:** login/registro local contra SQLite (modo offline).
- La sesión se recuerda al reabrir la app (como WhatsApp).

### Servicios principales (`src/services/`)
| Servicio | Qué hace |
|----------|----------|
| `database.ts` | SQLite: 11 tablas, CRUD, estadísticas (adherencia, racha, semana) |
| `authService.ts` | Login/registro nube + offline, tokens, espejo local |
| `apiService.ts` | Sincronización con el backend por tabla |
| `chatService.ts` | Chat IA: arma contexto médico y llama al backend → GROQ |
| `alarmService.ts` | Monitor de alarmas (30s) + notificaciones programadas |
| `notificationService.ts` | Canales, acciones "✓ Ya lo tomé"/"⏰ En 10 min", prefs |
| `systemAlarmService.ts` | Guarda alarmas en el reloj del teléfono (Google Clock) |
| `emergencyService.ts` | SOS: contactos del teléfono, WhatsApp, SMS, ubicación |

### Base de datos local (11 tablas)
`usuarios`, `medicamentos`, `prescripciones`, `alarmas`, `tomas`, `cuidadores`, `diario_entradas`, `contactos_emergencia`, `eventos_sos`, `chat_history`, `inventario`. Todas con `synced_at` (sincronización) y `deleted_at` (borrado suave).

---

## 5. Pantallas (página por página)

La app tiene **2 pantallas de acceso** + **7 pestañas** inferiores.

### 🔐 Login / Registro
- Logo **MyVita** (V verde), inputs grandes con ícono, "Recordar sesión", "¿Olvidaste tu contraseña?".
- Registro: nombre, usuario (sin espacios), correo, teléfono, contraseña (mín. 8).
- Crea la cuenta en la nube + espejo local para uso offline.

### 🏠 Inicio (Dashboard)
- Tarjeta de bienvenida con saludo por hora + frase + **anillo animado de adherencia** ("85% META").
- 4 estadísticas: Adherencia · Medicinas activas · Pendientes · Racha (días seguidos).
- **Próximas tomas** con hora, medicamento y botón verde para marcar tomada.
- Accesos rápidos: Asistente IA, Mi Diario, Emergencia.

### 💊 Medicinas
- Lista con buscador, tiles de colores y nombre/dosis/notas.
- Botón **Agregar** → modal (nombre, dosis, unidad, notas).

### ⏰ Alarmas
- Barra de **Progreso Diario** (X de Y tomas completadas + anillo).
- Cada alarma: badge de hora con período (**MAÑANA/TARDE/NOCHE**), estado (Pendiente/Tomado/Silenciado), botón **"Tomar Medicina"**, silenciar y borrar.
- Crear alarma: medicamento, dosis, **selector de hora**, **frecuencia** (una vez/diaria/semanal con días), e interruptor **"Guardar en el reloj del teléfono"**.

### 🤖 Chat (Asistente Médico IA)
- Chips de sugerencias, burbujas grandes, indicador "Escribiendo…".
- Conoce tus medicamentos, tomas y adherencia. Historial guardado. No diagnostica.

### 📔 Diario
- Estado de ánimo (5 emojis), síntomas y notas del día.
- Lista de **entradas recientes** (Hoy/Ayer/día) con su emoji.

### 🆘 SOS (Emergencia)
- Botón rojo grande de emergencia.
- **Contactos de emergencia**: se eligen de la **agenda del teléfono** (con buscador propio dentro de la app) o a mano.
- Al activar el SOS, eliges enviar la alerta por:
  - **💬 WhatsApp** (al contacto principal)
  - **✉️ SMS** (a todos los contactos)
  - **📞 Llamada**
- El mensaje incluye tu **ubicación actual** (enlace de Google Maps).

### ⚙️ Configuración
- Perfil (nombre, correo).
- **Tema:** Claro / Oscuro / Automático.
- **Notificaciones:** sonido, vibración, botón de prueba.
- Datos (copia/restaurar/eliminar), info de la app, cerrar sesión.

### Componentes transversales
- **Notificaciones nativas** con botones de acción y el ícono de cápsula azul.
- **Barra inferior** con píldora verde en la pestaña activa (se adapta al modo oscuro y sube por encima de la barra del sistema).

---

## 6. Sistema de diseño — Material 3 "Premium Wellness"

Pensado para máxima legibilidad en adultos mayores.

| Elemento | Valor |
|----------|-------|
| **Azul primario** | `#006096` |
| **Verde vitalidad** | `#006e2a` |
| **Gradiente firma** | azul → verde |
| **Fondo** | `#f8f9ff` (claro) · `#0f172a` (oscuro) |
| **Tipografía** | Poppins, **mínimo 18px** en cuerpo |
| **Esquinas** | Tarjetas 24px, botones/inputs 16px |
| **Tiles de íconos** | Contenedores de color suave (azul/verde/naranja/rojo) |
| **Accesibilidad** | Zonas táctiles ≥ 48px, alto contraste (WCAG AA) |

Componentes propios: `GradientButton`, `StatCard`, `AdherenceRing`.
Ícono y splash propios (cápsula sobre gradiente) generados con `scripts/generate-assets.js`.

---

## 7. Lo que hemos construido (resumen de logros)

✅ Migración completa de Cordova → React Native (Expo SDK 56)
✅ Base de datos local SQLite con 11 tablas y estadísticas
✅ Autenticación nube (Supabase) + offline local
✅ **Backend desplegado en Railway** con Supabase + GROQ + MapTiler
✅ Chat IA funcional (arregla el error 401 que tenía la app)
✅ Alarmas con frecuencia, días, y respaldo en el reloj del sistema
✅ Notificaciones con botones "✓ Ya lo tomé" / "⏰ En 10 min"
✅ Modo claro / oscuro / automático
✅ Rediseño completo de las 11 pantallas (Material 3)
✅ Tipografía Poppins, animaciones, vibración háptica, ícono y splash propios
✅ SOS avanzado: selector de contactos + WhatsApp + SMS + ubicación
✅ APK nativo instalable, compilado e instalado en dispositivo real

---

## 8. Cómo compilar e instalar

```bash
# Verificar tipos (sin compilar)
npx tsc --noEmit

# Generar el proyecto nativo (tras cambiar plugins/permisos)
npx expo prebuild --platform android --no-install

# Compilar el APK de release
cd android
JAVA_HOME="C:/Program Files/Java/jdk-21.0.11" ./gradlew assembleRelease --no-daemon

# Instalar en el teléfono (USB con depuración activada)
adb install -r android/app/build/outputs/apk/release/app-release.apk
```
El APK queda en `android/app/build/outputs/apk/release/app-release.apk` (~95 MB) y se puede compartir a otros teléfonos.

**Backend (re-desplegar):**
```bash
cd files_context/backend/myvita-backend
railway up
```

---

## 9. Pendientes / próximos pasos

🔴 **Hacer commit** del trabajo (hay muchos cambios sin respaldar en git).
🟡 Hashear las contraseñas guardadas en SQLite local (el backend ya las cifra).
🟡 Migrar módulos de la app vieja aún sin pantalla:
   - **Cuidador** (vincular un familiar — el backend ya está listo)
   - **Inventario** (control de stock con avisos de "pocas pastillas")
   - **Mapa del SOS** (el backend ya sirve mapas con MapTiler)
   - Comandos de voz · Detector de interacciones · Escanear receta (OCR)
🟢 Editar/borrar medicinas y contactos · Sincronización automática en segundo plano · Tests.

---

## 10. Notas técnicas importantes

- **No funciona en Expo Go** (usa módulos nativos). Siempre se usa el **APK** o `npx expo run:android`.
- Las notificaciones solo funcionan en el APK nativo (Expo Go las quitó desde SDK 53).
- El selector de contactos usa una **lista propia dentro de la app** (el selector nativo de Android falla en algunos teléfonos Xiaomi/MediaTek).
- WhatsApp/SMS **se abren con el mensaje ya escrito** y el usuario da "Enviar" (Android no permite enviar 100% automático sin apps especiales).
- Los secretos (llaves de Supabase, GROQ) viven en **variables de entorno de Railway**, nunca en el código. La carpeta `files_context/` está fuera de git.

---

*Documento generado para el proyecto MyVita 2.0.*
