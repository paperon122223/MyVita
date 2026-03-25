// ========================================
// MAPA CON MAPTILER - 100% GRATIS
// Sin necesidad de tarjeta de crédito
// ========================================

// ========================================
// CONFIGURACIÓN DE MAPTILER
// ========================================
const MAPTILER_CONFIG = {
  // API Key de MapTiler configurada
  apiKey: 'J66k5T4kfjaEkbj4dTRF', // ✅ API KEY CONFIGURADA
  
  // Estilos disponibles (todos gratis):
  styles: {
    streets: 'streets-v2',           // Moderno tipo Google Maps
    basic: 'basic-v2',               // Minimalista y limpio
    bright: 'bright-v2',             // Colores vibrantes
    pastel: 'pastel',                // Suave y elegante
    topo: 'topo-v2',                 // Topográfico
    outdoor: 'outdoor-v2',           // Para exteriores
    winter: 'winter-v2',             // Tema invernal
    satellite: 'satellite'           // Vista satelital
  },
  
  // Estilo por defecto
  defaultStyle: 'streets',
  
  // Centro inicial
  center: [0, 0],
  zoom: 14
};

// ========================================
// VARIABLES GLOBALES
// ========================================
let map = null;
let userMarker = null;
let poiMarkers = [];

// ========================================
// INICIALIZACIÓN
// ========================================
document.addEventListener("deviceready", function() {
  initializeMapTiler();
  setupNavigationActive();
  setupBackButton();
  setupStyleSelector();
}, false);

// ========================================
// INICIALIZAR MAPTILER
// ========================================
function initializeMapTiler() {
  console.log('🗺️ Inicializando MapTiler...');
  
  // Verificar API key
  if (!MAPTILER_CONFIG.apiKey) {
    console.error('❌ FALTA API KEY DE MAPTILER');
    alert('Por favor configura tu API key de MapTiler en map.js');
    return;
  }
  
  // Crear mapa con Leaflet + MapTiler
  map = L.map('map', {
    center: MAPTILER_CONFIG.center,
    zoom: MAPTILER_CONFIG.zoom,
    zoomControl: false // Lo agregamos personalizado después
  });
  
  // Agregar capa de MapTiler
  loadMapTilerStyle(MAPTILER_CONFIG.defaultStyle);
  
  // Agregar controles personalizados
  L.control.zoom({
    position: 'topright'
  }).addTo(map);
  
  // Obtener ubicación del usuario
  getUserLocation();
  
  console.log('✅ Mapa inicializado');
}

// ========================================
// CARGAR ESTILO DE MAPTILER
// ========================================
function loadMapTilerStyle(styleName) {
  const style = MAPTILER_CONFIG.styles[styleName] || MAPTILER_CONFIG.styles.streets;
  
  // Remover capas anteriores si existen
  map.eachLayer(function(layer) {
    if (layer instanceof L.TileLayer) {
      map.removeLayer(layer);
    }
  });
  
  // Agregar nueva capa
  L.tileLayer(
    `https://api.maptiler.com/maps/${style}/{z}/{x}/{y}.png?key=${MAPTILER_CONFIG.apiKey}`,
    {
      tileSize: 512,
      zoomOffset: -1,
      minZoom: 1,
      maxZoom: 20,
      attribution: '© MapTiler © OpenStreetMap contributors',
      crossOrigin: true
    }
  ).addTo(map);
  
  console.log('🎨 Estilo cargado:', styleName);
}

// ========================================
// OBTENER UBICACIÓN DEL USUARIO
// ========================================
function getUserLocation() {
  const statusElem = document.getElementById('status');
  
  if (statusElem) {
    statusElem.textContent = "Obteniendo tu ubicación...";
    statusElem.className = 'status-message status-searching';
  }
  
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      onLocationSuccess,
      onLocationError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  } else {
    onLocationError({ message: "Geolocalización no soportada" });
  }
}

// ========================================
// ÉXITO AL OBTENER UBICACIÓN
// ========================================
function onLocationSuccess(position) {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  
  console.log('📍 Ubicación obtenida:', lat, lng);
  
  // Actualizar coordenadas en UI
  updateCoordinates(lat, lng);
  
  // Centrar mapa
  map.setView([lat, lng], 14);
  
  // Agregar marcador de usuario
  addUserMarker(lat, lng);
  
  // Buscar POIs cercanos
  findNearbyPOIs(lat, lng);
  
  // Actualizar estado
  const statusElem = document.getElementById('status');
  if (statusElem) {
    statusElem.textContent = "Ubicación obtenida correctamente";
    statusElem.className = 'status-message status-success';
  }
}

// ========================================
// ERROR AL OBTENER UBICACIÓN
// ========================================
function onLocationError(error) {
  console.error('❌ Error de ubicación:', error);
  
  const statusElem = document.getElementById('status');
  if (statusElem) {
    statusElem.textContent = "No se pudo obtener ubicación. Mostrando ejemplo...";
    statusElem.className = 'status-message status-error';
  }
  
  // Ubicación por defecto (Centro de México)
  const defaultLat = 25.6866;
  const defaultLng = -100.3161;
  
  updateCoordinates(defaultLat, defaultLng);
  map.setView([defaultLat, defaultLng], 14);
  addUserMarker(defaultLat, defaultLng, true);
  findNearbyPOIs(defaultLat, defaultLng);
}

// ========================================
// ACTUALIZAR COORDENADAS
// ========================================
function updateCoordinates(lat, lng) {
  const latElem = document.getElementById('lat');
  const lngElem = document.getElementById('lng');
  
  if (latElem) latElem.textContent = lat.toFixed(6);
  if (lngElem) lngElem.textContent = lng.toFixed(6);
}

// ========================================
// AGREGAR MARCADOR DE USUARIO
// ========================================
function addUserMarker(lat, lng, isDefault = false) {
  // Remover marcador anterior
  if (userMarker) {
    map.removeLayer(userMarker);
  }
  
  // Crear ícono personalizado con HTML
  const userIcon = L.divIcon({
    className: 'user-marker',
    html: `
      <div class="user-marker-content">
        <div class="user-marker-pulse"></div>
        <div class="user-marker-dot"></div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
  
  // Crear marcador
  userMarker = L.marker([lat, lng], { icon: userIcon })
    .addTo(map)
    .bindPopup(`
      <div class="marker-popup">
        <h3>${isDefault ? '📍 Ubicación de ejemplo' : '📍 Tu ubicación'}</h3>
        <p>Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</p>
      </div>
    `)
    .openPopup();
}

// ========================================
// BUSCAR POIs CERCANOS (MEJORADO)
// ========================================
function findNearbyPOIs(lat, lng) {
  const statusElem = document.getElementById('status');
  
  if (statusElem) {
    statusElem.innerHTML = '<span class="material-icons" style="font-size: 16px; vertical-align: middle; animation: spin 1s linear infinite;">sync</span> Buscando lugares cercanos...';
    statusElem.className = 'status-message status-searching';
  }
  
  // Limpiar marcadores anteriores
  clearPOIMarkers();
  
  // Buscar en múltiples fuentes para mayor precisión
  Promise.all([
    searchOverpassAPI(lat, lng),
    searchNominatimAPI(lat, lng)
  ]).then(results => {
    // Combinar resultados de ambas fuentes
    const allPOIs = [...results[0], ...results[1]];
    
    // Eliminar duplicados basados en coordenadas cercanas
    const uniquePOIs = removeDuplicates(allPOIs);
    
    console.log('📍 Total POIs únicos encontrados:', uniquePOIs.length);
    
    if (uniquePOIs.length > 0) {
      uniquePOIs.forEach(poi => addPOIMarker(poi));
      
      if (statusElem) {
        statusElem.innerHTML = `✅ ${uniquePOIs.length} lugares encontrados`;
        statusElem.className = 'status-message status-success';
      }
    } else {
      if (statusElem) {
        statusElem.innerHTML = '⚠️ No se encontraron lugares. Mostrando ejemplos...';
        statusElem.className = 'status-message status-error';
      }
      showExamplePOIs(lat, lng);
    }
  }).catch(error => {
    console.error('❌ Error en búsqueda:', error);
    
    if (statusElem) {
      statusElem.innerHTML = '❌ Error al buscar. Mostrando ejemplos...';
      statusElem.className = 'status-message status-error';
    }
    
    showExamplePOIs(lat, lng);
  });
}

// ========================================
// BUSCAR EN OVERPASS API
// ========================================
function searchOverpassAPI(lat, lng) {
  return new Promise((resolve) => {
    // Radio ampliado a 10km para más resultados
    const radius = 10000;
    
    // Query mejorada con más tipos de establecimientos
    const query = `[out:json][timeout:25];
      (
        node["amenity"~"hospital|clinic|doctors|pharmacy|dentist|health_centre"](around:${radius},${lat},${lng});
        way["amenity"~"hospital|clinic|doctors|pharmacy|dentist|health_centre"](around:${radius},${lat},${lng});
        node["healthcare"](around:${radius},${lat},${lng});
        way["healthcare"](around:${radius},${lat},${lng});
      );
      out center 100;
    `;
    
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    
    fetch(url, { timeout: 10000 })
      .then(response => response.json())
      .then(data => {
        console.log('🔵 Overpass API:', data.elements ? data.elements.length : 0, 'resultados');
        resolve(data.elements || []);
      })
      .catch(error => {
        console.warn('⚠️ Overpass API falló:', error);
        resolve([]);
      });
  });
}

// ========================================
// BUSCAR EN NOMINATIM (ALTERNATIVA)
// ========================================
function searchNominatimAPI(lat, lng) {
  return new Promise((resolve) => {
    const searches = [
      'hospital',
      'pharmacy',
      'clinic',
      'medical center',
      'health clinic'
    ];
    
    const promises = searches.map(term => {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(term)}&lat=${lat}&lon=${lng}&bounded=1&viewbox=${lng-0.1},${lat-0.1},${lng+0.1},${lat+0.1}&limit=10`;
      
      return fetch(url, {
        headers: {
          'User-Agent': 'MyVita Medical App'
        }
      })
        .then(response => response.json())
        .then(data => {
          return data.map(place => ({
            type: 'node',
            lat: parseFloat(place.lat),
            lon: parseFloat(place.lon),
            tags: {
              name: place.display_name.split(',')[0],
              amenity: determineAmenityType(place.type, place.class),
              'addr:street': place.display_name
            }
          }));
        })
        .catch(() => []);
    });
    
    Promise.all(promises)
      .then(results => {
        const allResults = results.flat();
        console.log('🟢 Nominatim API:', allResults.length, 'resultados');
        resolve(allResults);
      })
      .catch(() => resolve([]));
  });
}

// ========================================
// DETERMINAR TIPO DE AMENITY
// ========================================
function determineAmenityType(type, classType) {
  const lowerType = (type + ' ' + classType).toLowerCase();
  
  if (lowerType.includes('hospital')) return 'hospital';
  if (lowerType.includes('pharmacy') || lowerType.includes('farmacia')) return 'pharmacy';
  if (lowerType.includes('clinic') || lowerType.includes('health')) return 'clinic';
  if (lowerType.includes('dentist')) return 'clinic';
  if (lowerType.includes('doctor')) return 'doctors';
  
  return 'clinic';
}

// ========================================
// ELIMINAR DUPLICADOS
// ========================================
function removeDuplicates(pois) {
  const unique = [];
  const threshold = 0.0005; // ~50 metros
  
  pois.forEach(poi => {
    let poiLat, poiLng;
    
    if (poi.type === 'node') {
      poiLat = poi.lat;
      poiLng = poi.lon;
    } else if (poi.center) {
      poiLat = poi.center.lat;
      poiLng = poi.center.lon;
    } else {
      return;
    }
    
    // Verificar si ya existe un POI muy cercano
    const isDuplicate = unique.some(existingPoi => {
      let existingLat, existingLng;
      
      if (existingPoi.type === 'node') {
        existingLat = existingPoi.lat;
        existingLng = existingPoi.lon;
      } else if (existingPoi.center) {
        existingLat = existingPoi.center.lat;
        existingLng = existingPoi.center.lon;
      } else {
        return false;
      }
      
      const distance = Math.sqrt(
        Math.pow(poiLat - existingLat, 2) + 
        Math.pow(poiLng - existingLng, 2)
      );
      
      return distance < threshold;
    });
    
    if (!isDuplicate) {
      unique.push(poi);
    }
  });
  
  return unique;
}

// ========================================
// AGREGAR MARCADOR DE POI
// ========================================
function addPOIMarker(poi) {
  // Obtener coordenadas
  let lat, lng;
  if (poi.type === 'node') {
    lat = poi.lat;
    lng = poi.lon;
  } else if (poi.center) {
    lat = poi.center.lat;
    lng = poi.center.lon;
  } else {
    return;
  }
  
  // Determinar tipo y color
  const amenity = poi.tags.amenity;
  let color, emoji, type;
  
  switch(amenity) {
    case 'hospital':
      color = '#e74c3c';
      emoji = '🏥';
      type = 'Hospital';
      break;
    case 'pharmacy':
      color = '#27ae60';
      emoji = '💊';
      type = 'Farmacia';
      break;
    case 'clinic':
    case 'doctors':
      color = '#3498db';
      emoji = '🏥';
      type = 'Clínica';
      break;
    default:
      color = '#95a5a6';
      emoji = '📍';
      type = 'Centro médico';
  }
  
  // Crear ícono
  const poiIcon = L.divIcon({
    className: 'poi-marker',
    html: `<div style="background-color: ${color};">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36]
  });
  
  // Crear marcador
  const marker = L.marker([lat, lng], { icon: poiIcon })
    .addTo(map)
    .bindPopup(`
      <div class="marker-popup">
        <h3>${poi.tags.name || type}</h3>
        <p><strong>Tipo:</strong> ${type}</p>
        ${poi.tags['addr:street'] ? `<p>📍 ${poi.tags['addr:street']} ${poi.tags['addr:housenumber'] || ''}</p>` : ''}
        ${poi.tags.phone ? `<p>📞 ${poi.tags.phone}</p>` : ''}
        ${poi.tags.website ? `<p><a href="${poi.tags.website}" target="_blank">🌐 Sitio web</a></p>` : ''}
      </div>
    `);
  
  poiMarkers.push(marker);
}

// ========================================
// MOSTRAR POIs DE EJEMPLO
// ========================================
function showExamplePOIs(lat, lng) {
  const examples = [
    {
      type: 'node',
      lat: lat + 0.01,
      lon: lng + 0.01,
      tags: { amenity: 'hospital', name: 'Hospital General (Ejemplo)' }
    },
    {
      type: 'node',
      lat: lat + 0.005,
      lon: lng - 0.005,
      tags: { amenity: 'pharmacy', name: 'Farmacia Central (Ejemplo)' }
    },
    {
      type: 'node',
      lat: lat - 0.01,
      lon: lng + 0.005,
      tags: { amenity: 'clinic', name: 'Centro de Salud (Ejemplo)' }
    }
  ];
  
  examples.forEach(poi => addPOIMarker(poi));
}

// ========================================
// LIMPIAR MARCADORES
// ========================================
function clearPOIMarkers() {
  poiMarkers.forEach(marker => map.removeLayer(marker));
  poiMarkers = [];
}

// ========================================
// SELECTOR DE ESTILO
// ========================================
function setupStyleSelector() {
  // Crear botón
  const styleBtn = document.createElement('button');
  styleBtn.className = 'style-selector-btn';
  styleBtn.innerHTML = '🎨';
  styleBtn.title = 'Cambiar estilo';
  
  const mapContainer = document.getElementById('map');
  if (mapContainer) {
    mapContainer.appendChild(styleBtn);
  }
  
  // Crear menú
  const styleMenu = document.createElement('div');
  styleMenu.className = 'style-menu hidden';
  styleMenu.innerHTML = `
    <h4>Estilo del mapa</h4>
    <button data-style="streets">🗺️ Calles</button>
    <button data-style="basic">📋 Básico</button>
    <button data-style="bright">☀️ Brillante</button>
    <button data-style="pastel">🎨 Pastel</button>
    <button data-style="outdoor">🏞️ Exterior</button>
    <button data-style="satellite">🛰️ Satélite</button>
  `;
  
  if (mapContainer) {
    mapContainer.appendChild(styleMenu);
  }
  
  // Toggle menú
  styleBtn.addEventListener('click', function() {
    styleMenu.classList.toggle('hidden');
  });
  
  // Cambiar estilo
  styleMenu.addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON') {
      const style = e.target.getAttribute('data-style');
      loadMapTilerStyle(style);
      styleMenu.classList.add('hidden');
    }
  });
}

// ========================================
// NAVEGACIÓN
// ========================================
function setupNavigationActive() {
  const currentPath = window.location.pathname.split('/').pop();
  
  document.querySelectorAll('.nav-item, .bottom-menu-item').forEach(item => {
    item.classList.remove('active');
  });
  
  const selector = '[href="map.html"], [data-page="map"]';
  const activeItem = document.querySelector(selector);
  if (activeItem) {
    activeItem.classList.add('active');
  }
}

function setupBackButton() {
  const backBtn = document.getElementById('backButton');
  if (backBtn) {
    backBtn.onclick = () => window.history.back();
  }
}