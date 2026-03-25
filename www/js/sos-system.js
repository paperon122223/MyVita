// ========================================
// SISTEMA SOS v5 - MYVITA
// Métodos basados en contacts.js existente:
// ✅ navigator.contacts.find() — carga contactos reales
// ✅ window.open(url, '_system') con wa.me — WhatsApp funcional
// ✅ limpiarNumero() igual que el código existente
// ✅ Botón SOS en header + en cada mensaje IA
// ========================================

(function () {
  'use strict';

  const COUNTRY_CODE = '52'; // igual que contacts.js

  const SOS_CONFIG = {
    defaultMessage: '🚨 EMERGENCIA MÉDICA 🚨\nNecesito ayuda urgente.\n\n📍 Ubicación: {ubicacion}\n🕐 Hora: {hora}\n\nEnviado desde MyVita.',
    storageKey: 'sos_contacts',
    messageKey: 'sos_custom_message'
  };

  let sosContacts      = [];   // contactos de emergencia guardados
  let allDeviceContacts = [];  // todos los contactos del teléfono
  let filteredContacts  = [];  // resultado de búsqueda
  let userLocation     = null;
  let cdInterval       = null;

  // ─────────────────────────────────────────
  // INIT — igual que contacts.js usa deviceready
  // ─────────────────────────────────────────
  function initSOS() {
    loadSOSContacts();
    requestLocation();
    injectStyles();
    injectModal();
    injectCountdownModal();
    bindHeaderBtn();
    observeMessages();
    console.log('✅ SOS v5 listo — contactos emergencia:', sosContacts.length);
  }

  function injectStyles() {
    if (document.getElementById('sos-css')) return;
    const l = document.createElement('link');
    l.id = 'sos-css'; l.rel = 'stylesheet'; l.href = 'css/sos-system.css';
    document.head.appendChild(l);
  }

  // ─────────────────────────────────────────
  // BOTÓN SOS EN EL HEADER
  // ─────────────────────────────────────────
  function bindHeaderBtn() {
    const btn = document.getElementById('btnSOSHeader');
    if (btn) btn.addEventListener('click', openPanel);
  }

  // ─────────────────────────────────────────
  // BOTÓN SOS EN CADA MENSAJE DE LA IA
  // ─────────────────────────────────────────
  function observeMessages() {
    const container = document.getElementById('chatContainer');
    if (!container) return;
    container.querySelectorAll('.message.ai').forEach(addBtnToMsg);
    new MutationObserver(muts => {
      muts.forEach(m => m.addedNodes.forEach(node => {
        if (node.nodeType === 1 && node.classList.contains('message') && node.classList.contains('ai')) {
          setTimeout(() => addBtnToMsg(node), 60);
        }
      }));
    }).observe(container, { childList: true });
  }

  function addBtnToMsg(msgEl) {
    if (msgEl.querySelector('.sos-inline-row')) return;
    const bubble = msgEl.querySelector('.message-bubble');
    if (!bubble) return;
    const row = document.createElement('div');
    row.className = 'sos-inline-row';
    row.innerHTML = `<button class="sos-inline-btn">🆘 Enviar SOS</button>`;
    row.querySelector('.sos-inline-btn').addEventListener('click', e => {
      e.stopPropagation();
      openPanel();
    });
    bubble.appendChild(row);
  }

  // ─────────────────────────────────────────
  // CARGAR CONTACTOS DEL TELÉFONO
  // Mismo método que contacts.js usa y que ya funciona
  // ─────────────────────────────────────────
  function cargarContactosTelefono(callback) {
    // Pedir permiso igual que contacts.js
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.permissions) {
      const perms = cordova.plugins.permissions;
      perms.requestPermission(perms.READ_CONTACTS,
        function (status) {
          if (status.hasPermission) {
            buscarContactos(callback);
          } else {
            mostrarToast('⚠️ Sin permiso para leer contactos. Revisa los ajustes.');
            callback([]);
          }
        },
        function () {
          mostrarToast('❌ Error al solicitar permiso de contactos');
          callback([]);
        }
      );
    } else {
      // Sin plugin de permisos — intentar directo
      buscarContactos(callback);
    }
  }

  function buscarContactos(callback) {
    // Exactamente igual que loadContacts() en contacts.js
    if (!navigator.contacts) {
      mostrarToast('⚠️ API de contactos no disponible');
      callback([]);
      return;
    }

    const options = new ContactFindOptions();
    options.filter   = "";
    options.multiple = true;
    const fields = ["displayName", "name", "id", "phoneNumbers"];

    navigator.contacts.find(
      fields,
      function (contacts) {
        // Filtrar solo los que tienen nombre y teléfono
        const validos = contacts.filter(
          c => (c.displayName || c.name?.formatted) &&
               Array.isArray(c.phoneNumbers) && c.phoneNumbers.length > 0
        );
        // Ordenar alfabéticamente
        validos.sort((a, b) => {
          const na = (a.displayName || a.name?.formatted || '').toLowerCase();
          const nb = (b.displayName || b.name?.formatted || '').toLowerCase();
          return na.localeCompare(nb);
        });
        callback(validos);
      },
      function (error) {
        console.error('Error contacts.find:', error);
        mostrarToast('❌ No se pudieron cargar los contactos');
        callback([]);
      },
      options
    );
  }

  // ─────────────────────────────────────────
  // LIMPIAR NÚMERO — exactamente igual que contacts.js
  // ─────────────────────────────────────────
  function limpiarNumero(phone) {
    let numero = phone.replace(/[^\d]/g, '');
    if (numero.length === 12 && numero.startsWith(COUNTRY_CODE))        return numero;
    if (numero.length === 13 && numero.startsWith(COUNTRY_CODE + '1'))  return COUNTRY_CODE + numero.substring(3);
    if (numero.length === 11 && numero.startsWith('1'))                  return COUNTRY_CODE + numero.substring(1);
    if (numero.length === 10)                                            return COUNTRY_CODE + numero;
    return numero;
  }

  // ─────────────────────────────────────────
  // MODAL PRINCIPAL
  // ─────────────────────────────────────────
  function injectModal() {
    if (document.getElementById('sosModal')) return;
    const modal = document.createElement('div');
    modal.id = 'sosModal';
    modal.className = 'sos-modal';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="sos-panel">

        <div class="sos-panel-hdr">
          <div class="sos-hdr-left">
            <span class="sos-hdr-icon">🚨</span>
            <div>
              <h2 class="sos-title">Sistema SOS</h2>
              <p class="sos-subtitle">Alerta de emergencia médica</p>
            </div>
          </div>
          <button class="sos-x-btn" id="btnSOSClose">✕</button>
        </div>

        <div class="sos-tabs">
          <button class="sos-tab active" data-tab="enviar">📤 Enviar</button>
          <button class="sos-tab" data-tab="contactos">👥 Contactos</button>
          <button class="sos-tab" data-tab="mensaje">✏️ Mensaje</button>
        </div>

        <!-- ══ TAB ENVIAR ══ -->
        <div class="sos-tc active" id="sos-tab-enviar">
          <div class="sos-loc" id="sosLocBox">
            <span>📍</span>
            <span id="sosLocTxt">Obteniendo ubicación...</span>
          </div>
          <div id="sosPreviewContacts"></div>
          <div class="sos-two-btns">
            <button class="sos-btn-channel sms" id="btnOnlySMS">
              <span class="ch-icon">📱</span>
              <div><strong>Solo SMS</strong><small>A todos los contactos</small></div>
            </button>
            <button class="sos-btn-channel wa" id="btnOnlyWA">
              <span class="ch-icon">💬</span>
              <div><strong>Solo WhatsApp</strong><small>Abre WA listo para enviar</small></div>
            </button>
          </div>
          <button class="sos-big-btn" id="btnSOSNow">
            🆘 &nbsp;ENVIAR ALERTA AHORA
          </button>
          <p class="sos-note">SMS directo + WhatsApp abierto con mensaje listo para cada contacto</p>
        </div>

        <!-- ══ TAB CONTACTOS ══ -->
        <div class="sos-tc" id="sos-tab-contactos">

          <!-- Botón importar del teléfono -->
          <button class="sos-pick-btn" id="btnPickContact">
            <span class="pick-icon">📒</span>
            <div class="pick-text">
              <strong>Importar del teléfono</strong>
              <small>Selecciona de tus contactos guardados</small>
            </div>
            <span class="pick-arrow">›</span>
          </button>

          <!-- Buscador — aparece después de cargar contactos -->
          <div id="sosContactSearch" style="display:none;">
            <input type="text" id="sosSearchInput" class="sos-input sos-search"
              placeholder="🔍 Buscar contacto..." autocomplete="off">
            <div id="sosContactResults" class="sos-results-list"></div>
          </div>

          <div class="sos-or-line">— o ingresa manualmente —</div>

          <input type="text" id="sosInpName"  class="sos-input" placeholder="Nombre (ej: Mamá)">
          <input type="tel"  id="sosInpPhone" class="sos-input" placeholder="Teléfono (+52 844 123 4567)">
          <div class="sos-chk-row">
            <label class="sos-chk">
              <input type="checkbox" id="chkWA" checked>
              <span class="chk-wa">💬 WhatsApp</span>
            </label>
            <label class="sos-chk">
              <input type="checkbox" id="chkSMS" checked>
              <span class="chk-sms">📱 SMS</span>
            </label>
          </div>
          <button class="sos-add-btn" id="btnAddContact">➕ Agregar contacto</button>

          <h4 class="sos-list-title">Contactos de emergencia guardados</h4>
          <div id="sosSavedList"></div>
        </div>

        <!-- ══ TAB MENSAJE ══ -->
        <div class="sos-tc" id="sos-tab-mensaje">
          <p class="sos-hint">Variables: <code>{ubicacion}</code> y <code>{hora}</code></p>
          <textarea id="sosCustomMsg" class="sos-textarea" rows="6"></textarea>
          <div class="sos-msg-row-btns">
            <button class="sos-btn-reset" id="btnResetMsg">🔄 Restaurar</button>
            <button class="sos-btn-save"  id="btnSaveMsg">💾 Guardar</button>
          </div>
          <div class="sos-preview-box">
            <p class="sos-preview-lbl">Vista previa:</p>
            <p id="sosMsgPreview"></p>
          </div>
        </div>

      </div>
    `;
    document.querySelector('.app-container').appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) closePanel(); });
    bindModalEvents();
  }

  function bindModalEvents() {
    const g = id => document.getElementById(id);
    g('btnSOSClose')   .addEventListener('click', closePanel);
    g('btnSOSNow')     .addEventListener('click', startCountdown);
    g('btnOnlySMS')    .addEventListener('click', sendAllSMS);
    g('btnOnlyWA')     .addEventListener('click', openAllWA);
    g('btnPickContact').addEventListener('click', abrirSelectorContactos);
    g('btnAddContact') .addEventListener('click', () => addManual(false));
    g('btnSaveMsg')    .addEventListener('click', saveMsg);
    g('btnResetMsg')   .addEventListener('click', resetMsg);
    g('sosCustomMsg')  .addEventListener('input',  updatePreview);
    document.querySelectorAll('.sos-tab').forEach(t =>
      t.addEventListener('click', () => switchTab(t.dataset.tab))
    );
  }

  // ─────────────────────────────────────────
  // SELECTOR DE CONTACTOS DEL TELÉFONO
  // Carga todos, muestra lista con buscador
  // ─────────────────────────────────────────
  function abrirSelectorContactos() {
    const searchBox = document.getElementById('sosContactSearch');
    const results   = document.getElementById('sosContactResults');
    const input     = document.getElementById('sosSearchInput');

    // Si ya están cargados, solo mostrar
    if (allDeviceContacts.length > 0) {
      searchBox.style.display = 'block';
      input.focus();
      renderContactResults(allDeviceContacts);
      return;
    }

    // Mostrar loading
    searchBox.style.display = 'block';
    results.innerHTML = `<div class="sos-loading">⏳ Cargando contactos del teléfono...</div>`;

    cargarContactosTelefono(function (contacts) {
      allDeviceContacts = contacts;
      filteredContacts  = contacts;

      if (contacts.length === 0) {
        results.innerHTML = `<div class="sos-loading">Sin contactos disponibles</div>`;
        return;
      }

      renderContactResults(contacts);

      // Buscador en tiempo real
      input.addEventListener('input', function () {
        const term = this.value.toLowerCase();
        const filtered = allDeviceContacts.filter(c => {
          const name = (c.displayName || c.name?.formatted || '').toLowerCase();
          return name.includes(term);
        });
        renderContactResults(filtered);
      });

      input.focus();
      mostrarToast(`📒 ${contacts.length} contactos cargados`);
    });
  }

  function renderContactResults(contacts) {
    const results = document.getElementById('sosContactResults');
    if (!results) return;

    if (contacts.length === 0) {
      results.innerHTML = `<div class="sos-loading">No se encontraron contactos</div>`;
      return;
    }

    results.innerHTML = contacts.map((c, i) => {
      const name   = c.displayName || c.name?.formatted || 'Sin nombre';
      const letter = name.trim()[0]?.toUpperCase() || '?';
      // Mostrar primer número formateado
      const phone  = c.phoneNumbers?.[0]?.value || '';
      const phoneClean = limpiarNumero(phone);

      return `
        <div class="sos-result-item" data-index="${i}" data-phone="${phoneClean}" data-name="${name}">
          <div class="sos-av sm result-av">${letter}</div>
          <div class="sos-result-info">
            <strong>${name}</strong>
            <span>${phone}</span>
          </div>
          <span class="sos-result-arrow">+</span>
        </div>
      `;
    }).join('');

    // Evento: tocar un contacto lo agrega a la lista SOS
    results.querySelectorAll('.sos-result-item').forEach(item => {
      item.addEventListener('click', function () {
        const name  = this.dataset.name;
        const phone = this.dataset.phone;

        // Pre-llenar y agregar
        document.getElementById('sosInpName').value  = name;
        document.getElementById('sosInpPhone').value = phone;
        document.getElementById('chkWA').checked  = true;
        document.getElementById('chkSMS').checked = true;
        addManual(true);

        // Animación de confirmación en el item
        this.classList.add('sos-result-added');
        this.querySelector('.sos-result-arrow').textContent = '✓';
        setTimeout(() => {
          // Ocultar el buscador y volver a la lista
          document.getElementById('sosContactSearch').style.display = 'none';
          document.getElementById('sosSearchInput').value = '';
        }, 800);
      });
    });
  }

  // ─────────────────────────────────────────
  // CONTACTOS SOS — CRUD
  // ─────────────────────────────────────────
  function loadSOSContacts() {
    try { sosContacts = JSON.parse(localStorage.getItem(SOS_CONFIG.storageKey) || '[]'); }
    catch (_) { sosContacts = []; }
  }

  function saveSOSContacts() {
    localStorage.setItem(SOS_CONFIG.storageKey, JSON.stringify(sosContacts));
  }

  function addManual(silent) {
    const name  = document.getElementById('sosInpName').value.trim();
    const phone = document.getElementById('sosInpPhone').value.trim();
    const wa    = document.getElementById('chkWA').checked;
    const sms   = document.getElementById('chkSMS').checked;

    if (!name)            return mostrarToast('⚠️ Ingresa un nombre');
    if (phone.length < 7) return mostrarToast('⚠️ Número de teléfono inválido');
    if (!wa && !sms)      return mostrarToast('⚠️ Elige al menos un método');

    const phoneClean = limpiarNumero(phone);
    sosContacts.push({ name, phone: phoneClean, wa, sms });
    saveSOSContacts();

    document.getElementById('sosInpName').value  = '';
    document.getElementById('sosInpPhone').value = '';

    refreshSavedList();
    refreshPreviewContacts();
    if (!silent) mostrarToast(`✅ ${name} agregado como contacto SOS`);
  }

  function deleteContact(i) {
    const name = sosContacts[i].name;
    sosContacts.splice(i, 1);
    saveSOSContacts();
    refreshSavedList();
    refreshPreviewContacts();
    mostrarToast(`🗑️ ${name} eliminado`);
  }

  function refreshSavedList() {
    const el = document.getElementById('sosSavedList');
    if (!el) return;
    if (!sosContacts.length) {
      el.innerHTML = `<p class="sos-empty">Aún sin contactos de emergencia.<br>Toca <strong>Importar del teléfono</strong> o agrégalos manualmente.</p>`;
      return;
    }
    el.innerHTML = sosContacts.map((c, i) => `
      <div class="sos-card">
        <div class="sos-av">${c.name[0].toUpperCase()}</div>
        <div class="sos-card-info">
          <strong>${c.name}</strong>
          <span>${c.phone}</span>
          <div class="sos-card-badges">
            ${c.wa  ? '<span class="cbadge wa">💬 WA</span>'   : ''}
            ${c.sms ? '<span class="cbadge sms">📱 SMS</span>' : ''}
          </div>
        </div>
        <button class="sos-del" data-i="${i}">✕</button>
      </div>
    `).join('');
    el.querySelectorAll('.sos-del').forEach(b =>
      b.addEventListener('click', () => deleteContact(+b.dataset.i))
    );
  }

  function refreshPreviewContacts() {
    const el = document.getElementById('sosPreviewContacts');
    if (!el) return;
    if (!sosContacts.length) {
      el.innerHTML = `<div class="sos-no-contacts">⚠️ No tienes contactos de emergencia.<br>Ve a la pestaña <strong>Contactos</strong>.</div>`;
      return;
    }
    el.innerHTML = `
      <p class="sos-c-label">Se enviará a ${sosContacts.length} contacto(s):</p>
      ${sosContacts.map(c => `
        <div class="sos-c-row">
          <div class="sos-av sm">${c.name[0].toUpperCase()}</div>
          <span class="sos-c-name">${c.name}</span>
          <div class="sos-mini-badges">
            ${c.wa  ? '<span class="mb-wa">WA</span>'   : ''}
            ${c.sms ? '<span class="mb-sms">SMS</span>' : ''}
          </div>
        </div>
      `).join('')}
    `;
  }

  // ─────────────────────────────────────────
  // UBICACIÓN
  // ─────────────────────────────────────────
  function requestLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      p => { userLocation = p.coords; },
      () => { userLocation = null; },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function refreshLocation() {
    const box = document.getElementById('sosLocBox');
    const txt = document.getElementById('sosLocTxt');
    if (!box || !txt) return;
    if (userLocation) {
      box.className = 'sos-loc ok';
      txt.textContent = 'Ubicación lista ✓';
    } else {
      box.className = 'sos-loc warn';
      txt.textContent = 'Ubicación no disponible';
      requestLocation();
    }
  }

  function locationStr() {
    return userLocation
      ? `https://maps.google.com/?q=${userLocation.latitude},${userLocation.longitude}`
      : 'No disponible';
  }

  // ─────────────────────────────────────────
  // MENSAJE
  // ─────────────────────────────────────────
  function buildMsg() {
    const tpl = localStorage.getItem(SOS_CONFIG.messageKey) || SOS_CONFIG.defaultMessage;
    return tpl
      .replace('{ubicacion}', locationStr())
      .replace('{hora}', new Date().toLocaleString('es-MX'));
  }

  function loadMsgEditor() {
    const ta = document.getElementById('sosCustomMsg');
    if (!ta) return;
    ta.value = localStorage.getItem(SOS_CONFIG.messageKey) || SOS_CONFIG.defaultMessage;
    updatePreview();
  }

  function saveMsg() {
    localStorage.setItem(SOS_CONFIG.messageKey, document.getElementById('sosCustomMsg').value);
    mostrarToast('✅ Mensaje guardado');
  }

  function resetMsg() {
    document.getElementById('sosCustomMsg').value = SOS_CONFIG.defaultMessage;
    localStorage.removeItem(SOS_CONFIG.messageKey);
    updatePreview();
    mostrarToast('🔄 Mensaje restaurado');
  }

  function updatePreview() {
    const ta  = document.getElementById('sosCustomMsg');
    const pre = document.getElementById('sosMsgPreview');
    if (!ta || !pre) return;
    pre.textContent = ta.value
      .replace('{ubicacion}', locationStr())
      .replace('{hora}', new Date().toLocaleString('es-MX'));
  }

  // ─────────────────────────────────────────
  // PANEL OPEN/CLOSE + TABS
  // ─────────────────────────────────────────
  function openPanel() {
    const m = document.getElementById('sosModal');
    m.style.display = 'flex';
    requestAnimationFrame(() => m.classList.add('sos-visible'));
    refreshPreviewContacts();
    refreshSavedList();
    refreshLocation();
  }

  function closePanel() {
    const m = document.getElementById('sosModal');
    m.classList.remove('sos-visible');
    setTimeout(() => (m.style.display = 'none'), 320);
    // Ocultar buscador al cerrar
    const s = document.getElementById('sosContactSearch');
    if (s) s.style.display = 'none';
  }

  function switchTab(name) {
    document.querySelectorAll('.sos-tab')
      .forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.sos-tc')
      .forEach(c => c.classList.toggle('active', c.id === `sos-tab-${name}`));
    if (name === 'mensaje') loadMsgEditor();
  }

  // ─────────────────────────────────────────
  // COUNTDOWN
  // ─────────────────────────────────────────
  function injectCountdownModal() {
    if (document.getElementById('sosCdModal')) return;
    const m = document.createElement('div');
    m.id = 'sosCdModal';
    m.className = 'sos-cd-modal';
    m.style.display = 'none';
    m.innerHTML = `
      <div class="sos-cd-box">
        <div class="sos-cd-emoji">🆘</div>
        <h2 class="sos-cd-title">Enviando SOS en...</h2>
        <div class="sos-cd-num" id="sosCdNum">5</div>
        <p class="sos-cd-sub">SMS directo + WhatsApp abierto para cada contacto</p>
        <div class="sos-cd-bar-wrap"><div class="sos-cd-bar" id="sosCdBar"></div></div>
        <button class="sos-cd-cancel" id="btnCancelSOS">✕ Cancelar</button>
      </div>
    `;
    document.querySelector('.app-container').appendChild(m);
    document.getElementById('btnCancelSOS').addEventListener('click', cancelCountdown);
  }

  function startCountdown() {
    if (!sosContacts.length) {
      mostrarToast('⚠️ Agrega contactos de emergencia primero');
      switchTab('contactos');
      return;
    }
    requestLocation();
    const m   = document.getElementById('sosCdModal');
    const num = document.getElementById('sosCdNum');
    const bar = document.getElementById('sosCdBar');
    m.style.display = 'flex';
    requestAnimationFrame(() => m.classList.add('sos-visible'));
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    let cnt = 5;
    num.textContent = cnt;
    bar.style.transition = 'none';
    bar.style.width = '100%';

    cdInterval = setInterval(() => {
      cnt--;
      num.textContent = cnt;
      bar.style.transition = 'width 1s linear';
      bar.style.width = (cnt / 5 * 100) + '%';
      if (cnt <= 0) {
        clearInterval(cdInterval); cdInterval = null;
        m.classList.remove('sos-visible');
        setTimeout(() => (m.style.display = 'none'), 300);
        executeSOS();
      }
    }, 1000);
  }

  function cancelCountdown() {
    clearInterval(cdInterval); cdInterval = null;
    const m = document.getElementById('sosCdModal');
    m.classList.remove('sos-visible');
    setTimeout(() => (m.style.display = 'none'), 300);
    if (navigator.vibrate) navigator.vibrate(50);
    mostrarToast('❌ SOS cancelado');
  }

  // ─────────────────────────────────────────
  // EJECUTAR SOS COMPLETO
  // ─────────────────────────────────────────
  function executeSOS() {
    closePanel();
    const smsC = sosContacts.filter(c => c.sms);
    const waC  = sosContacts.filter(c => c.wa);
    smsC.forEach(c => sendSMS(c));
    waC.forEach((c, i) =>
      setTimeout(() => openWA(c), i * 2000 + (smsC.length ? 1000 : 0))
    );
    setTimeout(() => {
      showConfirmation(smsC.length, waC.length);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 300]);
    }, 800);
  }

  // ─────────────────────────────────────────
  // SMS
  // ─────────────────────────────────────────
  function sendAllSMS() {
    const list = sosContacts.filter(c => c.sms);
    if (!list.length) return mostrarToast('⚠️ Ningún contacto tiene SMS habilitado');
    list.forEach(c => sendSMS(c));
    mostrarToast(`📱 SMS enviado a ${list.length} contacto(s)`);
  }

  function sendSMS(contact) {
    const msg = buildMsg();
    const enc = encodeURIComponent(msg);
    // Cordova SMS plugin: envío directo sin abrir app
    if (window.sms && typeof window.sms.send === 'function') {
      window.sms.send(
        contact.phone, msg,
        { replaceLineBreaks: false, android: { intent: '' } },
        () => console.log('✅ SMS >', contact.name),
        () => smsFallback(contact.phone, enc)
      );
    } else {
      smsFallback(contact.phone, enc);
    }
  }

  function smsFallback(phone, encodedMsg) {
    window.location.href = /android/i.test(navigator.userAgent)
      ? `sms:${phone}?body=${encodedMsg}`
      : `sms:${phone}&body=${encodedMsg}`;
  }

  // ─────────────────────────────────────────
  // WHATSAPP
  // Usando window.open(url, '_system') + wa.me
  // — EXACTAMENTE igual que sendHelpMessage()
  //   en el contacts.js que ya funciona
  // ─────────────────────────────────────────
  function openAllWA() {
    const list = sosContacts.filter(c => c.wa);
    if (!list.length) return mostrarToast('⚠️ Ningún contacto tiene WhatsApp');
    list.forEach((c, i) => setTimeout(() => openWA(c), i * 2000));
    mostrarToast(`💬 Abriendo WhatsApp para ${list.length} contacto(s)...`);
  }

  function openWA(contact) {
    const msg = buildMsg();
    const url = `https://wa.me/${contact.phone}?text=${encodeURIComponent(msg)}`;
    // window.open(url, '_system') — igual que contacts.js
    window.open(url, '_system');
    console.log('💬 WA SOS >', contact.name, contact.phone);
  }

  // ─────────────────────────────────────────
  // TOAST — igual que mostrarNotificacion()
  //         pero más simple para el SOS
  // ─────────────────────────────────────────
  function mostrarToast(msg) {
    let t = document.getElementById('sosToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'sosToast'; t.className = 'sos-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 3200);
  }

  function showConfirmation(smsCount, waCount) {
    const ov = document.createElement('div');
    ov.className = 'sos-confirm-ov';
    ov.innerHTML = `
      <div class="sos-confirm-box">
        <div class="sos-confirm-emoji">✅</div>
        <h2>¡SOS Activado!</h2>
        ${smsCount ? `<p>📱 SMS enviado a <strong>${smsCount}</strong> contacto(s)</p>` : ''}
        ${waCount  ? `<p>💬 WhatsApp abierto para <strong>${waCount}</strong> contacto(s)<br><span class="conf-hint">Solo toca el botón ▶ Enviar en cada chat</span></p>` : ''}
        <button onclick="this.closest('.sos-confirm-ov').remove()">Cerrar</button>
      </div>
    `;
    document.body.appendChild(ov);
    setTimeout(() => ov.remove(), 9000);
  }

  // ─────────────────────────────────────────
  // ARRANQUE — igual que contacts.js
  // ─────────────────────────────────────────
  function boot() {
    if (typeof cordova !== 'undefined') {
      document.addEventListener('deviceready', initSOS, false);
    } else {
      initSOS();
    }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot)
    : boot();

  window.SOSSystem = { open: openPanel, send: startCountdown, trigger: executeSOS };

})();