// ================================================================
// watch.js — Integración Reloj · MyVita
// Redmi Watch 5 / Xiaomi — vía notificaciones Android
// (Mi Fitness espeja notificaciones automáticamente al reloj)
//
// ARQUITECTURA:
//   1. MyVita dispara alarma
//   2. Crea notificación Android con acción "Apagar"
//   3. Mi Fitness la espeja al Redmi Watch 5
//   4. Usuario toca "Apagar" en el reloj
//   5. BroadcastReceiver captura la acción → para la alarma
//
// NO requiere BLE directo (protocolo Xiaomi es propietario/cifrado)
// ================================================================

window.WatchConnector = (function () {
  'use strict';

  // ── IDs de notificación ───────────────────────────────────────
  const NOTIF_ALARM_ID   = 9001;  // Notificación de alarma activa
  const NOTIF_REMINDER_ID= 9002;  // Recordatorio 30min antes
  const CHANNEL_ID       = 'myvita_alarmas';
  const CHANNEL_NAME     = 'MyVita — Alarmas';

  // ── Acciones para el BroadcastReceiver ───────────────────────
  const ACTION_STOP   = 'com.myvita.STOP_ALARM';
  const ACTION_SNOOZE = 'com.myvita.SNOOZE_ALARM';
  const ACTION_TOMADA = 'com.myvita.TOMADA_ALARM';

  // ── Estado ───────────────────────────────────────────────────
  let _modeloReloj = localStorage.getItem('myvita_watch_model') || 'redmi';
  let _inicializado = false;

  // ─────────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────────
  function init() {
    if (_inicializado) return;
    _inicializado = true;

    // Crear canal de notificación (Android 8+)
    _crearCanal();

    // Escuchar acciones del reloj cuando la app vuelve al frente
    document.addEventListener('resume', _checkAccionReloj, false);

    // Escuchar intent con acción (cuando la app está en background)
    if (window.plugins?.intentShim) {
      window.plugins.intentShim.onNewIntent(_handleIntent);
    }

    // Escuchar via localStorage (puente background↔foreground)
    _checkAccionReloj();

    console.log('[Watch] Inicializado · Modelo:', _modeloReloj);
  }

  // ─────────────────────────────────────────────────────────────
  // CANAL DE NOTIFICACIÓN ANDROID
  // ─────────────────────────────────────────────────────────────
  function _crearCanal() {
    const notif = cordova?.plugins?.notification?.local;
    if (!notif) return;

    // cordova-plugin-local-notification crea el canal automáticamente
    // con las propiedades del primer uso, pero podemos forzarlo:
    try {
      notif.createChannel({
        id          : CHANNEL_ID,
        name        : CHANNEL_NAME,
        importance  : 4,  // IMPORTANCE_HIGH — aparece como heads-up
        visibility  : 1,  // VISIBILITY_PUBLIC — visible en pantalla bloqueada
        sound       : true,
        vibration   : [0, 400, 200, 400],
        lights      : true,
        lightColor  : '#0288d1'
      });
    } catch (e) {
      // El plugin puede no soportar createChannel en versiones antiguas
      console.log('[Watch] Canal creado implícitamente');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // NOTIFICAR AL RELOJ — llamar cuando suena la alarma
  // ─────────────────────────────────────────────────────────────
  function notificarAlarma(nombreMed, horaToma, alarmaId) {
    const notif = cordova?.plugins?.notification?.local;
    if (!notif) {
      console.warn('[Watch] cordova-plugin-local-notification no disponible');
      return;
    }

    // Guardar ID de alarma activa para el BroadcastReceiver
    localStorage.setItem('myvita_active_alarm_id', alarmaId || '');

    const titulo  = 'MyVita — Hora de tu medicamento';
    const mensaje = `${nombreMed} | ${horaToma}`;

    notif.schedule({
      id          : NOTIF_ALARM_ID,
      title       : titulo,
      text        : mensaje,
      icon        : 'res://ic_medication',   // ícono en res/drawable
      smallIcon   : 'res://ic_stat_medication',
      color       : '#0288d1',
      channel     : CHANNEL_ID,
      priority    : 2,    // PRIORITY_MAX
      launch      : true, // abre la app al tocar
      wakeup      : true,
      vibrate     : true,
      // Botones de acción — Mi Fitness los espeja al reloj
      actions     : [
        {
          id     : 'tomada',
          title  : 'Tomada',
          launch : true,
          callback: _onAccionTomada
        },
        {
          id     : 'posponer',
          title  : 'Posponer 10min',
          launch : false,
          callback: _onAccionSnooze
        }
      ],
      // Android extras para el intent
      data : {
        alarmaId : alarmaId,
        action   : 'alarm_fired'
      }
    });

    console.log('[Watch] Notificación enviada al reloj:', mensaje);
  }

  // ─────────────────────────────────────────────────────────────
  // NOTIFICACIÓN DE RECORDATORIO (30min antes)
  // ─────────────────────────────────────────────────────────────
  function notificarRecordatorio(nombreMed, minutos) {
    const notif = cordova?.plugins?.notification?.local;
    if (!notif) return;

    notif.schedule({
      id      : NOTIF_REMINDER_ID,
      title   : 'MyVita — Recordatorio',
      text    : `${nombreMed} en ${minutos} minutos`,
      icon    : 'res://ic_medication',
      smallIcon: 'res://ic_stat_medication',
      color   : '#00c853',
      channel : CHANNEL_ID,
      launch  : true,
      vibrate : true
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CANCELAR NOTIFICACIÓN DEL RELOJ
  // ─────────────────────────────────────────────────────────────
  function cancelarNotificacion() {
    const notif = cordova?.plugins?.notification?.local;
    if (!notif) return;
    notif.cancel(NOTIF_ALARM_ID);
    notif.cancel(NOTIF_REMINDER_ID);
    console.log('[Watch] Notificaciones canceladas del reloj');
  }

  // ─────────────────────────────────────────────────────────────
  // CALLBACKS DE ACCIONES DEL RELOJ
  // ─────────────────────────────────────────────────────────────
  function _onAccionTomada(notification, eopts) {
    console.log('[Watch] Acción: TOMADA desde reloj');
    localStorage.setItem('myvita_watch_action', 'tomada');
    localStorage.setItem('myvita_watch_alarm_id', notification?.data?.alarmaId || '');
    _ejecutarAccion('tomada', notification?.data?.alarmaId);
  }

  function _onAccionSnooze(notification, eopts) {
    console.log('[Watch] Acción: POSPONER desde reloj');
    localStorage.setItem('myvita_watch_action', 'snooze');
    localStorage.setItem('myvita_watch_alarm_id', notification?.data?.alarmaId || '');
    _ejecutarAccion('snooze', notification?.data?.alarmaId);
  }

  // ─────────────────────────────────────────────────────────────
  // VERIFICAR ACCIÓN PENDIENTE (al volver al frente)
  // ─────────────────────────────────────────────────────────────
  function _checkAccionReloj() {
    const accion   = localStorage.getItem('myvita_watch_action');
    const alarmaId = localStorage.getItem('myvita_watch_alarm_id');

    if (!accion) return;

    // Limpiar inmediatamente para no ejecutar dos veces
    localStorage.removeItem('myvita_watch_action');
    localStorage.removeItem('myvita_watch_alarm_id');

    console.log('[Watch] Acción pendiente del reloj:', accion, alarmaId);
    _ejecutarAccion(accion, alarmaId);
  }

  // ─────────────────────────────────────────────────────────────
  // EJECUTAR ACCIÓN EN LA APP
  // ─────────────────────────────────────────────────────────────
  function _ejecutarAccion(accion, alarmaId) {
    if (accion === 'tomada') {
      // Parar audio
      if (window.AlarmManager?.stopCurrentAlarm) {
        window.AlarmManager.stopCurrentAlarm();
      }
      // Marcar como tomada
      if (window.AlarmManager?.marcarTomada && alarmaId) {
        window.AlarmManager.marcarTomada(alarmaId);
      }
      // Cerrar modal
      const modal = document.getElementById('alarmModal');
      if (modal) modal.style.display = 'none';

      cancelarNotificacion();
      console.log('[Watch] Alarma marcada como tomada desde el reloj');

    } else if (accion === 'snooze') {
      // Parar audio temporalmente
      if (window.AlarmManager?.stopCurrentAlarm) {
        window.AlarmManager.stopCurrentAlarm();
      }
      // Cerrar modal
      const modal = document.getElementById('alarmModal');
      if (modal) modal.style.display = 'none';

      cancelarNotificacion();
      console.log('[Watch] Alarma pospuesta 10min desde el reloj');

      // Re-disparar en 10 minutos
      if (alarmaId && window.AlarmManager) {
        const alarmaActiva = window.AlarmManager._alarmasHoy?.find(a => a.id === alarmaId);
        if (alarmaActiva) {
          setTimeout(() => {
            if (!alarmaActiva.tomado) {
              window.AlarmManager.triggerAlarm(alarmaActiva);
            }
          }, 10 * 60 * 1000);
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // HANDLE INTENT (cuando app se abre desde la notificación)
  // ─────────────────────────────────────────────────────────────
  function _handleIntent(intent) {
    if (!intent?.extras) return;
    const action   = intent.extras['action'];
    const alarmaId = intent.extras['alarmaId'];
    if (action === 'alarm_fired') {
      _checkAccionReloj();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // MODELO DE RELOJ
  // ─────────────────────────────────────────────────────────────
  function setModelo(modelo) {
    _modeloReloj = modelo;
    localStorage.setItem('myvita_watch_model', modelo);
    console.log('[Watch] Modelo configurado:', modelo);
  }

  function getModelo() { return _modeloReloj; }

  // ─────────────────────────────────────────────────────────────
  // COMPATIBILIDAD: método legacy para ZL02 (por si lo tienes aún)
  // ─────────────────────────────────────────────────────────────
  function notificarReloj(nombreMed, horaToma) {
    notificarAlarma(nombreMed, horaToma, null);
  }

  // ─────────────────────────────────────────────────────────────
  // API PÚBLICA
  // ─────────────────────────────────────────────────────────────
  return {
    init,
    notificarAlarma,
    notificarRecordatorio,
    cancelarNotificacion,
    notificarReloj,   // legacy
    setModelo,
    getModelo
  };

})();

// Auto-init cuando Cordova esté listo
if (window.cordova) {
  document.addEventListener('deviceready', () => window.WatchConnector.init(), false);
} else {
  document.addEventListener('DOMContentLoaded', () => window.WatchConnector.init(), false);
}