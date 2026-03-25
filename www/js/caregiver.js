// ================================================================
// caregiver.js — Modo Cuidador · MyVita
// Vinculación por código de 6 dígitos (sin QR, sin cámara)
// ================================================================

const SB_URL  = 'https://ocieybkcehoxlvmdgvpf.supabase.co';
const SB_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jaWV5YmtjZWhveGx2bWRndnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MTUzMDUsImV4cCI6MjA4NzM5MTMwNX0.8aasJNmNmUOi-5cNiXNl4LAAIfipt7H9J6ysFABnfEs';

let codigoActual  = '';
let expiryTimer   = null;
let expirySecs    = 600;
let pacienteVinc  = null; // { id, nombre, email }
let refreshTimer  = null;

// ── Notificaciones ──────────────────────────────────────────
function notif(msg, tipo = 'info', ms = 3500) {
  const box  = document.getElementById('notif-box');
  if (!box) return;
  const iconos = { exito:'check_circle', error:'error', advertencia:'warning', info:'info' };
  const el   = document.createElement('div');
  el.className = 'notif ' + tipo;
  el.innerHTML = '<span class="material-icons">' + (iconos[tipo]||'info') + '</span><span>' + msg + '</span>';
  box.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  if (ms > 0) setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, ms);
}

// ── Supabase ─────────────────────────────────────────────────
function sbH() {
  return { 'Content-Type':'application/json', 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY };
}
async function sbGet(tabla, qs) {
  const r = await fetch(SB_URL + '/rest/v1/' + tabla + '?' + qs, { headers: sbH() });
  if (!r.ok) throw new Error(r.status + ' ' + tabla);
  return r.json();
}
async function sbPost(tabla, data) {
  const r = await fetch(SB_URL + '/rest/v1/' + tabla, {
    method: 'POST',
    headers: { ...sbH(), 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(data)
  });
  if (!r.ok) { const t = await r.text(); throw new Error(r.status + ': ' + t); }
}
async function sbPatch(tabla, qs, data) {
  const r = await fetch(SB_URL + '/rest/v1/' + tabla + '?' + qs, {
    method: 'PATCH', headers: sbH(), body: JSON.stringify(data)
  });
  if (!r.ok) { const t = await r.text(); throw new Error(r.status + ': ' + t); }
}

// ================================================================
// INIT
// ================================================================
function init() {
  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = 'settings.html';
  });
  document.getElementById('btnShare').addEventListener('click', compartir);
  document.getElementById('btnRenovar').addEventListener('click', generarCodigo);
  document.getElementById('btnVincular').addEventListener('click', vincular);
  document.getElementById('btnRefresh').addEventListener('click', () => cargarDatos(true));
  document.getElementById('btnDesvincular').addEventListener('click', desvincular);

  // Input de dígitos
  for (let i = 0; i < 6; i++) {
    const el = document.getElementById('d' + i);
    el.addEventListener('input', () => onDigitInput(i));
    el.addEventListener('keydown', (e) => onDigitKey(e, i));
    el.addEventListener('paste', onPaste);
  }

  // ¿Ya tiene paciente vinculado?
  const saved = localStorage.getItem('cg_patient');
  if (saved) {
    try { pacienteVinc = JSON.parse(saved); } catch(e) {}
  }

  if (pacienteVinc) {
    setMode('cuidador');
    mostrarDashboard();
  } else {
    setMode('paciente');
    generarCodigo();
    cargarCuidadoresVinculados();
  }
}

if (window.cordova) {
  document.addEventListener('deviceready', init);
} else {
  document.addEventListener('DOMContentLoaded', init);
}

// ================================================================
// MODO (paciente / cuidador)
// ================================================================
function setMode(modo) {
  document.getElementById('panelPaciente').classList.toggle('active', modo === 'paciente');
  document.getElementById('panelCuidador').classList.toggle('active', modo === 'cuidador');
  document.getElementById('tabPaciente').classList.toggle('active', modo === 'paciente');
  document.getElementById('tabCuidador').classList.toggle('active', modo === 'cuidador');

  if (modo === 'paciente') {
    generarCodigo();
    cargarCuidadoresVinculados();
  }
}

// ================================================================
// PANEL PACIENTE — Generar código
// ================================================================
function generarCodigo() {
  // 6 dígitos aleatorios
  codigoActual = '';
  for (let i = 0; i < 6; i++) codigoActual += Math.floor(Math.random() * 10);

  // Guardar en Supabase para que el cuidador pueda validarlo
  const userId   = localStorage.getItem('currentUserId');
  const userName = localStorage.getItem('currentUserName') || 'Paciente';
  const expires  = new Date(Date.now() + expirySecs * 1000).toISOString();

  // Mostrar en pantalla
  document.getElementById('codigoNumero').textContent = codigoActual;

  // Guardar en Supabase (best-effort, si hay internet)
  if (userId) {
    sbPost('codigos_vinculacion', {
      codigo    : codigoActual,
      usuario_id: userId,
      nombre    : userName,
      expires_at: expires
    }).catch(err => console.warn('No se pudo guardar código en Supabase:', err.message));
  }

  // También guardar en localStorage como fallback offline
  localStorage.setItem('cg_codigo', JSON.stringify({
    codigo: codigoActual,
    userId: userId || '',
    nombre: userName,
    expires: Date.now() + expirySecs * 1000
  }));

  iniciarContador(expirySecs);
}

function iniciarContador(secs) {
  if (expiryTimer) clearInterval(expiryTimer);
  let s = secs;
  const tick = () => {
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    const el = document.getElementById('codigoExpiry');
    if (el) el.textContent = m + ':' + ss;
    if (s <= 0) { clearInterval(expiryTimer); generarCodigo(); }
    s--;
  };
  tick();
  expiryTimer = setInterval(tick, 1000);
}

function compartir() {
  if (!codigoActual) return;
  const nombre = localStorage.getItem('currentUserName') || 'yo';
  const msg = encodeURIComponent(
    'Hola, soy ' + nombre + '. Abre MyVita → Configuración → Modo Cuidador → "Soy cuidador" e ingresa este código:\n\n' +
    codigoActual + '\n\n' +
    'El código expira en 10 minutos.'
  );
  window.open('https://wa.me/?text=' + msg, '_blank');
}

// ── Cuidadores vinculados del paciente ────────────────────────
async function cargarCuidadoresVinculados() {
  const userId = localStorage.getItem('currentUserId');
  const cont   = document.getElementById('listaCuidadores');
  if (!userId || !cont) return;

  // Mostrar estado de carga
  cont.innerHTML = '<div class="empty-state"><span class="material-icons">hourglass_empty</span>' +
    '<p style="font-size:.85rem">Cargando...</p></div>';

  try {
    const rows = await sbGet('vinculos_cuidador',
      'paciente_id=eq.' + userId + '&estado=eq.activo&select=*');

    if (!rows || rows.length === 0) {
      cont.innerHTML = '<div class="empty-state"><span class="material-icons">person_add</span>' +
        '<p style="font-size:.85rem">Nadie te sigue aún</p></div>';
      return;
    }

    cont.innerHTML = rows.map(v =>
      '<div class="linked-card">' +
        '<div class="linked-avatar">' + (v.cuidador_nombre || 'C').charAt(0).toUpperCase() + '</div>' +
        '<div class="linked-info">' +
          '<div class="linked-name">' + (v.cuidador_nombre || 'Cuidador') + '</div>' +
          '<div class="linked-since">Vinculado ' + fmtFecha(v.created_at) + '</div>' +
        '</div>' +
        '<button class="btn-unlink" onclick="desvinc(\'' + v.id + '\')">' +
          '<span class="material-icons">link_off</span>' +
        '</button>' +
      '</div>'
    ).join('');

  } catch (e) {
    console.error('[Cuidador] vinculos_cuidador error:', e.message);
    // Si la tabla no existe (404) o cualquier error — mostrar vacío sin bloquear
    const es404 = e.message.includes('404') || e.message.includes('relation') || e.message.includes('does not exist');
    cont.innerHTML = es404
      ? '<div class="empty-state"><span class="material-icons">person_add</span>' +
        '<p style="font-size:.85rem">Nadie te sigue aún</p></div>'
      : '<div class="empty-state"><span class="material-icons">sync_problem</span>' +
        '<p style="font-size:.85rem">Sin conexión</p></div>';
  }
}

async function desvinc(vinculoId) {
  if (!confirm('¿Desvincular a este cuidador?')) return;
  try {
    await sbPatch('vinculos_cuidador', 'id=eq.' + vinculoId, { estado: 'desvinculado' });
    notif('Cuidador desvinculado', 'info');
    cargarCuidadoresVinculados();
  } catch (e) {
    notif('Error al desvincular', 'error');
  }
}

// ================================================================
// PANEL CUIDADOR — Inputs de dígitos
// ================================================================
function onDigitInput(i) {
  const el  = document.getElementById('d' + i);
  let val   = el.value.replace(/\D/g, '').charAt(0) || '';
  el.value  = val;
  el.classList.toggle('filled', val !== '');

  if (val && i < 5) {
    document.getElementById('d' + (i + 1)).focus();
  }
  verificarCompleto();
}

function onDigitKey(e, i) {
  if (e.key === 'Backspace') {
    const el = document.getElementById('d' + i);
    if (!el.value && i > 0) {
      document.getElementById('d' + (i - 1)).focus();
    }
  }
}

function onPaste(e) {
  e.preventDefault();
  const txt = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').substring(0, 6);
  for (let i = 0; i < txt.length; i++) {
    const el = document.getElementById('d' + i);
    if (el) { el.value = txt[i]; el.classList.add('filled'); }
  }
  verificarCompleto();
  if (txt.length === 6) document.getElementById('btnVincular').focus();
}

function verificarCompleto() {
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    const v = (document.getElementById('d' + i).value || '').trim();
    codigo += v;
  }
  document.getElementById('btnVincular').disabled = codigo.length < 6;
}

function getCodigoIngresado() {
  let c = '';
  for (let i = 0; i < 6; i++) c += (document.getElementById('d' + i).value || '').trim();
  return c;
}

// ================================================================
// VINCULAR
// ================================================================
async function vincular() {
  const codigo = getCodigoIngresado();
  if (codigo.length < 6) return;

  const btn = document.getElementById('btnVincular');
  btn.disabled = true;
  btn.innerHTML = '<span class="material-icons spin">refresh</span> Verificando...';

  try {
    // 1. Buscar el código en Supabase
    let paciente = null;
    try {
      const rows = await sbGet('codigos_vinculacion',
        'codigo=eq.' + codigo + '&select=*&order=created_at.desc&limit=1');

      if (rows && rows.length > 0) {
        const row = rows[0];
        // Verificar que no expiró
        if (new Date(row.expires_at) < new Date()) {
          notif('Código expirado. Pide al paciente que genere uno nuevo.', 'advertencia', 5000);
          resetBtn();
          return;
        }
        paciente = { id: row.usuario_id, nombre: row.nombre, email: '—' };
      }
    } catch (e) {
      console.warn('No se pudo verificar en Supabase:', e.message);
    }

    // 2. Fallback: verificar contra localStorage (mismo dispositivo, para demos)
    if (!paciente) {
      const local = localStorage.getItem('cg_codigo');
      if (local) {
        const datos = JSON.parse(local);
        if (datos.codigo === codigo && Date.now() < datos.expires) {
          paciente = { id: datos.userId || 'local-user', nombre: datos.nombre, email: '—' };
        } else if (datos.codigo === codigo) {
          notif('Código expirado. Pide al paciente que genere uno nuevo.', 'advertencia', 5000);
          resetBtn();
          return;
        }
      }
    }

    if (!paciente) {
      notif('Código incorrecto. Verifica con el paciente.', 'error');
      resetBtn();
      return;
    }

    // 3. Guardar vínculo en Supabase
    const cuidadorNombre = localStorage.getItem('currentUserName') || 'Cuidador';
    const cuidadorId     = localStorage.getItem('currentUserId') || ('anon-' + Date.now());
    const vinculoId      = cuidadorId + '-' + paciente.id;

    try {
      await sbPost('vinculos_cuidador', {
        id             : vinculoId,
        paciente_id    : paciente.id,
        cuidador_id    : cuidadorId,
        cuidador_nombre: cuidadorNombre,
        estado         : 'activo',
        permisos       : 'lectura',
        created_at     : new Date().toISOString()
      });
    } catch (e) {
      console.warn('No se pudo registrar vínculo:', e.message);
    }

    // 4. Guardar paciente localmente
    pacienteVinc = paciente;
    localStorage.setItem('cg_patient', JSON.stringify(paciente));

    notif('¡Vinculado con ' + paciente.nombre + '!', 'exito');
    mostrarDashboard();

  } catch (e) {
    console.error('Error vinculando:', e);
    notif('Error al vincular. Intenta de nuevo.', 'error');
    resetBtn();
  }
}

function resetBtn() {
  const btn = document.getElementById('btnVincular');
  btn.disabled = false;
  btn.innerHTML = '<span class="material-icons">link</span> Vincularme como cuidador';
}

// ================================================================
// DASHBOARD DEL PACIENTE
// ================================================================
function mostrarDashboard() {
  if (!pacienteVinc) return;
  document.getElementById('seccionIngreso').style.display   = 'none';
  document.getElementById('seccionDashboard').style.display = 'block';

  const ini = (pacienteVinc.nombre || '?').charAt(0).toUpperCase();
  const elAv = document.getElementById('dashAvatar');
  if (elAv) elAv.textContent = ini;
  document.getElementById('dashNombre').textContent  = pacienteVinc.nombre;
  document.getElementById('dashEmail').textContent   = pacienteVinc.email || '—';

  cargarDatos();

  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(cargarDatos, 60000);
}

async function cargarDatos(manual = false) {
  if (!pacienteVinc?.id) return;

  const ico = document.getElementById('icoRefresh');
  if (ico) ico.classList.add('spin');

  const hoy = new Date().toISOString().split('T')[0];

  const d30 = new Date(); d30.setDate(d30.getDate() - 30);
  const desde30 = d30.toISOString().split('T')[0];

  // Usar allSettled — si una falla las demás siguen
  const [resHoy, resPresc, resHist] = await Promise.allSettled([
    sbGet('alarmas',
      'usuario_id=eq.' + pacienteVinc.id +
      '&fecha=eq.' + hoy +
      '&deleted_at=is.null' +
      '&select=id,hora_toma,hora_tomado,tomado,prescripcion_id,nombre'),
    sbGet('prescripciones',
      'usuario_id=eq.' + pacienteVinc.id +
      '&deleted_at=is.null' +
      '&select=id,dosis,frecuencia,hora_toma,via_administracion,nombre_medico,esta_activa'),
    sbGet('alarmas',
      'usuario_id=eq.' + pacienteVinc.id +
      '&fecha=gte.' + desde30 +
      '&deleted_at=is.null' +
      '&select=fecha,tomado')
  ]);

  // Loggear errores individuales sin tumbar todo
  if (resHoy.status   === 'rejected') console.error('[Cuidador] alarmasHoy:', resHoy.reason?.message);
  if (resPresc.status === 'rejected') console.error('[Cuidador] presc:', resPresc.reason?.message);
  if (resHist.status  === 'rejected') console.error('[Cuidador] hist30:', resHist.reason?.message);

  // Si las 3 fallaron hay un problema de red real
  if (resHoy.status === 'rejected' && resPresc.status === 'rejected' && resHist.status === 'rejected') {
    const msg = resHoy.reason?.message || 'Sin conexión';
    notif('No se pudo conectar con Supabase: ' + msg, 'error', 8000);
    if (ico) ico.classList.remove('spin');
    return;
  }

  try {
    const alarmasRaw = resHoy.status   === 'fulfilled' ? (resHoy.value   || []) : [];
    const prescRaw   = resPresc.status === 'fulfilled' ? (resPresc.value || []) : [];
    const hist30Raw  = resHist.status  === 'fulfilled' ? (resHist.value  || []) : [];

    console.log('[Cuidador] alarmasHoy:', alarmasRaw.length,
      '| presc:', prescRaw.length, '| hist30:', hist30Raw.length);
    if (alarmasRaw.length > 0)
      console.log('[Cuidador] tomado[0]:', alarmasRaw[0].tomado, typeof alarmasRaw[0].tomado);

    // Filtrar prescripciones activas (acepta boolean o integer)
    const prescActivas = prescRaw.filter(p =>
      p.esta_activa === true || p.esta_activa === 1 || p.esta_activa === '1' || p.esta_activa === null
    );

    // Mapa id → nombre para enriquecer alarmas
    const prescMap = {};
    prescRaw.forEach(p => { prescMap[p.id] = p.dosis || 'Medicamento'; });

    const alarmas = alarmasRaw.map(a => ({
      ...a,
      tomado        : a.tomado === null ? false : a.tomado,
      nombre_display: prescMap[a.prescripcion_id] || a.nombre || 'Medicamento'
    }));

    const histArr = hist30Raw.map(h => ({
      ...h,
      tomado: h.tomado === null ? false : h.tomado
    }));

    renderStats(alarmas, prescActivas);
    renderAlarmas(alarmas);
    renderMeds(prescActivas);
    const elRacha = document.getElementById('statRacha');
    if (elRacha) elRacha.textContent = calcRacha(histArr) + ' d';

    const elUpd = document.getElementById('lastUpdate');
    if (elUpd) elUpd.textContent = 'Actualizado: ' +
      new Date().toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' });

  } catch (e) {
    console.error('[Cuidador] Error procesando datos:', e.message);
    notif('Error al procesar datos: ' + e.message, 'error', 6000);
  } finally {
    if (ico) ico.classList.remove('spin');
  }
}

function isTomado(v) {
  return v === true || v === 1 || v === '1';
}

function renderStats(alarmas, presc) {
  const total      = alarmas.length;
  const tomadas    = alarmas.filter(a => isTomado(a.tomado)).length;
  const pendientes = alarmas.filter(a => !isTomado(a.tomado)).length;

  const elTom  = document.getElementById('statTomadas');
  const elPend = document.getElementById('statPend');
  const elMeds = document.getElementById('statMeds');

  if (elTom)  elTom.textContent  = total ? tomadas + '/' + total : '—';
  if (elPend) elPend.textContent = pendientes;
  if (elMeds) elMeds.textContent = presc.length;
}

function renderAlarmas(alarmas) {
  const cont  = document.getElementById('listaAlarmas');
  const ahora = new Date().toTimeString().substring(0, 5);

  if (!alarmas.length) {
    cont.innerHTML = '<div class="empty-state"><span class="material-icons">event_available</span><p style="font-size:.85rem">Sin alarmas hoy</p></div>';
    return;
  }

  const icoMap   = { tomada:'check_circle', perdida:'cancel', pendiente:'schedule' };
  const labelMap = { tomada:'Tomada', perdida:'No tomada', pendiente:'Pendiente' };

  cont.innerHTML = alarmas
    .sort((a,b) => (a.hora_toma||'').localeCompare(b.hora_toma||''))
    .map(a => {
      const tomado = a.tomado == true || a.tomado === 1;
      const pasada = (a.hora_toma||'') < ahora;
      const estado = tomado ? 'tomada' : (pasada ? 'perdida' : 'pendiente');
      const [h, m] = (a.hora_toma||'00:00').split(':').map(Number);
      const hora   = (h%12||12) + ':' + String(m).padStart(2,'0') + ' ' + (h>=12?'PM':'AM');
      return (
        '<div class="alarm-row ' + estado + '">' +
          '<div class="alarm-ico ' + estado + '"><span class="material-icons">' + icoMap[estado] + '</span></div>' +
          '<div style="flex:1">' +
            '<div class="alarm-name">' + (a.nombre_display || a.nombre || 'Medicamento') + '</div>' +
            '<div class="alarm-hora">' + hora + '</div>' +
          '</div>' +
          '<span class="alarm-badge ' + estado + '">' + labelMap[estado] + '</span>' +
        '</div>'
      );
    }).join('');
}

function renderMeds(presc) {
  const cont = document.getElementById('listaMeds');
  if (!presc.length) { cont.innerHTML = '<p style="font-size:.85rem;color:#9ca3af">Sin medicamentos activos</p>'; return; }
  cont.innerHTML = '<div style="display:flex;flex-wrap:wrap;margin:-3px">' +
    presc.map(p =>
      '<span class="med-chip"><span class="material-icons" style="font-size:14px">medication</span>' +
      (p.dosis || 'Medicamento') + '</span>'
    ).join('') + '</div>';
}

function calcRacha(hist) {
  const con = new Set(hist.filter(h => isTomado(h.tomado)).map(h => h.fecha));
  let r = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (con.has(d.toISOString().split('T')[0])) r++;
    else if (i > 0) break;
  }
  return r;
}

function desvincular() {
  if (!confirm('¿Dejar de seguir a este paciente?')) return;
  localStorage.removeItem('cg_patient');
  pacienteVinc = null;
  if (refreshTimer) clearInterval(refreshTimer);
  document.getElementById('seccionIngreso').style.display   = 'block';
  document.getElementById('seccionDashboard').style.display = 'none';
  // Limpiar inputs
  for (let i = 0; i < 6; i++) {
    const el = document.getElementById('d' + i);
    el.value = ''; el.classList.remove('filled');
  }
  document.getElementById('btnVincular').disabled = true;
  notif('Desvinculado', 'info');
}

function fmtFecha(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('es-MX', { day:'2-digit', month:'short' }); }
  catch(e) { return iso; }
}

window.addEventListener('beforeunload', () => {
  if (expiryTimer)  clearInterval(expiryTimer);
  if (refreshTimer) clearInterval(refreshTimer);
});