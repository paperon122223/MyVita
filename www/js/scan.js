// ========================================
// ESCANEO DE RECETAS - FUNCIONALIDAD COMPLETA
// NOTA: mostrarNotificacion está en utils.js
// ========================================

let capturedImageData = null;
let videoStream = null;

// ========================================
// INICIALIZACIÓN
// ========================================
if (!window.cordova) {
  document.dispatchEvent(new Event('deviceready'));
}

document.addEventListener('deviceready', async function() {
  if (window.DB) {
    try { await window.DB.init(); } catch(e) { console.error('[scan] DB:', e.message); }
  }
  setupEventListeners();
  setTodayDate();
  checkPermissions();
}, false);

// ========================================
// VERIFICAR PERMISOS
// ========================================
function checkPermissions() {
  // Verificar si estamos en Cordova
  if (window.cordova && window.cordova.plugins && window.cordova.plugins.permissions) {
    const permissions = window.cordova.plugins.permissions;
    
    // Verificar permiso de cámara
    permissions.checkPermission(permissions.CAMERA, function(status) {
      console.log('Permiso de cámara:', status.hasPermission ? 'Concedido' : 'Denegado');
    });
  } else {
    console.log('Usando API HTML5 getUserMedia');
  }
}

// ========================================
// CONFIGURAR EVENT LISTENERS
// ========================================
function setupEventListeners() {
  // Botón volver
  const backButton = document.getElementById('backButton');
  if (backButton) {
    backButton.addEventListener('click', () => {
      stopCamera();
      window.location.href = 'main.html';
    });
  }

  // Paso 1: Captura
  const startCameraBtn = document.getElementById('startCameraBtn');
  if (startCameraBtn) {
    startCameraBtn.addEventListener('click', startCamera);
  }

  const captureBtn = document.getElementById('captureBtn');
  if (captureBtn) {
    captureBtn.addEventListener('click', capturePhoto);
  }

  const uploadBtn = document.getElementById('uploadBtn');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      document.getElementById('fileInput').click();
    });
  }

  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
  }

  // Paso 2: Preview
  const retakeBtn = document.getElementById('retakeBtn');
  if (retakeBtn) {
    retakeBtn.addEventListener('click', retakePhoto);
  }

  const processBtn = document.getElementById('processBtn');
  if (processBtn) {
    processBtn.addEventListener('click', processRecipe);
  }

  // Paso 4: Resultados
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', savePrescription);
  }

  const cancelBtn = document.getElementById('cancelBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', cancelScan);
  }
}

// ========================================
// PASO 1: CÁMARA Y CAPTURA
// ========================================
async function startCamera() {
  try {
    // Verificar si getUserMedia está disponible
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia no está soportado en este navegador');
    }

    const constraints = {
      video: {
        facingMode: 'environment', // Cámara trasera
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    };

    // Solicitar acceso a la cámara
    mostrarNotificacion('Solicitando acceso a la cámara...', 'info');
    
    videoStream = await navigator.mediaDevices.getUserMedia(constraints);
    const video = document.getElementById('videoPreview');
    
    if (!video) {
      throw new Error('Elemento de video no encontrado');
    }

    video.srcObject = videoStream;
    
    // Esperar a que el video esté listo
    video.onloadedmetadata = () => {
      video.play();
      // Mostrar video y botón de captura
      document.getElementById('cameraContainer').style.display = 'block';
      document.getElementById('startCameraBtn').style.display = 'none';
      document.getElementById('captureBtn').style.display = 'block';
      
      mostrarNotificacion('¡Cámara activada! Encuadra tu receta', 'exito');
    };

  } catch (error) {
    console.error('Error al acceder a la cámara:', error);
    
    let mensaje = 'No se pudo acceder a la cámara. ';
    
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      mensaje += 'Por favor, concede permisos de cámara en la configuración de tu dispositivo.';
    } else if (error.name === 'NotFoundError') {
      mensaje += 'No se encontró ninguna cámara en el dispositivo.';
    } else if (error.name === 'NotReadableError') {
      mensaje += 'La cámara está siendo usada por otra aplicación.';
    } else {
      mensaje += 'Usa el botón "Subir desde Galería" como alternativa.';
    }
    
    mostrarNotificacion(mensaje, 'error', 5000);
    
    // No hacer clic automático, dejar que el usuario elija
    console.log('Usa el botón de galería manualmente');
  }
}

function capturePhoto() {
  const video = document.getElementById('videoPreview');
  const canvas = document.getElementById('canvas');
  
  if (!video || !canvas) {
    mostrarNotificacion('Error: elementos no encontrados', 'error');
    return;
  }

  const context = canvas.getContext('2d');

  // Ajustar tamaño del canvas
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Capturar frame actual
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Convertir a base64
  capturedImageData = canvas.toDataURL('image/jpeg', 0.9);

  // Detener cámara
  stopCamera();

  // Mostrar preview
  showStep(2);
  document.getElementById('imagePreview').src = capturedImageData;
  
  mostrarNotificacion('Foto capturada exitosamente', 'exito');
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  
  if (!file) return;

  if (!file.type.match('image.*')) {
    mostrarNotificacion('Por favor selecciona una imagen válida', 'error');
    return;
  }

  mostrarNotificacion('Cargando imagen...', 'info');

  const reader = new FileReader();
  
  reader.onload = function(e) {
    capturedImageData = e.target.result;
    showStep(2);
    document.getElementById('imagePreview').src = capturedImageData;
    mostrarNotificacion('Imagen cargada exitosamente', 'exito');
  };
  
  reader.onerror = function() {
    mostrarNotificacion('Error al cargar la imagen', 'error');
  };
  
  reader.readAsDataURL(file);
}

function stopCamera() {
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
    console.log('Cámara detenida');
  }
}

function retakePhoto() {
  capturedImageData = null;
  showStep(1);
  document.getElementById('cameraContainer').style.display = 'none';
  document.getElementById('startCameraBtn').style.display = 'block';
  document.getElementById('captureBtn').style.display = 'none';
}

// ========================================
// PASO 3: PROCESAMIENTO CON OCR
// ========================================
async function processRecipe() {
  showStep(3);
  
  // Simular progreso
  simulateProgress();

  try {
    // Verificar que Tesseract esté disponible
    if (typeof Tesseract === 'undefined') {
      throw new Error('Tesseract no está cargado');
    }

    mostrarNotificacion('Iniciando reconocimiento de texto...', 'info');

    // Usar Tesseract.js para OCR
    const result = await Tesseract.recognize(
      capturedImageData,
      'spa', // Idioma español
      {
        logger: info => {
          console.log(info);
          updateProcessingTip(info);
        }
      }
    );

    const extractedText = result.data.text;
    console.log('Texto extraído:', extractedText);

    // Procesar el texto extraído
    const extractedData = parseRecipeText(extractedText);

    // Llenar formulario con datos extraídos
    fillForm(extractedData);

    // Mostrar resultados
    setTimeout(() => {
      showStep(4);
      mostrarNotificacion('¡Receta procesada exitosamente!', 'exito');
    }, 500);

  } catch (error) {
    console.error('Error en OCR:', error);
    mostrarNotificacion('Error al procesar la receta. Puedes editarla manualmente.', 'advertencia', 4000);
    
    // Mostrar formulario vacío para edición manual
    setTimeout(() => {
      fillForm({}); // Llenar con datos vacíos
      showStep(4);
    }, 1000);
  }
}

function simulateProgress() {
  const progressFill = document.getElementById('progressFill');
  if (!progressFill) return;
  
  let progress = 0;
  
  const interval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress > 100) progress = 100;
    
    progressFill.style.width = progress + '%';
    
    if (progress >= 100) {
      clearInterval(interval);
    }
  }, 300);
}

function updateProcessingTip(info) {
  const tipElement = document.getElementById('processingTip');
  if (!tipElement) return;
  
  if (info.status === 'loading tesseract core') {
    tipElement.textContent = 'Cargando motor OCR...';
  } else if (info.status === 'initializing tesseract') {
    tipElement.textContent = 'Inicializando...';
  } else if (info.status === 'recognizing text') {
    const percentage = Math.round(info.progress * 100);
    tipElement.textContent = `Reconociendo texto... ${percentage}%`;
  }
}

// ========================================
// PARSEO INTELIGENTE DE TEXTO
// ========================================
function parseRecipeText(text) {
  const data = {
    medicamento: '',
    dosis: '',
    frecuencia: '',
    horaToma: '08:00',
    duracionDias: '',
    viaAdmin: 'oral',
    nombreMedico: '',
    notas: ''
  };

  if (!text || text.trim() === '') {
    return data;
  }

  // Convertir a minúsculas para búsqueda
  const lowerText = text.toLowerCase();

  // Buscar nombres de medicamentos comunes (simplificado)
  const medicamentos = [
    'paracetamol', 'ibuprofeno', 'amoxicilina', 'aspirina', 
    'omeprazol', 'losartan', 'metformina', 'atorvastatina',
    'ranitidina', 'diclofenaco', 'ketorolaco', 'naproxeno',
    'clonazepam', 'captopril', 'enalapril', 'simvastatina'
  ];

  for (const med of medicamentos) {
    if (lowerText.includes(med)) {
      data.medicamento = med.charAt(0).toUpperCase() + med.slice(1);
      
      // Buscar dosis cerca del medicamento
      const medIndex = lowerText.indexOf(med);
      const nearText = text.substring(medIndex, medIndex + 100);
      const dosisMatch = nearText.match(/(\d+)\s*(mg|g|ml|tabletas?|cápsulas?|comprimidos?)/i);
      if (dosisMatch) {
        data.dosis = dosisMatch[0];
      }
      break;
    }
  }

  // Buscar frecuencia
  if (lowerText.includes('cada 8 horas') || lowerText.includes('c/8h')) {
    data.frecuencia = 'cada_8_horas';
  } else if (lowerText.includes('cada 12 horas') || lowerText.includes('c/12h')) {
    data.frecuencia = 'cada_12_horas';
  } else if (lowerText.includes('cada 6 horas') || lowerText.includes('c/6h')) {
    data.frecuencia = 'cada_6_horas';
  } else if (lowerText.includes('cada 4 horas') || lowerText.includes('c/4h')) {
    data.frecuencia = 'cada_4_horas';
  } else if (lowerText.includes('3 veces') || lowerText.includes('tres veces')) {
    data.frecuencia = 'tres_veces_dia';
  } else if (lowerText.includes('2 veces') || lowerText.includes('dos veces')) {
    data.frecuencia = 'dos_veces_dia';
  } else if (lowerText.includes('1 vez') || lowerText.includes('una vez')) {
    data.frecuencia = 'una_vez_dia';
  }

  // Buscar duración
  const duracionMatch = text.match(/(\d+)\s*(días?|dia)/i);
  if (duracionMatch) {
    data.duracionDias = duracionMatch[1];
  }

  // Buscar nombre del médico (después de Dr., Dra., Doctor, Doctora)
  const doctorMatch = text.match(/(?:Dr\.?a?|Doctor(?:a)?)\s+([A-ZÁÉÍÓÚÑ'][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ'][a-záéíóúñ]+)?)/i);
  if (doctorMatch) {
    data.nombreMedico = 'Dr. ' + doctorMatch[1];
  }

  // Guardar el texto completo como notas si no pudimos extraer mucho
  if (!data.medicamento && !data.dosis) {
    data.notas = 'Texto extraído: ' + text.substring(0, 200) + (text.length > 200 ? '...' : '');
  }

  return data;
}

// ========================================
// LLENAR FORMULARIO CON DATOS EXTRAÍDOS
// ========================================
function fillForm(data) {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
  };
  // 'dosis' en el schema = nombre del medicamento + cantidad
  const dosisCompleta = [data.medicamento, data.dosis].filter(Boolean).join(' ');
  set('dosis',              dosisCompleta);
  set('frecuencia',         data.frecuencia);
  set('hora_toma',          data.horaToma || '08:00');
  set('fecha_inicio',       data.fechaInicio || new Date().toISOString().split('T')[0]);
  set('fecha_fin',          data.fechaFin || '');
  set('via_administracion', data.viaAdmin || 'Oral');
  set('nombre_medico',      data.nombreMedico || '');
  set('contacto_medico',    data.contactoMedico || '');
  set('notas',              data.notas || '');
}

// ========================================
// PASO 4: GUARDAR PRESCRIPCIÓN
// ========================================
async function savePrescription() {
  const get = id => (document.getElementById(id)?.value || '').trim();

  const prescriptionData = {
    dosis              : get('dosis'),
    hora_toma          : get('hora_toma'),
    frecuencia         : get('frecuencia'),
    fecha_inicio       : get('fecha_inicio') || new Date().toISOString().split('T')[0],
    fecha_fin          : get('fecha_fin') || null,
    via_administracion : get('via_administracion') || 'Oral',
    nombre_medico      : get('nombre_medico') || null,
    contacto_medico    : get('contacto_medico') || null,
    notas              : get('notas') || null,
    medicamento_id     : null
  };

  // Validar igual que home.js
  if (!prescriptionData.dosis) {
    mostrarNotificacion('Por favor ingresa el medicamento', 'advertencia');
    document.getElementById('dosis').focus();
    return;
  }
  if (!prescriptionData.hora_toma) {
    mostrarNotificacion('Por favor ingresa la hora de toma', 'advertencia');
    document.getElementById('hora_toma').focus();
    return;
  }
  if (!prescriptionData.frecuencia) {
    mostrarNotificacion('Por favor selecciona la frecuencia', 'advertencia');
    document.getElementById('frecuencia').focus();
    return;
  }

  await checkInteractionsBeforeSave(prescriptionData);
}

async function checkInteractionsBeforeSave(data) {
  // Si no hay InteractionChecker o no hay internet, guardar directo
  if (!window.InteractionChecker || !window.DB) {
    saveToDatabase(data); return;
  }
  try {
    const userId   = localStorage.getItem('currentUserId');
    const activos  = userId ? await window.DB.Prescripciones.getActivas(userId) : [];
    const found    = await InteractionChecker.checkNew(data.medicamento, activos);
    if (found.length > 0) {
      InteractionChecker.showModal(
        found,
        () => saveToDatabase(data),   // onContinue
        () => mostrarNotificacion('Guardado cancelado. Revisa con tu médico.', 'advertencia')
      );
    } else {
      saveToDatabase(data);
    }
  } catch (e) {
    console.warn('[scan] Error revisando interacciones:', e.message);
    saveToDatabase(data);
  }
}

async function saveToDatabase(data) {
  const userId = localStorage.getItem('currentUserId');
  if (!userId) {
    mostrarNotificacion('Debes iniciar sesión para guardar', 'error');
    return;
  }

  if (!window.DB) {
    mostrarNotificacion('Base de datos no disponible', 'error');
    return;
  }

  try {
    // Guardar prescripción — mismos campos exactos que home.js
    const prescId = await window.DB.Prescripciones.crear(userId, data);
    console.log('[scan] Prescripción guardada:', prescId);

    // Crear alarma para hoy automáticamente
    if (data.hora_toma && prescId) {
      const hoy = new Date().toISOString().split('T')[0];
      await window.DB.Alarmas.crear(userId, {
        nombre          : data.dosis,
        hora_toma       : data.hora_toma,
        fecha           : hoy,
        prescripcion_id : prescId,
        tono            : 'alarm.mp3'
      });
    }

    mostrarNotificacion('✅ Prescripción guardada correctamente', 'exito');
    setTimeout(() => { window.location.href = 'home.html'; }, 1500);

  } catch (err) {
    console.error('[scan] Error guardando:', err);
    mostrarNotificacion('Error al guardar: ' + err.message, 'error');
  }
}

function calcFechaFin(fechaInicio, dias) {
  try {
    const d = new Date(fechaInicio || new Date());
    d.setDate(d.getDate() + parseInt(dias));
    return d.toISOString().split('T')[0];
  } catch { return null; }
}

function saveToLocalStorage(data) {
  try {
    // Fallback: guardar en localStorage
    let prescriptions = JSON.parse(localStorage.getItem('scannedPrescriptions') || '[]');
    
    // Agregar ID único
    data.id = Date.now();
    
    prescriptions.push(data);
    localStorage.setItem('scannedPrescriptions', JSON.stringify(prescriptions));
    
    mostrarNotificacion('Prescripción guardada (modo offline)', 'exito');
    
    setTimeout(() => {
      window.location.href = 'main.html';
    }, 1500);
  } catch (error) {
    console.error('Error al guardar en localStorage:', error);
    mostrarNotificacion('Error al guardar la prescripción', 'error');
  }
}

function cancelScan() {
  if (confirm('¿Seguro que deseas cancelar? Se perderán los datos escaneados.')) {
    stopCamera();
    window.location.href = 'main.html';
  }
}

// ========================================
// UTILIDADES
// ========================================
function showStep(stepNumber) {
  // Ocultar todos los pasos
  document.querySelectorAll('.scan-step').forEach(step => {
    step.classList.remove('active');
  });

  // Mostrar el paso solicitado
  const stepElement = document.getElementById('step' + stepNumber);
  if (stepElement) {
    stepElement.classList.add('active');
  }
}

function setTodayDate() {
  const today = new Date().toISOString().split('T')[0];
  const fechaInput = document.getElementById('fechaInicio');
  if (fechaInput) {
    fechaInput.value = today;
  }
}

// ========================================
// CLEANUP AL SALIR
// ========================================
window.addEventListener('beforeunload', () => {
  stopCamera();
});

// Para debugging
window.addEventListener('error', (event) => {
  console.error('Error global:', event.error);
  mostrarNotificacion('Error: ' + event.message, 'error');
});