// ================================================================
// diary.js — Diario Médico · MyVita
// ================================================================

// Igual que home.js: si no hay Cordova (web), disparar deviceready ya
if (!window.cordova) {
  document.dispatchEvent(new Event('deviceready'));
}

(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────
  const MOODS = {
    1: { emoji: '😞', label: 'Muy mal',  class: 'mood-1', gradClass: 'mood-bg-1' },
    2: { emoji: '😔', label: 'Mal',      class: 'mood-2', gradClass: 'mood-bg-2' },
    3: { emoji: '😐', label: 'Regular',  class: 'mood-3', gradClass: 'mood-bg-3' },
    4: { emoji: '😊', label: 'Bien',     class: 'mood-4', gradClass: 'mood-bg-4' },
    5: { emoji: '😄', label: 'Excelente',class: 'mood-5', gradClass: 'mood-bg-5' },
  };
  const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  // ── Estado ────────────────────────────────────────────────────
  let userId      = null;
  let entradas    = [];      // todas las del mes
  let filtroActivo = 'all';
  let editandoId  = null;    // null = nueva, string = editar
  let moodSeleccionado = null;
  let sintomasSeleccionados = new Set();

  // ── Arrancar ──────────────────────────────────────────────────
  function arrancar() {
    document.addEventListener('deviceready', init, false);
  }

  async function init() {
    userId = localStorage.getItem('currentUserId');
    if (!userId) { window.location.href = 'index.html'; return; }

    try {
      await window.DB.init();
    } catch(e) {
      console.error('[Diario] DB init error:', e.message);
      mostrarNotif('Error al inicializar la base de datos', 'error');
      return; // ← detener si la BD no arrancó
    }

    // Cargar menú inferior
    try {
      const res = await fetch('menu-fragment.html');
      document.getElementById('menuContainer').innerHTML = await res.text();
      if (window.BottomNav) window.BottomNav.init();
    } catch(e) {}

    setupListeners();
    await cargarEntradas();
    renderMoodStrip();
  }

  // ── Cargar desde BD ───────────────────────────────────────────
  async function cargarEntradas() {
    try {
      entradas = await window.DB.Diario.getAll(userId) || [];
    } catch(e) {
      console.error('[Diario] getAll:', e.message);
      entradas = [];
    }
    renderEntradas();
  }

  // ── Tira de humor últimos 7 días ──────────────────────────────
  function renderMoodStrip() {
    const strip = document.getElementById('moodStrip');
    if (!strip) return;

    // Mapa fecha → entrada
    const mapaFecha = {};
    entradas.forEach(e => { mapaFecha[e.fecha] = e; });

    const hoy = new Date();
    let html = '';
    for (let i = 6; i >= 0; i--) {
      const d     = new Date(hoy); d.setDate(d.getDate() - i);
      const iso   = d.toISOString().split('T')[0];
      const entry = mapaFecha[iso];
      const mood  = entry ? MOODS[parseInt(entry.estado_animo)] : null;
      const esHoy = i === 0;

      html += `
        <div class="mood-day ${entry ? '' : 'no-entry'} ${esHoy ? 'active' : ''}"
             data-fecha="${iso}" onclick="filtrarPorFecha('${iso}')">
          <span class="day-label">${DIAS[d.getDay()]}</span>
          <span class="day-num" style="${esHoy ? 'color:#0288d1;font-weight:800' : ''}">${d.getDate()}</span>
          <div class="mood-dot">${mood ? mood.emoji : '·'}</div>
        </div>`;
    }
    strip.innerHTML = html;
  }

  // ── Render lista ──────────────────────────────────────────────
  function renderEntradas() {
    const cont = document.getElementById('diaryList');
    if (!cont) return;

    let lista = [...entradas];

    // Aplicar filtro
    if (filtroActivo !== 'all') {
      lista = lista.filter(e => String(e.estado_animo) === filtroActivo);
    }

    if (!lista.length) {
      cont.innerHTML = `
        <div class="diary-empty">
          <div class="empty-icon">
            <span class="material-icons">book</span>
          </div>
          <h3>${filtroActivo !== 'all' ? 'Sin entradas con ese estado' : 'Tu diario está vacío'}</h3>
          <p>${filtroActivo !== 'all' ? 'Prueba otro filtro' : 'Toca + para registrar cómo te sientes hoy'}</p>
        </div>`;
      return;
    }

    cont.innerHTML = lista.map((e, idx) => renderEntradaCard(e, idx)).join('');

    // Listeners de expandir notas
    cont.querySelectorAll('.btn-expand').forEach(btn => {
      btn.addEventListener('click', function() {
        const notas = this.previousElementSibling;
        const expandido = notas.classList.toggle('expanded');
        this.textContent = expandido ? 'Ver menos' : 'Ver más';
      });
    });
  }

  function renderEntradaCard(e, idx) {
    const mood    = MOODS[parseInt(e.estado_animo)] || MOODS[3];
    const fecha   = formatFecha(e.fecha);
    const delay   = Math.min(idx * 50, 300);

    // Síntomas
    const sintArr = e.sintomas
      ? e.sintomas.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const sintomasHtml = sintArr.map(s => {
      const esMalo = s.match(/dolor|náusea|mareo|fatiga|fiebre|insomnio|apetito/i);
      return `<span class="sintoma-tag ${esMalo ? 'malo' : ''}">${s}</span>`;
    }).join('');

    const notasHtml = e.notas
      ? `<p class="entry-notas" id="notas-${e.id}">${e.notas.replace(/\n/g,'<br>')}</p>
         ${e.notas.length > 120
           ? `<button class="btn-expand">Ver más</button>`
           : ''}`
      : '';

    return `
      <div class="diary-entry" style="animation-delay:${delay}ms">
        <div class="entry-divider ${mood.gradClass}" style="height:4px;margin:0"></div>
        <div class="entry-top">
          <div class="entry-mood-badge ${mood.class}">${mood.emoji}</div>
          <div class="entry-meta">
            <p class="entry-date">${fecha}</p>
            <p class="entry-mood-label">${mood.label}</p>
          </div>
          <div class="entry-actions">
            <button class="btn-entry-action" onclick="abrirEditar('${e.id}')">
              <span class="material-icons">edit</span>
            </button>
            <button class="btn-entry-action delete" onclick="eliminarEntrada('${e.id}')">
              <span class="material-icons">delete_outline</span>
            </button>
          </div>
        </div>
        ${sintArr.length || e.notas ? `
        <div class="entry-body">
          ${sintArr.length ? `<div class="entry-sintomas">${sintomasHtml}</div>` : ''}
          ${notasHtml}
        </div>` : ''}
      </div>`;
  }

  // ── Modal ─────────────────────────────────────────────────────
  function abrirModal(entrada = null) {
    editandoId = entrada ? entrada.id : null;
    moodSeleccionado = entrada ? parseInt(entrada.estado_animo) : null;
    sintomasSeleccionados = new Set(
      entrada?.sintomas ? entrada.sintomas.split(',').map(s => s.trim()).filter(Boolean) : []
    );

    document.getElementById('modalTitulo').textContent =
      entrada ? 'Editar entrada' : 'Nueva entrada';

    // Fecha
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('entradaFecha').value = entrada?.fecha || hoy;

    // Mood
    document.querySelectorAll('.mood-btn').forEach(btn => {
      const v = parseInt(btn.getAttribute('data-val'));
      btn.classList.toggle('selected', v === moodSeleccionado);
    });

    // Síntomas
    document.querySelectorAll('.sintoma-chip').forEach(chip => {
      chip.classList.toggle('selected', sintomasSeleccionados.has(chip.getAttribute('data-s')));
    });

    // Notas
    document.getElementById('entradaNotas').value = entrada?.notas || '';

    document.getElementById('modalEntrada').classList.add('open');
  }

  function cerrarModal() {
    document.getElementById('modalEntrada').classList.remove('open');
    editandoId = null;
    moodSeleccionado = null;
    sintomasSeleccionados.clear();
  }

  // ── Guardar ───────────────────────────────────────────────────
  async function guardarEntrada() {
    const fecha = document.getElementById('entradaFecha').value;
    const notas = document.getElementById('entradaNotas').value.trim();

    if (!fecha) {
      mostrarNotif('Selecciona una fecha', 'error'); return;
    }
    if (!moodSeleccionado) {
      mostrarNotif('¿Cómo te sientes hoy?', 'error'); return;
    }

    const datos = {
      fecha,
      estado_animo : String(moodSeleccionado),
      sintomas     : [...sintomasSeleccionados].join(', ') || null,
      notas        : notas || null,
      foto_url     : null
    };

    const btn = document.getElementById('btnGuardarEntrada');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons" style="animation:spin .6s linear infinite">refresh</span> Guardando...';

    try {
      if (editandoId) {
        // Actualizar existente
        await window.DB.Diario.actualizar(userId, editandoId, datos);
        mostrarNotif('Entrada actualizada ✅', 'exito');
      } else {
        // Verificar si ya existe entrada para esa fecha
        const existe = entradas.find(e => e.fecha === fecha);
        if (existe) {
          const ok = confirm(`Ya tienes una entrada para el ${formatFecha(fecha)}. ¿Reemplazarla?`);
          if (!ok) { btn.disabled = false; btn.innerHTML = '<span class="material-icons">save</span> Guardar entrada'; return; }
          await window.DB.Diario.actualizar(userId, existe.id, datos);
          mostrarNotif('Entrada actualizada ✅', 'exito');
        } else {
          await window.DB.Diario.crear(userId, datos);
          mostrarNotif('Entrada guardada ✅', 'exito');
        }
      }

      cerrarModal();
      await cargarEntradas();
      renderMoodStrip();

    } catch(e) {
      console.error('[Diario] guardar:', e.message);
      mostrarNotif('Error al guardar: ' + e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons">save</span> Guardar entrada';
    }
  }

  // ── Editar ────────────────────────────────────────────────────
  window.abrirEditar = function(id) {
    const entrada = entradas.find(e => e.id === id);
    if (entrada) abrirModal(entrada);
  };

  // ── Eliminar ──────────────────────────────────────────────────
  window.eliminarEntrada = async function(id) {
    const ok = confirm('¿Eliminar esta entrada del diario?');
    if (!ok) return;
    try {
      await window.DB.Diario.eliminar(userId, id);
      mostrarNotif('Entrada eliminada', 'info');
      await cargarEntradas();
      renderMoodStrip();
    } catch(e) {
      console.error('[Diario] eliminar:', e.message);
      mostrarNotif('Error al eliminar', 'error');
    }
  };

  // ── Filtrar por fecha desde tira ──────────────────────────────
  window.filtrarPorFecha = function(fecha) {
    const entrada = entradas.find(e => e.fecha === fecha);
    if (entrada) {
      abrirModal(entrada);
    } else {
      // Abrir nueva entrada para esa fecha
      const modal = { fecha };
      document.getElementById('entradaFecha').value = fecha;
      abrirModal(null);
      document.getElementById('entradaFecha').value = fecha;
    }
  };

  // ── Listeners ─────────────────────────────────────────────────
  function setupListeners() {
    // Botón nueva entrada
    document.getElementById('btnNuevaEntrada')?.addEventListener('click', () => abrirModal());

    // Cerrar modal
    document.getElementById('btnCerrarModal')?.addEventListener('click', cerrarModal);
    document.getElementById('modalEntrada')?.addEventListener('click', function(e) {
      if (e.target === this) cerrarModal();
    });

    // Guardar
    document.getElementById('btnGuardarEntrada')?.addEventListener('click', guardarEntrada);

    // Mood selector
    document.querySelectorAll('.mood-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        moodSeleccionado = parseInt(this.getAttribute('data-val'));
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        if (navigator.vibrate) navigator.vibrate(10);
      });
    });

    // Síntomas
    document.querySelectorAll('.sintoma-chip').forEach(chip => {
      chip.addEventListener('click', function() {
        const s = this.getAttribute('data-s');
        if (sintomasSeleccionados.has(s)) {
          sintomasSeleccionados.delete(s);
          this.classList.remove('selected');
        } else {
          sintomasSeleccionados.add(s);
          this.classList.add('selected');
        }
      });
    });

    // Filtros
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', function() {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        filtroActivo = this.getAttribute('data-filter');
        renderEntradas();
      });
    });
  }

  // ── Helpers ───────────────────────────────────────────────────
  function formatFecha(iso) {
    if (!iso) return '—';
    try {
      const [y, m, d] = iso.split('-').map(Number);
      const fecha = new Date(y, m - 1, d);
      const hoy   = new Date(); hoy.setHours(0,0,0,0);
      const ayer  = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
      if (fecha.getTime() === hoy.getTime())  return 'Hoy · ' + fecha.toLocaleDateString('es-MX', { day:'2-digit', month:'long' });
      if (fecha.getTime() === ayer.getTime()) return 'Ayer · ' + fecha.toLocaleDateString('es-MX', { day:'2-digit', month:'long' });
      return fecha.toLocaleDateString('es-MX', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
    } catch(e) { return iso; }
  }

  function mostrarNotif(msg, tipo = 'info') {
    const colores = { exito:'#00c853', error:'#ef4444', info:'#0288d1' };
    const n = document.createElement('div');
    n.style.cssText = `position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(12px);
      background:${colores[tipo]||colores.info};color:white;padding:10px 20px;border-radius:20px;
      font-size:.85rem;font-weight:600;z-index:9999;opacity:0;transition:all .25s;
      box-shadow:0 4px 16px rgba(0,0,0,.2);font-family:'Poppins',sans-serif;white-space:nowrap`;
    n.textContent = msg;
    document.body.appendChild(n);
    requestAnimationFrame(() => {
      n.style.opacity = '1'; n.style.transform = 'translateX(-50%) translateY(0)';
    });
    setTimeout(() => {
      n.style.opacity = '0';
      setTimeout(() => n.remove(), 300);
    }, 3000);
  }

  arrancar();
})();