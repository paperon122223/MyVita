import { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import alarmService from '../services/alarmService';
import {
  loadAlarmsStart,
  loadAlarmsSuccess,
  loadAlarmsFailure,
  updateStatistics,
} from '../redux/slices/alarmSlice';
import { Alarma, AlarmStatistics, FrecuenciaAlarma } from '../types';

interface UseAlarmsResult {
  alarms: Alarma[];
  statistics: AlarmStatistics;
  loading: boolean;
  error: string | null;
  markTaken: (alarmaId: string) => Promise<void>;
  silenceAlarm: (alarmaId: string) => Promise<void>;
  createAlarm: (
    alarm: Partial<Alarma>,
    frecuencia?: FrecuenciaAlarma,
    diasSemana?: number[],
    fechaFin?: string,
  ) => Promise<string>;
  deleteAlarm: (alarmaId: string) => Promise<void>;
  deleteAlarmSeries: (recurrenciaId: string) => Promise<void>;
  refreshAlarms: () => Promise<void>;
}

export const useAlarms = (usuarioId: string): UseAlarmsResult => {
  const dispatch = useDispatch();
  const [alarms, setAlarms] = useState<Alarma[]>([]);
  const [statistics, setStatistics] = useState<AlarmStatistics>({
    total: 0,
    tomadas: 0,
    pendientes: 0,
    silenciadas: 0,
    adherencia: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize alarm service
  const initializeAlarms = useCallback(async () => {
    try {
      setLoading(true);
      dispatch(loadAlarmsStart());

      await alarmService.init(usuarioId);
      const currentAlarms = alarmService.getAlarmas();
      const stats = await alarmService.getEstadisticas();

      setAlarms(currentAlarms);
      setStatistics(stats);
      dispatch(loadAlarmsSuccess(currentAlarms));
      dispatch(updateStatistics(stats));
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error initializing alarms';
      setError(message);
      dispatch(loadAlarmsFailure(message));
    } finally {
      setLoading(false);
    }
  }, [usuarioId, dispatch]);

  useEffect(() => {
    initializeAlarms();

    return () => {
      // Cleanup when component unmounts
      alarmService.destroy();
    };
  }, [initializeAlarms]);

  const markTaken = useCallback(
    async (alarmaId: string) => {
      try {
        setError(null);
        await alarmService.marcarComoTomada(alarmaId);
        const updated = alarmService.getAlarmas();
        const stats = await alarmService.getEstadisticas();
        setAlarms(updated);
        setStatistics(stats);
        dispatch(updateStatistics(stats));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error marking alarm as taken';
        setError(message);
        throw err;
      }
    },
    [dispatch],
  );

  const silenceAlarm = useCallback(
    async (alarmaId: string) => {
      try {
        setError(null);
        await alarmService.silenciarAlarma(alarmaId);
        const updated = alarmService.getAlarmas();
        setAlarms(updated);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error silencing alarm';
        setError(message);
        throw err;
      }
    },
    [],
  );

  const createAlarm = useCallback(
    async (
      alarm: Partial<Alarma>,
      frecuencia: FrecuenciaAlarma = 'una_vez',
      diasSemana?: number[],
      fechaFin?: string,
    ) => {
      try {
        setError(null);
        const id = await alarmService.crearAlarma(alarm, frecuencia, diasSemana, fechaFin);
        const updated = alarmService.getAlarmas();
        setAlarms(updated);
        return id;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error creating alarm';
        setError(message);
        throw err;
      }
    },
    [],
  );

  const deleteAlarm = useCallback(async (alarmaId: string) => {
    try {
      setError(null);
      await alarmService.eliminarAlarma(alarmaId);
      const updated = alarmService.getAlarmas();
      const stats = await alarmService.getEstadisticas();
      setAlarms(updated);
      setStatistics(stats);
      dispatch(updateStatistics(stats));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error deleting alarm';
      setError(message);
      throw err;
    }
  }, [dispatch]);

  const deleteAlarmSeries = useCallback(async (recurrenciaId: string) => {
    try {
      setError(null);
      await alarmService.eliminarSerie(recurrenciaId);
      const updated = alarmService.getAlarmas();
      const stats = await alarmService.getEstadisticas();
      setAlarms(updated);
      setStatistics(stats);
      dispatch(updateStatistics(stats));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error deleting alarm series';
      setError(message);
      throw err;
    }
  }, [dispatch]);

  const refreshAlarms = useCallback(async () => {
    await initializeAlarms();
  }, [initializeAlarms]);

  return {
    alarms,
    statistics,
    loading,
    error,
    markTaken,
    silenceAlarm,
    createAlarm,
    deleteAlarm,
    deleteAlarmSeries,
    refreshAlarms,
  };
};

// Hook for subscribing to statistics updates
export const useAlarmStatistics = (usuarioId: string) => {
  const [statistics, setStatistics] = useState<AlarmStatistics>({
    total: 0,
    tomadas: 0,
    pendientes: 0,
    silenciadas: 0,
    adherencia: 0,
  });

  useEffect(() => {
    const updateStats = async () => {
      try {
        const stats = await alarmService.getEstadisticas();
        setStatistics(stats);
      } catch (err) {
        console.error('Error fetching alarm statistics:', err);
      }
    };

    // Initial fetch
    updateStats();

    // Refresh every minute
    const interval = setInterval(updateStats, 60000);

    return () => clearInterval(interval);
  }, [usuarioId]);

  return statistics;
};
