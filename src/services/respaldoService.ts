// ================================================================
// respaldoService.ts — Copia de seguridad y restauración
//
// Exporta los datos del usuario a un archivo JSON que puede guardarse
// en Drive, enviarse por correo o pasarse a otro teléfono. La sincronización
// con el servidor solo cubre medicamentos y alarmas, así que sin esto el
// historial, el diario y el inventario se perderían al cambiar de equipo.
// ================================================================

import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import DatabaseService from './database';

/** Sube al cambiar el formato, para poder rechazar archivos incompatibles. */
const VERSION_FORMATO = 1;

/** Tablas incluidas. El orden importa al restaurar: primero las referenciadas. */
const TABLAS = [
  'medicamentos',
  'alarmas',
  'tomas',
  'inventario',
  'diario_entradas',
  'contactos_emergencia',
] as const;

interface ArchivoRespaldo {
  formato: number;
  generado: string;
  usuarioId: string;
  datos: Record<string, any[]>;
}

class RespaldoService {
  /** Genera el archivo de respaldo y abre el menú para guardarlo o enviarlo. */
  async exportar(usuarioId: string): Promise<number> {
    if (!usuarioId) throw new Error('Falta el usuario');

    const datos: Record<string, any[]> = {};
    let totalRegistros = 0;

    for (const tabla of TABLAS) {
      const filas = await DatabaseService.ejecutar(
        `SELECT * FROM ${tabla} WHERE usuario_id = ?`,
        [usuarioId],
      );
      datos[tabla] = filas ?? [];
      totalRegistros += datos[tabla].length;
    }

    const contenido: ArchivoRespaldo = {
      formato: VERSION_FORMATO,
      generado: new Date().toISOString(),
      usuarioId,
      datos,
    };

    const fecha = new Date().toISOString().slice(0, 10);
    const archivo = new File(Paths.cache, `myvita-respaldo-${fecha}.json`);
    if (archivo.exists) archivo.delete();
    archivo.create();
    archivo.write(JSON.stringify(contenido, null, 2));

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(archivo.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Guardar copia de seguridad',
      });
    }

    return totalRegistros;
  }

  /**
   * Restaura desde un archivo elegido por el usuario.
   * Reemplaza los datos actuales del usuario por los del respaldo.
   */
  async importar(usuarioId: string): Promise<number> {
    if (!usuarioId) throw new Error('Falta el usuario');

    const resultado = await File.pickFileAsync({ mimeTypes: ['application/json'] });
    const elegido = Array.isArray(resultado) ? resultado[0] : resultado;
    if (!elegido) return 0;

    const uri = (elegido as any).uri ?? elegido;
    const contenido: ArchivoRespaldo = JSON.parse(new File(uri).textSync());

    if (contenido.formato !== VERSION_FORMATO || !contenido.datos) {
      throw new Error('formato-invalido');
    }

    const database = await DatabaseService.getDB();
    const registros: Record<string, Record<string, any>[]> = {};
    // Validar el archivo entero antes de modificar cualquier dato.
    for (const tabla of TABLAS) {
      const filas = contenido.datos[tabla] ?? [];
      if (!Array.isArray(filas)) throw new Error('formato-invalido');
      const esquema = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${tabla})`);
      const permitidas = new Set(esquema.map(columna => columna.name));
      registros[tabla] = filas.map(fila => {
        if (!fila || typeof fila !== 'object' || Array.isArray(fila) || typeof fila.id !== 'string') {
          throw new Error('formato-invalido');
        }
        if (Object.keys(fila).some(columna => !permitidas.has(columna))) {
          throw new Error('formato-invalido');
        }
        return { ...fila, usuario_id: usuarioId };
      });
    }

    let restaurados = 0;
    await database.withExclusiveTransactionAsync(async transaction => {
      for (const tabla of [...TABLAS].reverse()) {
        await transaction.runAsync(`DELETE FROM ${tabla} WHERE usuario_id = ?`, [usuarioId]);
      }
      for (const tabla of TABLAS) {
        for (const registro of registros[tabla]) {
          const columnas = Object.keys(registro);
          const marcadores = columnas.map(() => '?').join(', ');
          // Un conflicto con otra cuenta aborta la restauración, sin sobrescribirla.
          await transaction.runAsync(
            `INSERT INTO ${tabla} (${columnas.map(columna => '"' + columna + '"').join(', ')}) VALUES (${marcadores})`,
            columnas.map(columna => registro[columna]),
          );
          restaurados++;
        }
      }
    });

    return restaurados;
  }
}

export default new RespaldoService();
