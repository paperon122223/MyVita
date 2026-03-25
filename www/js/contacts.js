// Código de país (México)
const COUNTRY_CODE = '52';

// NOTA: mostrarNotificacion y cerrarNotificacion están en utils.js

// ========== INICIALIZACIÓN ==========
document.addEventListener('deviceready', function() {
  if (window.cordova && window.cordova.plugins && window.cordova.plugins.permissions) {
    const permissions = cordova.plugins.permissions;
    permissions.requestPermission(permissions.READ_CONTACTS, function(status) {
      if (status.hasPermission) {
        loadContacts();
      } else {
        mostrarNotificacion('No pudimos acceder a tus contactos. Revisa los permisos en ajustes.', 'advertencia', 5000);
      }
    }, function() {
      mostrarNotificacion('Hubo un problema al solicitar permisos.', 'error');
    });
  } else {
    loadContacts();
  }

  setupEventListeners();
  setupNavigationActive();
});

// ========== CONFIGURAR EVENT LISTENERS ==========
function setupEventListeners() {
  // Botón de enviar mensaje a seleccionados
  const sendBtn = document.getElementById('sendSelectedMessage');
  if (sendBtn) {
    sendBtn.addEventListener('click', sendSelectedHelpMessages);
  }

  // Búsqueda de contactos
  const searchInput = document.getElementById('searchContact');
  if (searchInput) {
    searchInput.addEventListener('input', filtrarContactos);
  }

  // Botón de agregar contacto
  const addBtn = document.getElementById('addContact');
  if (addBtn) {
    addBtn.addEventListener('click', function() {
      mostrarNotificacion('Funcionalidad de agregar contacto próximamente', 'info');
    });
  }
}

// ========== MARCAR NAVEGACIÓN ACTIVA ==========
function setupNavigationActive() {
  const currentPath = window.location.pathname.split('/').pop();
  
  // Remover clase active de todos
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Agregar active al actual
  const pageMap = {
    'main.html': '[href="main.html"]',
    'alarm.html': '[href="alarm.html"]',
    'contacts.html': '[href="contacts.html"]',
    'map.html': '[href="map.html"]',
    'settings.html': '[href="settings.html"]'
  };
  
  const selector = pageMap[currentPath];
  if (selector) {
    const activeItem = document.querySelector(selector);
    if (activeItem) {
      activeItem.classList.add('active');
    }
  }
}

// ========== FILTRAR CONTACTOS ==========
function filtrarContactos() {
  const searchTerm = document.getElementById('searchContact')?.value.toLowerCase() || '';
  const contacts = document.querySelectorAll('.contact-item');
  const emptyState = document.getElementById('emptyState');
  let visibleCount = 0;

  contacts.forEach(contact => {
    const nombre = contact.getAttribute('data-name')?.toLowerCase() || '';
    const phoneElements = contact.querySelectorAll('.contact-phone');
    let phoneText = '';
    
    phoneElements.forEach(el => {
      phoneText += el.textContent.toLowerCase() + ' ';
    });

    if (nombre.includes(searchTerm) || phoneText.includes(searchTerm)) {
      contact.style.display = '';
      visibleCount++;
    } else {
      contact.style.display = 'none';
    }
  });

  // Mostrar/ocultar estado vacío
  if (visibleCount === 0 && searchTerm && contacts.length > 0) {
    emptyState.style.display = 'block';
    emptyState.querySelector('h3').textContent = 'Sin resultados';
    emptyState.querySelector('p').textContent = 'No se encontraron contactos';
  } else if (contacts.length === 0) {
    emptyState.style.display = 'block';
    emptyState.querySelector('h3').textContent = 'Sin contactos';
    emptyState.querySelector('p').textContent = 'Agrega tus contactos de emergencia';
  } else {
    emptyState.style.display = 'none';
  }
}

// ========== CARGAR CONTACTOS ==========
function loadContacts() {
  const contactsList = document.getElementById('contactsList');
  if (!contactsList) return;

  const options = new ContactFindOptions();
  options.filter = "";
  options.multiple = true;
  const fields = ["displayName", "name", "id", "phoneNumbers"];

  navigator.contacts.find(
    fields,
    function(contacts) {
      contactsList.innerHTML = "";

      if (!contacts || contacts.length === 0) {
        contactsList.innerHTML = `<li class="contact-item no-contacts-message">No se encontraron contactos en tu dispositivo.</li>`;
        return;
      }

      const validContacts = contacts.filter(
        c => (c.displayName || c.name?.formatted) &&
             Array.isArray(c.phoneNumbers) &&
             c.phoneNumbers.length > 0
      );

      validContacts.sort((a, b) => {
        const nameA = (a.displayName || a.name?.formatted || "").toLowerCase();
        const nameB = (b.displayName || b.name?.formatted || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });

      if (validContacts.length === 0) {
        contactsList.innerHTML = `<li class="contact-item no-contacts-message">No hay contactos con números de teléfono.</li>`;
        return;
      }

      for (const contact of validContacts) {
        const name = contact.displayName || contact.name?.formatted || "Sin nombre";
        const avatarLetter = name.trim()[0]?.toUpperCase() || "?";
        
        const numbersHtml = contact.phoneNumbers.map(pn => {
          const cleanPhone = limpiarNumero(pn.value);
          return `
            <div class="contact-phone-option">
              <label>
                <input type="checkbox" class="contact-checkbox" value="${cleanPhone}" data-name="${name}">
                <span class="contact-phone">${pn.value}</span>
              </label>
              <button class="contact-message-btn" data-phone="${cleanPhone}" title="Enviar mensaje de emergencia">
                <i class="fab fa-whatsapp"></i>
              </button>
            </div>
          `;
        }).join('');

        const li = document.createElement("li");
        li.className = "contact-item";
        li.setAttribute("data-name", name);
        li.innerHTML = `
          <div class="contact-avatar">${avatarLetter}</div>
          <div class="contact-info">
            <span class="contact-name">${name}</span>
            <div class="contact-phones">${numbersHtml}</div>
          </div>
        `;
        contactsList.appendChild(li);
      }

      // Eventos para botones de WhatsApp
      contactsList.querySelectorAll('.contact-message-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          sendHelpMessage(e.currentTarget.getAttribute('data-phone'));
        });
      });

      // Eventos para checkboxes (marcar visualmente)
      contactsList.querySelectorAll('.contact-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
          const contactItem = this.closest('.contact-item');
          if (this.checked) {
            contactItem.classList.add('selected');
          } else {
            contactItem.classList.remove('selected');
          }
        });
      });
    },
    function(error) {
      console.error("Error al cargar contactos:", error);
      contactsList.innerHTML = `<li class="contact-item no-contacts-message">No pudimos cargar tus contactos. ¿Podrías intentarlo de nuevo?</li>`;
    },
    options
  );
}

// ========== LIMPIAR NÚMERO PARA WHATSAPP ==========
function limpiarNumero(phone) {
  let numero = phone.replace(/[^\d]/g, '');
  
  if (numero.length === 12 && numero.startsWith(COUNTRY_CODE)) {
    return numero;
  }
  if (numero.length === 13 && numero.startsWith(COUNTRY_CODE + '1')) {
    return COUNTRY_CODE + numero.substring(3);
  }
  if (numero.length === 11 && numero.startsWith('1')) {
    return COUNTRY_CODE + numero.substring(1);
  }
  if (numero.length === 10) {
    return COUNTRY_CODE + numero;
  }
  
  return numero;
}

// ========== ENVIAR MENSAJE DE EMERGENCIA ==========
function sendHelpMessage(phone) {
  if (!phone || phone.length < 10) {
    mostrarNotificacion('Número no válido para WhatsApp.', 'advertencia');
    return;
  }
  
  const helpText = encodeURIComponent("Hola, necesito ayuda. Es una emergencia. Por favor comunícate conmigo lo antes posible.");
  const url = `https://wa.me/${phone}?text=${helpText}`;
  
  window.open(url, '_system');
}

// ========== ENVIAR A SELECCIONADOS ==========
function sendSelectedHelpMessages() {
  const checkboxes = document.querySelectorAll('.contact-checkbox:checked');
  
  if (checkboxes.length === 0) {
    mostrarNotificacion('Por favor, selecciona al menos un contacto para enviar el mensaje.', 'advertencia');
    return;
  }
  
  const helpText = encodeURIComponent("Hola, necesito ayuda. Es una emergencia. Por favor comunícate conmigo lo antes posible.");
  
  checkboxes.forEach(cb => {
    const url = `https://wa.me/${cb.value}?text=${helpText}`;
    window.open(url, '_system');
  });
  
  mostrarNotificacion(`Mensaje de emergencia enviado a ${checkboxes.length} contacto(s).`, 'exito');
}