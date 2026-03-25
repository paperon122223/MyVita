// ================================================================
// dashboard.js — Dashboard · MediTime
// Lee estadísticas desde SQLite local (esquema nuevo: alarmas)
// ================================================================

(function () {
  'use strict';

  let weeklyChart = null;
  let userId      = null;

  // ── Inicialización ────────────────────────────────────────────
  async function iniciar() {
    userId = localStorage.getItem('currentUserId');
    if (!userId) { window.location.href = 'index.html'; return; }

    try {
      await window.DB.init();
      console.log('📊 Dashboard iniciado (SQLite)');
      setupGreeting();
      await loadDashboardData();
      setupMonthSelector();
      setInterval(updateTimeBasedData, 60000);
    } catch (err) {
      console.error('Error en dashboard:', err);
    }
  }

  // Cordova: esperar deviceready. Navegador: DOMContentLoaded
  if (window.cordova) {
    document.addEventListener('deviceready', iniciar);
  } else {
    document.addEventListener('DOMContentLoaded', iniciar);
  }

  // ── Saludo ────────────────────────────────────────────────────
  function setupGreeting() {
    const hora     = new Date().getHours();
    const username = localStorage.getItem('currentUserName') || localStorage.getItem('currentUser') || 'Usuario';
    let greeting, subtext;

    if (hora >= 5 && hora < 12)       { greeting = `¡Buenos días, ${username}!`;   subtext = 'Empecemos el día con energía'; }
    else if (hora >= 12 && hora < 19) { greeting = `¡Buenas tardes, ${username}!`; subtext = 'Sigue así, vas muy bien'; }
    else                               { greeting = `¡Buenas noches, ${username}!`; subtext = 'Descansa bien hoy'; }

    setEl('greetingText',    greeting);
    setEl('greetingSubtext', subtext);
  }

  // ── Cargar todo ───────────────────────────────────────────────
  async function loadDashboardData() {
    await Promise.allSettled([
      loadQuickStats(),
      loadWeeklyChart(),
      loadUpcomingAlarms(),
      loadLowStockMeds(),
      loadMonthlySummary(),
      loadAIInsights()
    ]);
    console.log('✅ Dashboard cargado');
  }

  // ── Estadísticas rápidas ──────────────────────────────────────
  async function loadQuickStats() {
    try {
      const [resumen, activeMeds, racha] = await Promise.all([
        window.DB.Stats.getResumenHoy(userId),
        window.DB.Stats.getMedicamentosActivos(userId),
        window.DB.Stats.getRachaDias(userId)
      ]);

      setEl('todayAdherence', resumen.adherencia + '%');
      setEl('activeMeds',     activeMeds);
      setEl('pendingAlarms',  resumen.pendientes);
      setEl('currentStreak',  racha + ' días');

      if (window.BottomNav) window.BottomNav.setPendingAlarmsCount(resumen.pendientes);

      if (racha >= 7) {
        const icon = document.querySelector('.stat-icon.streak');
        if (icon) icon.style.animation = 'pulse 1s ease-in-out infinite';
      }
    } catch (err) {
      console.error('Error estadísticas:', err);
    }
  }

  // ── Gráfica semanal ───────────────────────────────────────────
  async function loadWeeklyChart() {
    try {
      const data = await window.DB.Stats.getSemana(userId);
      renderWeeklyChart(data.labels, { completed: data.tomadas, missed: data.perdidas });
    } catch (err) {
      console.error('Error gráfica:', err);
      renderWeeklyChart(['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'],
        { completed: [0,0,0,0,0,0,0], missed: [0,0,0,0,0,0,0] });
    }
  }

  function renderWeeklyChart(labels, data) {
    const ctx = document.getElementById('weeklyChart');
    if (!ctx) return;
    if (weeklyChart) weeklyChart.destroy();

    const isDark    = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#cbd5e1' : '#666';
    const gridColor = isDark ? '#334155' : '#e0e0e0';

    weeklyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Tomados', data: data.completed,
            backgroundColor: 'rgba(0,200,83,.8)', borderColor: '#00c853',
            borderWidth: 2, borderRadius: 8, borderSkipped: false },
          { label: 'Perdidos', data: data.missed,
            backgroundColor: 'rgba(244,67,54,.8)', borderColor: '#f44336',
            borderWidth: 2, borderRadius: 8, borderSkipped: false }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#1e293b' : 'white',
            titleColor: isDark ? '#f1f5f9' : '#222',
            bodyColor:  isDark ? '#cbd5e1' : '#666',
            borderColor: isDark ? '#334155' : '#e0e0e0',
            borderWidth: 1, padding: 12
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor, font: { size: 11, weight: 600 } } },
          y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, stepSize: 2 } }
        }
      }
    });
  }

  // ── Próximas alarmas ──────────────────────────────────────────
  async function loadUpcomingAlarms() {
    const container = document.getElementById('upcomingAlarms');
    if (!container) return;

    try {
      const alarmasPendientes = await window.DB.Alarmas.getPendientes(userId);
      const ahora = new Date().toTimeString().substring(0, 5);
      const futuras = alarmasPendientes
        .filter(a => a.hora_toma >= ahora)
        .slice(0, 5);

      if (futuras.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <span class="material-icons">done_all</span>
            <p>¡Todo al día!</p>
            <small>No tienes alarmas pendientes</small>
          </div>`;
        return;
      }

      container.innerHTML = futuras.map(a => {
        const nombre  = a.nombre || a.medicamento_nombre || 'Medicamento';
        const [h, m]  = (a.hora_toma || '00:00').split(':').map(Number);
        const ampm    = h >= 12 ? 'PM' : 'AM';
        const horaStr = `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`;
        return `
          <div class="alarm-preview animate-fade-in-up">
            <div class="alarm-time">${horaStr}</div>
            <div class="alarm-details">
              <h4>${nombre}</h4>
              <p>${a.dosis || ''}</p>
            </div>
          </div>`;
      }).join('');

    } catch (err) {
      console.error('Error cargando alarmas:', err);
      container.innerHTML = `<div class="empty-state"><p>No se pudieron cargar las alarmas</p></div>`;
    }
  }

  // ── Stock bajo ────────────────────────────────────────────────
  async function loadLowStockMeds() {
    const container = document.getElementById('lowStockMeds');
    if (!container) return;

    try {
      const bajos = await window.DB.Inventario.getStockBajo(userId);

      if (bajos.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <span class="material-icons">check_circle</span>
            <p>Stock suficiente</p>
            <small>Todos tus medicamentos tienen suficientes dosis</small>
          </div>`;
        return;
      }

      container.innerHTML = bajos.map(item => `
        <div class="stock-item animate-fade-in-up">
          <div class="stock-icon"><span class="material-icons">inventory_2</span></div>
          <div class="stock-details">
            <h4>${item.medicamento_nombre || 'Medicamento'}</h4>
            <p>Quedan ${item.stock_actual} unidades</p>
          </div>
          <div class="stock-badge">${item.stock_actual}</div>
        </div>`).join('');

    } catch (err) {
      console.error('Error stock bajo:', err);
    }
  }

  // ── Resumen mensual ───────────────────────────────────────────
  function setupMonthSelector() {
    const selector = document.getElementById('monthSelector');
    if (!selector) return;
    selector.value = new Date().getMonth();
    selector.addEventListener('change', function () {
      loadMonthlySummary(parseInt(this.value));
    });
  }

  async function loadMonthlySummary(mes = null) {
    if (mes === null) mes = new Date().getMonth();
    const anio = new Date().getFullYear();

    try {
      const data = await window.DB.Stats.getResumenMes(userId, mes, anio);
      setEl('monthCompleted',    data.tomadas);
      setEl('monthMissed',       data.perdidas);
      setEl('monthAdherence',    data.adherencia + '%');
      setEl('monthProgressText', data.adherencia + '% completado');

      const bar = document.getElementById('monthProgress');
      if (bar) setTimeout(() => { bar.style.width = data.adherencia + '%'; }, 100);
    } catch (err) {
      console.error('Error resumen mensual:', err);
    }
  }

  // ── Actualizar periódicamente ─────────────────────────────────
  function updateTimeBasedData() {
    setupGreeting();
    loadUpcomingAlarms();
    loadQuickStats();
  }

  // ── Helper ────────────────────────────────────────────────────
  function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ── Dark mode observer ────────────────────────────────────────
  const observer = new MutationObserver(() => {
    if (!weeklyChart) return;
    const isDark = document.body.classList.contains('dark-mode');
    const tc = isDark ? '#cbd5e1' : '#666';
    const gc = isDark ? '#334155' : '#e0e0e0';
    weeklyChart.options.scales.x.ticks.color = tc;
    weeklyChart.options.scales.y.ticks.color = tc;
    weeklyChart.options.scales.y.grid.color  = gc;
    weeklyChart.update();
  });
  observer.observe(document.body, { attributes: true });

  // ── AI Insights ───────────────────────────────────────────────
  async function loadAIInsights() {
    const container = document.getElementById('aiInsightsContainer');
    if (!container || !window.AiAnalyzer) return;

    try {
      const insights = await window.AiAnalyzer.showSmartNotifications(userId);

      if (insights.length === 0) {
        container.style.display = 'none';
        return;
      }

      container.innerHTML = insights.map(insight => renderAIInsightCard(insight)).join('');
      container.style.display = 'block';

      // Agregar event listeners a los botones
      container.querySelectorAll('.ai-insight-btn').forEach(btn => {
        btn.addEventListener('click', handleAIInsightAction);
      });

    } catch (err) {
      console.error('Error cargando AI insights:', err);
    }
  }

  function renderAIInsightCard(insight) {
    const icons = {
      'advertencia': 'warning',
      'error': 'error',
      'info': 'psychology',
      'exito': 'check_circle'
    };

    const titles = {
      'high_risk': '⚠️ Alerta de Adherencia',
      'medium_risk': '⚡ Advertencia',
      'low_risk': '✅ Todo en orden'
    };

    const cardClass = insight.tipo === 'error' ? 'high-risk' :
                      insight.tipo === 'advertencia' ? 'medium-risk' : 'info';

    let html = `
      <div class="ai-insight-card ${cardClass}">
        <div class="ai-insight-header">
          <div class="ai-insight-icon">
            <span class="material-icons">${icons[insight.tipo] || 'psychology'}</span>
          </div>
          <div class="ai-insight-title">
            <h4>${insight.titulo}</h4>
            <span>Análisis de IA</span>
          </div>
        </div>
        <div class="ai-insight-content">
          ${insight.mensaje}
        </div>`;

    if (insight.accion) {
      html += `
        <div class="ai-insight-actions">
          <button class="ai-insight-btn primary" data-action="${insight.tipo}">
            <span class="material-icons">arrow_forward</span>
            ${insight.accion}
          </button>
        </div>`;
    }

    html += `</div>`;
    return html;
  }

  function handleAIInsightAction(e) {
    const action = e.currentTarget.dataset.action;

    switch (action) {
      case 'error':
        window.location.href = 'chat-ai.html';
        break;
      case 'advertencia':
        window.location.href = 'alarm.html';
        break;
      default:
        window.location.href = 'home.html';
    }
  }

  // ── Exponer API ───────────────────────────────────────────────
  window.Dashboard = { refresh: loadDashboardData, updateStats: loadQuickStats, updateChart: loadWeeklyChart, loadAI: loadAIInsights };

})();