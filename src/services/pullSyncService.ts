// ================================================================
// pullSyncService.ts — Sync de bajada (servidor → SQLite local)
//
// El resto de la sincronización (apiService.syncData) solo sube cambios
// locales. Esto cubre el otro sentido: trae lo que se creó/editó del
// lado del servidor (por ejemplo, desde el futuro skill de Alexa) y lo
// mete en SQLite para que alarmService lo agarre y programe la
// notificación nativa. Se llama al volver la app a primer plano, en el
// watchdog periódico, y cuando llega la push silenciosa "alarm-sync".
// ================================================================

import authenticatedClient from './authenticatedClient';
import DatabaseService from './database';
import authService from './authService';
import { TOKEN_SESION_OFFLINE } from './offlineAuthService';

const TABLAS_A_BAJAR = ['medicamentos', 'alarmas'] as const;

/** Inserta la fila del servidor solo si es más nueva que la que ya hay localmente. */
async function upsertSiMasReciente(tabla: string, fila: Record<string, any>): Promise<boolean> {
  const existentes = await DatabaseService.ejecutar(
    `SELECT updated_at FROM ${tabla} WHERE id = ?`,
    [fila.id],
  );
  const localUpdatedAt = existentes?.[0]?.updated_at;

  // Comparación por fecha real: Postgres devuelve "...+00:00" y SQLite
  // guarda "...Z" — comparar los strings tal cual daría resultados falsos.
  if (localUpdatedAt && new Date(localUpdatedAt).getTime() >= new Date(fila.updated_at).getTime()) {
    return false;
  }

  const registro: Record<string, any> = { ...fila, synced_at: fila.updated_at };
  const columnas = Object.keys(registro);
  const marcadores = columnas.map(() => '?').join(', ');

  await DatabaseService.ejecutar(
    `INSERT OR REPLACE INTO ${tabla} (${columnas.join(', ')}) VALUES (${marcadores})`,
    columnas.map((c) => registro[c]),
  );
  return true;
}

class PullSyncService {
  /**
   * Trae medicamentos y alarmas del servidor. Devuelve true si algo cambió
   * localmente. El backend deriva la identidad del JWT (ya no acepta
   * usuario_id por query) — en sesión offline no hay token real, así que
   * no hay nada que bajar todavía.
   */
  async pullServerChanges(_usuarioId: string): Promise<boolean> {
    const authToken = await authService.getStoredToken();
    if (!authToken || authToken === TOKEN_SESION_OFFLINE) return false;

    let huboCambios = false;

    for (const tabla of TABLAS_A_BAJAR) {
      try {
        const { data } = await authenticatedClient.get<{ data: Record<string, any>[] }>(
          `/sync/${tabla}`,
          { timeout: 15000 },
        );

        for (const fila of data?.data ?? []) {
          const escrito = await upsertSiMasReciente(tabla, fila);
          if (escrito) huboCambios = true;
        }
      } catch (error) {
        // Sin red o backend caído: el watchdog local vuelve a intentarlo pronto.
        console.warn(`[pull-sync] No se pudo bajar ${tabla}:`, error);
      }
    }

    return huboCambios;
  }
}

export default new PullSyncService();
