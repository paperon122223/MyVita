// ================================================================
// settings.js — Configuración y perfil · MyVita
// ✅ ACTUALIZADO: Funcionalidades de "Acerca de" y "Sugerencias"
// NOTA: mostrarNotificacion y applyFontSettings están en utils.js
// ================================================================

function adjustButtonSizes() {
  document.querySelectorAll('.back-button').forEach(btn => {
    const fs = parseFloat(getComputedStyle(btn).fontSize);
    btn.style.padding = `${Math.round(fs*.75)}px ${Math.round(fs*.875)}px`;
    const img = btn.querySelector('img');
    if (img) {
      const is = Math.round(fs*1.2);
      img.style.width = img.style.height = `${is}px`;
      img.style.marginRight = `${Math.round(fs*.5)}px`;
    }
  });
}

function applyFontSizeClass(sizeClass) {
  localStorage.setItem('fontSizeClass', sizeClass);
  const isDark = localStorage.getItem('darkMode') === 'true';
  document.body.className = sizeClass;
  if (isDark) document.body.classList.add('dark-mode');
  adjustButtonSizes();
}

// ── Cargar perfil desde SQLite ────────────────────────────────
async function loadUserProfile() {
  const userId  = localStorage.getItem('currentUserId');
  const nameEl  = document.getElementById('userName');
  const loginEl = document.getElementById('lastLogin');

  if (!userId) {
    if (nameEl)  nameEl.textContent  = 'Invitado';
    if (loginEl) loginEl.textContent = '—';
    return;
  }

  try {
    if (window.DB && window.DB.init) {
      await window.DB.init();
      const perfil = await window.DB.Usuarios.getPerfil(userId);
      if (perfil) {
        if (nameEl)  nameEl.textContent  = perfil.nombre || perfil.usuario || '—';
        if (loginEl) loginEl.textContent =
          'Último acceso: ' + formatFechaHora(localStorage.getItem('lastLogin'));
      }
    } else {
      // Fallback si no hay DB
      if (nameEl) nameEl.textContent = localStorage.getItem('currentUserName') || 'Usuario';
      if (loginEl) loginEl.textContent = 'Último acceso: ' + formatFechaHora(localStorage.getItem('lastLogin'));
    }
  } catch (err) {
    console.error('Error cargando perfil:', err);
    if (nameEl) nameEl.textContent = localStorage.getItem('currentUserName') || 'Usuario';
  }
}

// ══════════════════════════════════════════════════════════════
// ✅ NUEVO: ACERCA DE LA APLICACIÓN
// ══════════════════════════════════════════════════════════════
function setupAboutButton() {
  const btn = document.getElementById('aboutButton');
  if (!btn) return;

  btn.addEventListener('click', function() {
    mostrarModalAcercaDe();
  });
}

function mostrarModalAcercaDe() {
  // Obtener versión de la app
  const appVersion = '2.0.0';
  const buildDate = 'Febrero 2026';
  
  const modalHTML = `
    <div class="modal-overlay" id="aboutModal" onclick="cerrarModalSiClickFuera(event)">
      <div class="modal-content about-modal" onclick="event.stopPropagation()">
        
        <!-- Header -->
        <div class="modal-header">
          <div class="app-icon">
            <span class="material-icons" style="font-size: 64px; color: #2196f3;">health_and_safety</span>
          </div>
          <h2>MyVita</h2>
          <p class="version">Versión ${appVersion}</p>
        </div>

        <!-- Body -->
        <div class="modal-body">
          
          <!-- Descripción -->
          <div class="about-section">
            <h3>
              <span class="material-icons">info</span>
              Acerca de
            </h3>
            <p>
              <strong>MyVita</strong> es tu asistente personal de salud que te ayuda a 
              gestionar tus medicamentos, recordatorios médicos y seguimiento de tratamientos 
              de manera inteligente y segura.
            </p>
          </div>

          <!-- Características -->
          <div class="about-section">
            <h3>
              <span class="material-icons">star</span>
              Características Principales
            </h3>
            <ul class="features-list">
              <li>
                <span class="material-icons">alarm</span>
                <div>
                  <strong>Recordatorios Inteligentes</strong>
                  <small>Nunca olvides tomar tus medicamentos</small>
                </div>
              </li>
              <li>
                <span class="material-icons">cloud_sync</span>
                <div>
                  <strong>Sincronización en la Nube</strong>
                  <small>Tus datos seguros y accesibles desde cualquier dispositivo</small>
                </div>
              </li>
              <li>
                <span class="material-icons">smart_toy</span>
                <div>
                  <strong>Asistente IA Médico</strong>
                  <small>Responde tus dudas sobre medicamentos 24/7</small>
                </div>
              </li>
              <li>
                <span class="material-icons">map</span>
                <div>
                  <strong>Localizador de Farmacias</strong>
                  <small>Encuentra farmacias y hospitales cercanos</small>
                </div>
              </li>
              <li>
                <span class="material-icons">qr_code_scanner</span>
                <div>
                  <strong>Escáner de Recetas</strong>
                  <small>Digitaliza tus recetas médicas con OCR</small>
                </div>
              </li>
              <li>
                <span class="material-icons">inventory_2</span>
                <div>
                  <strong>Control de Inventario</strong>
                  <small>Gestiona tu stock de medicamentos</small>
                </div>
              </li>
            </ul>
          </div>

          <!-- Información Técnica -->
          <div class="about-section">
            <h3>
              <span class="material-icons">code</span>
              Información Técnica
            </h3>
            <div class="tech-info">
              <div class="info-row">
                <span class="label">Versión:</span>
                <span class="value">${appVersion}</span>
              </div>
              <div class="info-row">
                <span class="label">Build:</span>
                <span class="value">${buildDate}</span>
              </div>
              <div class="info-row">
                <span class="label">Plataforma:</span>
                <span class="value">${getPlatformInfo()}</span>
              </div>
              <div class="info-row">
                <span class="label">Base de datos:</span>
                <span class="value">SQLite + Supabase</span>
              </div>
            </div>
          </div>

          <!-- Créditos -->
          <div class="about-section">
            <h3>
              <span class="material-icons">people</span>
              Desarrollado por
            </h3>
            <p class="credits">
              Equipo de Desarrollo MyVita<br>
              <small>Con ❤️ para mejorar tu salud</small>
            </p>
          </div>

          <!-- Enlaces -->
          <div class="about-section">
            <h3>
              <span class="material-icons">link</span>
              Enlaces Útiles
            </h3>
            <div class="links-container">
              <button class="link-btn" onclick="abrirPrivacidad()">
                <span class="material-icons">privacy_tip</span>
                Política de Privacidad
              </button>
              <button class="link-btn" onclick="abrirTerminos()">
                <span class="material-icons">gavel</span>
                Términos de Uso
              </button>
              <button class="link-btn" onclick="abrirLicencias()">
                <span class="material-icons">description</span>
                Licencias de Software
              </button>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn-close-modal" onclick="cerrarModal('aboutModal')">
            Cerrar
          </button>
        </div>

      </div>
    </div>
  `;

  // Insertar modal en el DOM
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Agregar estilos si no existen
  if (!document.getElementById('aboutModalStyles')) {
    agregarEstilosModal();
  }

  // Animación de entrada
  setTimeout(() => {
    document.getElementById('aboutModal').classList.add('show');
  }, 10);
}

function agregarEstilosModal() {
  const styles = document.createElement('style');
  styles.id = 'aboutModalStyles';
  styles.textContent = `
    /* Modal Overlay */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.3s ease;
      padding: 20px;
    }

    .modal-overlay.show {
      opacity: 1;
    }

    /* Modal Content */
    .modal-content {
      background: white;
      border-radius: 16px;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      transform: translateY(30px);
      transition: transform 0.3s ease;
    }

    .modal-overlay.show .modal-content {
      transform: translateY(0);
    }

    /* Dark Mode */
    body.dark-mode .modal-content {
      background: #1e293b;
      color: #f1f5f9;
    }

    /* Header */
    .modal-header {
      text-align: center;
      padding: 30px 20px 20px;
      border-bottom: 1px solid #e5e7eb;
    }

    body.dark-mode .modal-header {
      border-bottom-color: #334155;
    }

    .app-icon {
      margin-bottom: 15px;
    }

    .modal-header h2 {
      margin: 0 0 5px;
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
    }

    body.dark-mode .modal-header h2 {
      color: #f1f5f9;
    }

    .modal-header .version {
      color: #6b7280;
      font-size: 14px;
      margin: 0;
    }

    /* Body */
    .modal-body {
      padding: 20px;
    }

    .about-section {
      margin-bottom: 25px;
    }

    .about-section:last-child {
      margin-bottom: 0;
    }

    .about-section h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 12px;
    }

    body.dark-mode .about-section h3 {
      color: #f1f5f9;
    }

    .about-section h3 .material-icons {
      font-size: 20px;
      color: #2196f3;
    }

    .about-section p {
      margin: 0;
      color: #4b5563;
      line-height: 1.6;
      font-size: 14px;
    }

    body.dark-mode .about-section p {
      color: #cbd5e1;
    }

    /* Features List */
    .features-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .features-list li {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      background: #f9fafb;
      border-radius: 8px;
      margin-bottom: 8px;
    }

    body.dark-mode .features-list li {
      background: #334155;
    }

    .features-list li:last-child {
      margin-bottom: 0;
    }

    .features-list .material-icons {
      color: #2196f3;
      font-size: 24px;
      flex-shrink: 0;
    }

    .features-list strong {
      display: block;
      color: #1f2937;
      font-size: 14px;
      margin-bottom: 2px;
    }

    body.dark-mode .features-list strong {
      color: #f1f5f9;
    }

    .features-list small {
      color: #6b7280;
      font-size: 12px;
    }

    body.dark-mode .features-list small {
      color: #94a3b8;
    }

    /* Tech Info */
    .tech-info {
      background: #f9fafb;
      border-radius: 8px;
      padding: 12px 16px;
    }

    body.dark-mode .tech-info {
      background: #334155;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }

    body.dark-mode .info-row {
      border-bottom-color: #475569;
    }

    .info-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .info-row:first-child {
      padding-top: 0;
    }

    .info-row .label {
      color: #6b7280;
      font-size: 14px;
    }

    .info-row .value {
      color: #1f2937;
      font-weight: 500;
      font-size: 14px;
    }

    body.dark-mode .info-row .value {
      color: #f1f5f9;
    }

    /* Credits */
    .credits {
      text-align: center;
      color: #6b7280;
    }

    .credits small {
      color: #9ca3af;
      font-size: 13px;
    }

    /* Links */
    .links-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .link-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      color: #1f2937;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    body.dark-mode .link-btn {
      background: #334155;
      border-color: #475569;
      color: #f1f5f9;
    }

    .link-btn:hover {
      background: #f3f4f6;
      border-color: #2196f3;
    }

    body.dark-mode .link-btn:hover {
      background: #475569;
    }

    .link-btn .material-icons {
      color: #2196f3;
      font-size: 20px;
    }

    /* Footer */
    .modal-footer {
      padding: 15px 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
    }

    body.dark-mode .modal-footer {
      border-top-color: #334155;
    }

    .btn-close-modal {
      padding: 12px 32px;
      background: #2196f3;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-close-modal:hover {
      background: #1976d2;
    }

    /* Responsive */
    @media (max-width: 640px) {
      .modal-content {
        margin: 10px;
        max-height: 95vh;
      }

      .modal-header {
        padding: 20px 15px 15px;
      }

      .modal-body {
        padding: 15px;
      }
    }
  `;
  document.head.appendChild(styles);
}

function getPlatformInfo() {
  if (window.cordova) {
    if (window.device) {
      return `${window.device.platform} ${window.device.version}`;
    }
    return 'Cordova/PhoneGap';
  }
  return 'Navegador Web';
}

function cerrarModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
  }
}

function cerrarModalSiClickFuera(event) {
  if (event.target.classList.contains('modal-overlay')) {
    const modal = event.target;
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
  }
}

function abrirPrivacidad() {
  cerrarModal('aboutModal'); // Cerrar el modal actual
  setTimeout(() => {
    window.location.href = 'terms.html?section=privacy';
  }, 300);
}

function abrirTerminos() {
  cerrarModal('aboutModal'); // Cerrar el modal actual
  setTimeout(() => {
    window.location.href = 'terms.html?section=terms';
  }, 300);
}

function abrirLicencias() {
  mostrarModalLicencias();
}

function mostrarModalLicencias() {
  const modalHTML = `
    <div class="modal-overlay" id="licensesModal" onclick="cerrarModalSiClickFuera(event)">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>Licencias de Software</h2>
        </div>
        <div class="modal-body">
          <div class="about-section">
            <h3>Componentes de Terceros</h3>
            <ul style="list-style: none; padding: 0;">
              <li style="margin-bottom: 15px;">
                <strong>Cordova/PhoneGap</strong><br>
                <small style="color: #6b7280;">Licencia: Apache 2.0</small>
              </li>
              <li style="margin-bottom: 15px;">
                <strong>Bootstrap</strong><br>
                <small style="color: #6b7280;">Licencia: MIT</small>
              </li>
              <li style="margin-bottom: 15px;">
                <strong>Material Icons</strong><br>
                <small style="color: #6b7280;">Licencia: Apache 2.0</small>
              </li>
              <li style="margin-bottom: 15px;">
                <strong>Tesseract.js (OCR)</strong><br>
                <small style="color: #6b7280;">Licencia: Apache 2.0</small>
              </li>
              <li style="margin-bottom: 15px;">
                <strong>Leaflet (Mapas)</strong><br>
                <small style="color: #6b7280;">Licencia: BSD-2-Clause</small>
              </li>
              <li style="margin-bottom: 15px;">
                <strong>GROQ API</strong><br>
                <small style="color: #6b7280;">Proveedor: Groq Inc.</small>
              </li>
              <li style="margin-bottom: 15px;">
                <strong>Supabase</strong><br>
                <small style="color: #6b7280;">Licencia: Apache 2.0</small>
              </li>
            </ul>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-close-modal" onclick="cerrarModal('licensesModal')">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  setTimeout(() => {
    document.getElementById('licensesModal').classList.add('show');
  }, 10);
}

// ══════════════════════════════════════════════════════════════
// ✅ NUEVO: ENVIAR SUGERENCIAS
// ══════════════════════════════════════════════════════════════
function setupSuggestionsButton() {
  const btn = document.getElementById('suggestionsButton');
  if (!btn) return;

  btn.addEventListener('click', function() {
    enviarSugerencia();
  });
}

function enviarSugerencia() {
  // Email de contacto de MyVita
  const emailDestino = 'sugerencias@myvita.app';
  const asunto = 'Sugerencia para MyVita';
  
  // Información del dispositivo para debugging
  const deviceInfo = getDeviceInfo();
  
  const cuerpoEmail = `
Hola equipo de MyVita,

Tengo una sugerencia para mejorar la aplicación:

[Escribe aquí tu sugerencia]


---
Información del dispositivo (no borrar):
- Versión de la app: 2.0.0
- Plataforma: ${deviceInfo.platform}
- Versión del SO: ${deviceInfo.version}
- Modelo: ${deviceInfo.model}
- Usuario ID: ${localStorage.getItem('currentUserId') || 'No identificado'}
  `.trim();

  const mailtoLink = `mailto:${emailDestino}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpoEmail)}`;

  // Intentar abrir cliente de email
  if (window.cordova && window.cordova.InAppBrowser) {
    // En Cordova, usar InAppBrowser
    window.cordova.InAppBrowser.open(mailtoLink, '_system');
    mostrarNotificacion('Abriendo cliente de correo...', 'info');
  } else {
    // En navegador web
    window.location.href = mailtoLink;
  }

  // También mostrar un modal alternativo si el usuario no tiene cliente de email
  setTimeout(() => {
    mostrarModalSugerenciaAlternativa(emailDestino);
  }, 1000);
}

function mostrarModalSugerenciaAlternativa(email) {
  const modalHTML = `
    <div class="modal-overlay" id="suggestionModal" onclick="cerrarModalSiClickFuera(event)">
      <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 500px;">
        
        <div class="modal-header">
          <span class="material-icons" style="font-size: 48px; color: #2196f3;">email</span>
          <h2>Enviar Sugerencia</h2>
        </div>

        <div class="modal-body">
          <div class="about-section">
            <p style="text-align: center; margin-bottom: 20px;">
              ¿No se abrió tu cliente de correo?<br>
              Puedes enviarnos tu sugerencia directamente a:
            </p>
            
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
              <strong style="color: #2196f3; font-size: 16px;">${email}</strong>
              <button 
                onclick="copiarAlPortapapeles('${email}')" 
                style="display: block; width: 100%; margin-top: 10px; padding: 8px; background: #2196f3; color: white; border: none; border-radius: 6px; cursor: pointer;">
                <span class="material-icons" style="font-size: 16px; vertical-align: middle;">content_copy</span>
                Copiar email
              </button>
            </div>

            <p style="font-size: 14px; color: #6b7280; text-align: center;">
              También puedes contactarnos por:
            </p>

            <div class="links-container">
              <button class="link-btn" onclick="abrirWhatsApp()">
                <span class="material-icons">chat</span>
                WhatsApp
              </button>
              <button class="link-btn" onclick="abrirTwitter()">
                <span class="material-icons">share</span>
                Twitter/X
              </button>
              <button class="link-btn" onclick="abrirFormulario()">
                <span class="material-icons">description</span>
                Formulario Web
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-close-modal" onclick="cerrarModal('suggestionModal')">
            Cerrar
          </button>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  setTimeout(() => {
    document.getElementById('suggestionModal').classList.add('show');
  }, 10);
}

function copiarAlPortapapeles(texto) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(texto).then(() => {
      mostrarNotificacion('Email copiado al portapapeles', 'exito');
    }).catch(() => {
      mostrarNotificacion('No se pudo copiar. Copia manualmente.', 'advertencia');
    });
  } else {
    // Fallback para navegadores antiguos
    const input = document.createElement('input');
    input.value = texto;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    mostrarNotificacion('Email copiado al portapapeles', 'exito');
  }
}

function abrirWhatsApp() {
  const numero = '5215512345678'; // Cambiar por tu número real
  const mensaje = 'Hola, tengo una sugerencia para MyVita: ';
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
  
  if (window.cordova) {
    window.cordova.InAppBrowser.open(url, '_system');
  } else {
    window.open(url, '_blank');
  }
}

function abrirTwitter() {
  const texto = '@MyVitaApp Tengo una sugerencia: ';
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}`;
  
  if (window.cordova) {
    window.cordova.InAppBrowser.open(url, '_system');
  } else {
    window.open(url, '_blank');
  }
}

function abrirFormulario() {
  const url = 'https://forms.gle/tu-formulario-google'; // Cambiar por tu formulario real
  
  if (window.cordova) {
    window.cordova.InAppBrowser.open(url, '_system');
  } else {
    window.open(url, '_blank');
  }
}

function getDeviceInfo() {
  if (window.device) {
    return {
      platform: window.device.platform || 'Desconocido',
      version: window.device.version || 'Desconocido',
      model: window.device.model || 'Desconocido'
    };
  }
  
  return {
    platform: navigator.platform || 'Web',
    version: navigator.userAgent,
    model: 'Navegador'
  };
}

// ── Logout ────────────────────────────────────────────────────
function setupLogoutButton() {
  const btn = document.getElementById('logoutBtn');
  if (!btn) return;

  btn.addEventListener('click', function () {
    const doLogout = () => {
      ['currentUserId','currentUser','currentUserName','lastLogin',
       'sb_access_token','sb_user_id'].forEach(k => localStorage.removeItem(k));
      window.location.href = 'index.html';
    };

    if (navigator.notification) {
      navigator.notification.confirm(
        '¿Deseas cerrar sesión?',
        (i) => { if (i === 1) doLogout(); },
        'Confirmar', ['Sí','Cancelar']
      );
    } else if (confirm('¿Deseas cerrar sesión?')) {
      doLogout();
    }
  });
}

// ── Controles de audio ────────────────────────────────────────
function setupAudioToggle() {
  const chk = document.getElementById('audioCheckbox');
  if (!chk) return;
  chk.checked = localStorage.getItem('audioEnabled') !== 'false';
  chk.addEventListener('change', function () {
    localStorage.setItem('audioEnabled', this.checked ? 'true' : 'false');
  });
}

// ── Indicador de sincronización ───────────────────────────────
async function setupSyncStatus() {
  try {
    if (window.DB && window.DB.init) {
      await window.DB.init();
      const pendientes = await window.DB.select(
        `SELECT COUNT(*) as cnt FROM sync_queue WHERE synced = 0`, []
      );
      const cnt  = pendientes[0]?.cnt || 0;
      const el   = document.getElementById('syncStatus') || document.getElementById('syncInfo');
      if (el) {
        el.textContent = cnt > 0
          ? `${cnt} cambio(s) pendiente(s) de sincronizar`
          : 'Todo sincronizado ✓';
      }
    }
  } catch(err) { 
    console.log('Sync status no disponible:', err);
  }

  // Botón de sync manual
  const btnSync = document.getElementById('btnSyncNow');
  if (btnSync) {
    btnSync.addEventListener('click', async function () {
      this.disabled = true;
      try {
        if (window.SyncService && window.SyncService.forzar) {
          await window.SyncService.forzar();
          mostrarNotificacion('Sincronización completada.', 'exito');
          await setupSyncStatus();
        } else if (window.Sync && window.Sync.forzar) {
          await window.Sync.forzar();
          mostrarNotificacion('Sincronización completada.', 'exito');
          await setupSyncStatus();
        } else {
          mostrarNotificacion('Sincronización no disponible.', 'advertencia');
        }
      } catch(err) {
        console.error('Error sincronizando:', err);
        mostrarNotificacion('No se pudo sincronizar. Verifica tu conexión.', 'error');
      } finally {
        this.disabled = false;
      }
    });
  }
}

// ── Helper ────────────────────────────────────────────────────
function formatFechaHora(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX') + ' ' +
           d.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' });
  } catch { return iso; }
}

// ── Inicializar todo ──────────────────────────────────────────
function init() {
  applyFontSettings();
  loadUserProfile();
  setupLogoutButton();
  setupAudioToggle();
  setupSyncStatus();
  
  // ✅ NUEVAS FUNCIONES
  setupAboutButton();
  setupSuggestionsButton();
}

if (window.cordova) {
  document.addEventListener('deviceready', init);
} else {
  document.addEventListener('DOMContentLoaded', init);
}