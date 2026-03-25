// ========================================
// SISTEMA DE ANIMACIONES RÁPIDAS
// Versión optimizada para velocidad y respuesta instantánea
// ========================================

(function() {
  'use strict';

  // ========================================
  // CONFIGURACIÓN RÁPIDA
  // ========================================
  const config = {
    observerThreshold: 0.05,  // Más sensible (antes 0.1)
    animationDelay: 30,        // Mucho más rápido (antes 100)
    rippleEnabled: true,
    pageTransitionsEnabled: true,
    staggerDelay: 30           // Delay escalonado reducido (antes 50)
  };

  // ========================================
  // ANIMACIONES AL CARGAR PÁGINA - RÁPIDAS
  // ========================================
  function initPageLoadAnimations() {
    // Animar header inmediatamente
    const header = document.querySelector('.app-header');
    if (header) {
      header.classList.add('animate-fade-in-down');
    }

    // Animar navegación inferior con delay mínimo
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
      setTimeout(() => {
        bottomNav.classList.add('animate-fade-in-up');
      }, 50); // Reducido de 200ms
    }

    // Animar contenido principal con delay escalonado RÁPIDO
    const contentItems = document.querySelectorAll(
      '.prescripcion-item, .alarm-item, .contact-item, .settings-item, .scan-step, .instructions-card, .preview-card'
    );
    
    contentItems.forEach((item, index) => {
      setTimeout(() => {
        item.classList.add('animate-fade-in-up');
      }, index * config.staggerDelay); // 30ms entre cada uno (antes 50ms)
    });

    // Animar botones principales RÁPIDO
    const mainButtons = document.querySelectorAll('.btn-gradient, .btn-primary, .action-btn');
    mainButtons.forEach((btn, index) => {
      setTimeout(() => {
        btn.classList.add('animate-zoom-in');
      }, 100 + (index * 40)); // Reducido (antes 200 + 100)
    });

    // Animar tarjetas INMEDIATAMENTE
    const cards = document.querySelectorAll(
      '.login-card, .preinsc-card, .info-box, .processing-card, .results-card'
    );
    cards.forEach((card, index) => {
      setTimeout(() => {
        card.classList.add('animate-fade-in-up');
      }, 80 + (index * 50)); // Reducido (antes 150 + 100)
    });

    // Animar formularios
    const forms = document.querySelectorAll('form, .form-group');
    forms.forEach((form, index) => {
      setTimeout(() => {
        form.classList.add('animate-fade-in-up', 'delay-' + ((index + 1) * 50));
      }, index * 30); // Muy rápido
    });
  }

  // ========================================
  // EFECTO RIPPLE EN BOTONES - OPTIMIZADO
  // ========================================
  function addRippleEffect() {
    if (!config.rippleEnabled) return;

    const buttons = document.querySelectorAll(
      'button:not(.no-ripple), .btn-gradient, .btn-primary, .btn-secondary, .nav-item, .action-btn'
    );

    buttons.forEach(button => {
      button.classList.add('btn-ripple');
      
      button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.cssText = `
          position: absolute;
          width: ${size}px;
          height: ${size}px;
          top: ${y}px;
          left: ${x}px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 50%;
          pointer-events: none;
          animation: ripple 0.4s ease-out;
        `;

        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);

        setTimeout(() => ripple.remove(), 400); // Reducido de 600ms
      });
    });
  }

  // ========================================
  // ANIMACIONES AL HACER SCROLL - MÁS SENSIBLES
  // ========================================
  function initScrollAnimations() {
    const elementsToAnimate = document.querySelectorAll(
      '.prescripcion-item, .alarm-item, .contact-item, .settings-item, .form-group, .info-box'
    );

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Animación inmediata sin delay
          entry.target.classList.add('scroll-fade-in', 'visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: config.observerThreshold, // 0.05 = más sensible
      rootMargin: '0px 0px -30px 0px' // Reducido de -50px
    });

    elementsToAnimate.forEach(el => {
      el.classList.add('scroll-fade-in');
      observer.observe(el);
    });
  }

  // ========================================
  // MICROINTERACCIONES EN TARJETAS - INSTANTÁNEAS
  // ========================================
  function enhanceCards() {
    const cards = document.querySelectorAll(
      '.prescripcion-item, .alarm-item, .contact-item, .settings-item, .card-hover'
    );

    cards.forEach(card => {
      card.classList.add('card-hover', 'transition-fast');

      // Efecto de presionado instantáneo
      card.addEventListener('mousedown', function() {
        this.style.transform = 'scale(0.98)';
        this.style.transition = 'transform 0.1s';
      });

      card.addEventListener('mouseup', function() {
        this.style.transform = '';
      });

      card.addEventListener('mouseleave', function() {
        this.style.transform = '';
      });

      // Touch events para móvil
      card.addEventListener('touchstart', function() {
        this.style.transform = 'scale(0.98)';
      });

      card.addEventListener('touchend', function() {
        this.style.transform = '';
      });
    });
  }

  // ========================================
  // MICROINTERACCIONES EN INPUTS - RÁPIDAS
  // ========================================
  function enhanceInputs() {
    const inputs = document.querySelectorAll(
      'input:not([type="checkbox"]):not([type="radio"]), textarea, select'
    );

    inputs.forEach(input => {
      input.classList.add('input-focus', 'transition-fast');

      // Animación al enfocar - INSTANTÁNEA
      input.addEventListener('focus', function() {
        this.parentElement?.classList.add('input-focused');
        
        // Sin animación de pulso para ser más rápido
        // Pero agregar clase para estilos CSS
      });

      input.addEventListener('blur', function() {
        this.parentElement?.classList.remove('input-focused');
      });

      // Validación visual RÁPIDA
      input.addEventListener('invalid', function() {
        this.classList.add('animate-shake');
        setTimeout(() => {
          this.classList.remove('animate-shake');
        }, 300); // Reducido de 500ms
      });
    });
  }

  // ========================================
  // ANIMACIONES EN BOTONES - OPTIMIZADAS
  // ========================================
  function enhanceButtons() {
    const buttons = document.querySelectorAll(
      'button, .btn-gradient, .btn-primary, .btn-secondary, .action-btn'
    );

    buttons.forEach(button => {
      button.classList.add('btn-lift', 'transition-fast');

      // Feedback táctil (vibración)
      button.addEventListener('click', function() {
        if (navigator.vibrate) {
          navigator.vibrate(5); // Reducido de 10ms
        }

        // Sin animación extra para ser más rápido
        // El ripple es suficiente
      });
    });
  }

  // ========================================
  // ANIMACIÓN DE NOTIFICACIONES - RÁPIDA
  // ========================================
  function enhanceNotifications() {
    const notifContainer = document.getElementById('notificaciones-container');
    if (!notifContainer) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.classList.contains('notificacion')) {
            node.classList.add('notification-enter');
            
            // Vibración al mostrar notificación
            if (navigator.vibrate) {
              const tipo = node.className.includes('exito') ? [5, 30, 5] :
                          node.className.includes('error') ? [30, 30, 30] :
                          [10]; // Reducidos
              navigator.vibrate(tipo);
            }
          }
        });
      });
    });

    observer.observe(notifContainer, { childList: true });
  }

  // ========================================
  // SKELETON LOADER - RÁPIDO
  // ========================================
  function showSkeletonLoader(container, count = 3) {
    const skeletonHTML = `
      <div class="skeleton-item" style="margin-bottom: 12px;">
        <div class="skeleton skeleton-avatar" style="float: left; margin-right: 10px;"></div>
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text" style="width: 80%;"></div>
      </div>
    `;

    const skeletons = Array(count).fill(skeletonHTML).join('');
    container.innerHTML = skeletons;

    // Remover skeleton más rápido
    setTimeout(() => {
      container.querySelectorAll('.skeleton-item').forEach((item, index) => {
        setTimeout(() => {
          item.classList.add('animate-fade-out');
          setTimeout(() => item.remove(), 150); // Reducido de 300ms
        }, index * 50); // Reducido de 100ms
      });
    }, 800); // Reducido de 1500ms
  }

  // ========================================
  // CONFETTI - MÁS RÁPIDO
  // ========================================
  function showConfetti() {
    const colors = ['#00c853', '#0288d1', '#ffd700', '#ff6b6b', '#4ecdc4'];
    const confettiCount = 40; // Reducido de 50

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.style.cssText = `
        position: fixed;
        top: -10px;
        left: ${Math.random() * 100}%;
        width: 8px;
        height: 8px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        animation: confetti-fall ${1.5 + Math.random() * 1}s linear forwards;
        z-index: 10000;
        pointer-events: none;
      `;
      document.body.appendChild(confetti);

      setTimeout(() => confetti.remove(), 2500); // Reducido de 4000ms
    }

    // Vibración de celebración
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50, 30, 100]); // Más corta
    }
  }

  // ========================================
  // ANIMACIÓN DE ÉXITO - RÁPIDA
  // ========================================
  function showSuccessAnimation(callback) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease-out;
    `;

    const successIcon = document.createElement('div');
    successIcon.className = 'success-checkmark';
    successIcon.innerHTML = `
      <div class="check-icon">
        <span class="icon-line line-tip" style="
          position: absolute;
          height: 5px;
          background-color: #00c853;
          display: block;
          border-radius: 2px;
          top: 46px;
          left: 14px;
          width: 25px;
          transform: rotate(45deg);
          animation: drawCheck 0.2s 0.15s ease-out forwards;
          opacity: 0;
        "></span>
        <span class="icon-line line-long" style="
          position: absolute;
          height: 5px;
          background-color: #00c853;
          display: block;
          border-radius: 2px;
          top: 38px;
          right: 8px;
          width: 47px;
          transform: rotate(-45deg);
          animation: drawCheck 0.3s 0.25s ease-out forwards;
          opacity: 0;
        "></span>
      </div>
    `;

    overlay.appendChild(successIcon);
    document.body.appendChild(overlay);

    // Vibración de éxito
    if (navigator.vibrate) {
      navigator.vibrate([30, 50, 30]); // Reducido
    }

    setTimeout(() => {
      overlay.classList.add('animate-fade-out');
      setTimeout(() => {
        overlay.remove();
        if (callback) callback();
      }, 150); // Reducido de 300ms
    }, 800); // Reducido de 1500ms
  }

  // ========================================
  // LOADING DOTS - RÁPIDO
  // ========================================
  function showLoadingDots(container) {
    container.innerHTML = `
      <div class="loading-dots" style="justify-content: center; padding: 15px;">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
  }

  // ========================================
  // TRANSICIONES ENTRE PÁGINAS - RÁPIDAS
  // ========================================
  function initPageTransitions() {
    if (!config.pageTransitionsEnabled) return;

    document.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        
        if (href && !href.startsWith('http') && !href.startsWith('#') && !href.includes('javascript:')) {
          e.preventDefault();
          
          document.body.style.opacity = '0';
          document.body.style.transition = 'opacity 0.15s ease-out';
          
          setTimeout(() => {
            window.location.href = href;
          }, 150); // Reducido de 300ms
        }
      });
    });
  }

  // ========================================
  // FLOATING ACTION BUTTON
  // ========================================
  function enhanceFAB() {
    const fab = document.querySelector('.fab, #btnAgregarPrescripcion, #btnEscanearReceta');
    if (fab) {
      fab.classList.add('animate-floating');
      
      fab.addEventListener('mouseenter', function() {
        this.style.animation = 'pulse 0.4s ease-out'; // Reducido
      });
      
      fab.addEventListener('mouseleave', function() {
        this.style.animation = 'floating 2s ease-in-out infinite';
      });
    }
  }

  // ========================================
  // INICIALIZACIÓN INMEDIATA
  // ========================================
  function init() {
    console.log('⚡ Inicializando animaciones rápidas...');

    // Ejecutar inmediatamente sin esperar
    requestAnimationFrame(() => {
      initPageLoadAnimations();
      addRippleEffect();
      enhanceCards();
      enhanceInputs();
      enhanceButtons();
      enhanceNotifications();
      enhanceFAB();
    });

    // Scroll animations con IntersectionObserver (más eficiente)
    if ('IntersectionObserver' in window) {
      initScrollAnimations();
    }

    // Transiciones de página
    if (config.pageTransitionsEnabled) {
      initPageTransitions();
    }

    console.log('✨ ¡Sistema de animaciones listo!');
  }

  // ========================================
  // EXPORTAR FUNCIONES GLOBALES
  // ========================================
  window.AnimationSystem = {
    showConfetti,
    showSuccessAnimation,
    showLoadingDots,
    showSkeletonLoader
  };

  // Auto-inicializar INMEDIATAMENTE
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();