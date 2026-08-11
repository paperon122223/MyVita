# Prompt para rediseñar MyVita

> Copia todo lo de abajo y pégalo en tu herramienta de diseño (v0, Figma AI, Claude, ChatGPT con imágenes, o pásaselo a un diseñador).

---

## ROL Y OBJETIVO

Actúa como un diseñador de producto senior especializado en apps de salud para **adultos mayores**. Quiero que rediseñes la interfaz de **MyVita**, una app móvil (Android, React Native) de **gestión de medicamentos** que ayuda a personas mayores a no olvidar sus tomas, llevar un diario de salud, hablar con un asistente médico de IA y pedir ayuda en emergencias.

El rediseño debe **mantener la identidad de marca** (gradiente azul → verde) pero elevar la calidad visual a nivel "app premium de la App Store": moderno, limpio, con jerarquía clara. **La prioridad #1 es la accesibilidad para personas mayores**: texto grande y legible, alto contraste, botones grandes (mínimo 48dp), iconografía clara, nada de elementos diminutos ni dependientes solo del color.

Entrégame: propuesta visual de cada pantalla, sistema de diseño actualizado (colores, tipografía, espaciados, componentes), y notas de accesibilidad.

---

## SISTEMA DE DISEÑO ACTUAL (punto de partida)

**Paleta de marca:**
- Azul primario: `#0288d1` · Verde secundario: `#00c853`
- Gradiente firma: azul → verde (`#0288d1 → #00c853`), usado en logo, botones, encabezados y tiles de íconos
- Gradientes por categoría: Adherencia (verde `#00c853→#00e676`), Activos (azul `#0288d1→#03a9f4`), Pendientes (naranja `#ff9800→#ffb74d`), Racha/Emergencia (rojo `#f44336→#ff5252`)
- Fondo claro: `#f0f4f8` · Tarjetas: blanco · Texto: `#1a202c` · Texto tenue: `#64748b`
- Modo oscuro: fondo `#0f172a`, tarjetas `#1e293b`, texto `#f1f5f9`

**Tipografía:** Poppins (pesos 400 a 800). Títulos en ExtraBold, números grandes y gruesos.

**Forma y profundidad:** esquinas muy redondeadas (radios 20–24px), sombras suaves de tono azulado, tiles de íconos con gradiente.

**Efectos actuales:** anillo de progreso circular animado, animaciones de entrada en cascada (fade + slide), vibración háptica al tocar, botones que se encogen al presionar.

**Modos:** Claro / Oscuro / Automático.

---

## ESTRUCTURA: la app tiene 2 pantallas de acceso + 7 pestañas inferiores

Barra de navegación inferior con 7 pestañas: **Inicio · Medicinas · Alarmas · Chat · Diario · SOS · Config**. Íconos Material Design, pestaña activa en azul.

---

## PÁGINA POR PÁGINA (qué tiene y qué hace cada cosa)

### 0. Splash (pantalla de carga)
- Logo de MyVita (cápsula blanca sobre gradiente azul→verde) centrado sobre fondo claro/oscuro mientras cargan las fuentes.

### 1. Login (Iniciar sesión)
- **Logo** con gradiente + ícono de cápsula, título **"MyVita"**, subtítulo *"Tu salud, siempre a tiempo"*.
- **Tarjeta de formulario** con:
  - Campo **Correo electrónico** (ícono de sobre).
  - Campo **Contraseña** (ícono de candado + botón de ojo para mostrar/ocultar).
  - Caja de **error** roja cuando algo falla.
  - **Botón gradiente "Iniciar Sesión"** (muestra spinner al cargar).
  - Enlace *"¿No tienes cuenta? Regístrate aquí"*.
- Animación de entrada del logo y la tarjeta.
- **Función:** valida el correo, entra a la cuenta (en la nube vía backend, o local si no hay internet).

### 2. Registro (Crear cuenta)
- Logo + título **"Crear Cuenta"** + subtítulo.
- Campos: **Nombre completo**, **Usuario** (sin espacios), **Correo**, **Teléfono** (opcional), **Contraseña** (mín. 8), **Confirmar contraseña**. Cada uno con su ícono.
- Caja de error, **botón gradiente "Registrarse"**, enlace a Login.
- **Función:** crea la cuenta nueva y entra directo.

### 3. Inicio / Dashboard
- **Tarjeta de bienvenida** con gradiente: saludo según la hora (*"¡Buenos días, Edgar!"*), frase motivacional, fecha, y un **anillo circular animado** que muestra el % de adherencia del día.
- **Cuadrícula 2×2 de estadísticas** (cada tile con su ícono en gradiente):
  - **Adherencia hoy** (%) · **Medicamentos** (cantidad activa) · **Pendientes hoy** · **Racha** (días seguidos cumpliendo).
- **Tarjeta "Próximas tomas":** lista de hasta 3 alarmas pendientes (hora en badge, nombre del medicamento, dosis) con **botón verde de check** para marcar como tomada. Enlace *"Ver todas"*. Si no hay pendientes: *"¡Todo tomado por hoy!"*.
- **Tarjeta "Esta semana":** mini gráfica de barras por día (verde = tomados, rojo = perdidos) con leyenda.
- **Accesos rápidos:** 3 tarjetas grandes → **Asistente IA**, **Mi Diario**, **Emergencia**.
- **Función:** vista general de salud del día; deslizar hacia abajo recarga; tocar el check vibra y registra la toma.

### 4. Medicinas
- **Lista de medicamentos:** cada tarjeta con ícono en gradiente, nombre, dosis + unidad, y notas.
- **Estado vacío:** ícono + *"Sin medicamentos / Agrega tus medicamentos…"*.
- **Botón flotante (FAB) "Agregar"** con gradiente.
- **Modal "Nuevo Medicamento":** campos Nombre*, Dosis, Unidad (mg/ml/tabletas), Notas, botón **Guardar**.
- **Función:** registrar y consultar el catálogo personal de medicamentos.

### 5. Alarmas
- **Lista de alarmas del día:** hora en badge, nombre del medicamento, dosis, y **chips de estado** (Tomada / Pendiente / Silenciada). Cada alarma pendiente tiene **botón verde de check** (marcar tomada) y **botón de silenciar**.
- **Estado vacío** con ícono.
- **FAB "Nueva Alarma".**
- **Modal "Nueva Alarma":** campo Medicamento, Dosis, **selector de hora** (reloj nativo), **interruptor "Guardar en el reloj del teléfono"** (también suena en la app de reloj del sistema), botón **Crear**.
- **Función:** programar recordatorios; cada uno dispara una **notificación con botones "✓ Ya lo tomé" y "⏰ En 10 min"**.

### 6. Chat (Asistente Médico IA)
- **Estado inicial:** ícono grande en gradiente, título *"Asistente Médico"*, descripción, y **chips de sugerencias** (ej.: *"¿Ya tomé mis medicamentos de hoy?"*, *"¿Cómo va mi adherencia?"*).
- **Conversación:** burbujas del usuario (gradiente, alineadas a la derecha) y del asistente (tarjeta con avatar, a la izquierda), con hora. Indicador *"Escribiendo…"*.
- **Barra inferior:** campo de texto multilínea + **botón enviar** en gradiente.
- **Función:** asistente de IA que conoce tus medicamentos, tomas y adherencia para responder dudas (no diagnostica). Guarda el historial.

### 7. Diario
- **Fecha del día** arriba.
- **Tarjeta "¿Cómo te sientes hoy?":** fila de **5 emojis de ánimo** seleccionables (Muy mal → Muy bien), campo **Síntomas**, campo **Notas del día**, botón **Guardar Entrada**.
- **Tarjeta "Entradas recientes":** lista con emoji de ánimo, fecha, síntomas y notas de cada día.
- **Función:** llevar un diario de salud y estado de ánimo que también alimenta al asistente de IA.

### 8. SOS (Emergencia)
- **Botón circular grande rojo "EMERGENCIA"** (gradiente rojo) con instrucción debajo.
- **Tarjeta "Contactos de emergencia":** lista con avatar (el principal resaltado), nombre, relación, y **botón verde de llamar**. Botón **+** para agregar.
- **Modal "Nuevo Contacto":** Nombre*, Relación, Teléfono*.
- **Función:** al presionar SOS (con vibración fuerte) registra el evento y ofrece **llamar al contacto principal**; cada contacto se puede llamar directo.

### 9. Config (Ajustes)
- **Tarjeta de perfil** con gradiente: avatar, nombre, correo.
- **Sección Apariencia:** **selector de tema** (Claro / Oscuro / Auto en chips), **Notificaciones** (abre modal), **Idioma** (Español).
- **Modal Notificaciones:** interruptor **Sonido**, interruptor **Vibración**, nota explicativa, botón **"Enviar notificación de prueba"**.
- **Sección Datos:** Copia de seguridad, Restaurar datos, Eliminar todos los datos.
- **Sección Información:** Versión (2.0.0), Términos de servicio, Política de privacidad.
- **Botón rojo "Cerrar Sesión".**
- **Función:** controlar tema, notificaciones, datos y cerrar sesión.

### Componentes transversales
- **Notificaciones nativas:** ícono de cápsula azul en la barra de estado; botones de acción *"✓ Ya lo tomé"* / *"⏰ En 10 min"* que funcionan sin abrir la app.
- **Barra de navegación inferior:** 7 pestañas, se adapta a modo claro/oscuro.

---

## QUÉ QUIERO QUE MEJORES

1. **Legibilidad para mayores:** sube tamaños de fuente base, mejora contraste (mínimo WCAG AA 4.5:1), botones y áreas táctiles grandes (≥48dp).
2. **Jerarquía visual más clara:** que de un vistazo se entienda "qué tomo ahora" y "qué me falta".
3. **Modernizar sin perder calidez:** mantener el gradiente azul→verde y las esquinas redondeadas, pero refinar espaciados, sombras y estados (vacío, cargando, error, éxito).
4. **Consistencia:** un solo lenguaje visual para tarjetas, botones, chips, modales e iconos en las 11 pantallas.
5. **Estados emocionales positivos:** la app debe sentirse tranquilizadora y motivadora (es para salud), no clínica ni fría.
6. **Modo oscuro de primera:** que se vea igual de pulido que el claro.

## RESTRICCIONES
- Plataforma: app móvil Android (vertical, ~390px de ancho).
- Mantener la paleta de marca azul/verde.
- Público: adultos mayores (algunos con baja visión o poca experiencia tecnológica).
- Tecnología: React Native (los diseños deben ser realizables con componentes nativos estándar).

## ENTREGABLES QUE ESPERO
- Mockups de alta fidelidad de las 11 pantallas (claro y oscuro).
- Sistema de diseño actualizado: paleta final, escala tipográfica, espaciados, sombras, componentes (botón, tarjeta, chip, input, modal, FAB, tile de estadística, anillo de progreso, burbuja de chat).
- Notas de accesibilidad por pantalla.
