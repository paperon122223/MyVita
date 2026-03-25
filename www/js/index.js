// ================================================================
// index.js — Login · MediTime
// Autenticación local contra SQLite (usuario + password)
// NOTA: mostrarNotificacion está en utils.js
// ================================================================

document.addEventListener('deviceready', async function () {
  console.log('🔐 Login iniciando...');

  // ── Verificar sesión existente ──────────────────────────────
  if (localStorage.getItem('currentUserId')) {
    console.log('✅ Sesión existente, redirigiendo a home');
    window.location.href = 'home.html';
    return;
  }

  // ── Inicializar DB ─────────────────────────────────────────
  try {
    console.log('⏳ Inicializando DB...');
    await window.DB.init();
    console.log('✅ DB inicializada');
  } catch (err) {
    console.error('❌ Error BD:', err);
    mostrarNotificacion('Error al abrir la base de datos. Reinicia la app.', 'error', 0);
    return;
  }

  // ── Iniciar SyncService ────────────────────────────────────
  try {
    if (window.SyncService) {
      console.log('✅ Iniciando SyncService');
      window.SyncService.iniciar(30000);
    } else {
      console.warn('⚠️ SyncService no disponible');
    }
  } catch (err) {
    console.error('❌ Error SyncService:', err);
  }

  // ── Formulario de login ────────────────────────────────────
  const form = document.getElementById('loginForm');
  if (!form) {
    console.error('❌ loginForm no encontrado');
    return;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    console.log('📝 Formulario enviado');

    const usuarioInput = document.getElementById('username').value.trim();
    const password     = document.getElementById('password').value;

    if (!usuarioInput || !password) {
      mostrarNotificacion('Por favor completa todos los campos.', 'advertencia');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    try {
      console.log('🔍 Autenticando:', usuarioInput);
      const user = await window.DB.Usuarios.autenticar(usuarioInput, password);
      console.log('✅ Usuario autenticado:', user);

      // 🆕 SINCRONIZAR USUARIO A SUPABASE
      try {
        await fetch('https://ocieybkcehoxlvmdgvpf.supabase.co/rest/v1/usuarios', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jaWV5YmtjZWhveGx2bWRndnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MTUzMDUsImV4cCI6MjA4NzM5MTMwNX0.8aasJNmNmUOi-5cNiXNl4LAAIfipt7H9J6ysFABnfEs',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jaWV5YmtjZWhveGx2bWRndnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MTUzMDUsImV4cCI6MjA4NzM5MTMwNX0.8aasJNmNmUOi-5cNiXNl4LAAIfipt7H9J6ysFABnfEs',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            id: user.id,
            nombre: user.nombre,
            email: user.email || '',
            usuario: user.usuario || '',
            password: password,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        });
        console.log('✅ Usuario sincronizado a Supabase');
      } catch (err) {
        console.warn('⚠️ Error sincronizando usuario:', err.message);
      }

      // Guardar sesión
      localStorage.setItem('currentUserId',   user.id);
      localStorage.setItem('currentUser',     user.usuario || user.nombre);
      localStorage.setItem('currentUserName', user.nombre);
      localStorage.setItem('lastLogin',       new Date().toISOString());

      console.log('💾 Sesión guardada');

      // Intentar obtener token Supabase en background
      if (user.email && window.loginEnSupabase) {
        console.log('🌐 Obteniendo token Supabase...');
        window.loginEnSupabase(user.email, password)
          .then(data => console.log('✅ Token Supabase obtenido'))
          .catch(err => console.warn('⚠️ No se pudo obtener token:', err));
      }

      mostrarNotificacion(`¡Bienvenido, ${user.nombre}!`, 'exito', 2000);
      
      setTimeout(() => {
        console.log('➡️ Redirigiendo a home');
        window.location.href = 'home.html';
      }, 1500);

    } catch (err) {
      console.error('❌ Error autenticación:', err);
      mostrarNotificacion(err.message || 'Usuario o contraseña incorrectos.', 'error');
      document.getElementById('password').value = '';
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  // ── Logout (si el botón está en esta vista) ─────────────────
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      const confirmar = window.navigator.notification
        ? navigator.notification.confirm(
            '¿Deseas cerrar sesión?',
            (i) => { if (i === 1) cerrarSesion(); },
            'Confirmar', ['Sí','Cancelar'])
        : window.confirm('¿Deseas cerrar sesión?');

      if (!window.navigator.notification && confirmar) cerrarSesion();
    });
  }

  function cerrarSesion() {
    ['currentUserId','currentUser','currentUserName','lastLogin',
     'sb_access_token','sb_user_id'].forEach(k => localStorage.removeItem(k));
    window.location.href = 'index.html';
  }

  console.log('✅ Index.js listo');
});