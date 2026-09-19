// ================================================================
// offlineAuthService.ts — Inicio de sesión sin conexión
//
// Permite entrar cuando no hay red, pero SOLO a quien ya inició sesión
// antes en este teléfono con el servidor. Al autenticar en línea se
// guarda un hash de la contraseña; después se compara contra él.
//
// El hash vive en SecureStore (respaldado por el Keystore de Android),
// no en SQLite: así, aunque alguien extraiga la base de datos del
// dispositivo, no obtiene nada con lo que intentar adivinar la clave.
// ================================================================

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { User } from '../types';

/** Marca que la sesión activa se abrió sin conexión (no hay token real). */
export const TOKEN_SESION_OFFLINE = 'myvita-sesion-offline';

/** Repeticiones del hash: encarece un intento de adivinar por fuerza bruta. */
const ITERACIONES = 600;

interface CredencialGuardada {
  salt: string;
  hash: string;
  usuario: User;
}

/** SecureStore solo admite [A-Za-z0-9._-] en las claves. */
function claveDe(email: string): string {
  const normalizado = email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `myvita.offline.${normalizado}`;
}

async function derivar(password: string, salt: string): Promise<string> {
  let valor = `${salt}:${password}`;
  for (let i = 0; i < ITERACIONES; i++) {
    valor = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, valor);
  }
  return valor;
}

/** Comparación en tiempo constante: no revela cuánto coincidía el hash. */
function igualesSeguro(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) {
    diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diferencia === 0;
}

class OfflineAuthService {
  /**
   * Guarda la credencial para futuros inicios sin conexión.
   * Se llama únicamente tras autenticar correctamente contra el servidor.
   */
  async recordar(email: string, password: string, usuario: User): Promise<void> {
    try {
      const bytes = await Crypto.getRandomBytesAsync(16);
      const salt = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const credencial: CredencialGuardada = {
        salt,
        hash: await derivar(password, salt),
        usuario,
      };
      await SecureStore.setItemAsync(claveDe(email), JSON.stringify(credencial));
    } catch (error) {
      // No poder habilitar el modo offline no debe romper un login que sí
      // funcionó: la sesión en línea ya quedó abierta.
      console.warn('No se pudo guardar la credencial offline:', error);
    }
  }

  /**
   * Verifica email + contraseña contra lo guardado en este dispositivo.
   * Devuelve el usuario si coincide, o null si no.
   */
  async verificar(email: string, password: string): Promise<User | null> {
    try {
      const guardado = await SecureStore.getItemAsync(claveDe(email));
      if (!guardado) return null;

      const credencial: CredencialGuardada = JSON.parse(guardado);
      const hash = await derivar(password, credencial.salt);
      return igualesSeguro(hash, credencial.hash) ? credencial.usuario : null;
    } catch (error) {
      console.warn('No se pudo verificar la credencial offline:', error);
      return null;
    }
  }

  /** ¿Este correo puede entrar sin conexión en este teléfono? */
  async tieneCredencial(email: string): Promise<boolean> {
    try {
      return (await SecureStore.getItemAsync(claveDe(email))) !== null;
    } catch {
      return false;
    }
  }

  /** Olvida la credencial (al cerrar sesión de forma explícita). */
  async olvidar(email: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(claveDe(email));
    } catch {
      // Si no existía, no hay nada que hacer.
    }
  }
}

export default new OfflineAuthService();
