import { BleManager, Device } from 'react-native-ble-plx';
import { Permission, PermissionsAndroid, Platform } from 'react-native';
import { BLE_SCAN_TIMEOUT, BLE_HEARTBEAT_INTERVAL, BLE_MAX_RECONNECT_ATTEMPTS } from '../utils/constants';
import { BLEDevice } from '../types';

interface PillDispenserStatus {
  pillTaken: boolean;
  batteryLevel: number;
  lastSync: string;
  dispenserId: string;
}

class BLEService {
  private manager = new BleManager();
  private connectedDevice: Device | null = null;
  private reconnectAttempts = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupAndroid();
  }

  private setupAndroid() {
    if (Platform.OS === 'android') {
      this.requestAndroidPermissions();
    }
  }

  private async requestAndroidPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const permissions: Permission[] = [
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.BLUETOOTH_CONNECT',
        'android.permission.ACCESS_FINE_LOCATION',
      ];

      const result = await PermissionsAndroid.requestMultiple(permissions);
      return Object.values(result).every((perm) => perm === 'granted');
    } catch (error) {
      console.error('Error requesting BLE permissions:', error);
      return false;
    }
  }

  async scanForDevice(deviceName: string): Promise<BLEDevice | null> {
    try {
      const permissionGranted = await this.requestAndroidPermissions();
      if (!permissionGranted && Platform.OS === 'android') {
        throw new Error('Permisos de Bluetooth no otorgados');
      }

      let foundDevice: BLEDevice | null = null;

      this.manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error('BLE scan error:', error);
          return;
        }

        if (device?.name === deviceName) {
          foundDevice = {
            id: device.id,
            name: device.name || 'Unknown',
            rssi: device.rssi || -100,
            isConnectable: device.isConnectable ?? true,
          };
          this.manager.stopDeviceScan();
        }
      });

      // Wait for scan to complete
      await new Promise((resolve) => setTimeout(resolve, BLE_SCAN_TIMEOUT));
      this.manager.stopDeviceScan();

      return foundDevice;
    } catch (error) {
      console.error('Error scanning for BLE device:', error);
      throw error;
    }
  }

  async connectToDevice(deviceId: string): Promise<Device> {
    try {
      const device = await this.manager.connectToDevice(deviceId, {
        autoConnect: true,
        timeout: 10000,
      });

      await device.discoverAllServicesAndCharacteristics();
      this.connectedDevice = device;
      this.reconnectAttempts = 0;

      // Start heartbeat
      this.startHeartbeat();

      return device;
    } catch (error) {
      console.error('Error connecting to BLE device:', error);
      this.handleConnectionError();
      throw error;
    }
  }

  async readPillStatus(): Promise<PillDispenserStatus> {
    if (!this.connectedDevice) {
      throw new Error('Dispositivo no conectado');
    }

    try {
      // This assumes you know the service and characteristic UUIDs
      // Replace with actual UUIDs from your pill dispenser
      const SERVICE_UUID = '12345678-1234-1234-1234-123456789012';
      const CHARACTERISTIC_UUID = 'abcdef00-1234-1234-1234-123456789012';

      const characteristic = await this.connectedDevice.readCharacteristicForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
      );

      const value = characteristic.value;
      if (!value) {
        throw new Error('No value received from device');
      }

      // Parse the response (adapt to your protocol)
      const bytes = Buffer.from(value, 'base64');
      return {
        pillTaken: bytes[0] === 1,
        batteryLevel: bytes[1],
        lastSync: new Date().toISOString(),
        dispenserId: this.connectedDevice.id,
      };
    } catch (error) {
      console.error('Error reading pill status:', error);
      throw error;
    }
  }

  async writePillStatus(status: Partial<PillDispenserStatus>): Promise<void> {
    if (!this.connectedDevice) {
      throw new Error('Dispositivo no conectado');
    }

    try {
      const SERVICE_UUID = '12345678-1234-1234-1234-123456789012';
      const CHARACTERISTIC_UUID = 'abcdef01-1234-1234-1234-123456789012';

      // Create payload (adapt to your protocol)
      const payload = Buffer.alloc(10);
      payload[0] = status.pillTaken ? 1 : 0;
      payload.write(JSON.stringify({ timestamp: Date.now() }), 1);

      await this.connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        payload.toString('base64'),
      );
    } catch (error) {
      console.error('Error writing pill status:', error);
      throw error;
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      try {
        if (this.connectedDevice) {
          await this.readPillStatus();
          this.reconnectAttempts = 0; // Reset on successful heartbeat
        }
      } catch (error) {
        console.warn('Heartbeat check failed:', error);
        this.handleConnectionError();
      }
    }, BLE_HEARTBEAT_INTERVAL);
  }

  private handleConnectionError(): void {
    this.reconnectAttempts++;

    if (this.reconnectAttempts < BLE_MAX_RECONNECT_ATTEMPTS) {
      if (!this.reconnectInterval) {
        this.reconnectInterval = setInterval(() => {
          if (this.connectedDevice) {
            this.connectToDevice(this.connectedDevice.id).catch(() => {
              console.warn('Reconnection attempt failed');
            });
          }
        }, 5000);
      }
    } else {
      this.disconnect();
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
      }

      if (this.connectedDevice) {
        await this.manager.cancelDeviceConnection(this.connectedDevice.id);
        this.connectedDevice = null;
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }

  isConnected(): boolean {
    return !!this.connectedDevice;
  }

  getConnectedDeviceId(): string | null {
    return this.connectedDevice?.id ?? null;
  }

  destroy(): void {
    this.disconnect().catch(() => {});
    this.manager.destroy();
  }
}

export default new BLEService();
