// ================================================================
// voice-commands.js — Comandos de Voz para MyVita
// Agrega medicamentos y configura alarmas usando tu voz
// ================================================================

(function () {
  'use strict';

  const VoiceCommands = {
    recognition: null,
    synthesis: window.speechSynthesis,
    isListening: false,
    currentContext: null,
    callbacks: {},

    // ── Inicializar ─────────────────────────────────────────────
    init() {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('Reconocimiento de voz no soportado');
        return false;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'es-ES';

      this.recognition.onresult = (e) => this.handleResult(e);
      this.recognition.onerror = (e) => this.handleError(e);
      this.recognition.onend = () => this.handleEnd();

      return true;
    },

    // ── Comenzar a escuchar ──────────────────────────────────────
    startListening(context = 'general', callbacks = {}) {
      if (!this.recognition && !this.init()) {
        this.speak('Lo siento, tu dispositivo no soporta comandos de voz');
        return false;
      }

      this.currentContext = context;
      this.callbacks = callbacks;
      this.isListening = true;

      try {
        this.recognition.start();
        console.log('🎤 Escuchando comandos de voz...');
        return true;
      } catch (e) {
        console.error('Error iniciando reconocimiento:', e);
        return false;
      }
    },

    // ── Detener escucha ──────────────────────────────────────────
    stopListening() {
      if (this.recognition) {
        this.recognition.stop();
        this.isListening = false;
      }
    },

    // ── Procesar resultado ──────────────────────────────────────
    handleResult(event) {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      console.log('🗣️ Comando reconocido:', transcript);

      const command = this.parseCommand(transcript);

      if (command) {
        this.executeCommand(command);
      } else {
        this.speak('No entendí ese comando. Intenta decir: "Agregar medicamento" o "Configurar alarma"');
        if (this.callbacks.onUnrecognized) {
          this.callbacks.onUnrecognized(transcript);
        }
      }
    },

    // ── Parsear comando ──────────────────────────────────────────
    parseCommand(transcript) {
      const patterns = {
        addMedication: [
          /agregar medicamento (.+)/,
          /nuevo medicamento (.+)/,
          /agregar (.+) a medicamentos/,
          /tomar (.+)/,
          /medicamento (.+)/
        ],
        setAlarm: [
          /alarma (?:a las|para las) (\d+)(?::(\d+))?/,
          /recordatorio (?:a las|para las) (\d+)(?::(\d+))?/,
          /configurar alarma (?:a las|para las) (\d+)(?::(\d+))?/
        ],
        checkInventory: [
          /inventario/,
          /stock/,
          /queda medicamento/,
          /cuántos medicamentos/
        ],
        openDiary: [
          /abrir diario/,
          /nueva entrada/,
          /registrar en diario/
        ],
        getHelp: [
          /ayuda/,
          /comandos/,
          /qué puedo decir/
        ],
        stopListening: [
          /cancelar/,
          /detener/,
          /parar/
        ]
      };

      // Buscar patrón coincidente
      for (const [type, regexList] of Object.entries(patterns)) {
        for (const regex of regexList) {
          const match = transcript.match(regex);
          if (match) {
            return { type, match, transcript };
          }
        }
      }

      // Detección de medicamentos por contexto
      if (this.currentContext === 'addMedication') {
        return { type: 'medicationName', data: transcript, transcript };
      }

      return null;
    },

    // ── Ejecutar comando ─────────────────────────────────────────
    async executeCommand(command) {
      switch (command.type) {
        case 'addMedication':
          await this.handleAddMedication(command);
          break;
        case 'setAlarm':
          await this.handleSetAlarm(command);
          break;
        case 'checkInventory':
          await this.handleCheckInventory();
          break;
        case 'openDiary':
          this.handleOpenDiary();
          break;
        case 'getHelp':
          this.handleGetHelp();
          break;
        case 'stopListening':
          this.stopListening();
          this.speak('Comandos de voz desactivados');
          break;
        case 'medicationName':
          if (this.callbacks.onMedicationName) {
            this.callbacks.onMedicationName(command.data);
          }
          break;
      }
    },

    // ── Agregar medicamento ─────────────────────────────────────
    async handleAddMedication(command) {
      const name = command.match[1];
      this.speak(`Voy a agregar ${name}. ¿Cuál es la dosis?`);

      if (this.callbacks.onAddMedication) {
        this.callbacks.onAddMedication({ name, needsMoreInfo: true });
      }
    },

    // ── Configurar alarma ─────────────────────────────────────────
    async handleSetAlarm(command) {
      const hours = parseInt(command.match[1]);
      const minutes = command.match[2] ? parseInt(command.match[2]) : 0;
      const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

      this.speak(`Alarma configurada para las ${timeStr}`);

      if (this.callbacks.onSetAlarm) {
        this.callbacks.onSetAlarm({ time: timeStr, hours, minutes });
      }
    },

    // ── Ver inventario ───────────────────────────────────────────
    async handleCheckInventory() {
      try {
        const userId = localStorage.getItem('currentUserId');
        if (!userId || !window.DB) {
          this.speak('No puedo acceder al inventario ahora');
          return;
        }

        const bajos = await window.DB.Inventario.getStockBajo(userId);

        if (bajos.length === 0) {
          this.speak('Todos tus medicamentos tienen stock suficiente');
        } else {
          const medNames = bajos.slice(0, 3).map(m => m.medicamento_nombre).join(', ');
          this.speak(`Tienes ${bajos.length} medicamentos con stock bajo: ${medNames}`);
        }

        if (this.callbacks.onCheckInventory) {
          this.callbacks.onCheckInventory(bajos);
        }
      } catch (e) {
        this.speak('Error al consultar el inventario');
      }
    },

    // ── Abrir diario ──────────────────────────────────────────────
    handleOpenDiary() {
      this.speak('Abriendo el diario');
      setTimeout(() => {
        window.location.href = 'Diary.html';
      }, 1000);
    },

    // ── Mostrar ayuda ────────────────────────────────────────────
    handleGetHelp() {
      const helpText = `Puedes decir: Agregar medicamento seguido del nombre,
        Alarma a las, seguido de la hora, Inventario para ver el stock,
        o Abrir diario para registrar cómo te sientes.`;
      this.speak(helpText);
    },

    // ── Manejar errores ───────────────────────────────────────────
    handleError(event) {
      console.error('Error de reconocimiento:', event.error);
      this.isListening = false;

      if (event.error === 'no-speech') {
        this.speak('No te escuché. Intenta de nuevo.');
      } else if (event.error === 'audio-capture') {
        this.speak('No se detectó micrófono. Verifica los permisos.');
      } else if (event.error === 'not-allowed') {
        this.speak('Necesito permiso para usar el micrófono.');
      }

      if (this.callbacks.onError) {
        this.callbacks.onError(event.error);
      }
    },

    // ── Fin de escucha ───────────────────────────────────────────
    handleEnd() {
      this.isListening = false;
      console.log('🎤 Escucha finalizada');
      if (this.callbacks.onEnd) {
        this.callbacks.onEnd();
      }
    },

    // ── Texto a voz ─────────────────────────────────────────────
    speak(text, options = {}) {
      if (!this.synthesis) return;

      // Cancelar cualquier speech anterior
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = options.rate || 1;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;

      // Seleccionar voz en español si está disponible
      const voices = this.synthesis.getVoices();
      const spanishVoice = voices.find(v => v.lang.startsWith('es'));
      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }

      this.synthesis.speak(utterance);
      return utterance;
    },

    // ── Leer medicamentos del día ────────────────────────────────
    async speakTodayMedications() {
      try {
        const userId = localStorage.getItem('currentUserId');
        if (!userId || !window.DB) {
          this.speak('No puedo acceder a tus medicamentos ahora');
          return;
        }

        const alarmas = await window.DB.Alarmas.getPendientes(userId);

        if (alarmas.length === 0) {
          this.speak('No tienes medicamentos pendientes para hoy. ¡Buen trabajo!');
          return;
        }

        const ahora = new Date().toTimeString().substring(0, 5);
        const proximas = alarmas.filter(a => a.hora_toma >= ahora).slice(0, 3);

        if (proximas.length === 0) {
          this.speak('Tienes ' + alarmas.length + ' medicamentos programados para hoy. Todas las tomas están completadas por ahora.');
          return;
        }

        let text = `Tienes ${proximas.length} medicamentos próximos. `;
        proximas.forEach((a, i) => {
          text += `${i + 1}: ${a.nombre || a.medicamento_nombre} a las ${a.hora_toma}. `;
        });

        this.speak(text);
      } catch (e) {
        console.error('Error leyendo medicamentos:', e);
        this.speak('Error al consultar tus medicamentos');
      }
    },

    // ── Confirmar toma de medicamento ────────────────────────────
    async confirmMedicationTaken(alarmId) {
      this.speak('¿Tomaste tu medicamento? Di sí para confirmar o no para posponer.');

      return new Promise((resolve) => {
        const checkResponse = (e) => {
          const transcript = e.results[0][0].transcript.toLowerCase().trim();

          if (transcript.includes('sí') || transcript.includes('si') || transcript.includes('tomé') || transcript.includes('tome')) {
            resolve(true);
          } else if (transcript.includes('no') || transcript.includes('todavía') || transcript.includes('todavia')) {
            resolve(false);
          }

          this.recognition.removeEventListener('result', checkResponse);
        };

        this.recognition.addEventListener('result', checkResponse);
        this.startListening('confirmation');
      });
    },

    // ── Crear botón de micrófono flotante ────────────────────────
    createMicButton(options = {}) {
      const btn = document.createElement('button');
      btn.className = 'voice-mic-btn';
      btn.innerHTML = '<span class="material-icons">mic</span>';
      btn.style.cssText = `
        position: fixed;
        bottom: ${options.bottom || '100px'};
        right: ${options.right || '20px'};
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #7c4dff, #5e35b1);
        border: none;
        box-shadow: 0 4px 16px rgba(124, 77, 255, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 1000;
        transition: all 0.3s ease;
      `;

      btn.querySelector('.material-icons').style.cssText = `
        color: white;
        font-size: 28px;
      `;

      let isListening = false;

      btn.addEventListener('click', () => {
        if (isListening) {
          this.stopListening();
          btn.style.background = 'linear-gradient(135deg, #7c4dff, #5e35b1)';
          btn.innerHTML = '<span class="material-icons" style="color: white; font-size: 28px;">mic</span>';
          isListening = false;
        } else {
          if (this.startListening(options.context || 'general', options.callbacks)) {
            btn.style.background = 'linear-gradient(135deg, #ff5252, #c62828)';
            btn.innerHTML = '<span class="material-icons" style="color: white; font-size: 28px;">mic_off</span>';
            isListening = true;
          }
        }
      });

      document.body.appendChild(btn);
      return btn;
    }
  };

  // Exponer globalmente
  window.VoiceCommands = VoiceCommands;

  // Inicializar cuando el DOM esté listo
  document.addEventListener('DOMContentLoaded', () => {
    VoiceCommands.init();
  });

})();
