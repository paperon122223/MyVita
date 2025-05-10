// Versión 3.0 - Solución perfectamente integrada con tu HTML
document.addEventListener('deviceready', onDeviceReady, false);

// Objeto principal de la aplicación
const alarmApp = {
    alarms: [],
    sound: null,
    
    init: function() {
        console.log('Inicializando aplicación de alarmas');
        this.loadAlarms();
        this.setupEventListeners();
        this.startAlarmChecker();
    },
    
    setupEventListeners: function() {
        // Manejador robusto para el botón de guardar
        const saveBtn = document.getElementById('saveAlarmButton');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveAlarm());
        } else {
            console.error('Botón de guardar no encontrado');
        }
        
        // Manejador para el botón de volver
        const backBtn = document.getElementById('backButton');
        if (backBtn) {
            backBtn.addEventListener('click', () => history.back());
        }
        
        // Delegación de eventos para eliminar alarmas
        const alarmsContainer = document.getElementById('alarmsContainer');
        if (alarmsContainer) {
            alarmsContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-alarm')) {
                    this.deleteAlarm(e.target.dataset.id);
                }
            });
        }
    },
    
    saveAlarm: function() {
        console.log('Intentando guardar nueva alarma...');
        
        const nameInput = document.getElementById('alarmName');
        const timeInput = document.getElementById('alarmTime');
        
        if (!nameInput || !timeInput) {
            this.showAlert('Error', 'Elementos del formulario no encontrados');
            return;
        }
        
        const name = nameInput.value.trim();
        const time = timeInput.value;
        
        // Validación completa
        if (!name) {
            this.showAlert('Error', 'Por favor ingresa un nombre para la alarma');
            nameInput.focus();
            return;
        }
        
        if (!time) {
            this.showAlert('Error', 'Por favor selecciona una hora');
            timeInput.focus();
            return;
        }
        
        const [hours, minutes] = time.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) {
            this.showAlert('Error', 'Hora inválida');
            return;
        }
        
        // Crear objeto alarma
        const newAlarm = {
            id: `alarm-${Date.now()}`,
            name: name,
            time: time,
            hours: hours,
            minutes: minutes,
            active: true,
            dateCreated: new Date().toISOString()
        };
        
        // Agregar y guardar
        this.alarms.push(newAlarm);
        this.saveAlarms();
        this.renderAlarms();
        
        // Limpiar formulario
        nameInput.value = '';
        timeInput.value = '';
        
        this.showAlert('Éxito', `Alarma "${name}" guardada para las ${time}`);
        console.log('Alarma guardada correctamente:', newAlarm);
    },
    
    deleteAlarm: function(alarmId) {
        this.alarms = this.alarms.filter(alarm => alarm.id !== alarmId);
        this.saveAlarms();
        this.renderAlarms();
        console.log('Alarma eliminada:', alarmId);
    },
    
    saveAlarms: function() {
        return new Promise((resolve, reject) => {
            try {
                localStorage.setItem('alarmAppStorage', JSON.stringify({
                    version: '1.0',
                    savedAt: new Date().toISOString(),
                    alarms: this.alarms
                }));
                console.log('Alarmas guardadas en localStorage');
                resolve(true);
            } catch (error) {
                console.error('Error al guardar alarmas:', error);
                this.showAlert('Error', 'No se pudo guardar la alarma');
                reject(error);
            }
        });
    },
    
    loadAlarms: function() {
        try {
            const savedData = localStorage.getItem('alarmAppStorage');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                this.alarms = parsedData.alarms || [];
                console.log(`Alarmas cargadas: ${this.alarms.length}`);
                this.renderAlarms();
            }
        } catch (error) {
            console.error('Error al cargar alarmas:', error);
            this.alarms = [];
        }
    },
    
    renderAlarms: function() {
        const container = document.getElementById('alarmsContainer');
        if (!container) {
            console.error('Contenedor de alarmas no encontrado');
            return;
        }
        
        if (this.alarms.length === 0) {
            container.innerHTML = '<li class="no-alarms">No hay alarmas programadas</li>';
            return;
        }
        
        container.innerHTML = this.alarms.map(alarm => `
            <li class="alarm-item" data-id="${alarm.id}">
                <div class="alarm-info">
                    <span class="alarm-name">${alarm.name}</span>
                    <span class="alarm-time">${this.formatTime(alarm.hours, alarm.minutes)}</span>
                </div>
                <button class="delete-alarm" data-id="${alarm.id}">✕</button>
            </li>
        `).join('');
    },
    
    startAlarmChecker: function() {
        // Verificar cada minuto
        setInterval(() => {
            const now = new Date();
            const currentHours = now.getHours();
            const currentMinutes = now.getMinutes();
            
            this.alarms.forEach(alarm => {
                if (alarm.active && alarm.hours === currentHours && alarm.minutes === currentMinutes) {
                    this.triggerAlarm(alarm);
                }
            });
        }, 60000); // 60,000 ms = 1 minuto
    },
    
    triggerAlarm: function(alarm) {
        console.log(`¡ALARMA ACTIVADA! ${alarm.name} a las ${alarm.time}`);
        
        // Reproducir sonido
        this.playAlarmSound();
        
        // Mostrar notificación
        this.showNotification(alarm.name);
        
        // Vibrar si está disponible
        if (navigator.vibrate) {
            navigator.vibrate([1000, 500, 1000]); // Patrón de vibración
        }
        
        // Mostrar alerta
        this.showAlert('¡Alarma!', alarm.name);
    },
    
  // ... (todo el código anterior se mantiene igual hasta la función playAlarmSound)

  playAlarmSound: function() {
    const alarmSound = document.getElementById('alarmSound');
    if (alarmSound) {
        // Establecer la ruta correcta del sonido
        const soundPath = this.getAlarmSoundPath();
        alarmSound.src = soundPath;
        
        alarmSound.currentTime = 0; // Reiniciar si ya está sonando
        alarmSound.play().catch(e => {
            console.error('Error al reproducir con HTML5 Audio:', e);
            this.playWithMediaPlugin(soundPath);
        });
    } else {
        console.error('Elemento de audio no encontrado');
        this.playWithMediaPlugin(this.getAlarmSoundPath());
    }
},

// ... (todo el código anterior permanece igual hasta playAlarmSound)

playAlarmSound: function() {
    console.log('Iniciando reproducción de sonido...');
    
    // 1. Primero intentamos con HTML5 Audio
    const html5Audio = document.getElementById('alarmSound');
    const soundPath = this.getSoundPath();
    
    if (html5Audio) {
        console.log('Intentando con HTML5 Audio');
        html5Audio.src = soundPath;
        html5Audio.currentTime = 0;
        
        const playPromise = html5Audio.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log('Sonido reproducido con HTML5 Audio');
            }).catch(error => {
                console.error('Error HTML5 Audio:', error);
                this.tryMediaPlugin(soundPath);
            });
        }
    } else {
        this.tryMediaPlugin(soundPath);
    }
},

getSoundPath: function() {
    // Ruta exacta según la plataforma
    if (typeof device !== 'undefined' && device.platform.toLowerCase() === 'android') {
        return '/android_asset/www/audio/alarm.mp3';
    }
    return 'audio/alarm.mp3';
},

tryMediaPlugin: function(soundPath) {
    console.log('Intentando con plugin Media');
    
    if (window.Media) {
        try {
            // Detener cualquier sonido previo
            if (this.mediaInstance) {
                this.mediaInstance.stop();
                this.mediaInstance.release();
            }
            
            // Crear nueva instancia
            this.mediaInstance = new Media(
                soundPath,
                () => console.log('Sonido reproducido con plugin Media'),
                (err) => console.error('Error plugin Media:', err),
                (status) => {
                    if (status === Media.MEDIA_ERROR) {
                        console.error('Error crítico en plugin Media');
                        this.useVibration();
                    }
                }
            );
            
            // Reproducir con opciones
            this.mediaInstance.play({ playAudioWhenScreenIsLocked: true });
            
        } catch (e) {
            console.error('Excepción en plugin Media:', e);
            this.useVibration();
        }
    } else {
        this.useVibration();
    }
},

useVibration: function() {
    console.log('Usando vibración como último recurso');
    if (navigator.vibrate) {
        navigator.vibrate([1000, 1000, 1000]); // Vibrar 1 segundo, pausa, vibrar
    } else {
        console.log('No hay soporte para vibración');
    }
},

// ... (todo el código posterior permanece igual)
    showNotification: function(message) {
        if (window.plugins?.notification?.local) {
            window.plugins.notification.local.schedule({
                title: '¡Alarma!',
                message: message,
                foreground: true,
                sound: 'alarm.mp3'
            });
        } else {
            console.log('Notificación:', message);
        }
    },
    
    showAlert: function(title, message) {
        if (navigator.notification?.alert) {
            navigator.notification.alert(
                message,
                () => console.log('Alerta cerrada'),
                title,
                'OK'
            );
        } else {
            alert(`${title}\n${message}`);
        }
    },
    
    formatTime: function(hours, minutes) {
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    }
};

function onDeviceReady() {
    console.log('Dispositivo listo - Iniciando aplicación de alarmas');
    alarmApp.init();
    
    // Configurar el evento de botón físico de volver en Android
    document.addEventListener('backbutton', (e) => {
        if (window.location.pathname.endsWith('alarm.html')) {
            e.preventDefault();
            history.back();
        }
    }, false);
}