// ================================================================
// ai-analyzer.js — Análisis Predictivo y Sentimiento con IA
// Predice adherencia, analiza diario, detecta patrones de riesgo
// ================================================================

(function () {
  'use strict';

  const AI_CONFIG = {
    apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
    apiKey: ,
    model: 'llama-3.1-8b-instant'
  };

  const AiAnalyzer = {
    // ── Análisis de adherencia predictiva ──────────────────────
    async predictAdherence(userId) {
      try {
        const hoy = new Date().toISOString().split('T')[0];

        // Obtener historial de los últimos 30 días
        const hace30 = new Date();
        hace30.setDate(hace30.getDate() - 30);

        const historial = await window.DB.select(
          `SELECT fecha, COUNT(*) as total,
                  SUM(CASE WHEN tomado = 1 THEN 1 ELSE 0 END) as tomadas
           FROM alarmas
           WHERE usuario_id = ? AND fecha >= ? AND deleted_at IS NULL
           GROUP BY fecha
           ORDER BY fecha`,
          [userId, hace30.toISOString().split('T')[0]]
        );

        if (historial.length < 7) {
          return { status: 'insufficient_data', confidence: 0 };
        }

        // Calcular patrones
        const patrones = this.analyzePatterns(historial);
        const diaSemana = new Date().getDay();
        const horaActual = new Date().getHours();

        // Predecir riesgo de olvido hoy
        let riesgo = 0;
        let factores = [];

        // Factor 1: Adherencia baja en los últimos 3 días
        const ultimos3 = historial.slice(-3);
        const adherencia3d = ultimos3.reduce((s, d) => s + (d.tomadas/d.total), 0) / 3;
        if (adherencia3d < 0.7) {
          riesgo += 30;
          factores.push('Adherencia baja últimos 3 días');
        }

        // Factor 2: Día de la semana con mayor olvido histórico
        if (patrones.diaCritico === diaSemana) {
          riesgo += 25;
          factores.push('Hoy es tu día crítico histórico');
        }

        // Factor 3: Racha actual
        const racha = await window.DB.Stats.getRachaDias(userId);
        if (racha === 0) {
          riesgo += 20;
          factores.push('Sin racha actual (rompiste ayer)');
        } else if (racha < 3) {
          riesgo += 10;
          factores.push('Racha corta, estabilizando');
        }

        // Factor 4: Hora del día
        if (horaActual > 22) {
          riesgo += 15;
          factores.push('Tomas pendientes tarde');
        }

        // Factor 5: Cambio reciente en medicamentos
        const recientes = await window.DB.Prescripciones.getActivas(userId);
        const nuevos = recientes.filter(p => {
          const dias = (new Date() - new Date(p.fecha_inicio)) / (1000*60*60*24);
          return dias < 7;
        });
        if (nuevos.length > 0) {
          riesgo += 10;
          factores.push('Medicamentos nuevos (ajuste)');
        }

        return {
          status: riesgo >= 50 ? 'high_risk' : riesgo >= 25 ? 'medium_risk' : 'low_risk',
          score: Math.min(riesgo, 100),
          confidence: Math.min(historial.length * 3, 95),
          factors: factores,
          patterns: patrones,
          recommendations: this.getRecommendations(riesgo, factores)
        };

      } catch (e) {
        console.error('[AI Analyzer] Error adherencia:', e);
        return { status: 'error', score: 0 };
      }
    },

    // Analizar patrones del historial
    analyzePatterns(historial) {
      const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const porDia = Array(7).fill(0).map(() => ({ total: 0, tomadas: 0 }));

      historial.forEach(d => {
        const fecha = new Date(d.fecha);
        const dia = fecha.getDay();
        porDia[dia].total += d.total;
        porDia[dia].tomadas += d.tomadas;
      });

      // Encontrar día más crítico (menor adherencia)
      let diaCritico = 0;
      let minAdherencia = 1;

      porDia.forEach((d, i) => {
        if (d.total > 0) {
          const adherencia = d.tomadas / d.total;
          if (adherencia < minAdherencia) {
            minAdherencia = adherencia;
            diaCritico = i;
          }
        }
      });

      // Calcular tendencia
      const primera = historial.slice(0, 7);
      const ultima = historial.slice(-7);
      const promPrimera = primera.reduce((s, d) => s + (d.tomadas/d.total), 0) / primera.length;
      const promUltima = ultima.reduce((s, d) => s + (d.tomadas/d.total), 0) / ultima.length;

      return {
        diaCritico,
        diaCriticoNombre: diasSemana[diaCritico],
        adherenciaCritica: Math.round(minAdherencia * 100),
        tendencia: promUltima > promPrimera ? 'mejorando' :
                   promUltima < promPrimera ? 'empeorando' : 'estable',
        variacion: Math.round((promUltima - promPrimera) * 100)
      };
    },

    getRecommendations(riesgo, factores) {
      const recs = [];

      if (riesgo >= 50) {
        recs.push('⚠️ ALTA PROBABILIDAD de olvido hoy');
        recs.push('💡 Activa el modo "cuidador" para recibir recordatorios');
        recs.push('📱 Mantén la app abierta hoy');
      } else if (riesgo >= 25) {
        recs.push('⚡ Riesgo moderado - Estate atento');
        recs.push('💧 Hidratación afecta la memoria, toma agua');
      } else {
        recs.push('✅ Buen momento para mantener la racha');
      }

      if (factores.includes('Hoy es tu día crítico histórico')) {
        recs.push('📅 Pon alarmas extra hoy');
      }

      return recs;
    },

    // ── Análisis de sentimiento del diario ───────────────────
    async analyzeDiarySentiment(userId) {
      try {
        const entradas = await window.DB.Diario.getAll(userId);
        if (entradas.length < 3) {
          return { status: 'insufficient', alert: false };
        }

        const recientes = entradas.slice(0, 7);
        const promedioAnimo = recientes.reduce((s, e) => s + (e.estado_animo || 3), 0) / recientes.length;

        // Detectar síntomas repetidos
        const sintomasFrecuentes = {};
        recientes.forEach(e => {
          if (e.sintomas) {
            const lista = e.sintomas.split(',').map(s => s.trim().toLowerCase());
            lista.forEach(s => {
              sintomasFrecuentes[s] = (sintomasFrecuentes[s] || 0) + 1;
            });
          }
        });

        const sintomasPreocupantes = Object.entries(sintomasFrecuentes)
          .filter(([_, count]) => count >= 3)
          .map(([sintoma, _]) => sintoma);

        // Detectar cambio brusco (comparar con semana anterior)
        const semanaAnterior = entradas.slice(7, 14);
        let cambioAnimo = 0;
        if (semanaAnterior.length > 0) {
          const promAnterior = semanaAnterior.reduce((s, e) => s + (e.estado_animo || 3), 0) / semanaAnterior.length;
          cambioAnimo = promedioAnimo - promAnterior;
        }

        // Generar insights con IA si hay datos suficientes
        let iaInsights = null;
        if (entradas.length >= 5) {
          iaInsights = await this.getAIInsights(entradas.slice(0, 14));
        }

        return {
          status: 'success',
          promedioAnimo: Math.round(promedioAnimo),
          cambioAnimo: Math.round(cambioAnimo * 10) / 10,
          sintomasPreocupantes,
          alert: promedioAnimo < 2.5 || cambioAnimo <= -1 || sintomasPreocupantes.length > 0,
          alertLevel: promedioAnimo < 2 ? 'high' : promedioAnimo < 2.5 ? 'medium' : 'low',
          iaInsights,
          summary: {
            mensaje: cambioAnimo <= -1
              ? 'Tu estado emocional ha disminuido esta semana'
              : cambioAnimo >= 1
                ? '¡Tu estado emocional ha mejorado! 🎉'
                : 'Tu estado emocional se mantiene estable'
          }
        };

      } catch (e) {
        console.error('[AI Analyzer] Error diario:', e);
        return { status: 'error', alert: false };
      }
    },

    // Obtener insights de IA
    async getAIInsights(entradas) {
      try {
        const prompt = `Analiza estas entradas de diario de salud de los últimos ${entradas.length} días:
${entradas.map(e => {
  const fecha = e.fecha;
  const animo = ['😞','😔','😐','😊','😄'][e.estado_animo - 1] || '😐';
  return `- ${fecha}: ${animo} ${e.sintomas || ''} ${e.notas || ''}`;
}).join('\n')}

Responde en formato JSON con:
{
  "resumen": "resumen breve en 1 frase",
  "observaciones": ["observación 1", "observación 2"],
  "sugerencias": ["sugerencia 1", "sugerencia 2"],
  "recomendarConsulta": true/false,
  "motivoConsulta": "si aplica, explicar"
}`;

        const res = await fetch(AI_CONFIG.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + AI_CONFIG.apiKey
          },
          body: JSON.stringify({
            model: AI_CONFIG.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500,
            temperature: 0.3
          })
        });

        if (!res.ok) return null;

        const data = await res.json();
        const content = data.choices[0].message.content;

        // Extraer JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }

        return null;
      } catch (e) {
        return null;
      }
    },

    // ── Detección de desviación de tratamiento ────────────────
    async detectTreatmentDeviation(userId) {
      try {
        const prescripciones = await window.DB.Prescripciones.getActivas(userId);
        const desviaciones = [];

        for (const prescripcion of prescripciones) {
          // Verificar adherencia específica de esta prescripción
          const alarmas = await window.DB.Alarmas.getByPrescripcion(userId, prescripcion.id);
          const recientes = alarmas.slice(-14);

          if (recientes.length < 7) continue;

          const tomadas = recientes.filter(a => a.tomado).length;
          const adherencia = tomadas / recientes.length;

          // Detectar omisiones consecutivas
          let maxOmitidas = 0;
          let actualOmitidas = 0;
          recientes.forEach(a => {
            if (!a.tomado) {
              actualOmitidas++;
              maxOmitidas = Math.max(maxOmitidas, actualOmitidas);
            } else {
              actualOmitidas = 0;
            }
          });

          if (adherencia < 0.6 || maxOmitidas >= 3) {
            desviaciones.push({
              medicamento: prescripcion.dosis || prescripcion.medicamento_nombre,
              adherencia: Math.round(adherencia * 100),
              diasConsecutivosPerdidos: maxOmitidas,
              severidad: adherencia < 0.5 ? 'alta' : 'media',
              recomendacion: maxOmitidas >= 3
                ? 'Consulta con tu médico sobre continuidad del tratamiento'
                : 'Intenta recuperar la constancia con recordatorios adicionales'
            });
          }
        }

        return {
          status: desviaciones.length > 0 ? 'alert' : 'ok',
          desviaciones,
          totalMedicamentos: prescripciones.length
        };

      } catch (e) {
        console.error('[AI Analyzer] Error desviación:', e);
        return { status: 'error', desviaciones: [] };
      }
    },

    // ── Mostrar notificaciones inteligentes ──────────────────
    async showSmartNotifications(userId) {
      const resultados = await Promise.all([
        this.predictAdherence(userId),
        this.analyzeDiarySentiment(userId),
        this.detectTreatmentDeviation(userId)
      ]);

      const [adherencia, diario, desviacion] = resultados;
      const notificaciones = [];

      // Notificación de adherencia
      if (adherencia.status === 'high_risk') {
        notificaciones.push({
          tipo: 'advertencia',
          titulo: '⚠️ Riesgo de olvido hoy',
          mensaje: `Score de riesgo: ${adherencia.score}%. ${adherencia.recommendations[0]}`,
          accion: 'Ver recomendaciones'
        });
      }

      // Notificación de diario
      if (diario.alert && diario.alertLevel === 'high') {
        notificaciones.push({
          tipo: 'error',
          titulo: '😔 Cambio emocional detectado',
          mensaje: diario.summary.mensaje,
          accion: 'Hablar con IA'
        });
      }

      // Notificación de desviación
      if (desviacion.status === 'alert') {
        const critico = desviacion.desviaciones[0];
        notificaciones.push({
          tipo: 'error',
          titulo: '💊 Problema con ' + critico.medicamento,
          mensaje: `Solo ${critico.adherencia}% de adherencia. ${critico.recomendacion}`,
          accion: 'Ver detalles'
        });
      }

      // Guardar en localStorage para mostrar en el dashboard
      localStorage.setItem('ai_insights_' + userId, JSON.stringify({
        fecha: new Date().toISOString(),
        adherencia,
        diario,
        desviacion,
        notificaciones
      }));

      return notificaciones;
    }
  };

  // Exponer globalmente
  window.AiAnalyzer = AiAnalyzer;

  // Ejecutar análisis cada vez que se abre la app (si no se hizo hoy)
  document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('currentUserId');
    if (!userId) return;

    const ultimoAnalisis = localStorage.getItem('ai_last_analysis_' + userId);
    const hoy = new Date().toISOString().split('T')[0];

    if (ultimoAnalisis !== hoy) {
      await AiAnalyzer.showSmartNotifications(userId);
      localStorage.setItem('ai_last_analysis_' + userId, hoy);
    }
  });

})();
