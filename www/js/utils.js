// ================================================================
// utils.js — Utilidades comunes para MediTime/MyVita
// Centraliza funciones duplicadas en múltiples archivos
// ================================================================

/**
 * Muestra una notificación toast en la esquina superior derecha
 * @param {string} mensaje - Texto a mostrar
 * @param {string} tipo - Tipo: 'exito', 'error', 'advertencia', 'info'
 * @param {number} duracion - Milisegundos visible (0 = permanente)
 */
function mostrarNotificacion(mensaje, tipo = 'info', duracion = 3500) {
  let cont = document.getElementById('notificaciones-container');
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'notificaciones-container';
    document.body.appendChild(cont);
  }

  const iconos = {
    exito: 'check_circle',
    error: 'error',
    advertencia: 'warning',
    info: 'info'
  };

  const notif = document.createElement('div');
  notif.className = `notificacion ${tipo}`;
  notif.innerHTML = `
    <span class="material-icons">${iconos[tipo] || 'info'}</span>
    <span>${escapeHtml(mensaje)}</span>
    <button type="button" aria-label="Cerrar notificación">
      <span class="material-icons">close</span>
    </button>
  `;

  cont.appendChild(notif);

  // Animación de entrada
  requestAnimationFrame(() => {
    notif.classList.add('show');
  });

  // Cerrar al hacer clic
  notif.querySelector('button').addEventListener('click', () => {
    cerrarNotificacion(notif);
  });

  // Auto-cerrar
  if (duracion > 0) {
    setTimeout(() => cerrarNotificacion(notif), duracion);
  }

  return notif;
}

/**
 * Cierra una notificación con animación
 * @param {HTMLElement} notif - Elemento de notificación
 */
function cerrarNotificacion(notif) {
  if (!notif || !notif.parentNode) return;
  notif.classList.remove('show');
  setTimeout(() => {
    if (notif.parentNode) notif.remove();
  }, 300);
}

/**
 * Escapa HTML para prevenir XSS
 * @param {string} text - Texto a escapar
 * @returns {string} Texto seguro
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Formatea una hora de 24h a 12h (AM/PM)
 * @param {string} time - Hora en formato "HH:MM"
 * @returns {string} Hora en formato "H:MM am/pm"
 */
function formatTimeTo12h(time) {
  if (!time) return '—';
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h)) return time;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
}

/**
 * Convierte código de frecuencia a texto legible
 * @param {string} frecuencia - Código de frecuencia
 * @returns {string} Texto descriptivo
 */
function frecuenciaTexto(frecuencia) {
  const mapa = {
    una_vez_dia: 'Una vez al día',
    dos_veces_dia: 'Dos veces al día',
    tres_veces_dia: 'Tres veces al día',
    cuatro_veces_dia: 'Cuatro veces al día',
    cada_8_horas: 'Cada 8 horas',
    cada_12_horas: 'Cada 12 horas',
    cada_24_horas: 'Cada 24 horas',
    semanal: 'Semanal',
    mensual: 'Mensual',
    segun_necesidad: 'Según necesidad',
    personalizado: 'Personalizado'
  };
  return mapa[frecuencia] || frecuencia || '—';
}

/**
 * Formatea fecha de ISO (YYYY-MM-DD) a formato local (DD/MM/YYYY)
 * @param {string} fecha - Fecha en formato ISO
 * @returns {string} Fecha formateada
 */
function formatFecha(fecha) {
  if (!fecha) return '—';
  const [y, mo, d] = fecha.split('-');
  if (!y || !mo || !d) return fecha;
  return `${d}/${mo}/${y}`;
}

/**
 * Obtiene la fecha actual en formato ISO (YYYY-MM-DD)
 * @returns {string} Fecha actual
 */
function hoy() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Obtiene la fecha y hora actual en formato ISO completo
 * @returns {string} Fecha/hora ISO
 */
function ahoraISO() {
  return new Date().toISOString();
}

/**
 * Verifica si hay una sesión activa
 * @returns {boolean} true si hay usuario logueado
 */
function verificarSesion() {
  const userId = localStorage.getItem('currentUserId');
  const token = localStorage.getItem('sessionToken');
  return !!(userId && token);
}

/**
 * Obtiene el ID del usuario actual
 * @returns {string|null} ID de usuario o null
 */
function obtenerUsuarioActual() {
  return localStorage.getItem('currentUserId');
}

/**
 * Cierra la sesión del usuario y redirige al login
 * @param {boolean} mostrarMensaje - Si se debe mostrar notificación
 */
function cerrarSesion(mostrarMensaje = true) {
  localStorage.removeItem('currentUserId');
  localStorage.removeItem('sessionToken');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userName');

  if (mostrarMensaje) {
    mostrarNotificacion('Sesión cerrada correctamente', 'info');
  }

  setTimeout(() => {
    window.location.href = 'index.html';
  }, 500);
}

/**
 * Aplica configuración de tamaño de fuente guardada
 */
function applyFontSettings() {
  const savedClass = localStorage.getItem('fontSizeClass') || 'font-medium';
  const isDark = localStorage.getItem('darkMode') === 'true';

  document.body.className = savedClass;
  if (isDark) document.body.classList.add('dark-mode');

  const selector = document.getElementById('fontSizeSelector');
  if (selector) selector.value = savedClass.replace('font-', '');
}

/**
 * Genera un UUID v4 único
 * @returns {string} UUID
 */
function generarUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Debounce: limita la frecuencia de ejecución de una función
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Milisegundos de espera
 * @returns {Function} Función con debounce
 */
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Formatea un número como moneda local (MXN)
 * @param {number} cantidad - Cantidad a formatear
 * @returns {string} Cantidad formateada
 */
function formatMoneda(cantidad) {
  if (cantidad === null || cantidad === undefined) return '—';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(cantidad);
}

/**
 * Calcula la edad a partir de fecha de nacimiento
 * @param {string} fechaNacimiento - Fecha en formato YYYY-MM-DD
 * @returns {number} Edad en años
 */
function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
}

/**
 * Valida un email
 * @param {string} email - Email a validar
 * @returns {boolean} true si es válido
 */
function validarEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Valida un teléfono mexicano
 * @param {string} telefono - Teléfono a validar
 * @returns {boolean} true si es válido
 */
function validarTelefono(telefono) {
  const re = /^[0-9]{10}$/;
  return re.test(telefono.replace(/\D/g, ''));
}

/**
 * Copia texto al portapapeles
 * @param {string} texto - Texto a copiar
 * @returns {Promise<boolean>} true si se copió exitosamente
 */
async function copiarAlPortapapeles(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch (err) {
    // Fallback para navegadores antiguos
    const textarea = document.createElement('textarea');
    textarea.value = texto;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const exito = document.execCommand('copy');
    document.body.removeChild(textarea);
    return exito;
  }
}

// Exportar para módulos (si se usa ES6)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mostrarNotificacion,
    cerrarNotificacion,
    escapeHtml,
    formatTimeTo12h,
    frecuenciaTexto,
    formatFecha,
    hoy,
    ahoraISO,
    verificarSesion,
    obtenerUsuarioActual,
    cerrarSesion,
    applyFontSettings,
    generarUUID,
    debounce,
    formatMoneda,
    calcularEdad,
    validarEmail,
    validarTelefono,
    copiarAlPortapapeles
  };
}
