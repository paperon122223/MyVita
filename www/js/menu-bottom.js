// ========================================
// MENÚ INFERIOR ESTILO INSTAGRAM - MYVITA
// ========================================

(function() {
  'use strict';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    hideOldMenu();
    createBottomMenu();
    markActivePage();
  }

  function hideOldMenu() {
    const oldMenu = document.getElementById('globalMenuShell');
    if (oldMenu) oldMenu.style.display = 'none';
  }

  function createBottomMenu() {
    if (document.querySelector('.bottom-menu')) return;

    const menu = document.createElement('div');
    menu.className = 'bottom-menu';
    menu.innerHTML = `
      <nav>
        <a href="home.html" class="bottom-menu-item" data-page="home">
          <span class="material-icons">medication</span>
          <span>Inicio</span>
        </a>
        <a href="chat-ai.html" class="bottom-menu-item" data-page="chat">
          <span class="material-icons">chat</span>
          <span>Asistente</span>
        </a>
        <a href="dashboard.html" class="bottom-menu-item" data-page="dashboard">
          <span class="material-icons">dashboard</span>
          <span>Dashboard</span>
        </a>
        <a href="alarm.html" class="bottom-menu-item" data-page="alarm">
          <span class="material-icons">alarm</span>
          <span>Alarmas</span>
        </a>
        <a href="map.html" class="bottom-menu-item" data-page="map">
          <span class="material-icons">map</span>
          <span>Mapa</span>
        </a>
        <a href="settings.html" class="bottom-menu-item" data-page="settings">
          <span class="material-icons">settings</span>
          <span>Ajustes</span>
        </a>
      </nav>
    `;

    // Insertar en <html> para escapar overflow:hidden del body
    document.documentElement.appendChild(menu);

    setupNavigation();
    markActivePage();
  }

  function markActivePage() {
    const currentPage = window.location.pathname.split('/').pop() || 'home.html';
    document.querySelectorAll('.bottom-menu-item').forEach(item => item.classList.remove('active'));

    const pageMap = {
      'home.html': 'home', 'main.html': 'home',
      'chat-ai.html': 'chat',
      'dashboard.html': 'dashboard',
      'alarm.html': 'alarm',
      'map.html': 'map',
      'settings.html': 'settings'
    };

    const activePage = pageMap[currentPage];
    if (activePage) {
      const activeItem = document.querySelector(`[data-page="${activePage}"]`);
      if (activeItem) activeItem.classList.add('active');
    }
  }

  function setupNavigation() {
    document.querySelectorAll('.bottom-menu-item').forEach(item => {
      item.addEventListener('touchstart', function() {
        if (navigator.vibrate) navigator.vibrate(5);
      });
      item.addEventListener('click', function(e) {
        const currentPage = window.location.pathname.split('/').pop();
        const targetPage = this.getAttribute('href').split('/').pop();
        if (currentPage === targetPage) e.preventDefault();
      });
    });
  }

})();