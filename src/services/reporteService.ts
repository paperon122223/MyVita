// ================================================================
// reporteService.ts — Reporte de adherencia para llevar al médico
// Arma un PDF a partir del historial local (SQLite) y lo comparte
// o lo manda a imprimir. Funciona sin conexión.
// ================================================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import DatabaseService from './database';
import { localDateFromKey } from '../utils/localDate';

interface DatosReporte {
  nombrePaciente: string;
  dias: number;
}

/** Escapa texto que entra al HTML (nombres de medicamentos, notas del usuario). */
function escaparHtml(texto: string): string {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fechaLarga(fecha: Date): string {
  return fecha.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

class ReporteService {
  /** Construye el HTML del reporte con los datos locales del usuario. */
  private async construirHtml(usuarioId: string, datos: DatosReporte): Promise<string> {
    const [historial, medicamentos, racha] = await Promise.all([
      DatabaseService.getHistorialTomas(usuarioId, datos.dias),
      DatabaseService.getMedicamentos(usuarioId),
      DatabaseService.getRachaDias(usuarioId).catch(() => 0),
    ]);

    const total = historial.length;
    const tomadas = historial.filter((t: any) => t.tomado === 1).length;
    const omitidas = total - tomadas;
    const adherencia = total > 0 ? Math.round((tomadas / total) * 100) : 0;

    // Agrupar por día para el detalle
    const porFecha = new Map<string, any[]>();
    for (const toma of historial) {
      const lista = porFecha.get(toma.fecha) ?? [];
      lista.push(toma);
      porFecha.set(toma.fecha, lista);
    }

    const filasMedicamentos = medicamentos.length
      ? medicamentos
          .map(
            (m: any) => `
        <tr>
          <td>${escaparHtml(m.nombre ?? '')}</td>
          <td>${escaparHtml([m.dosis, m.unidad].filter(Boolean).join(' ') || '—')}</td>
          <td>${escaparHtml(m.descripcion || '—')}</td>
        </tr>`,
          )
          .join('')
      : '<tr><td colspan="3" class="vacio">Sin medicamentos registrados</td></tr>';

    const bloquesDias = porFecha.size
      ? Array.from(porFecha.entries())
          .map(([fecha, tomas]) => {
            const filas = tomas
              .map(
                (t: any) => `
            <tr>
              <td>${escaparHtml(t.hora_toma ?? '')}</td>
              <td>${escaparHtml(t.medicamento_nombre || 'Medicamento')}</td>
              <td>${escaparHtml(t.dosis || '—')}</td>
              <td class="${t.tomado === 1 ? 'ok' : 'falta'}">
                ${t.tomado === 1 ? 'Tomada' : 'Omitida'}
              </td>
            </tr>`,
              )
              .join('');
            return `
          <h3>${escaparHtml(fechaLarga(localDateFromKey(fecha)))}</h3>
          <table>
            <thead>
              <tr><th>Hora</th><th>Medicamento</th><th>Dosis</th><th>Estado</th></tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>`;
          })
          .join('')
      : '<p class="vacio">No hay tomas registradas en este periodo.</p>';

    return `
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, Roboto, sans-serif; color: #0B1526; padding: 28px; }
      h1 { font-size: 22px; margin: 0 0 4px; color: #1E3FE0; }
      h2 { font-size: 16px; margin: 26px 0 8px; border-bottom: 2px solid #DCEAFE; padding-bottom: 4px; }
      h3 { font-size: 13px; margin: 16px 0 6px; color: #48566B; text-transform: capitalize; }
      .sub { color: #48566B; font-size: 12px; margin: 0 0 18px; }
      .tarjetas { display: flex; gap: 10px; margin-bottom: 8px; }
      .tarjeta { flex: 1; border: 1px solid #D7E1EF; border-radius: 8px; padding: 12px; text-align: center; }
      .tarjeta .num { font-size: 24px; font-weight: bold; }
      .tarjeta .lbl { font-size: 11px; color: #48566B; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { background: #EAF1FE; text-align: left; padding: 7px; font-size: 11px; }
      td { padding: 7px; border-bottom: 1px solid #EEF2F7; }
      .ok { color: #1FAE4A; font-weight: bold; }
      .falta { color: #E53935; font-weight: bold; }
      .vacio { color: #7A8AA0; font-style: italic; }
      .pie { margin-top: 28px; font-size: 10px; color: #7A8AA0; border-top: 1px solid #D7E1EF; padding-top: 10px; }
    </style>
  </head>
  <body>
    <h1>Reporte de adherencia</h1>
    <p class="sub">
      <strong>${escaparHtml(datos.nombrePaciente)}</strong><br />
      Periodo: últimos ${datos.dias} días · Generado el ${escaparHtml(fechaLarga(new Date()))}
    </p>

    <div class="tarjetas">
      <div class="tarjeta"><div class="num" style="color:#1E3FE0">${adherencia}%</div><div class="lbl">Adherencia</div></div>
      <div class="tarjeta"><div class="num" style="color:#1FAE4A">${tomadas}</div><div class="lbl">Tomadas</div></div>
      <div class="tarjeta"><div class="num" style="color:#E53935">${omitidas}</div><div class="lbl">Omitidas</div></div>
      <div class="tarjeta"><div class="num">${racha}</div><div class="lbl">Racha (días)</div></div>
    </div>

    <h2>Medicamentos registrados</h2>
    <table>
      <thead><tr><th>Medicamento</th><th>Dosis</th><th>Notas</th></tr></thead>
      <tbody>${filasMedicamentos}</tbody>
    </table>

    <h2>Detalle por día</h2>
    ${bloquesDias}

    <p class="pie">
      Generado por MyVita a partir de los registros del propio paciente.
      Es un apoyo informativo y no sustituye la valoración de un profesional de la salud.
    </p>
  </body>
</html>`;
  }

  /** Genera el PDF y abre el menú para compartirlo (WhatsApp, correo, guardar…). */
  async compartir(usuarioId: string, datos: DatosReporte): Promise<void> {
    const html = await this.construirHtml(usuarioId, datos);
    const { uri } = await Print.printToFileAsync({ html });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Compartir reporte médico',
        UTI: 'com.adobe.pdf',
      });
    } else {
      // Sin app para compartir: al menos ofrecer imprimir.
      await Print.printAsync({ html });
    }
  }

  /** Manda el reporte directo al diálogo de impresión del sistema. */
  async imprimir(usuarioId: string, datos: DatosReporte): Promise<void> {
    const html = await this.construirHtml(usuarioId, datos);
    await Print.printAsync({ html });
  }
}

export default new ReporteService();
