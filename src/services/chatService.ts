// ================================================================
// chatService.ts — Asistente Médico IA · MyVita
// Habla con el backend (/api/chat/mensaje), que hace de proxy seguro
// a GROQ. El contexto médico se construye localmente desde SQLite y
// se envía como systemCtx. Si el backend no responde, degrada con un
// mensaje amable (igual que la app Cordova original).
// ================================================================

import axios from 'axios';
import DatabaseService from './database';
import { API_BASE_URL } from '../utils/constants';
import { localDateKey } from '../utils/localDate';

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface MedicalContext {
  medicamentos: any[];
  alarmasHoy: any[];
  tomadas: number;
  pendientes: number;
  adherenciaHoy: number;
  adherencia30: number;
  racha: number;
  diario: any[];
}

class ChatService {
  private history: ChatTurn[] = [];

  /** Cargar historial persistido desde SQLite */
  async cargarHistorial(usuarioId: string): Promise<ChatTurn[]> {
    try {
      const rows = await DatabaseService.getHistorialChat(usuarioId, 50);
      this.history = rows
        .filter((r) => r.rol === 'user' || r.rol === 'assistant')
        .map((r) => ({ role: r.rol as 'user' | 'assistant', content: r.contenido }));
      return [...this.history];
    } catch (e) {
      console.warn('[Chat] Error cargando historial:', e);
      return [];
    }
  }

  /** Contexto médico completo (port de cargarContexto) */
  private async cargarContexto(usuarioId: string): Promise<MedicalContext> {
    const ctx: MedicalContext = {
      medicamentos: [],
      alarmasHoy: [],
      tomadas: 0,
      pendientes: 0,
      adherenciaHoy: 0,
      adherencia30: 0,
      racha: 0,
      diario: [],
    };

    const hoy = localDateKey();

    try {
      ctx.medicamentos = await DatabaseService.getMedicamentos(usuarioId);
    } catch (e) {}

    try {
      const al = await DatabaseService.getAlarmasDelDia(usuarioId, hoy);
      ctx.alarmasHoy = al;
      ctx.tomadas = al.filter((a: any) => a.tomado === 1).length;
      ctx.pendientes = al.filter((a: any) => a.tomado !== 1).length;
      ctx.adherenciaHoy = al.length > 0 ? Math.round((ctx.tomadas / al.length) * 100) : 0;
    } catch (e) {}

    try {
      const hace30 = new Date();
      hace30.setDate(hace30.getDate() - 30);
      const rows = await DatabaseService.ejecutar(
        `SELECT tomado FROM alarmas WHERE usuario_id = ? AND fecha >= ? AND deleted_at IS NULL`,
        [usuarioId, localDateKey(hace30)],
      );
      ctx.adherencia30 =
        rows.length > 0
          ? Math.round((rows.filter((r: any) => r.tomado === 1).length / rows.length) * 100)
          : 0;
    } catch (e) {}

    try {
      ctx.racha = await DatabaseService.getRachaDias(usuarioId);
    } catch (e) {}

    try {
      ctx.diario = await DatabaseService.getDiarioReciente(usuarioId, 5);
    } catch (e) {}

    return ctx;
  }

  /** System prompt con datos del usuario (port de buildSystemPrompt) */
  private buildSystemPrompt(ctx: MedicalContext): string {
    const fecha = new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    let c = `Fecha y hora: ${fecha}, ${hora}\n\n`;

    c += '=== MEDICAMENTOS ACTIVOS ===\n';
    if (!ctx.medicamentos.length) {
      c += 'Sin medicamentos registrados.\n\n';
    } else {
      ctx.medicamentos.forEach((m: any, i: number) => {
        c += `${i + 1}. ${m.nombre}${m.dosis ? ' — ' + m.dosis : ''}${m.unidad ? ' ' + m.unidad : ''}\n`;
        if (m.descripcion) c += `   Notas: ${m.descripcion}\n`;
      });
      c += '\n';
    }

    c += '=== TOMAS DE HOY ===\n';
    if (!ctx.alarmasHoy.length) {
      // Son dos hechos distintos: puede haber medicamentos registrados
      // aunque hoy no toque ninguna toma. No confundirlos al responder.
      c += ctx.medicamentos.length
        ? 'Hoy no hay tomas programadas (el usuario sí tiene medicamentos registrados).\n\n'
        : 'Hoy no hay tomas programadas y no hay medicamentos registrados.\n\n';
    } else {
      c += `Tomadas: ${ctx.tomadas}/${ctx.alarmasHoy.length} (${ctx.adherenciaHoy}%)\n`;
      ctx.alarmasHoy.forEach((a: any) => {
        const n = a.medicamento_nombre || a.dosis || 'Medicamento';
        const est = a.tomado === 1 ? '✅' : '⏳';
        c += `  ${est} ${n} — ${a.hora_toma || '?'}\n`;
      });
      c += '\n';
    }

    c += '=== ADHERENCIA ===\n';
    c += `Hoy: ${ctx.adherenciaHoy}% | Últimos 30 días: ${ctx.adherencia30}% | Racha: ${ctx.racha} días\n\n`;

    if (ctx.diario.length) {
      c += '=== DIARIO RECIENTE ===\n';
      ctx.diario.forEach((d: any) => {
        c += `${d.fecha}:`;
        if (d.sintomas) c += ` ${d.sintomas}.`;
        if (d.contenido) c += ` ${d.contenido}.`;
        if (d.emocion) c += ` Estado: ${d.emocion}.`;
        c += '\n';
      });
      c += '\n';
    }

    return `Eres el asistente médico personal de MyVita, una app de gestión de medicamentos para pacientes en México.

${c}TU ROL:
- Tienes acceso a los datos del usuario que aparecen arriba, pero úsalos SOLO cuando la
  pregunta lo requiera. No los recites si no vienen al caso.
- Ante un saludo o charla breve ("hola", "buenos días", "gracias"), responde solo con un
  saludo corto y ofrece ayuda. NO menciones alarmas, medicamentos ni adherencia.
- Si preguntan "¿tomé mi medicamento?" revisa las tomas de hoy y responde específicamente.
- No confundas "hoy no hay tomas programadas" con "no tiene medicamentos registrados":
  son cosas distintas y arriba se indican por separado.
- Si la adherencia es baja, motiva al usuario con empatía.
- Ayuda con: efectos secundarios, qué hacer si olvidó una toma, cómo almacenar medicamentos, horarios.
- NUNCA diagnostiques enfermedades ni cambies dosis sin indicación médica.
- Recomienda consultar al médico para decisiones importantes.
- Responde en español mexicano, claro y sin tecnicismos innecesarios.
- Respuestas cortas (2-4 párrafos). Usa **negritas** para lo importante y listas cuando aplique.
- Usa emojis ocasionalmente 💊`;
  }

  /** Enviar mensaje a la IA (port de enviarMensaje) */
  async enviarMensaje(usuarioId: string, mensaje: string): Promise<string> {
    this.history.push({ role: 'user', content: mensaje });
    try {
      await DatabaseService.guardarMensajeChat(usuarioId, 'user', mensaje);
    } catch (e) {}

    try {
      const ctx = await this.cargarContexto(usuarioId);

      // El backend agrega la API key de GROQ del lado servidor
      const res = await axios.post(
        `${API_BASE_URL}/chat/mensaje`,
        {
          mensaje,
          systemCtx: this.buildSystemPrompt(ctx),
          // Historial previo (sin el último mensaje, que va en `mensaje`)
          contexto: this.history.slice(0, -1).slice(-10),
        },
        { timeout: 30000 },
      );

      const reply: string = res.data?.respuesta ?? '';

      this.history.push({ role: 'assistant', content: reply });
      try {
        await DatabaseService.guardarMensajeChat(usuarioId, 'assistant', reply);
      } catch (e) {}

      return reply;
    } catch (e: any) {
      console.error('[Chat]', e?.response?.status, e?.message);
      if (e?.response?.status === 429) {
        return 'El asistente está muy solicitado ahora mismo ⏳. Intenta de nuevo en un momento.';
      }
      return 'Lo siento, no pude conectarme ahora mismo 😔\n\nPuedes revisar tus medicamentos y alarmas directamente en la app. Si es urgente, contacta a tu médico.';
    }
  }

  /** Limpiar conversación */
  async limpiarChat(usuarioId: string): Promise<void> {
    this.history = [];
    try {
      await DatabaseService.ejecutar(`DELETE FROM chat_history WHERE usuario_id = ?`, [usuarioId]);
    } catch (e) {}
  }
}

export default new ChatService();
