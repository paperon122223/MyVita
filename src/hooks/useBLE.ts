import { useEffect, useState, useCallback } from 'react';
import bleService from '../services/bleService';
import { BLEDevice } from '../types';

interface UseBLEScanResult {
  devices: BLEDevice[];
  scanning: boolean;
  error: string | null;
  scanForDevice: (deviceName: string) => Promise<BLEDevice | null>;
  stopScanning: () => void;
}

export const useBLEScan = (): UseBLEScanResult => {
  const [devices, setDevices] = useState<BLEDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanForDevice = useCallback(async (deviceName: string) => {
    try {
      setScanning(true);
      setError(null);
      const found = await bleService.scanForDevice(deviceName);
      if (found) {
        setDevices((prev) => {
          const existing = prev.find((d) => d.id === found.id);
          if (existing) return prev;
          return [...prev, found];
        });
        return found;
      }
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'BLE scan error';
      setError(message);
      return null;
    } finally {
      setScanning(false);
    }
  }, []);

  const stopScanning = useCallback(() => {
    setScanning(false);
  }, []);

  return {
    devices,
    scanning,
    error,
    scanForDevice,
    stopScanning,
  };
};

interface UseBLEConnectionResult {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  pillStatus: {
    taken: boolean;
    battery: number;
    lastSync: string | null;
  } | null;
  connect: (deviceId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  readStatus: () => Promise<void>;
  writePillTaken: (taken: boolean) => Promise<void>;
}

export const useBLEConnection = (): UseBLEConnectionResult => {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pillStatus, setPillStatus] = useState<{
    taken: boolean;
    battery: number;
    lastSync: string | null;
  } | null>(null);

  const connect = useCallback(async (deviceId: string) => {
    try {
      setConnecting(true);
      setError(null);
      await bleService.connectToDevice(deviceId);
      setConnected(true);

      // Read initial status
      const status = await bleService.readPillStatus();
      setPillStatus({
        taken: status.pillTaken,
        battery: status.batteryLevel,
        lastSync: status.lastSync,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await bleService.disconnect();
      setConnected(false);
      setPillStatus(null);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Disconnection failed';
      setError(message);
    }
  }, []);

  const readStatus = useCallback(async () => {
    try {
      setError(null);
      const status = await bleService.readPillStatus();
      setPillStatus({
        taken: status.pillTaken,
        battery: status.batteryLevel,
        lastSync: status.lastSync,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read status';
      setError(message);
    }
  }, []);

  const writePillTaken = useCallback(
    async (taken: boolean) => {
      try {
        setError(null);
        await bleService.writePillStatus({
          pillTaken: taken,
        });
        setPillStatus((prev) => (prev ? { ...prev, taken } : null));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to write status';
        setError(message);
      }
    },
    [],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connected) {
        bleService.disconnect().catch(() => {});
      }
    };
  }, [connected]);

  return {
    connected,
    connecting,
    error,
    pillStatus,
    connect,
    disconnect,
    readStatus,
    writePillTaken,
  };
};
