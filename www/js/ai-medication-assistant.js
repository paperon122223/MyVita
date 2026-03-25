// ================================================================
// ai-medication-assistant.js — Asistente IA Avanzado de Medicamentos
// Detecta interacciones, analiza efectos secundarios, da consejos
// ================================================================

(function () {
  'use strict';

  const AI_CONFIG = {
    apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
    apiKey: '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',
    model: 'llama-3.1-8b-instant'
  };

  const AIMedicationAssistant = {

    // ── Análisis de interacciones entre medicamentos ─────────────
    async checkDrugInteractions(medications) {
      if (!medications || medications.length < 2) {
        return { status: 'ok', interactions: [], message: 'Necesitas al menos 2 medicamentos para verificar interacciones' };
      }

      try {
        const prompt = `Analiza las posibles interacciones entre estos medicamentos:
${medications.map((m, i) => `${i + 1}. ${m.nombre || m.medicamento_nombre} (${m.dosis || 'dosis no especificada'})`).join('\n')}

Responde EXACTAMENTE en este formato JSON:
{
  "status": "ok|warning|danger",
  "interactions": [
    {
      "medicamentos": ["nombre1", "nombre2"],
      "severidad": "baja|media|alta",
      "descripcion": "descripción breve de la interacción",
      "recomendacion": "qué hacer"
    }
  ],
  "precaucionesGenerales": ["precaución 1", "precaución 2"],
  "resumen": "resumen general en una frase"
}

Si no hay interacciones conocidas, devuelve status "ok" y interactions vacío.`;

        const response = await this.callAI(prompt);
        return this.parseJSONResponse(response) || { status: 'error', interactions: [] };

      } catch (e) {
        console.error('[AI Assistant] Error interacciones:', e);
        return { status: 'error', message: 'No se pudo analizar las interacciones' };
      }
    },

    // ── Análisis de efectos secundarios ──────────────────────────
    async analyzeSideEffects(medicationName, symptoms, diaryEntries = []) {
      try {
        const prompt = `Analiza si estos síntomas pueden estar relacionados con el medicamento ${medicationName}:

Síntomas reportados: ${symptoms}

Entradas recientes del diario:
${diaryEntries.slice(0, 7).map(e => `- ${e.fecha}: Estado ${e.estado_animo}/5, Síntomas: ${e.sintomas || 'ninguno'}, Notas: ${e.notas || 'N/A'}`).join('\n')}

Responde EXACTAMENTE en este formato JSON:
{
  "probabilidad": "alta|media|baja",
  "explicacion": "explicación de por qué podría estar relacionado",
  "sintomasCoincidentes": ["síntoma1", "síntoma2"],
  "recomendaciones": [
    "recomendación 1",
    "recomendación 2"
  ],
  "consultarMedico": true|false,
  "urgencia": "inmediata|pronta|rutina",
  "notasAdicionales": "cualquier información útil adicional"
}`;

        const response = await this.callAI(prompt);
        return this.parseJSONResponse(response) || {
          probabilidad: 'desconocida',
          explicacion: 'No se pudo analizar',
          recomendaciones: ['Consulta con tu médico'],
          consultarMedico: true,
          urgencia: 'pronta'
        };

      } catch (e) {
        console.error('[AI Assistant] Error efectos secundarios:', e);
        return {
          probabilidad: 'desconocida',
          explicacion: 'Error en el análisis',
          recomendaciones: ['Consulta con tu médico'],
          consultarMedico: true,
          urgencia: 'pronta'
        };
      }
    },

    // ── Recomendaciones de horarios óptimos ──────────────────────
    async getOptimalSchedule(medications, userHabits = {}) {
      try {
        const meds = medications.map(m => ({
          nombre: m.nombre || m.medicamento_nombre,
          frecuencia: m.frecuencia,
          via: m.via_administracion || 'oral',
          indicaciones: m.notas || ''
        }));

        const prompt = `Recomienda horarios óptimos para tomar estos medicamentos:

Medicamentos:
${meds.map(m => `- ${m.nombre}: ${m.frecuencia}, vía ${m.via}${m.indicaciones ? ', Indicaciones: ' + m.indicaciones : ''}`).join('\n')}

Hábitos del usuario: ${JSON.stringify(userHabits)}

Responde EXACTAMENTE en este formato JSON:
{
  "horariosRecomendados": [
    {
      "hora": "HH:MM",
      "medicamentos": ["nombre1", "nombre2"],
      "razon": "por qué esta hora es óptima"
    }
  ],
  "consejos": [
    "consejo sobre cómo organizar las tomas",
    "consejo sobre alimentos"
  ],
  "advertencias": [
    "advertencia si hay algo importante"
  ]
}`;

        const response = await this.callAI(prompt);
        return this.parseJSONResponse(response) || {
          horariosRecomendados: [],
          consejos: ['Consulta con tu médico para el mejor horario'],
          advertencias: []
        };

      } catch (e) {
        console.error('[AI Assistant] Error horarios:', e);
        return {
          horariosRecomendados: [],
          consejos: ['No se pudieron generar recomendaciones'],
          advertencias: []
        };
      }
    },

    // ── Generar resumen semanal inteligente ───────────────────────
    async generateWeeklySummary(userId, weekData) {
      try {
        const prompt = `Genera un resumen semanal personalizado para un paciente con estos datos:

Adherencia: ${weekData.adherencia}%
Tomas completadas: ${weekData.tomadas}
Tomas perdidas: ${weekData.perdidas}
Racha actual: ${weekData.racha} días
Estados de ánimo: ${JSON.stringify(weekData.animos || [])}
Síntomas reportados: ${JSON.stringify(weekData.sintomas || [])}

Responde EXACTAMENTE en este formato JSON:
{
  "titulo": "título motivador del resumen",
  "resumen": "2-3 frases sobre cómo fue la semana",
  "destacado": "algo positivo que destacar",
  "areaMejora": "área donde puede mejorar",
  "metaProximaSemana": "objetivo específico para la próxima semana",
  "mensajeMotivacional": "frase de motivación personalizada"
}`;

        const response = await this.callAI(prompt);
        return this.parseJSONResponse(response) || {
          titulo: 'Resumen Semanal',
          resumen: 'No se pudo generar el análisis',
          destacado: 'Sigue tomando tus medicamentos',
          metaProximaSemana: 'Mantener la adherencia'
        };

      } catch (e) {
        console.error('[AI Assistant] Error resumen semanal:', e);
        return {
          titulo: 'Resumen Semanal',
          resumen: 'Error al generar el análisis',
          destacado: 'Continúa con tu tratamiento',
          metaProximaSemana: 'Mantener la adherencia'
        };
      }
    },

    // ── Análisis de imagen de medicamento ────────────────────────
    async analyzeMedicationImage(imageData) {
      try {
        // Nota: Esto requeriría un servicio de visión por computadora
        // Por ahora, devolvemos una estructura para implementación futura
        return {
          status: 'not_implemented',
          message: 'Análisis de imagen requiere integración con servicio de visión',
          detectedText: null,
          identifiedMedication: null,
          confidence: 0
        };
      } catch (e) {
        console.error('[AI Assistant] Error análisis imagen:', e);
        return { status: 'error', message: e.message };
      }
    },

    // ── Chat médico inteligente ──────────────────────────────────
    async medicalChat(message, context = {}) {
      try {
        const systemPrompt = `Eres un asistente médico virtual llamado "MyVita Assistant".
Tienes acceso a la información del usuario sobre sus medicamentos y salud.

REGLAS IMPORTANTES:
1. NO diagnostiques enfermedades
2. SIEMPRE recomienda consultar a un médico para situaciones graves
3. Sé empático y comprensivo
4. Proporciona información general sobre medicamentos (usos comunes, efectos secundarios conocidos)
5. Recuerda al usuario tomar sus medicamentos si parece que olvidó
6. Sé breve pero completo
7. Usa emojis apropiados para hacer la conversación amigable

Contexto actual del usuario:
${context.medications ? `Medicamentos: ${context.medications.map(m => m.nombre).join(', ')}` : ''}
${context.recentSymptoms ? `Síntomas recientes: ${context.recentSymptoms}` : ''}
${context.adherence ? `Adherencia actual: ${context.adherence}%` : ''}

Responde de manera útil y segura.`;

        const response = await this.callAI(message, systemPrompt);
        return {
          status: 'success',
          response: response,
          suggestedActions: this.extractSuggestedActions(response),
          shouldEscalate: this.shouldEscalateToDoctor(response)
        };

      } catch (e) {
        console.error('[AI Assistant] Error chat:', e);
        return {
          status: 'error',
          response: 'Lo siento, no puedo procesar tu consulta en este momento. Intenta más tarde.',
          suggestedActions: [],
          shouldEscalate: false
        };
      }
    },

    // ── Llamar a la API de IA ────────────────────────────────────
    async callAI(prompt, systemMessage = null) {
      const messages = [];

      if (systemMessage) {
        messages.push({ role: 'system', content: systemMessage });
      }

      messages.push({ role: 'user', content: prompt });

      const response = await fetch(AI_CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + AI_CONFIG.apiKey
        },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          messages: messages,
          max_tokens: 800,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error('API error: ' + response.status);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    },

    // ── Parsear respuesta JSON ───────────────────────────────────
    parseJSONResponse(text) {
      try {
        // Intentar extraer JSON de la respuesta
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return null;
      } catch (e) {
        console.warn('No se pudo parsear JSON:', e);
        return null;
      }
    },

    // ── Extraer acciones sugeridas ────────────────────────────────
    extractSuggestedActions(response) {
      const actions = [];
      const lower = response.toLowerCase();

      if (lower.includes('medicamento') || lower.includes('pastilla')) {
        actions.push({ label: 'Ver medicamentos', action: 'navigate', target: 'home.html' });
      }
      if (lower.includes('alarma') || lower.includes('recordatorio')) {
        actions.push({ label: 'Configurar alarmas', action: 'navigate', target: 'alarm.html' });
      }
      if (lower.includes('médico') || lower.includes('doctor')) {
        actions.push({ label: 'Contactar médico', action: 'navigate', target: 'contacts.html' });
      }
      if (lower.includes('diario') || lower.includes('síntoma')) {
        actions.push({ label: 'Abrir diario', action: 'navigate', target: 'Diary.html' });
      }

      return actions;
    },

    // ── Determinar si debe escalar a médico ──────────────────────
    shouldEscalateToDoctor(response) {
      const urgentKeywords = [
        'emergencia', 'urgente', 'inmediatamente', 'hospital', 'emergency',
        'grave', 'serio', 'llamar al', '999', '911', 'ambulancia'
      ];

      const lower = response.toLowerCase();
      return urgentKeywords.some(kw => lower.includes(kw));
    },

    // ── Mostrar notificación de interacción ─────────────────────
    async showInteractionAlert(userId) {
      try {
        const prescripciones = await window.DB.Prescripciones.getActivas(userId);
        const interactions = await this.checkDrugInteractions(prescripciones);

        if (interactions.status === 'danger' || interactions.status === 'warning') {
          const alert = {
            type: 'interaction',
            severity: interactions.status,
            title: '⚠️ Posible Interacción Detectada',
            message: interactions.resumen,
            details: interactions.interactions,
            timestamp: new Date().toISOString()
          };

          // Guardar en localStorage para mostrar en dashboard
          const existing = JSON.parse(localStorage.getItem('ai_alerts') || '[]');
          existing.push(alert);
          localStorage.setItem('ai_alerts', JSON.stringify(existing.slice(-10)));

          return alert;
        }

        return null;
      } catch (e) {
        console.error('Error mostrando alerta:', e);
        return null;
      }
    },

    // ── Obtener recomendaciones de estilo de vida ────────────────
    async getLifestyleRecommendations(medications, userProfile = {}) {
      try {
        const prompt = `Dame recomendaciones de estilo de vida para alguien que toma estos medicamentos:

Medicamentos: ${medications.map(m => m.nombre || m.medicamento_nombre).join(', ')}

Perfil del usuario: ${JSON.stringify(userProfile)}

Responde EXACTAMENTE en este formato JSON:
{
  "nutricion": ["recomendación 1", "recomendación 2"],
  "ejercicio": ["recomendación 1"],
  "sueno": ["recomendación 1"],
  "hidratacion": ["recomendación 1"],
  "evitar": ["cosas a evitar"],
  "general": "consejo general"
}`;

        const response = await this.callAI(prompt);
        return this.parseJSONResponse(response) || {
          nutricion: ['Mantén una dieta balanceada'],
          ejercicio: ['Consulta a tu médico antes de hacer ejercicio'],
          sueno: ['Duerme 7-8 horas'],
          hidratacion: ['Bebe suficiente agua'],
          evitar: ['Alcohol en exceso'],
          general: 'Sigue las indicaciones de tu médico'
        };

      } catch (e) {
        console.error('[AI Assistant] Error estilo de vida:', e);
        return {
          nutricion: ['Mantén una dieta balanceada'],
          ejercicio: ['Consulta a tu médico'],
          sueno: ['Duerme bien'],
          hidratacion: ['Hidrátate'],
          evitar: [],
          general: 'Consulta a tu médico'
        };
      }
    }
  };

  // Exponer globalmente
  window.AIMedicationAssistant = AIMedicationAssistant;

})();
