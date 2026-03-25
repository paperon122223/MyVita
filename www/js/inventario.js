// ================================================================
// inventario.js — Control de inventario de pastillas · MyVita
// ================================================================

let userId     = null;
let inventario = [];
let prescMeds  = [];
let editando   = null;
let reabId     = null;

// ── Notificaciones ────────────────────────────────────────
function notif(msg, tipo = 'info', ms = 3500) {
  const box = document.getElementById('notif-box');
  const el  = document.createElement('div');
  el.className = 'notif ' + tipo;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  if (ms > 0) setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, ms);
}

// ── Init ──────────────────────────────────────────────────
async function init() {
  userId = localStorage.getItem('currentUserId');
  if (!userId) { window.location.href = 'index.html'; return; }
  await window.DB.init();
  await cargar();
}

async function cargar() {
  inventario = await window.DB.Inventario.getAll(userId).catch(() => []);
  prescMeds  = await window.DB.Prescripciones.getActivas(userId).catch(() => []);
  renderStats();
  renderAlerta();
  renderLista();
  llenarSelectPrescripciones();
}

// ── Stats resumen ─────────────────────────────────────────
function renderStats() {
  if (!inventario.length) {
    document.getElementById('statsRow').style.display = 'none';
    return;
  }
  document.getElementById('statsRow').style.display = 'grid';
  const ok     = inventario.filter(i => i.stock_actual > i.stock_minimo).length;
  const warn   = inventario.filter(i => i.stock_actual > 0 && i.stock_actual <= i.stock_minimo).length;
  const danger = inventario.filter(i => i.stock_actual <= 0).length;
  document.getElementById('statOk').textContent     = ok;
  document.getElementById('statWarn').textContent   = warn;
  document.getElementById('statDanger').textContent = danger;
}

// ── Alerta stock bajo ─────────────────────────────────────
function renderAlerta() {
  const bajos = inventario.filter(i => i.stock_actual <= i.stock_minimo);
  const el    = document.getElementById('alertaBanner');
  if (!bajos.length) { el.style.display = 'none'; return; }
  const nombres = bajos.map(i => i.nombre_display || 'Medicamento').join(', ');
  el.style.display = 'flex';
  el.className = 'alert-banner';
  el.innerHTML = `
    <span class="material-icons">warning_amber</span>
    <div style="flex:1">
      <h3>${bajos.length === 1 ? '1 medicamento con poco stock' : bajos.length + ' medicamentos con poco stock'}</h3>
      <p>${nombres}</p>
    </div>
    <span class="material-icons" style="opacity:.7">chevron_right</span>`;
  el.onclick = () => {
    const primer = bajos[0];
    if (primer) abrirReab(primer.id);
  };
}

// ── Lista ─────────────────────────────────────────────────
function renderLista() {
  const cont = document.getElementById('listaInventario');
  if (!inventario.length) {
    cont.innerHTML = `
      <div class="empty-state">
        <span class="material-icons">inventory_2</span>
        <h3>Sin inventario registrado</h3>
        <p>Agrega tus medicamentos para saber cuántas pastillas te quedan</p>
        <button class="btn-add-first" onclick="abrirModal()">
          <span class="material-icons">add</span> Agregar medicamento
        </button>
      </div>`;
    return;
  }
  cont.innerHTML = inventario.map(inv => tarjetaHTML(inv)).join('');
}

function tarjetaHTML(inv) {
  const nombre   = inv.nombre_display || 'Medicamento';
  const actual   = inv.stock_actual   || 0;
  const minimo   = inv.stock_minimo   || 7;
  const tDia     = inv.tomas_dia      || 1;
  const diasEst  = tDia > 0 ? Math.floor(actual / tDia) : actual;

  let estado = 'ok';
  if (actual <= 0)      estado = 'danger';
  else if (actual <= minimo) estado = 'warn';

  const ref = Math.max(actual, minimo * 3, 30);
  const pct = Math.min(100, Math.round((actual / ref) * 100));

  const diasLabel = actual <= 0   ? 'Sin stock'
                  : diasEst === 1 ? '~1 día'
                  : '~' + diasEst + ' días';

  let vencHTML = '';
  if (inv.fecha_vencimiento) {
    const dias  = Math.ceil((new Date(inv.fecha_vencimiento + 'T00:00:00') - new Date()) / 86400000);
    let vClass  = 'ok', vTxt = 'Vence ' + fmtFecha(inv.fecha_vencimiento);
    if (dias < 0)       { vClass = 'vencido'; vTxt = '¡Vencido!'; }
    else if (dias <= 30){ vClass = 'pronto';  vTxt = 'Vence en ' + dias + ' días'; }
    vencHTML = `<span class="venc-chip ${vClass}">${vTxt}</span>`;
  }

  return `
    <div class="inv-card ${estado}" data-id="${inv.id}">
      <div class="inv-card-body">
        <div class="inv-top">
          <div class="inv-icon ${estado}">
            <span class="material-icons">medication</span>
          </div>
          <div class="inv-info">
            <div class="inv-nombre">${nombre}</div>
            <div class="inv-sub">${tDia} toma${tDia > 1 ? 's' : ''}/día · mín. ${minimo} pastillas</div>
            ${vencHTML}
          </div>
        </div>
        <div class="stock-section">
          <div class="stock-row">
            <div style="display:flex;align-items:flex-end;gap:4px">
              <span class="stock-num ${estado}">${actual}</span>
              <span class="stock-unit">pastillas</span>
            </div>
            <span class="dias-chip ${estado}">
              <span class="material-icons">schedule</span>${diasLabel}
            </span>
          </div>
          <div class="bar-track">
            <div class="bar-fill ${estado}" style="width:${pct}%"></div>
          </div>
        </div>
      </div>
      <div class="inv-actions">
        <button class="inv-btn btn-add" onclick="abrirReab('${inv.id}')">
          <span class="material-icons">add_circle</span> Reabastecer
        </button>
        <button class="inv-btn btn-edit" onclick="abrirModal('${inv.id}')">
          <span class="material-icons">edit</span> Editar
        </button>
        <button class="inv-btn btn-del" onclick="eliminar('${inv.id}')">
          <span class="material-icons">delete</span>
        </button>
      </div>
    </div>`;
}

// ── Modal Reabastecer ─────────────────────────────────────
function abrirReab(id) {
  reabId = id;
  const inv = inventario.find(i => i.id === id);
  document.getElementById('reabNombre').textContent = inv?.nombre_display || 'Medicamento';
  document.getElementById('reabCantidad').value = '';
  document.getElementById('reabOverlay').style.display = 'flex';
}

function elegirReab(n) {
  document.getElementById('reabCantidad').value = n;
}

async function confirmarReab() {
  const valor = parseInt(document.getElementById('reabCantidad').value);
  if (!valor || isNaN(valor) || valor <= 0) {
    notif('Ingresa una cantidad válida', 'advertencia'); return;
  }
  const inv = inventario.find(i => i.id === reabId);
  if (!inv) return;

  const nuevoStock = (inv.stock_actual || 0) + valor;
  try {
    await window.DB.run(
      `UPDATE inventario SET stock_actual = ?, updated_at = ?, synced_at = NULL WHERE id = ?`,
      [nuevoStock, new Date().toISOString(), reabId]
    );
    document.getElementById('reabOverlay').style.display = 'none';
    notif('✅ +' + valor + ' pastillas · Total: ' + nuevoStock, 'exito', 4000);
    await cargar();
  } catch (e) {
    notif('Error actualizando stock', 'error');
  }
}

// ── Escanear código de barras ─────────────────────────────
function abrirScan(enModal = false) {
  // Requiere cordova-plugin-barcodescanner o cordova-plugin-mlkit-barcode-scanner
  if (!window.cordova || !window.plugins?.barcodeScanner) {
    notif('Escáner no disponible — ingresa el nombre manualmente', 'info');
    if (enModal) {
      document.getElementById('grupoNombreManual').style.display = 'block';
      document.getElementById('fPrescripcion').value = '__manual__';
    }
    return;
  }

  window.plugins.barcodeScanner.scan(
    result => {
      if (result.cancelled) return;
      const codigo = result.text;
      console.log('[Scan] Código:', codigo);
      // Buscar en base de datos por código
      buscarPorCodigo(codigo, enModal);
    },
    err => {
      console.error('[Scan] Error:', err);
      notif('Error al escanear: ' + err, 'error');
    },
    {
      preferFrontCamera: false,
      showFlipCameraButton: true,
      showTorchButton: true,
      prompt: 'Apunta al código de barras del medicamento',
      formats: 'CODE_128,CODE_39,EAN_13,EAN_8,QR_CODE,UPC_A,UPC_E',
      orientation: 'portrait'
    }
  );
}

async function buscarPorCodigo(codigo, enModal = false) {
  // Buscar en prescripciones por código de barras
  const match = prescMeds.find(p =>
    p.codigo_barras === codigo ||
    p.dosis?.includes(codigo) ||
    p.medicamento_nombre?.includes(codigo)
  );

  if (match) {
    notif('✅ Medicamento encontrado: ' + (match.dosis || match.medicamento_nombre), 'exito');
    if (enModal) {
      document.getElementById('fPrescripcion').value = match.id;
      document.getElementById('grupoNombreManual').style.display = 'none';
    } else {
      abrirModal(null);
      setTimeout(() => {
        document.getElementById('fPrescripcion').value = match.id;
      }, 300);
    }
  } else {
    // No encontrado — poner el código en el campo manual
    notif('Medicamento no encontrado — ingresa el nombre', 'info');
    if (!enModal) abrirModal(null);
    setTimeout(() => {
      document.getElementById('fPrescripcion').value = '__manual__';
      document.getElementById('grupoNombreManual').style.display = 'block';
      document.getElementById('fNombreManual').value = codigo;
      document.getElementById('fNombreManual').focus();
    }, enModal ? 0 : 300);
  }
}

// ── Modal agregar/editar ──────────────────────────────────
function llenarSelectPrescripciones() {
  const sel = document.getElementById('fPrescripcion');
  sel.innerHTML = '<option value="">— Elige de tus recetas activas —</option>';
  prescMeds.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.dosis || p.medicamento_nombre || 'Medicamento';
    sel.appendChild(opt);
  });
  const optManual = document.createElement('option');
  optManual.value = '__manual__';
  optManual.textContent = '✏️ Ingresar nombre manualmente';
  sel.appendChild(optManual);
  sel.addEventListener('change', () => {
    document.getElementById('grupoNombreManual').style.display =
      sel.value === '__manual__' ? 'block' : 'none';
  });
}

function abrirModal(id = null) {
  editando = id;
  document.getElementById('modalTitulo').textContent = id ? 'Editar medicamento' : 'Agregar medicamento';
  document.getElementById('editId').value = id || '';
  document.getElementById('grupoNombreManual').style.display = 'none';

  if (id) {
    const inv = inventario.find(i => i.id === id);
    if (inv) {
      document.getElementById('fPrescripcion').value  = inv.prescripcion_id || '';
      document.getElementById('fNombreManual').value  = inv.nombre_medicamento || '';
      document.getElementById('fStock').value         = inv.stock_actual || 0;
      document.getElementById('fMinimo').value        = inv.stock_minimo || 7;
      document.getElementById('fTomasDia').value      = inv.tomas_dia || 1;
      document.getElementById('fVencimiento').value   = inv.fecha_vencimiento || '';
    }
  } else {
    document.getElementById('fPrescripcion').value  = '';
    document.getElementById('fNombreManual').value  = '';
    document.getElementById('fStock').value         = '';
    document.getElementById('fMinimo').value        = '7';
    document.getElementById('fTomasDia').value      = '1';
    document.getElementById('fVencimiento').value   = '';
  }
  document.getElementById('modalOverlay').style.display = 'flex';
}

function cerrarModal(e) {
  if (e && e.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').style.display = 'none';
}

async function guardarInventario() {
  const prescId  = document.getElementById('fPrescripcion').value;
  const nombreM  = document.getElementById('fNombreManual').value.trim();
  const stock    = parseInt(document.getElementById('fStock').value);
  const minimo   = parseInt(document.getElementById('fMinimo').value) || 7;
  const tomasDia = parseInt(document.getElementById('fTomasDia').value) || 1;
  const venc     = document.getElementById('fVencimiento').value;

  if (!prescId && !nombreM) {
    notif('Selecciona un medicamento o ingresa el nombre', 'advertencia'); return;
  }
  if (isNaN(stock) || stock < 0) {
    notif('Ingresa la cantidad de pastillas', 'advertencia'); return;
  }

  let nombre = nombreM;
  let pId    = prescId !== '__manual__' ? prescId : null;
  if (!nombre && pId) {
    const p = prescMeds.find(p => p.id === pId);
    nombre  = p?.dosis || p?.medicamento_nombre || 'Medicamento';
  }

  const datos = {
    stock_actual: stock, stock_minimo: minimo, tomas_dia: tomasDia,
    fecha_vencimiento: venc || null, nombre_medicamento: nombre,
    prescripcion_id: pId || null, medicamento_id: null
  };

  try {
    const now = new Date().toISOString();
    if (editando) {
      const campos = Object.keys(datos).map(k => k + ' = ?').join(', ');
      await window.DB.run(
        `UPDATE inventario SET ${campos}, updated_at = ?, synced_at = NULL WHERE id = ?`,
        [...Object.values(datos), now, editando]
      );
      notif('✅ Inventario actualizado', 'exito');
    } else {
      await window.DB.Inventario.crearParaPrescripcion(userId, pId || 'manual-' + Date.now(), datos);
      notif('✅ Medicamento agregado', 'exito');
    }
    document.getElementById('modalOverlay').style.display = 'none';
    await cargar();
  } catch (e) {
    console.error(e);
    notif('Error: ' + e.message, 'error');
  }
}

// ── Eliminar ──────────────────────────────────────────────
async function eliminar(id) {
  const inv  = inventario.find(i => i.id === id);
  const nombre = inv?.nombre_display || 'este medicamento';
  const ok = navigator.notification
    ? await new Promise(r => navigator.notification.confirm(
        '¿Eliminar inventario de ' + nombre + '?', i => r(i === 1), 'Confirmar', ['Sí','Cancelar']))
    : confirm('¿Eliminar inventario de ' + nombre + '?');
  if (!ok) return;
  try {
    await window.DB.run(
      `UPDATE inventario SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), new Date().toISOString(), id]
    );
    notif('Eliminado', 'info');
    await cargar();
  } catch (e) { notif('Error eliminando', 'error'); }
}

function fmtFecha(iso) {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('es-MX',
      { day:'2-digit', month:'short', year:'numeric' });
  } catch { return iso; }
}

if (window.cordova) document.addEventListener('deviceready', init);
else document.addEventListener('DOMContentLoaded', init);
