// ========================================
// SISTEMA DE MODO OSCURO UNIVERSAL
// Este archivo debe cargarse en TODAS las páginas
// ========================================

(function() {
  'use strict';

  // ========================================
  // APLICAR MODO OSCURO AL CARGAR LA PÁGINA
  // ========================================
  function applyDarkMode() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    document.body.classList.toggle('dark-mode', isDark);
    return isDark;
  }

  // ========================================
  // INICIALIZAR TOGGLE DEL MODO OSCURO
  // ========================================
  function initializeDarkModeToggle() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    if (!darkModeToggle) {
      // Si no hay toggle en esta página, solo aplicar el modo
      return;
    }

    // Obtener estado guardado
    const isDark = localStorage.getItem('darkMode') === 'true';
    
    // Sincronizar checkbox con el estado guardado
    darkModeToggle.checked = isDark;
    
    // Escuchar cambios en el toggle
    darkModeToggle.addEventListener('change', function() {
      const enabled = this.checked;
      
      // Guardar en localStorage
      localStorage.setItem('darkMode', enabled);
      
      // Aplicar inmediatamente
      document.body.classList.toggle('dark-mode', enabled);
      
      // Log para debug
      console.log('Modo oscuro:', enabled ? 'activado' : 'desactivado');
    });
  }

  // ========================================
  // EJECUTAR AL CARGAR EL DOM
  // ========================================
  if (document.readyState === 'loading') {
    // DOM aún no está listo, esperar
    document.addEventListener('DOMContentLoaded', function() {
      applyDarkMode();
      initializeDarkModeToggle();
    });
  } else {
    // DOM ya está listo, ejecutar inmediatamente
    applyDarkMode();
    initializeDarkModeToggle();
  }

})();