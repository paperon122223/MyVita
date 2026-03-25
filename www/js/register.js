// ================================================================
// register.js — Registro · MediTime
// 1) Inserta en SQLite local (siempre)
// 2) Crea cuenta en Supabase Auth (si hay internet)
// NOTA: mostrarNotificacion está en utils.js
// ================================================================

document.addEventListener('deviceready', async function () {
  console.log('📝 Registro iniciando...');

  // ── Helper de fecha/hora ────────────────────────────────────
  function getFechaHoraSQLite() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} `
         + `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  }

  // ── Inicializar DB ─────────────────────────────────────────
  try {
    await window.DB.init();
  } catch {
    mostrarNotificacion('Error al abrir la base de datos.', 'error');
    return;
  }

  // ── Validación ─────────────────────────────────────────────
  function validar(datos) {
    if (!datos.nombre || !datos.usuario || !datos.email || !datos.password) {
      mostrarNotificacion('Nombre, usuario, correo y contraseña son obligatorios.', 'advertencia');
      return false;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(datos.email)) {
      mostrarNotificacion('El correo electrónico no es válido.', 'advertencia');
      return false;
    }
    if (datos.password.length < 4) {
      mostrarNotificacion('La contraseña debe tener al menos 4 caracteres.', 'advertencia');
      return false;
    }
    const chk = document.getElementById('termsCheckbox');
    if (chk && !chk.checked) {
      mostrarNotificacion('Debes aceptar los términos y condiciones.', 'advertencia');
      return false;
    }
    return true;
  }

  // ── Leer formulario ─────────────────────────────────────────
  function getFormData() {
    return {
      nombre          : document.getElementById('nombre')?.value.trim()           || '',
      usuario         : document.getElementById('usuario')?.value.trim()          || '',
      email           : document.getElementById('email')?.value.trim().toLowerCase() || '',
      password        : document.getElementById('pass')?.value                    || '',
      fecha_nacimiento: document.getElementById('fecha_nacimiento')?.value        || null,
      telefono        : document.getElementById('telefono')?.value.trim()         || null,
      direccion       : document.getElementById('direccion')?.value.trim()        || null
    };
  }

  // ── Setup del formulario ────────────────────────────────────
  const form = document.getElementById('registerForm');
  if (!form) {
    mostrarNotificacion('Formulario no encontrado.', 'error');
    return;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const datos = getFormData();
    if (!validar(datos)) return;

    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    try {
      // 1) Verificar si ya existe en SQLite
      const existe = await window.DB.Usuarios.existeUsuario(datos.usuario, datos.email);
      if (existe) {
        mostrarNotificacion('Ya existe un usuario con ese nombre o correo.', 'advertencia');
        return;
      }

      // 2) Guardar en SQLite (siempre, con o sin internet)
      const localId = await window.DB.Usuarios.crear(datos);

      // 3) Intentar crear en Supabase simultáneamente
      let supabaseOk = false;
      if (navigator.onLine !== false && window.registrarEnSupabase) {
        try {
          await window.registrarEnSupabase(
            datos.email, datos.password, datos.nombre, datos.telefono
          );
          supabaseOk = true;
        } catch (sbErr) {
          console.warn('⚠️ Supabase no disponible, se sincronizará después:', sbErr.message);
          // El registro local ya está hecho — sync_queue lo enviará después
        }
      }

      // Guardar sesión automáticamente
      localStorage.setItem('currentUserId',   localId);
      localStorage.setItem('currentUser',     datos.usuario);
      localStorage.setItem('currentUserName', datos.nombre);
      localStorage.setItem('lastLogin',       new Date().toISOString());

      const msg = supabaseOk
        ? '¡Cuenta creada! También sincronizada en la nube.'
        : '¡Cuenta creada localmente! Se sincronizará cuando haya internet.';
      mostrarNotificacion(msg, 'exito', 4000);

      form.reset();
      setTimeout(() => { window.location.href = 'home.html'; }, 2500);

    } catch (err) {
      console.error('Error en registro:', err);
      mostrarNotificacion(err.message || 'No se pudo crear la cuenta.', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  });
});
