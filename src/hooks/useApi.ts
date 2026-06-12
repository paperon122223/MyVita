import { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import apiService from '../services/apiService';
import { setSyncStatus, setSyncSuccess, setSyncError } from '../redux/slices/userSlice';
import { Medicamento, Alarma, SyncResponse } from '../types';

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useSyncData = (userId: string) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncedData, setSyncedData] = useState<SyncResponse | null>(null);

  const sync = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      dispatch(setSyncStatus('syncing'));

      const result = await apiService.syncData(userId);
      setSyncedData(result);
      dispatch(setSyncSuccess());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync error';
      setError(message);
      dispatch(setSyncError(message));
    } finally {
      setLoading(false);
    }
  }, [userId, dispatch]);

  return {
    sync,
    loading,
    error,
    syncedData,
  };
};

export const useFetchMedications = (userId: string): UseApiResult<Medicamento[]> => {
  const [data, setData] = useState<Medicamento[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.fetchMedications(userId);
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch medications';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
};

export const useFetchAlarms = (userId: string): UseApiResult<Alarma[]> => {
  const [data, setData] = useState<Alarma[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.fetchAlarms(userId);
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch alarms';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
};

export const useCreateMedication = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (userId: string, medication: Partial<Medicamento>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.createMedication(userId, medication);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create medication';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading, error };
};

export const useCreateAlarm = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (userId: string, alarm: Partial<Alarma>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.createAlarm(userId, alarm);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create alarm';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading, error };
};

export const useChatAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (userId: string, msg: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.sendChatMessage(userId, msg);
      return response;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { sendMessage, loading, error };
};

export const useSendSOS = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendSOS = useCallback(async (userId: string, latitude?: number, longitude?: number) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiService.sendSOS(userId, latitude, longitude);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send SOS';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { sendSOS, loading, error };
};

export const useSaveDiary = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (
      userId: string,
      date: string,
      titulo: string,
      contenido: string,
      estadoAnimo?: string,
    ) => {
      try {
        setLoading(true);
        setError(null);
        const result = await apiService.saveDiaryEntry(userId, date, titulo, contenido, estadoAnimo);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save diary entry';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { save, loading, error };
};
