// ================================================================
// chat-ai.js — Asistente Médico IA · MyVita
// Usa window.DB (mismo sistema que toda la app)
// Contexto completo: meds, tomas hoy, adherencia, diario, interacciones
// ================================================================

(function () {
  'use strict';

  const AI_CONFIG = {
    apiUrl     : 'https://api.groq.com/openai/v1/chat/completions',
    apiKey     : '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',
    model      : 'llama-3.1-8b-instant',
    maxTokens  : 1000,
    temperature: 0.7
  };

  let conversationHistory = [];
  let ctx = null;
  let userId = null;

  // ── Arrancar ──────────────────────────────────────────────────
  function arrancar() {
    if (window.cordova) document.addEventListener('deviceready', init, false);
    else document.addEventListener('DOMContentLoaded', init);
  }

  async function init() {
    userId = localStorage.getItem('currentUserId');
    if (!userId) { window.location.href = 'index.html'; return; }
    try {
      await window.DB.init();
      await cargarContexto();
    } catch (e) {
      console.warn('[Chat] Error contexto:', e.message);
      ctx = ctxVacio();
    }
    cargarHistorial();
    setupListeners();
    autoResizeTextarea();
  }

  // ── Contexto médico completo ──────────────────────────────────
  function ctxVacio() {
    return { prescripciones:[], alarmasHoy:[], tomadas:0, pendientes:0,
             adherenciaHoy:0, adherencia30:0, racha:0, diario:[], interacciones:[] };
  }

  async function cargarContexto() {
    ctx = ctxVacio();
    const hoy = new Date().toISOString().split('T')[0];

    try { ctx.prescripciones = await window.DB.Prescripciones.getActivas(userId); } catch(e) {}

    try {
      const al = await window.DB.Alarmas.getDelDia(userId, hoy);
      ctx.alarmasHoy = al;
      ctx.tomadas    = al.filter(a => a.tomado == 1).length;
      ctx.pendientes = al.filter(a => a.tomado != 1).length;
      ctx.adherenciaHoy = al.length > 0 ? Math.round((ctx.tomadas / al.length) * 100) : 0;
    } catch(e) {}

    try {
      const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30);
      const rows = await window.DB.select(
        `SELECT tomado FROM alarmas WHERE usuario_id = ? AND fecha >= ? AND deleted_at IS NULL`,
        [userId, hace30.toISOString().split('T')[0]]
      );
      ctx.adherencia30 = rows.length > 0
        ? Math.round((rows.filter(r => r.tomado==1).length / rows.length) * 100) : 0;
    } catch(e) {}

    try { ctx.racha = await window.DB.Stats.getRachaDias(userId); } catch(e) {}

    try {
      const d = await window.DB.Diario.getAll(userId);
      ctx.diario = (d || []).slice(0, 5);
    } catch(e) {}

    try {
      if (window.InteractionChecker && ctx.prescripciones.length >= 2) {
        const found = await window.InteractionChecker.checkAll(ctx.prescripciones);
        ctx.interacciones = found.filter(r => r.severity !== 'baja');
      }
    } catch(e) {}
  }

  // ── System prompt ─────────────────────────────────────────────
  function buildSystemPrompt() {
    const fecha = new Date().toLocaleDateString('es-MX',
      { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    const hora = new Date().toLocaleTimeString('es-MX',
      { hour:'2-digit', minute:'2-digit' });

    let c = `Fecha y hora: ${fecha}, ${hora}\n\n`;

    // Medicamentos
    c += '=== MEDICAMENTOS ACTIVOS ===\n';
    if (!ctx.prescripciones.length) {
      c += 'Sin medicamentos registrados.\n\n';
    } else {
      ctx.prescripciones.forEach((p, i) => {
        const n = p.dosis || p.medicamento_nombre || 'Medicamento';
        c += `${i+1}. ${n}\n`;
        if (p.frecuencia)         c += `   Frecuencia: ${p.frecuencia}\n`;
        if (p.hora_toma)          c += `   Hora: ${p.hora_toma}\n`;
        if (p.via_administracion) c += `   Vía: ${p.via_administracion}\n`;
        if (p.nombre_medico)      c += `   Médico: ${p.nombre_medico}\n`;
        if (p.notas)              c += `   Notas: ${p.notas}\n`;
      });
      c += '\n';
    }

    // Tomas de hoy
    c += '=== TOMAS DE HOY ===\n';
    if (!ctx.alarmasHoy.length) {
      c += 'Sin alarmas programadas hoy.\n\n';
    } else {
      c += `Tomadas: ${ctx.tomadas}/${ctx.alarmasHoy.length} (${ctx.adherenciaHoy}%)\n`;
      ctx.alarmasHoy.forEach(a => {
        const n     = a.dosis || a.medicamento_nombre || a.nombre || 'Medicamento';
        const est   = a.tomado == 1 ? '✅' : '⏳';
        const cuand = a.hora_tomado ? ' (tomó a las ' + a.hora_tomado.substring(11,16) + ')' : '';
        c += `  ${est} ${n} — ${a.hora_toma || '?'}${cuand}\n`;
      });
      c += '\n';
    }

    // Adherencia
    c += '=== ADHERENCIA ===\n';
    c += `Hoy: ${ctx.adherenciaHoy}% | Últimos 30 días: ${ctx.adherencia30}% | Racha: ${ctx.racha} días\n\n`;

    // Interacciones
    if (ctx.interacciones.length) {
      c += '=== ⚠️ INTERACCIONES DETECTADAS ===\n';
      ctx.interacciones.forEach(i => {
        c += `${i.severity==='alta'?'⛔':'⚠️'} ${i.drugA} + ${i.drugB}: ${i.risk}\n`;
      });
      c += '\n';
    }

    // Diario
    if (ctx.diario.length) {
      c += '=== DIARIO RECIENTE ===\n';
      const animos = ['','Muy mal','Mal','Regular','Bien','Muy bien'];
      ctx.diario.forEach(d => {
        c += `${d.fecha}:`;
        if (d.sintomas)     c += ` ${d.sintomas}.`;
        if (d.notas)        c += ` ${d.notas}.`;
        if (d.estado_animo) c += ` Estado: ${animos[d.estado_animo]||d.estado_animo}.`;
        c += '\n';
      });
      c += '\n';
    }

    return `Eres el asistente médico personal de MyVita, una app de gestión de medicamentos para pacientes en México.

${c}TU ROL:
- Tienes acceso completo a los datos del usuario que aparecen arriba. Úsalos siempre.
- Si preguntan "¿tomé mi medicamento?" revisa las tomas de hoy y responde específicamente.
- Si hay interacciones, menciónalas cuando sea relevante y advierte con claridad.
- Si la adherencia es baja, motiva al usuario con empatía.
- Ayuda con: efectos secundarios, qué hacer si olvidó una toma, cómo almacenar medicamentos, horarios.
- NUNCA diagnostiques enfermedades ni cambies dosis sin indicación médica.
- Recomienda consultar al médico para decisiones importantes.
- Responde en español mexicano, claro y sin tecnicismos innecesarios.
- Respuestas cortas (2-4 párrafos). Usa **negritas** para lo importante y listas cuando aplique.
- Usa emojis ocasionalmente 💊`;
  }

  // ── Enviar a IA ───────────────────────────────────────────────
  async function enviarMensaje(mensaje) {
    try {
      mostrarTyping();
      conversationHistory.push({ role: 'user', content: mensaje });

      const res = await fetch(AI_CONFIG.apiUrl, {
        method : 'POST',
        headers: {
          'Content-Type' : 'application/json',
          'Authorization': 'Bearer ' + AI_CONFIG.apiKey
        },
        body: JSON.stringify({
          model      : AI_CONFIG.model,
          messages   : [
            { role: 'system', content: buildSystemPrompt() },
            ...conversationHistory.slice(-10)
          ],
          max_tokens : AI_CONFIG.maxTokens,
          temperature: AI_CONFIG.temperature,
          stream     : false
        })
      });

      if (!res.ok) throw new Error('API ' + res.status);
      const data  = await res.json();
      const reply = data.choices[0].message.content;
      conversationHistory.push({ role: 'assistant', content: reply });
      guardarHistorial();
      return reply;

    } catch (e) {
      console.error('[Chat]', e.message);
      return `Lo siento, no pude conectarme ahora mismo 😔\n\nPuedes revisar tus prescripciones y alarmas directamente en la app. Si es urgente, contacta a tu médico.`;
    } finally {
      ocultarTyping();
    }
  }

  // ── UI ────────────────────────────────────────────────────────
  function setupListeners() {
    const input  = document.getElementById('messageInput');
    const btnSnd = document.getElementById('btnSend');

    btnSnd.addEventListener('click', manejarEnvio);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); manejarEnvio(); }
    });

    document.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        input.value = chip.getAttribute('data-prompt') || chip.textContent.trim();
        manejarEnvio();
      });
    });

    document.getElementById('btnVoice')?.addEventListener('click', toggleVoz);
    document.getElementById('btnAttach')?.addEventListener('click', () =>
      mostrarNotif('Adjuntar imagen próximamente 📷'));

    document.getElementById('btnChatOptions')?.addEventListener('click', () =>
      document.getElementById('chatOptionsModal').style.display = 'flex');
    document.getElementById('chatOptionsModal')?.addEventListener('click', e => {
      if (e.target === document.getElementById('chatOptionsModal'))
        document.getElementById('chatOptionsModal').style.display = 'none';
    });

    document.getElementById('btnClearChat')?.addEventListener('click', limpiarChat);
    document.getElementById('btnExportChat')?.addEventListener('click', exportarChat);
    document.getElementById('btnContextInfo')?.addEventListener('click', mostrarContexto);
    document.getElementById('btnCloseContext')?.addEventListener('click', () =>
      document.getElementById('contextModal').style.display = 'none');
  }

  async function manejarEnvio() {
    const input   = document.getElementById('messageInput');
    const mensaje = input.value.trim();
    if (!mensaje) return;
    input.value = '';
    input.style.height = 'auto';
    document.querySelector('.welcome-message')?.remove();
    agregarMensaje('user', mensaje);
    if (navigator.vibrate) navigator.vibrate(10);
    scrollAbajo();
    try { await cargarContexto(); } catch(e) {}
    const respuesta = await enviarMensaje(mensaje);
    agregarMensaje('ai', respuesta);
    scrollAbajo();
    // Leer respuesta en voz si el usuario usó el micrófono
    if (escuchando === false && window._chatLeerRespuesta && document.getElementById('btnVoice')?.dataset.used === '1') {
      window._chatLeerRespuesta(respuesta);
    }
  }

  function agregarMensaje(sender, texto) {
    const cont = document.getElementById('chatContainer');
    const div  = document.createElement('div');
    div.className = 'message ' + sender;
    const hora = new Date().toLocaleTimeString('es-MX',
      { hour:'2-digit', minute:'2-digit' });
    div.innerHTML = `
      <div class="message-bubble">
        <div class="message-text">${fmt(texto)}</div>
        <div class="message-time">${hora}${sender==='user'
          ? ' <span class="material-icons">done_all</span>' : ''}</div>
      </div>`;
    cont.appendChild(div);
  }

  function fmt(t) {
    return t
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g,     '<em>$1</em>')
      .replace(/^- (.+)$/gm,    '• $1')
      .replace(/\n/g,            '<br>');
  }

  function mostrarTyping() {
    document.getElementById('typingIndicator').style.display = 'flex';
    document.getElementById('btnSend').disabled = true;
    scrollAbajo();
  }
  function ocultarTyping() {
    document.getElementById('typingIndicator').style.display = 'none';
    document.getElementById('btnSend').disabled = false;
  }
  function scrollAbajo() {
    const c = document.getElementById('chatContainer');
    setTimeout(() => { c.scrollTop = c.scrollHeight; }, 100);
  }
  function autoResizeTextarea() {
    document.getElementById('messageInput').addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
  }

  // ── Historial ─────────────────────────────────────────────────
  function guardarHistorial() {
    try {
      localStorage.setItem('chat_history_' + userId,
        JSON.stringify(conversationHistory.slice(-40)));
    } catch(e) {}
  }
  function cargarHistorial() {
    try {
      const raw = localStorage.getItem('chat_history_' + userId)
               || localStorage.getItem('chat_history');
      if (!raw) return;
      conversationHistory = JSON.parse(raw);
      if (!conversationHistory.length) return;
      conversationHistory.forEach(m => {
        if (m.role === 'user')      agregarMensaje('user', m.content);
        else if (m.role === 'assistant') agregarMensaje('ai', m.content);
      });
      document.querySelector('.welcome-message')?.remove();
      scrollAbajo();
    } catch(e) {}
  }

  // ── Opciones ──────────────────────────────────────────────────
  function limpiarChat() {
    const ok = confirm('¿Limpiar toda la conversación?');
    if (!ok) return;
    conversationHistory = [];
    localStorage.removeItem('chat_history_' + userId);
    localStorage.removeItem('chat_history');
    document.getElementById('chatOptionsModal').style.display = 'none';
    location.reload();
  }

  function exportarChat() {
    const texto = conversationHistory.map(m =>
      '[' + (m.role==='user' ? 'Yo' : 'Asistente') + ']: ' + m.content
    ).join('\n\n');
    const a = document.createElement('a');
    a.href     = 'data:text/plain;charset=utf-8,' + encodeURIComponent(texto);
    a.download = 'chat-myvita-' + new Date().toISOString().split('T')[0] + '.txt';
    a.click();
    document.getElementById('chatOptionsModal').style.display = 'none';
    mostrarNotif('Chat exportado ✅');
  }

  function mostrarContexto() {
    const presc = document.getElementById('activePrescriptions');
    const entr  = document.getElementById('lastEntries');

    presc.innerHTML = ctx.prescripciones.length
      ? ctx.prescripciones.map(p => {
          const n = p.dosis || p.medicamento_nombre || 'Medicamento';
          return `<p><strong>${n}</strong><br>${p.frecuencia||''} ${p.hora_toma?'· '+p.hora_toma:''}</p>`;
        }).join('')
      : '<p class="context-empty">Sin prescripciones activas</p>';

    const txt = `Adherencia hoy: ${ctx.adherenciaHoy}% (${ctx.tomadas}/${ctx.alarmasHoy.length} tomas)\n` +
      `Adherencia 30 días: ${ctx.adherencia30}%\nRacha: ${ctx.racha} días`;
    entr.innerHTML = `<p style="white-space:pre-line;font-size:.85rem">${txt}</p>`;

    if (ctx.interacciones.length)
      entr.innerHTML += `<p style="color:#ff5252;font-weight:600;margin-top:8px">` +
        `⚠️ ${ctx.interacciones.length} interacción(es) detectada(s)</p>`;

    document.getElementById('contextModal').style.display = 'flex';
    document.getElementById('chatOptionsModal').style.display = 'none';
  }

  function mostrarNotif(msg) {
    const n = document.createElement('div');  
    n.style.cssText = `position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(10px);
      background:#1a1a2e;color:white;padding:10px 20px;border-radius:20px;font-size:.85rem;
      font-weight:500;z-index:9999;opacity:0;transition:all .3s`;
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => { n.style.opacity='1'; n.style.transform='translateX(-50%) translateY(0)'; }, 10);
    setTimeout(() => { n.style.opacity='0'; setTimeout(() => n.remove(), 300); }, 3000);
  }

  arrancar();

  // ================================================================
  // VOZ — Reconocimiento (STT) + Síntesis (TTS)
  // ================================================================
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let reconocimiento  = null;
  let escuchando      = false;
  let ttsHabilitado   = true;   // el usuario puede silenciar la voz

  function initVoz() {
    if (!SpeechRecognition) {
      console.warn('[Voz] SpeechRecognition no soportado en este dispositivo');
      return;
    }

    reconocimiento = new SpeechRecognition();
    reconocimiento.lang           = 'es-MX';
    reconocimiento.continuous     = false;
    reconocimiento.interimResults = true;   // muestra texto mientras habla
    reconocimiento.maxAlternatives = 1;

    reconocimiento.onstart = () => {
      escuchando = true;
      setBtnVozActivo(true);
      document.getElementById('messageInput').placeholder = '🎤 Escuchando...';
    };

    reconocimiento.onresult = (e) => {
      // Mostrar transcripción parcial en el input en tiempo real
      const transcript = Array.from(e.results)
        .map(r => r[0].transcript)
        .join('');
      document.getElementById('messageInput').value = transcript;
      autoResize(document.getElementById('messageInput'));
    };

    reconocimiento.onend = () => {
      escuchando = false;
      setBtnVozActivo(false);
      document.getElementById('messageInput').placeholder = 'Escribe tu pregunta...';

      // Si hay texto capturado, enviar automáticamente
      const texto = document.getElementById('messageInput').value.trim();
      if (texto) {
        setTimeout(() => manejarEnvio(), 300);
      }
    };

    reconocimiento.onerror = (e) => {
      escuchando = false;
      setBtnVozActivo(false);
      document.getElementById('messageInput').placeholder = 'Escribe tu pregunta...';

      const msgs = {
        'not-allowed'     : 'Permiso de micrófono denegado. Actívalo en ajustes.',
        'no-speech'       : 'No se detectó voz. Intenta de nuevo.',
        'network'         : 'Sin conexión para reconocimiento de voz.',
        'audio-capture'   : 'No se encontró micrófono en el dispositivo.',
        'aborted'         : null   // cancelado por el usuario, sin mensaje
      };
      const msg = msgs[e.error];
      if (msg) mostrarNotif(msg, 'error');
    };
  }

  function toggleVoz() {
    if (!SpeechRecognition) {
      mostrarNotif('Tu dispositivo no soporta reconocimiento de voz 😔', 'error');
      return;
    }
    if (!reconocimiento) initVoz();

    if (escuchando) {
      reconocimiento.stop();
    } else {
      // Marcar que se usó voz (para activar TTS en la respuesta)
      const btnV = document.getElementById('btnVoice');
      if (btnV) btnV.dataset.used = '1';
      // Limpiar input antes de escuchar
      document.getElementById('messageInput').value = '';
      try {
        reconocimiento.start();
      } catch(e) {
        reconocimiento.stop();
        setTimeout(() => reconocimiento.start(), 300);
      }
    }
  }

  function setBtnVozActivo(activo) {
    const btn = document.getElementById('btnVoice');
    if (!btn) return;
    if (activo) {
      btn.innerHTML = '<span class="material-icons">mic</span>';
      btn.classList.add('voice-recording');
      btn.title = 'Toca para detener';
    } else {
      btn.innerHTML = '<span class="material-icons">mic</span>';
      btn.classList.remove('voice-recording');
      btn.title = 'Hablar';
    }
  }

  // ── Síntesis de voz (TTS) — leer respuesta del AI ────────────
  function leerRespuesta(texto) {
    if (!ttsHabilitado) return;
    if (!window.speechSynthesis) return;

    // Cancelar cualquier lectura en curso
    window.speechSynthesis.cancel();

    // Limpiar markdown del texto
    const textoLimpio = texto
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\n/g, ' ')
      .substring(0, 500);   // máximo 500 chars para no ser pesado

    const utterance       = new SpeechSynthesisUtterance(textoLimpio);
    utterance.lang        = 'es-MX';
    utterance.rate        = 1.0;
    utterance.pitch       = 1.0;
    utterance.volume      = 0.9;

    // Preferir voz en español si está disponible
    const voces = window.speechSynthesis.getVoices();
    const vozES = voces.find(v => v.lang.startsWith('es') && v.localService) ||
                  voces.find(v => v.lang.startsWith('es'));
    if (vozES) utterance.voice = vozES;

    window.speechSynthesis.speak(utterance);
  }

  // Exponer para que manejarEnvio llame leerRespuesta después de recibir respuesta IA
  window._chatLeerRespuesta = leerRespuesta;

  // Inicializar voz al arrancar (sin pedir permiso todavía)
  if (SpeechRecognition) initVoz();

})(); // fin IIFE