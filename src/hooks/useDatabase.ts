import { useEffect, useState, useCallback } from 'react';
import databaseService from '../services/database';
import { Medicamento, Alarma, Toma, Cuidador, ContactoEmergencia } from '../types';

interface UseDatabaseState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useAlarmasDelDia = (usuarioId: string, fecha: string): UseDatabaseState<Alarma[]> => {
  const [data, setData] = useState<Alarma[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await databaseService.getAlarmasDelDia(usuarioId, fecha);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching alarms');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [usuarioId, fecha]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
};

export const useMedicamentos = (usuarioId: string): UseDatabaseState<Medicamento[]> => {
  const [data, setData] = useState<Medicamento[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await databaseService.getMedicamentos(usuarioId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching medications');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [usuarioId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
};

export const useTomas = (usuarioId: string, fecha: string): UseDatabaseState<Toma[]> => {
  const [data, setData] = useState<Toma[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch tomas for a specific date
      const result = await databaseService.ejecutar(
        `SELECT t.*, t.usuario_id AS usuarioId, t.alarma_id AS alarmaId,
                t.medicamento_id AS medicamentoId, a.fecha,
                t.hora_toma AS horaProgramada, t.hora_tomada AS horaRegistrada,
                t.confirmado AS tomada
           FROM tomas t JOIN alarmas a ON a.id = t.alarma_id
          WHERE t.usuario_id = ? AND a.fecha = ?
            AND t.deleted_at IS NULL AND a.deleted_at IS NULL
          ORDER BY t.hora_toma`,
        [usuarioId, fecha],
      );
      setData((result || []).map((row: any) => ({ ...row, tomada: !!row.tomada })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las tomas');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [usuarioId, fecha]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
};

export const useCuidadores = (usuarioId: string): UseDatabaseState<Cuidador[]> => {
  const [data, setData] = useState<Cuidador[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await databaseService.ejecutar(
        `SELECT c.*, c.usuario_id AS usuarioId, u.nombre, c.rol AS relacion,
                c.autorizado AS notificaciones
           FROM cuidadores c LEFT JOIN usuarios u ON u.id = c.cuidador_id AND u.deleted_at IS NULL
          WHERE c.usuario_id = ? AND c.deleted_at IS NULL
          ORDER BY u.nombre`,
        [usuarioId],
      );
      setData((result || []).map((row: any) => ({ ...row, notificaciones: !!row.notificaciones })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los cuidadores');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [usuarioId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
};

export const useContactosEmergencia = (usuarioId: string): UseDatabaseState<ContactoEmergencia[]> => {
  const [data, setData] = useState<ContactoEmergencia[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await databaseService.ejecutar(
        'SELECT * FROM contactos_emergencia WHERE usuario_id = ? AND deleted_at IS NULL ORDER BY prioridad',
        [usuarioId],
      );
      setData(result || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching emergency contacts');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [usuarioId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
};

export const useCreateAlarma = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (alarma: any) => {
    try {
      setLoading(true);
      setError(null);
      const id = await databaseService.crearAlarma(alarma);
      return id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creating alarm';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading, error };
};

export const useMarkAlarmaAsTaken = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markTaken = useCallback(async (alarmaId: string) => {
    try {
      setLoading(true);
      setError(null);
      await databaseService.marcarAlamaComoTomada(alarmaId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error marking alarm as taken';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { markTaken, loading, error };
};
