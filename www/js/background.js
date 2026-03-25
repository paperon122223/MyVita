// ================================================================
// background.js — Modo segundo plano · MyVita
// Requiere: cordova-plugin-background-mode
// ================================================================

const BackgroundService = (function () {
  'use strict';

  let _intentos = 0;

  function init() {
    if (!window.cordova || !cordova.plugins?.backgroundMode) {
      console.warn('[Background] Plugin no disponible');
      return;
    }

    const bg = cordova.plugins.backgroundMode;

    bg.setDefaults({
      title    : 'MyVita activo',
      text     : 'Monitoreando alarmas de medicación',
      icon     : 'notification_icon',
      color    : '0288d1',
      resume   : true,
      hidden   : false,
      bigText  : false,
      // foregroundServiceType requerido en Android 14+ para no crashear
      // valor 64 = FOREGROUND_SERVICE_TYPE_HEALTH
      foregroundServiceType: 64
    });

    // Habilitar — solo si la app está activa
    try {
      bg.enable();
      bg.overrideBackButton(); // evitar que el botón atrás cierre la app
    } catch(e) {
      console.warn('[Background] Error al activar:', e);
    }

    bg.on('activate', function () {
      console.log('[Background] Segundo plano activo');
      try {
        bg.disableWebViewOptimizations();
      } catch(e) {}
    });

    bg.on('deactivate', function () {
      console.log('[Background] Primer plano');
    });

    bg.on('failure', function () {
      console.warn('[Background] Falló — reintento', ++_intentos);
      if (_intentos <= 3) {
        setTimeout(() => {
          try { bg.enable(); } catch(e) {}
        }, 5000);
      }
    });

    console.log('[Background] Iniciado correctamente');
  }

  function abrirConfigBateria() {
    try {
      if (window.cordova && cordova.plugins?.backgroundMode) {
        cordova.plugins.backgroundMode.battery();
      }
    } catch(e) {}
  }

  return { init, abrirConfigBateria };
})();

window.BackgroundService = BackgroundService;