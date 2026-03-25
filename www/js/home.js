// ================================================================
// home.js — Prescripciones · MediTime
// ================================================================
// NOTA: Las funciones comunes (mostrarNotificacion, formatFecha, etc.)
// están en utils.js - asegúrate de cargarlo antes que este archivo

if (!window.cordova) {
  document.dispatchEvent(new Event('deviceready'));
}

let userId = null;

// ── Inicializar ───────────────────────────────────────────────
document.addEventListener('deviceready', async function () {
  console.log('📱 === HOME INICIANDO ===');
  
  userId = localStorage.getItem('currentUserId');
  console.log('👤 userId:', userId);
  
  if (!userId) { 
    console.error('❌ No hay usuario, redirigiendo a index');
    window.location.href = 'index.html'; 
    return; 
  }

  try {
    console.log('⏳ Inicializando DB...');
    await window.DB.init();
    console.log('✅ DB inicializada');

    console.log('⏳ Cargando prescripciones...');
    await cargarPrescripciones();
    console.log('✅ Prescripciones cargadas');

    console.log('⏳ Configurando formulario...');
    setupFormulario();
    console.log('✅ Formulario configurado');

    console.log('⏳ Configurando botones...');
    setupBotones();
    console.log('✅ Botones configurados');
    
    console.log('✅ === HOME LISTO ===');
  } catch (err) {
    console.error('❌ Error inicializando home:', err);
    mostrarNotificacion('Hubo un problema al cargar tus datos.', 'error');
  }
});

// ── Cargar prescripciones ──────────────────────────────────────
async function cargarPrescripciones() {
  try {
    console.log('📥 Obteniendo prescripciones...');
    const prescripciones = await window.DB.Prescripciones.getActivas(userId);
    console.log('📋 Prescripciones obtenidas:', prescripciones);
    renderizarPrescripciones(prescripciones);
  } catch (err) {
    console.error('❌ Error cargando prescripciones:', err);
    mostrarNotificacion('No se pudieron cargar las prescripciones.', 'error');
  }
}

// ── Renderizar prescripciones ──────────────────────────────────
function renderizarPrescripciones(lista) {
  console.log('🎨 Renderizando', lista.length, 'prescripciones');
  
  const listaEl  = document.getElementById('prescripcionesList');
  const emptyEl  = document.getElementById('emptyPrescriptions');

  if (!listaEl) {
    console.error('❌ prescripcionesList no existe');
    return;
  }

  if (lista.length === 0) {
    console.log('📭 Sin prescripciones, mostrando empty state');
    listaEl.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  listaEl.innerHTML = lista.map(p => {
    const horaFormateada   = formatTimeTo12h(p.hora_toma);
    const frecTexto        = frecuenciaTexto(p.frecuencia);
    const fechaInicio      = formatFecha(p.fecha_inicio);
    const nombreMedico     = p.nombre_medico || 'No especificado';
    const nombreMedicamento = p.medicamento_nombre || p.dosis || 'Medicamento';

    return `
      <li class="prescripcion-item" data-id="${p.id}">
        <button class="btn-eliminar-prescripcion" onclick="eliminarPrescripcion('${p.id}')" style="float: right; background: none; border: none; color: #f44336; cursor: pointer;">
          <span class="material-icons">delete</span>
        </button>
        <div class="prescripcion-header">
          <div class="prescripcion-title">${nombreMedicamento}</div>
          <div class="prescripcion-time">${horaFormateada}</div>
        </div>
        <div class="prescripcion-detail">
          <strong>Dosis:</strong> ${p.dosis || '—'}
        </div>
        <div class="prescripcion-detail">
          <strong>Frecuencia:</strong> ${frecTexto}
        </div>
        <div class="prescripcion-detail">
          <strong>Inicio:</strong> ${fechaInicio}
        </div>
        <div class="prescripcion-detail">
          <strong>Médico:</strong> ${nombreMedico}
        </div>
        <div class="prescripcion-detail">
          <strong>Vía:</strong> ${p.via_administracion || 'Oral'}
        </div>
      </li>`;
  }).join('');

  console.log('✅ HTML renderizado');
}

// ── Eliminar prescripción ──────────────────────────────────────
async function eliminarPrescripcion(id) {
  console.log('🗑️ Eliminando prescripción:', id);
  
  const ok = confirm('¿Eliminar esta prescripción?');
  if (!ok) return;

  try {
    await window.DB.Prescripciones.desactivar(id);
    mostrarNotificacion('Prescripción eliminada.', 'exito');
    await cargarPrescripciones();
  } catch (err) {
    console.error('❌ Error eliminando:', err);
    mostrarNotificacion('No se pudo eliminar.', 'error');
  }
}

// ── Generar alarmas automáticas ────────────────────────────────
async function generarAlarmas(prescripcionId, frecuencia, horaPrincipal) {
  console.log('🔔 Generando alarmas para:', prescripcionId);
  
  if (!horaPrincipal) {
    console.warn('⚠️ Sin hora principal');
    return;
  }

  const [h, m] = horaPrincipal.split(':').map(Number);
  const horas  = [horaPrincipal];

  if (frecuencia === 'dos_veces_dia') {
    horas.push(`${String((h + 12) % 24).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  } else if (frecuencia === 'tres_veces_dia') {
    horas.push(`${String((h + 8)  % 24).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
    horas.push(`${String((h + 16) % 24).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  }

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const fecha = d.toISOString().split('T')[0];
    for (const hora of horas) {
      await window.DB.Alarmas.crear(userId, {
        prescripcion_id: prescripcionId,
        fecha,
        hora_toma: hora
      }).catch(e => console.warn('⚠️ Error alarma:', e));
    }
  }
  console.log('✅ Alarmas generadas');
}

// ── Configurar formulario ──────────────────────────────────────
function setupFormulario() {
  const form = document.getElementById('prescripcionForm');
  if (!form) {
    console.error('❌ prescripcionForm no encontrado');
    return;
  }
  console.log('✅ Formulario encontrado');

  const frecuenciaEl = document.getElementById('frecuencia');
  const personalizadoGroup = document.getElementById('horario_personalizado');
  
  if (frecuenciaEl && personalizadoGroup) {
    frecuenciaEl.addEventListener('change', function () {
      personalizadoGroup.style.display = this.value === 'personalizado' ? 'block' : 'none';
    });
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    console.log('📝 Formulario enviado');

    const dosis = document.getElementById('dosis')?.value.trim();
    if (!dosis) {
      mostrarNotificacion('La dosis es obligatoria.', 'advertencia');
      return;
    }

    const datos = {
      medicamento_id    : null,
      dosis,
      hora_toma         : document.getElementById('hora_toma')?.value,
      frecuencia        : document.getElementById('frecuencia')?.value || 'una_vez_dia',
      fecha_inicio      : document.getElementById('fecha_inicio')?.value || hoy(),
      fecha_fin         : document.getElementById('fecha_fin')?.value || null,
      nombre_medico     : document.getElementById('nombre_medico')?.value.trim() || null,
      contacto_medico   : document.getElementById('contacto_medico')?.value.trim() || null,
      via_administracion: document.getElementById('via_administracion')?.value || 'Oral'
    };

    console.log('💾 Guardando:', datos);

    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    try {
      const prescripcionId = await window.DB.Prescripciones.crear(userId, datos);
      console.log('✅ Prescripción guardada:', prescripcionId);

      await generarAlarmas(prescripcionId, datos.frecuencia, datos.hora_toma);

      mostrarNotificacion('✅ Prescripción guardada correctamente.', 'exito');
      form.reset();
      ocultarFormulario();
      await cargarPrescripciones();

      if (window.Sync && window.Sync.sincronizarPrescripciones) {
        window.Sync.sincronizarPrescripciones().catch(e => console.log('Sync:', e));
      }
    } catch (err) {
      console.error('❌ Error guardando:', err);
      mostrarNotificacion('No se pudo guardar la prescripción.', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  // ✅ EVENT LISTENER PARA EL BOTÓN CANCELAR
  const btnCancelar = document.getElementById('btnCancelarFormulario');
  if (btnCancelar) {
    console.log('✅ btnCancelarFormulario encontrado');
    btnCancelar.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('👆 Click en cancelar');
      ocultarFormulario();
    });
  }
}

// ── Configurar botones ────────────────────────────────────────
function setupBotones() {
  const btnAgregar = document.getElementById('btnAgregarPrescripcion');
  const btnEscanear = document.getElementById('btnEscanearReceta');

  if (btnAgregar) {
    console.log('✅ btnAgregarPrescripcion encontrado');
    btnAgregar.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('👆 Click en Agregar Prescripción');
      mostrarFormulario();
    });
  } else {
    console.error('❌ btnAgregarPrescripcion NO encontrado');
  }

  if (btnEscanear) {
    console.log('✅ btnEscanearReceta encontrado');
    btnEscanear.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('👆 Click en Escanear Receta');
      window.location.href = 'scan.html';
    });
  }
}

// ── Mostrar/ocultar formulario ────────────────────────────────
function mostrarFormulario() {
  const f = document.getElementById('formularioPrescripcion');
  console.log('📂 Mostrando formulario...');
  if (f) { 
    f.classList.add('visible');
    console.log('✅ Formulario visible');
  } else {
    console.error('❌ formularioPrescripcion no encontrado');
  }
}

function ocultarFormulario() {
  const f = document.getElementById('formularioPrescripcion');
  console.log('📁 Ocultando formulario...');
  if (f) {
    f.classList.remove('visible');
    console.log('✅ Formulario oculto');
  }
}

// ── Inicialización alternativa para desarrollo web ─────────────
if (!window.cordova) {
  document.addEventListener('DOMContentLoaded', function() {
    console.log('🌐 DOMContentLoaded disparado (modo web)');
    // Simular deviceready
    const evt = new Event('deviceready');
    document.dispatchEvent(evt);
  });
}

// ── AGREGAR AL FINAL DE home.js ──────────────────────────────

// Botón sincronizar
document.getElementById('btnSincronizar')?.addEventListener('click', async function() {
  console.log('👆 Click en sincronizar');
  this.disabled = true;
  
  try {
    mostrarNotificacion('⏳ Sincronizando...', 'info', 0);
    
    // Obtener prescripciones sin sincronizar
    const noSync = await window.DB.Prescripciones.getNoSincronizadas(userId);
    mostrarNotificacion(`📋 Encontradas ${noSync.length} prescripciones sin sincronizar`, 'info', 3000);
    
    // Forzar sincronización
    if (window.Sync && window.Sync.forzar) {
      await window.Sync.forzar();
      mostrarNotificacion('✅ Sincronización completada', 'exito', 3000);
    } else {
      mostrarNotificacion('❌ Sync no disponible', 'error', 3000);
    }
    
  } catch (err) {
    console.error('Error:', err);
    mostrarNotificacion(`❌ Error: ${err.message}`, 'error', 5000);
  } finally {
    this.disabled = false;
  }
});