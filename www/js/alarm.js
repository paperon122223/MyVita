// ================================================================
// alarm.js — Sistema de Alarmas · MediTime
// Lee y escribe en tabla SQLite `alarmas` (nuevo esquema)
// Mantiene el mismo UX: alarmName, alarmTime, alarmTone,
// alarmsContainer, saveAlarmButton, voiceAssistantBtn
// ================================================================

// ── Aplicar config visual antes de renderizar ─────────────────
(function () {
  const savedClass  = localStorage.getItem('fontSizeClass');
  const audioEnabled = localStorage.getItem('audioEnabled');
  if (savedClass) document.documentElement.className = savedClass;
})();

// ── Notificaciones ────────────────────────────────────────────
function mostrarNotificacion(mensaje, tipo = 'info', duracion = 3500) {
  let cont = document.getElementById('notificaciones-container');
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'notificaciones-container';
    cont.style.cssText = `position:fixed;top:20px;right:20px;z-index:10000;
      display:flex;flex-direction:column;gap:12px;pointer-events:none;`;
    document.body.appendChild(cont);
  }
  const colores = {
    exito:       { bg: '#00c853', icon: 'check_circle' },
    error:       { bg: '#ff5252', icon: 'error' },
    advertencia: { bg: '#ffab00', icon: 'warning' },
    info:        { bg: '#29b6f6', icon: 'info' }
  };
  const e = colores[tipo] || colores.info;
  const notif = document.createElement('div');
  notif.style.cssText = `pointer-events:auto;max-width:320px;padding:16px 20px;border-radius:14px;
    color:white;font-weight:500;font-size:.95rem;display:flex;align-items:center;gap:12px;
    box-shadow:0 6px 20px rgba(0,0,0,.25);background:${e.bg};
    transform:translateX(400px);opacity:0;transition:transform .3s ease,opacity .3s ease;`;
  notif.innerHTML = `
    <span class="material-icons" style="font-size:1.4rem;">${e.icon}</span>
    <span>${mensaje}</span>
    <button type="button" style="margin-left:auto;background:none;border:none;color:white;
      font-size:1.3rem;cursor:pointer;opacity:.8;padding:4px;border-radius:50%;">
      <span class="material-icons">close</span>
    </button>`;
  cont.appendChild(notif);
  setTimeout(() => { notif.style.transform='translateX(0)'; notif.style.opacity='1'; }, 10);
  notif.querySelector('button').addEventListener('click', () => {
    notif.style.transform = 'translateX(400px)'; notif.style.opacity = '0';
    setTimeout(() => notif.remove(), 300);
  });
  if (duracion > 0) setTimeout(() => {
    if (notif.parentNode) {
      notif.style.transform = 'translateX(400px)'; notif.style.opacity = '0';
      setTimeout(() => notif.remove(), 300);
    }
  }, duracion);
}

// ── Estado ────────────────────────────────────────────────────
let mediaInstance     = null;
let _watchdogInterval = null;
let currentRingingId  = null;
let checkInterval     = null;
let userId            = null;
let alarmasHoy        = [];

// ── Objeto principal ──────────────────────────────────────────
const alarmApp = {
  isFromVoiceAssistant: false,

  // ── Inicializar ─────────────────────────────────────────────
  async init() {
    userId = localStorage.getItem('currentUserId');
    if (!userId) { window.location.href = 'index.html'; return; }

    try {
      await window.DB.init();
      await this.loadAlarms();
      this.renderAlarms();
      this.startMonitor();
      this.setupEventListeners();
      this.scheduleBackgroundNotifications();
      // BackgroundService se inicia desde home.html — no reiniciar aquí
      // para evitar duplicar el foreground service (crash en Android 14)
      // if (window.BackgroundService) window.BackgroundService.init();
      // Iniciar sistema de recordatorios a familiar
      if (window.ReminderSystem) window.ReminderSystem.start(userId);
      console.log('✅ Alarm app lista (SQLite)');
    } catch (err) {
      console.error('Error iniciando alarm app:', err);
      mostrarNotificacion('Error cargando alarmas.', 'error');
    }
  },

  // ── Cargar alarmas del día desde SQLite ─────────────────────
  async loadAlarms() {
    const hoy = new Date().toISOString().split('T')[0];
    alarmasHoy = await window.DB.Alarmas.getDelDia(userId, hoy);
  },

  // ── Renderizar lista ─────────────────────────────────────────
  renderAlarms() {
    const container = document.getElementById('alarmsContainer');
    const emptyEl   = document.getElementById('emptyAlarms');

    if (!container) return;

    if (alarmasHoy.length === 0) {
      container.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'flex';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    // Actualizar contador
    const countEl = document.getElementById('alarmsCount');
    if (countEl) countEl.textContent = alarmasHoy.length;

    container.innerHTML = alarmasHoy.map(a => {
      const nombre   = a.nombre || a.medicamento_nombre || 'Alarma';
      const [h, m]   = (a.hora_toma || '00:00').split(':').map(Number);
      const ampm     = h >= 12 ? 'PM' : 'AM';
      const h12      = h % 12 || 12;
      const horaNum  = `${h12}:${String(m).padStart(2,'0')}`;
      const tomada   = !!a.tomado;
      const silenc   = !!a.recordatorio_silenciado;
      const activa   = a.esta_activa == 1 || a.esta_activa === true;

      const cardClass = tomada ? 'alarm-card tomada' : silenc ? 'alarm-card silenciada' : 'alarm-card';

      const chipLabel = tomada ? '<span class="alarm-chip tomada">Tomada</span>'
                       : !activa ? '<span class="alarm-chip">Inactiva</span>'
                       : silenc ? '<span class="alarm-chip silenciada">Sin recordatorio</span>'
                       : '<span class="alarm-chip activa">Activa</span>';

      return `
        <li class="${cardClass}" data-id="${a.id}">
          <div class="alarm-time-block">
            <div class="alarm-time">${horaNum}</div>
            <div class="alarm-ampm">${ampm}</div>
          </div>
          <div class="alarm-info">
            <div class="alarm-name">${nombre}${a.dosis ? ' · ' + a.dosis : ''}</div>
            <div class="alarm-meta">
              ${chipLabel}
              ${a.tono ? `<span class="alarm-chip">${a.tono.replace('.mp3','')}</span>` : ''}
            </div>
          </div>
          <div class="alarm-actions">
            ${!tomada ? `
              <button class="alarm-btn btn-tomar" data-id="${a.id}" title="Marcar como tomada">
                <span class="material-icons">check</span>
              </button>
              <button class="alarm-btn btn-snooze btn-silenciar" data-id="${a.id}" title="Silenciar recordatorio">
                <span class="material-icons">${silenc ? 'notifications_off' : 'notifications_active'}</span>
              </button>` : ''}
            <button class="alarm-btn btn-delete" data-id="${a.id}" title="Eliminar">
              <span class="material-icons">delete</span>
            </button>
          </div>
        </li>`;
    }).join('');

    // Botones de marcar tomada
    container.querySelectorAll('.btn-tomar').forEach(btn => {
      btn.addEventListener('click', () => this.marcarTomada(btn.dataset.id));
    });
    // Botones de silenciar recordatorio
    container.querySelectorAll('.btn-silenciar').forEach(btn => {
      btn.addEventListener('click', () => this.silenciarRecordatorio(btn.dataset.id));
    });
    // Botones de eliminar
    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => this.deleteAlarm(btn.dataset.id));
    });
  },

  // ── Guardar nueva alarma (desde formulario o voz) ───────────
  async saveAlarm() {
    const nameInput = document.getElementById('alarmName');
    const timeInput = document.getElementById('alarmTime');
    const toneInput = document.getElementById('alarmTone');

    const name  = nameInput?.value.trim();
    const time  = timeInput?.value;
    const tone  = toneInput?.value || 'alarm.mp3';
    const fecha = new Date().toISOString().split('T')[0];

    if (!name) {
      mostrarNotificacion('Ingresa un nombre para la alarma.', 'advertencia'); return;
    }
    if (!time) {
      mostrarNotificacion('Selecciona una hora.', 'advertencia'); return;
    }

    try {
      await window.DB.Alarmas.crear(userId, {
        nombre    : name,
        tono      : tone,
        fecha,
        hora_toma : time
        // prescripcion_id null → alarma manual
      });

      mostrarNotificacion(
        `✅ Alarma "${name}" guardada para las ${this.formatTime(...time.split(':').map(Number))}`,
        'exito'
      );

      if (nameInput) nameInput.value = '';
      if (timeInput) timeInput.value = '';
      if (toneInput) toneInput.selectedIndex = 0;

      await this.loadAlarms();
      this.renderAlarms();
      this.scheduleBackgroundNotifications();

    } catch (err) {
      console.error('Error guardando alarma:', err);
      mostrarNotificacion('No se pudo guardar la alarma.', 'error');
    }
  },

  // ── Marcar como tomada ───────────────────────────────────────
  async marcarTomada(id) {
    try {
      await window.DB.Alarmas.marcarTomada(id);
      const a = alarmasHoy.find(x => x.id === id);
      if (a) { a.tomado = 1; a.hora_tomado = new Date().toISOString(); }
      this.renderAlarms();
      if (currentRingingId === id) { this.stopCurrentAlarm(); }

      // Descontar 1 pastilla del inventario si hay prescripcion_id
      if (a?.prescripcion_id && window.DB.Inventario?.descontarStock) {
        try {
          const inv = await window.DB.Inventario.descontarStock(userId, a.prescripcion_id);
          if (inv !== null) {
            const nombre = a.dosis || a.medicamento_nombre || a.nombre || 'Medicamento';
            if (inv.stock_actual <= 0) {
              mostrarNotificacion('⚠️ ¡Sin pastillas de ' + nombre + '! Reabastece.', 'advertencia', 6000);
            } else if (inv.stock_actual <= inv.stock_minimo) {
              mostrarNotificacion('⚠️ Pocas pastillas de ' + nombre + ': ' + inv.stock_actual + ' restantes', 'advertencia', 5000);
            } else {
              mostrarNotificacion('✅ ¡Toma registrada! Quedan ' + inv.stock_actual + ' pastillas.', 'exito');
            }
            return;
          }
        } catch (e) {
          console.warn('[Inventario] No se pudo descontar:', e.message);
        }
      }

      mostrarNotificacion('✅ ¡Toma registrada! Sigue así.', 'exito');
    } catch (err) {
      console.error('Error marcando toma:', err);
      mostrarNotificacion('No se pudo registrar la toma.', 'error');
    }
  },

  // ── Silenciar recordatorio de una alarma ────────────────────
  async silenciarRecordatorio(id) {
    if (window.ReminderSystem) await window.ReminderSystem.silenciar(id);
    // Actualizar estado local para que el botón cambie visualmente
    const a = alarmasHoy.find(x => x.id === id);
    if (a) a.recordatorio_silenciado = a.recordatorio_silenciado ? 0 : 1;
    const estaba = a?.recordatorio_silenciado;
    this.renderAlarms();
    mostrarNotificacion(
      estaba ? 'Recordatorio activado para esta toma' : 'Recordatorio silenciado para esta toma',
      'info', 2500
    );
  },

  // ── Eliminar alarma ──────────────────────────────────────────
  async deleteAlarm(id) {
    const ok = navigator.notification
      ? await new Promise(r => navigator.notification.confirm(
          '¿Eliminar esta alarma?', i => r(i === 1), 'Confirmar', ['Sí','Cancelar']))
      : confirm('¿Eliminar esta alarma?');

    if (!ok) return;

    try {
      await window.DB.Alarmas.eliminar(id);
      alarmasHoy = alarmasHoy.filter(a => a.id !== id);
      this.renderAlarms();
      this.scheduleBackgroundNotifications();
      mostrarNotificacion('Alarma eliminada.', 'info');
    } catch (err) {
      console.error('Error eliminando alarma:', err);
      mostrarNotificacion('No se pudo eliminar.', 'error');
    }
  },

  // ── Monitor de alarmas (cada 30s) ────────────────────────────
  startMonitor() {
    if (checkInterval) clearInterval(checkInterval);
    if (!this._disparadas) this._disparadas = new Set();

    // ── Estrategia de doble precisión ─────────────────────────
    // 1. Calcular exactamente cuántos ms faltan para el próximo minuto
    //    y disparar un timeout en ese momento exacto
    // 2. setInterval cada 5s como red de seguridad

    const verificar = () => {
      const now    = new Date();
      const horaAc = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

      alarmasHoy.forEach(a => {
        if (a.tomado || !a.esta_activa) return;

        // Comparar solo HH:MM (los primeros 5 chars)
        if ((a.hora_toma || '').substring(0, 5) !== horaAc) return;

        // Guard anti-duplicado por minuto
        const clave = a.id + '_' + horaAc;
        if (this._disparadas.has(clave)) return;
        this._disparadas.add(clave);
        if (this._disparadas.size > 100) this._disparadas.clear();

        this.triggerAlarm(a);
      });
    };

    // Timeout preciso: esperar hasta el próximo cambio de minuto
    const programarSiguienteMinuto = () => {
      const now       = new Date();
      const msRestantes = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
      setTimeout(() => {
        verificar();
        programarSiguienteMinuto(); // encadenar para el siguiente minuto
      }, msRestantes + 200); // +200ms de margen para asegurar que el minuto ya cambió
    };

    // Verificar de inmediato al iniciar (por si ya es la hora)
    verificar();
    // Programar disparos exactos en cada cambio de minuto
    programarSiguienteMinuto();
    // Red de seguridad cada 5s (por si el timeout se desincroniza)
    checkInterval = setInterval(verificar, 5000);
  },

  // ── Disparar alarma ──────────────────────────────────────────
  triggerAlarm(alarm) {
    // Guard anti-duplicado — si esta alarma ya está sonando, ignorar
    if (currentRingingId === alarm.id) {
      console.log('[Alarm] Ignorando disparo duplicado de:', alarm.id);
      return;
    }
    // Guard de tiempo — no disparar la misma alarma dos veces en 60s
    const ahora = Date.now();
    if (!this._lastFired) this._lastFired = {};
    if (this._lastFired[alarm.id] && (ahora - this._lastFired[alarm.id]) < 60000) {
      console.log('[Alarm] Ignorando disparo dentro de 60s:', alarm.id);
      return;
    }
    this._lastFired[alarm.id] = ahora;

    const nombre = alarm.nombre || alarm.medicamento_nombre || 'Medicamento';
    const hora   = alarm.hora_toma || '';
    this.playAlarmSound(alarm.tono || 'alarm.mp3');
    this.showAlert('¡Alarma!', `${nombre} a las ${this.formatTime(
      ...hora.split(':').map(Number)
    )}`);
    if (navigator.vibrate) navigator.vibrate([1000, 500, 1000]);
    currentRingingId = alarm.id;

    // ── Notificar al reloj ────────────────────────────────────
    // El método más confiable para el ZL02CPRO / Da Fit es lanzar
    // una notificación del sistema Android — Da Fit la espeja al
    // reloj automáticamente igual que WhatsApp o cualquier otra app.
    this.notificarReloj(nombre, hora, alarm.id);
  },

  // ── Notificación al reloj — delega a watch.js ────────────────
  notificarReloj(nombre, hora, alarmId) {
    // Si está disponible el nuevo WatchConnector (Redmi Watch 5 / cualquier reloj)
    if (window.WatchConnector?.notificarAlarma) {
      const horaStr = (hora || '').substring(0, 5);
      window.WatchConnector.notificarAlarma(nombre, horaStr, alarmId);
      return;
    }
    // Fallback legacy — notificación directa si watch.js no está cargado
    if (!window.cordova || !cordova.plugins?.notification?.local) return;

    const notif    = cordova.plugins.notification.local;
    const horaStr  = (hora || '').substring(0, 5);
    const textoCorto = nombre.length > 20 ? nombre.substring(0, 18) + '…' : nombre;

    // ID único para esta notificación inmediata
    const notifId = 90000 + (parseInt(String(alarmId).replace(/\D/g, '')) % 9999 || 1);

    // Cancelar si ya existe una con ese ID (evita duplicados)
    notif.cancel(notifId, () => {

      // ── Registrar handlers de acciones ANTES de programar ──────
      // "Tomado" desde el reloj — para la alarma y marca como tomada
      notif.on('tomado_' + notifId, () => {
        console.log('[Watch] Acción TOMADO desde el reloj');
        if (window.alarmApp) {
          window.alarmApp.stopCurrentAlarm();
          window.alarmApp.marcarTomada(alarmId);
          // Cancelar la notificación del sistema
          notif.cancel(notifId, () => {});
          // Feedback visual en el teléfono
          window.alarmApp._mostrarNotif('✅ Medicamento marcado como tomado desde el reloj');
        }
      });

      // "Posponer" desde el reloj — para la alarma 10 min
      notif.on('posponer_' + notifId, () => {
        console.log('[Watch] Acción POSPONER desde el reloj');
        if (window.alarmApp) {
          window.alarmApp.stopCurrentAlarm();
          notif.cancel(notifId, () => {});
          window.alarmApp._mostrarNotif('⏰ Recordatorio pospuesto 10 minutos');

          // Reprogramar en 10 minutos
          setTimeout(() => {
            if (window.alarmApp) {
              const alarma = alarmasHoy.find(a => a.id === alarmId);
              if (alarma && !alarma.tomado) {
                window.alarmApp.triggerAlarm(alarma);
              }
            }
          }, 10 * 60 * 1000);
        }
      });

      notif.schedule({
        id         : notifId,
        // Título corto — lo que muestra el reloj en la pantalla
        // Sin emojis — el ZL02CPRO los muestra como [emoji]
        title      : 'MyVita: ' + textoCorto,
        text       : 'Hora: ' + horaStr + ' - toca para actuar',
        bigText    : nombre + ' | ' + horaStr + ' | No olvides tomarlo',
        ticker     : 'Medicamento: ' + textoCorto + ' - ' + horaStr,
        trigger    : { type: 'calendar', in: 1, unit: 'second' },
        channel    : 'medication_alarms',
        category   : 'alarm',
        sound      : false,
        vibrate    : false,
        priority   : 2,          // PRIORITY_MAX
        wakeup     : true,
        lockscreen : true,
        foreground : true,

        // ── Botones de acción — aparecen en el reloj vía Da Fit ──
        // El usuario puede tocarlos directamente desde la muñeca
        actions    : [
          {
            id     : 'tomado_' + notifId,
            title  : '✅ Tomado',        // texto en el reloj
            launch : false               // no abre la app al tocar
          },
          {
            id     : 'posponer_' + notifId,
            title  : '⏰ +10 min',
            launch : false
          }
        ],

        // Extras para wearables Android
        extras: {
          wearable   : true,
          summary    : textoCorto,
          contentInfo: horaStr
        },
        data: { alarmId, nombre }
      });

      console.log('[Alarm] Notificación + botones enviada → reloj ✅', nombre, horaStr);
    });
  },

  // Feedback visual rápido en el teléfono (sin abrir modal)
  _mostrarNotif(msg) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);' +
      'background:#1a1a2e;color:#fff;padding:12px 24px;border-radius:20px;' +
      'font-size:.9rem;font-weight:600;z-index:9999;opacity:0;transition:opacity .3s;' +
      'max-width:80vw;text-align:center';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.style.opacity = '1', 10);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 4000);
  },

  // ── Modal de alerta ───────────────────────────────────────────
  showAlert(title, msg) {
    const modal   = document.getElementById('alarmModal');
    const titleEl = document.getElementById('modalTitle');
    const msgEl   = document.getElementById('modalMessage');
    const stopBtn = document.getElementById('modalStopButton');
    if (!modal) return;
    if (titleEl) titleEl.textContent = title;
    if (msgEl)   msgEl.textContent   = msg;
    modal.style.display = 'flex';
    if (stopBtn) {
      stopBtn.onclick = () => {
        this.stopCurrentAlarm();
        modal.style.display = 'none';
      };
    }
  },

  // ── Sonido ────────────────────────────────────────────────────
  playAlarmSound(filename = 'alarm.mp3') {
    const isMuted   = localStorage.getItem('audioEnabled') === 'false';
    const isAndroid = typeof device !== 'undefined' && device.platform?.toLowerCase() === 'android';
    const path      = isAndroid ? `/android_asset/www/audio/${filename}` : `audio/${filename}`;

    // ── Forzar salida por speaker del teléfono (no Bluetooth) ──
    // En Android usamos Media plugin con setAudioStreamType(STREAM_ALARM=4)
    // STREAM_ALARM ignora el routing de BT y siempre suena en el altavoz
    if (isAndroid && window.Media) {
      this.tryMediaPlugin(path, true);
      return;
    }

    // Web fallback: forzar speaker via AudioContext + MediaElementSource
    const el = document.getElementById('alarmSound');
    if (el) {
      if (!isMuted) {
        // Intentar forzar al speaker default (no BT)
        this._forceToSpeaker(el);
        el.muted = false;
        el.src   = path;
        el.currentTime = 0;
        el.play().catch(() => this.tryMediaPlugin(path, false));
      }
    } else {
      this.tryMediaPlugin(path, false);
    }
  },

  // Forzar salida de audio al speaker del teléfono
  _forceToSpeaker(el) {
    try {
      // setSinkId('') = dispositivo por defecto (speaker, no BT)
      if (el.setSinkId) {
        el.setSinkId('').catch(() => {});
      }
      // AudioContext: crear contexto con sampleRate estándar
      // evita que Web Audio use el sink de BT
      if (!this._audioCtx) {
        this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
    } catch(e) {}
  },

  tryMediaPlugin(path, forceStream = false) {
    if (!window.Media) return;
    if (mediaInstance) { mediaInstance.stop(); mediaInstance.release(); }

    mediaInstance = new Media(
      path,
      () => console.log('[Alarm] Audio OK'),
      err => console.error('[Alarm] Media error:', err)
    );

    // STREAM_ALARM (4) en Android — NO se enruta por Bluetooth,
    // siempre suena en el altavoz del teléfono aunque haya BT conectado
    if (forceStream && mediaInstance.setAudioStreamType) {
      mediaInstance.setAudioStreamType(4); // AudioManager.STREAM_ALARM
    } else if (forceStream && mediaInstance.setVolume) {
      // Fallback: subir volumen al máximo del stream actual
      mediaInstance.setVolume(1.0);
    }

    mediaInstance.play({ playAudioWhenScreenIsLocked: true });
  },

  stopCurrentAlarm() {
    // Parar el Media plugin (funciona en background)
    try {
      if (mediaInstance) {
        mediaInstance.stop();
        mediaInstance.release();
        mediaInstance = null;
      }
    } catch(e) { console.warn('[Alarm] Error parando media:', e); }

    // Parar el elemento <audio> del DOM (solo si está en foreground)
    try {
      const el = document.getElementById('alarmSound');
      if (el && !el.paused) { el.pause(); el.currentTime = 0; }
    } catch(e) {}

    currentRingingId = null;

    // Limpiar watchdog
    if (_watchdogInterval) { clearInterval(_watchdogInterval); _watchdogInterval = null; }

    // Flag para que el evento 'resume' sepa que debe parar al volver
    localStorage.setItem('myvita_stop_alarm', '1');

    console.log('[Alarm] Alarma detenida');
  },

  // ── Notificaciones locales de Cordova ─────────────────────────
  scheduleBackgroundNotifications() {
    if (!window.cordova || !cordova.plugins?.notification?.local) {
      console.warn('[Alarm] Plugin local-notification no disponible');
      return;
    }

    const notif    = cordova.plugins.notification.local;
    const isAndroid = typeof device !== 'undefined' && device.platform === 'Android';

    try {
      // Crear canal de alta prioridad en Android 8+
      if (isAndroid) {
        notif.channel({
          id         : 'medication_alarms',
          name       : 'Alarmas de Medicación',
          description: 'Recordatorios para tomar tus medicamentos',
          sound      : true,
          vibration  : true,
          importance : 5,          // IMPORTANCE_HIGH
          visibility : 1,          // VISIBILITY_PUBLIC — aparece en pantalla bloqueada
          lights     : true,
          lightColor : '#0288d1'
        });
      }

      // Cancelar notificaciones anteriores para reprogramarlas limpias
      notif.cancelAll(() => {
        const pendientes = alarmasHoy.filter(a =>
          !a.tomado &&
          (a.esta_activa == 1 || a.esta_activa === true)
        );

        if (pendientes.length === 0) {
          console.log('[Alarm] Sin alarmas pendientes para programar');
          return;
        }

        const ahora    = new Date();
        const notifList = [];

        pendientes.forEach(a => {
          const [h, m] = (a.hora_toma || '00:00').split(':').map(Number);
          const fecha  = new Date();
          fecha.setHours(h, m, 0, 0);

          // Si ya pasó hoy, programar para mañana
          if (fecha <= ahora) fecha.setDate(fecha.getDate() + 1);

          const nombre  = a.nombre || a.medicamento_nombre || 'Medicamento';
          // Generar ID numérico estable a partir del ID de la alarma
          const notifId = Math.abs(
            (a.id || '0').split('').reduce((s, c) => (s * 31 + c.charCodeAt(0)) & 0x7FFFFFFF, 0)
          ) % 99999 + 1;

          // Texto corto para la pantalla del reloj (max ~20 chars)
          const textoReloj = nombre.length > 20 ? nombre.substring(0, 18) + '…' : nombre;
          const horaStr    = (a.hora_toma || '').substring(0, 5);

          notifList.push({
            id          : notifId,
            title       : 'MyVita — Medicamento',
            text        : textoReloj + ' · ' + horaStr,
            bigText     : '💊 ' + nombre + '\n🕐 ' + horaStr + '\nToca para marcar como tomado',
            ticker      : textoReloj + ' — hora de tomar',
            trigger     : { at: fecha, exact: true, wakeup: true },
            channel     : 'medication_alarms',
            category    : 'alarm',
            // Sonido — usa alarm.mp3 de la app
            sound       : 'file://assets/audio/alarm.mp3',
            vibrate     : [0,500,200,500,200,500,200,500],
            wakeup      : true,
            priority    : 2,
            lockscreen  : true,
            foreground  : true,
            launch      : true,
            // ongoing:false para que el reloj pueda descartarla con swipe
            // (si fuera ongoing:true el reloj no podría quitarla)
            ongoing     : false,
            sticky      : false,
            // Acciones — aparecen en relojes que SÍ las soportan
            actions     : [
              {
                id     : 'tomada',
                title  : '✅ Tomado',
                launch : false  // NO abre la app — BroadcastReceiver lo maneja
              },
              {
                id     : 'posponer',
                title  : '⏰ +10min',
                launch : false
              }
            ],
            data        : {
              alarmId         : a.id,
              nombre          : nombre,
              fromNotification: true
            }
          });

          console.log('[Alarm] Programada:', nombre, 'para', fecha.toLocaleTimeString('es-MX'));
        });

        notif.schedule(notifList);

        // ── WATCHDOG — verifica cada 3s si la notificación fue descartada ──
        // Solución al problema de WebView suspendido en background:
        // el Media plugin sigue vivo, pero el evento 'clear' no dispara.
        // Verificamos directamente si la notificación existe en el SO.
        if (_watchdogInterval) clearInterval(_watchdogInterval);
        _watchdogInterval = setInterval(() => {
          if (!currentRingingId) {
            clearInterval(_watchdogInterval);
            _watchdogInterval = null;
            return;
          }
          // Verificar si ALGUNA de las notificaciones programadas sigue activa
          const ids = notifList.map(n => n.id);
          notif.isPresent(ids[0], exists => {
            if (!exists && currentRingingId) {
              // La notificación fue descartada desde el reloj o celular
              // y el JS estaba suspendido — parar ahora
              console.log('[Alarm][Watchdog] Notificación descartada — parando alarma');
              clearInterval(_watchdogInterval);
              _watchdogInterval = null;

              // Marcar como tomada y parar audio
              const idParar = currentRingingId;
              if (window.alarmApp) {
                window.alarmApp.stopCurrentAlarm();
                window.alarmApp.marcarTomada(idParar);
                const modal = document.getElementById('alarmModal');
                if (modal) modal.style.display = 'none';
                window.alarmApp._mostrarNotif('✅ Medicamento tomado');
              } else {
                // App en background — parar audio directamente
                try {
                  if (mediaInstance) { mediaInstance.stop(); mediaInstance.release(); mediaInstance = null; }
                } catch(e) {}
                currentRingingId = null;
                localStorage.setItem('myvita_stop_alarm', '1');
                localStorage.setItem('myvita_stop_alarm_id', idParar);
              }
            }
          });
        }, 3000);

        // ── Función central para parar alarma desde cualquier evento ──
        function _pararDesdeNotif(n) {
          const alarmId = n?.data?.alarmId || currentRingingId;
          console.log('[Alarm] Parando desde notificación/reloj, alarmId:', alarmId);

          // Guardar en localStorage (puente background↔foreground)
          localStorage.setItem('myvita_stop_alarm', '1');
          if (alarmId) localStorage.setItem('myvita_stop_alarm_id', alarmId);

          // Cancelar la notificación del SO (para el sonido nativo)
          try { notif.cancel(n.id, function() {}); } catch(e) {}

          // Si la app está en foreground, actuar de inmediato
          if (window.alarmApp) {
            window.alarmApp.stopCurrentAlarm();
            if (alarmId) window.alarmApp.marcarTomada(alarmId);
            const modal = document.getElementById('alarmModal');
            if (modal) modal.style.display = 'none';
            window.alarmApp._mostrarNotif('✅ Medicamento tomado');
            localStorage.removeItem('myvita_stop_alarm');
            localStorage.removeItem('myvita_stop_alarm_id');
          }
          // Si está en background, 'resume' lo maneja al volver al frente
        }

        // ── TOCAR la notificación (tap en celular o en reloj) ─────────
        notif.on('click', _pararDesdeNotif);

        // ── DESCARTAR la notificación (deslizar en reloj o celular) ───
        // Este es el evento clave para el Redmi Watch 5:
        // cuando el usuario desliza la notificación en el reloj para quitarla,
        // Android dispara 'clear' — y aquí paramos la alarma sin abrir la app
        notif.on('clear', function(n) {
          console.log('[Alarm] Notificación descartada (swipe en reloj/celular):', n.id);
          _pararDesdeNotif(n);
        });

        // ── ACCIÓN directa (si algún reloj sí muestra botones) ────────
        notif.on('action', function(n) {
          console.log('[Alarm] Acción de notificación:', n.action, n.id);
          if (n.action === 'posponer') {
            // Posponer sin marcar como tomada
            const alarmId = n?.data?.alarmId || currentRingingId;
            try { notif.cancel(n.id, () => {}); } catch(e) {}
            if (window.alarmApp) {
              window.alarmApp.stopCurrentAlarm();
              const modal = document.getElementById('alarmModal');
              if (modal) modal.style.display = 'none';
              window.alarmApp._mostrarNotif('⏰ Pospuesto 10 minutos');
              if (alarmId) {
                setTimeout(() => {
                  const alarma = alarmasHoy.find(a => a.id === alarmId);
                  if (alarma && !alarma.tomado) window.alarmApp.triggerAlarm(alarma);
                }, 10 * 60 * 1000);
              }
            } else {
              // Background — guardar flag de snooze
              localStorage.setItem('myvita_watch_action', 'snooze');
              if (alarmId) localStorage.setItem('myvita_watch_alarm_id', alarmId);
            }
          } else {
            // Cualquier otra acción (tomada, tap, etc.) — para alarma
            _pararDesdeNotif(n);
          }
        });

        console.log('[Alarm] Programadas', notifList.length, 'notificaciones en el SO');
      });

    } catch (err) {
      console.error('[Alarm] Error programando notificaciones:', err);
    }
  },

  // Disparar alarma por ID (llamado desde notificación)
  triggerAlarmById(alarmId) {
    const a = alarmasHoy.find(x => x.id === alarmId);
    if (a && !a.tomado) this.triggerAlarm(a);
  },

  handleStopFromNotification(notifId) {
    // notifId es el ID numérico de la notificación, no el UUID
    this.stopCurrentAlarm();
  },

  // ── Event listeners ───────────────────────────────────────────
  setupEventListeners() {
    if (!document.getElementById('saveAlarmButton')) return;

    document.getElementById('saveAlarmButton')
      ?.addEventListener('click', () => this.saveAlarm());

    // Botón voz en header
    document.getElementById('voiceAssistantBtn')
      ?.addEventListener('click', () => {
        if (window.voiceAssistant) window.voiceAssistant.startListening();
      });

    // Botón voz en formulario
    document.getElementById('voiceBtnForm')
      ?.addEventListener('click', () => {
        if (window.voiceAssistant) window.voiceAssistant.startListening();
      });

    // Botón posponer del modal
    document.getElementById('modalSnoozeButton')
      ?.addEventListener('click', () => {
        const id = currentRingingId;
        this.stopCurrentAlarm();
        document.getElementById('alarmModal').style.display = 'none';
        this._mostrarNotif('Recordatorio pospuesto 10 minutos');
        if (id) {
          setTimeout(() => {
            const alarma = alarmasHoy.find(a => a.id === id);
            if (alarma && !alarma.tomado) this.triggerAlarm(alarma);
          }, 10 * 60 * 1000);
        }
      });

    document.addEventListener('backbutton', e => {
      if (window.location.pathname.endsWith('alarm.html')) {
        e.preventDefault(); history.back();
      }
    }, false);
  },

  formatTime(h, m) {
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`;
  }
};

// ── Arrancar ──────────────────────────────────────────────────
function onDeviceReady() {
  if (cordova?.plugins?.notification?.local) {
    cordova.plugins.notification.local.hasPermission(g => {
      if (!g) cordova.plugins.notification.local.requestPermission();
    });
  }
  alarmApp.init();

  // ── Manejar minimizar / restaurar app ────────────────────────
  // Sin estos handlers Android 14 mata la app al minimizar alarm.html
  document.addEventListener('pause', function() {
    console.log('[Alarm] App minimizada — pausando audio');
    // Pausar audio al minimizar (no detenerlo — se reanuda al volver)
    try {
      const el = document.getElementById('alarmSound');
      if (el && !el.paused) el.pause();
    } catch(e) {}
    // NO detener el intervalo — las alarmas siguen verificándose
    // via las notificaciones del sistema que ya están programadas
  }, false);

  document.addEventListener('resume', function() {
    console.log('[Alarm] App restaurada');

    // ── Verificar acción pendiente del reloj ──────────────────
    // Puede venir de 3 fuentes:
    //   1. notif.on('click') lo puso antes de que resume disparara
    //   2. watch.js (WatchConnector) lo puso via acción de notificación
    //   3. El intent de Android trae el extra 'alarmaId' al abrir la app

    const stopFlag    = localStorage.getItem('myvita_stop_alarm');
    const watchAction = localStorage.getItem('myvita_watch_action');

    if (stopFlag === '1' || watchAction === 'tomada') {
      localStorage.removeItem('myvita_stop_alarm');
      localStorage.removeItem('myvita_watch_action');

      const pendingId = localStorage.getItem('myvita_stop_alarm_id')
                     || localStorage.getItem('myvita_watch_alarm_id')
                     || currentRingingId;
      localStorage.removeItem('myvita_stop_alarm_id');
      localStorage.removeItem('myvita_watch_alarm_id');

      alarmApp.stopCurrentAlarm();
      if (pendingId) alarmApp.marcarTomada(pendingId);

      const modal = document.getElementById('alarmModal');
      if (modal) modal.style.display = 'none';
      alarmApp._mostrarNotif('✅ Medicamento tomado desde el reloj');
      console.log('[Alarm] Alarma parada al restaurar app (reloj)');
      return;
    }

    if (watchAction === 'snooze') {
      localStorage.removeItem('myvita_watch_action');
      const pendingId = localStorage.getItem('myvita_watch_alarm_id') || currentRingingId;
      localStorage.removeItem('myvita_watch_alarm_id');

      alarmApp.stopCurrentAlarm();
      const modal = document.getElementById('alarmModal');
      if (modal) modal.style.display = 'none';
      alarmApp._mostrarNotif('⏰ Pospuesto 10 minutos');

      if (pendingId) {
        setTimeout(() => {
          const alarma = alarmasHoy.find(a => a.id === pendingId);
          if (alarma && !alarma.tomado) alarmApp.triggerAlarm(alarma);
        }, 10 * 60 * 1000);
      }
      return;
    }

    // ── Verificar si la app se abrió desde la notificación ───
    // En Android, cuando tocas la notif del reloj y la app estaba cerrada,
    // el click handler nunca dispara — solo llega el intent de launch
    // Solución: si hay alarma activa Y la app se abrió ahora, parar
    if (currentRingingId) {
      // Checar via intent si viene de la notificación
      if (window.plugins?.intentShim) {
        window.plugins.intentShim.getIntent(intent => {
          const fromNotif = intent?.extras?.fromNotification
                         || intent?.action?.includes('myvita');
          if (fromNotif) {
            const alarmId = intent.extras?.alarmaId || currentRingingId;
            alarmApp.stopCurrentAlarm();
            if (alarmId) alarmApp.marcarTomada(alarmId);
            const modal = document.getElementById('alarmModal');
            if (modal) modal.style.display = 'none';
            alarmApp._mostrarNotif('✅ Medicamento tomado desde el reloj');
          } else {
            // No viene de notificación — mostrar modal de nuevo
            const alarma = alarmasHoy.find(a => a.id === currentRingingId);
            if (alarma) alarmApp.showAlert('Alarma', alarma.nombre || 'Medicamento');
          }
        }, () => {
          // Sin plugin de intent — mostrar modal de nuevo
          const alarma = alarmasHoy.find(a => a.id === currentRingingId);
          if (alarma) alarmApp.showAlert('Alarma', alarma.nombre || 'Medicamento');
        });
      } else {
        const alarma = alarmasHoy.find(a => a.id === currentRingingId);
        if (alarma) alarmApp.showAlert('Alarma', alarma.nombre || 'Medicamento');
      }
    }
  }, false);
}

// Exponer para que watch.js pueda acceder a las alarmas del día
Object.defineProperty(window.AlarmManager || alarmApp, '_alarmasHoy', {
  get() { return alarmasHoy; }
});
window.alarmApp = alarmApp;

if (window.cordova) {
  document.addEventListener('deviceready', onDeviceReady);
} else {
  document.addEventListener('DOMContentLoaded', () => alarmApp.init());
}

// ================================================================
// ASISTENTE DE VOZ (mismo código original adaptado)
// ================================================================
class VoiceMedicationAssistant {
  constructor(app) {
    this.alarmApp    = app;
    this.recognition = null;
    this.isListening = false;
    this.isSupported = false;
    this.lastResult  = null;
    this.initializeRecognition();
  }

  initializeRecognition() {
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition ||
                 window.mozSpeechRecognition || window.msSpeechRecognition;
      if (!SR) { this.isSupported = false; this.hideVoiceButton(); return; }

      this.recognition = new SR();
      this.recognition.lang            = 'es-ES';
      this.recognition.continuous      = false;
      this.recognition.interimResults  = false;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart  = () => { this.isListening = true;  this.updateVoiceButton(true); this.showStatus('Escuchando... Habla ahora', 'listening'); };
      this.recognition.onend    = () => { this.isListening = false; this.updateVoiceButton(false); if (!this.lastResult) this.showStatus('No se detectó ningún comando', 'error'); };
      this.recognition.onerror  = (ev) => { this.isListening = false; this.updateVoiceButton(false); this.showStatus('Error: ' + ev.error, 'error'); };
      this.recognition.onresult = (ev) => { this.lastResult = ev.results[0][0].transcript; this.processVoiceCommand(this.lastResult); };
      this.isSupported = true;
    } catch { this.isSupported = false; }
  }

  async startListening() {
    if (!this.isSupported) { this.showStatus('Asistente de voz no disponible', 'error'); return; }
    if (this.isListening) { this.recognition.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      this.lastResult = null;
      this.recognition.start();
    } catch { this.showStatus('Sin permiso de micrófono', 'error'); }
  }

  processVoiceCommand(command) {
    this.showStatus('Procesando...', 'processing');
    const data = this.parseAlarmCommand(command);
    if (data) {
      const nameEl = document.getElementById('alarmName');
      const timeEl = document.getElementById('alarmTime');
      if (nameEl) nameEl.value = data.name;
      if (timeEl) timeEl.value = data.time;
      this.alarmApp.isFromVoiceAssistant = true;
      this.alarmApp.saveAlarm();
      this.showStatus(`✅ Alarma: ${data.name} a las ${data.displayTime}`, 'success');
    } else {
      this.showStatus('❌ Usa: "Programar alarma de [medicamento] a las [hora] AM/PM"', 'error');
    }
  }

  parseAlarmCommand(command) {
    const text = command.toLowerCase().trim();
    const m = text.match(/programar\s+alarma\s+(?:de\s+)?([a-záéíóúñ\s]+?)\s+(?:a\s+las?|para\s+las?)\s+(.+)$/i);
    if (!m) return null;
    const timeData = this.extractTime(m[2].trim());
    if (!timeData) return null;
    return { name: this.cleanMedicationName(m[1].trim()), ...timeData };
  }

  extractTime(t) {
    const lower = t.toLowerCase();
    const match = lower.match(/(\d{1,2})[:.s]?(\d{2})?/);
    if (!match) return null;
    let h = parseInt(match[1]), m = match[2] ? parseInt(match[2]) : 0;
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;
    const isAM = !(lower.includes('pm') || lower.includes('tarde') || lower.includes('noche'));
    const h24  = isAM ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
    return {
      time       : `${String(h24).padStart(2,'0')}:${String(m).padStart(2,'0')}`,
      displayTime: `${h}:${String(m).padStart(2,'0')} ${isAM ? 'AM' : 'PM'}`
    };
  }

  cleanMedicationName(name) {
    return name.replace(/\b(tomar|alarma|de|para|la|el|los|las)\b/gi, '')
               .replace(/\s+/g, ' ').trim()
               .replace(/\b\w/g, l => l.toUpperCase()) || 'Medicación';
  }

  showStatus(msg, type) {
    const el = document.getElementById('voiceStatus');
    if (el) { el.textContent = msg; el.className = `voice-status ${type}`; }
  }

  updateVoiceButton(listening) {
    const btn = document.getElementById('voiceAssistantBtn');
    if (!btn) return;
    const icon = btn.querySelector('.material-icons');
    if (icon) icon.textContent = listening ? 'mic_off' : 'mic';
    btn.classList.toggle('listening', listening);
  }

  hideVoiceButton() {
    const btn = document.getElementById('voiceAssistantBtn');
    if (btn) btn.style.display = 'none';
  }
}

// Instanciar asistente después de que el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.voiceAssistant = new VoiceMedicationAssistant(alarmApp);
});