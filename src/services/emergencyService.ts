// ================================================================
// emergencyService.ts — Envío de alerta SOS por WhatsApp y SMS
// + selector de contactos del teléfono + ubicación actual.
// ================================================================

import { Linking, Platform } from 'react-native';
import * as Contacts from 'expo-contacts';
import * as SMS from 'expo-sms';
import * as Location from 'expo-location';

export interface ContactoElegido {
  id: string;
  nombre: string;
  telefono: string;
}

export interface UbicacionEmergencia {
  latitude: number;
  longitude: number;
  link: string;
}

export const EmergencyService = {
  /** Carga la agenda después de solicitar permiso y omite contactos sin teléfono. */
  async obtenerContactosTelefono(): Promise<ContactoElegido[]> {
    let permiso = await Contacts.getPermissionsAsync();
    if (permiso.status !== 'granted') {
      permiso = await Contacts.requestPermissionsAsync();
    }
    if (permiso.status !== 'granted') {
      throw new Error('CONTACTS_PERMISSION_DENIED');
    }

    const fields = [
      Contacts.ContactField.FULL_NAME,
      Contacts.ContactField.GIVEN_NAME,
      Contacts.ContactField.FAMILY_NAME,
      Contacts.ContactField.PHONES,
    ] as const;
    const agenda = await Contacts.Contact.getAllDetails(fields, {
      sortOrder: Contacts.ContactsSortOrder.GivenName,
    });

    return agenda.flatMap((contacto) => {
      const nombre =
        contacto.fullName ||
        [contacto.givenName, contacto.familyName].filter(Boolean).join(' ') ||
        'Sin nombre';
      return (contacto.phones || [])
        .map((phone, index) => ({
          id: `${contacto.id}_${phone.id || index}`,
          nombre,
          telefono: (phone.number || '').trim(),
        }))
        .filter((contacto) => contacto.telefono.length > 0);
    });
  },

  /**
   * Abrir el selector de contactos NATIVO del sistema y devolver el elegido.
   * Es mucho más fiable que leer toda la agenda (que falla/cuelga en varios
   * Android) y NO requiere el permiso READ_CONTACTS: el propio sistema maneja
   * la selección. Devuelve null si el usuario cancela.
   */
  async seleccionarContactoNativo(): Promise<ContactoElegido | null> {
    // Preferir la API orientada a objetos (Contact) cuando esté disponible.
    const ContactClass: any = (Contacts as any).Contact;

    // Helper para extraer número desde distintas formas que puede devolver la API.
    const extraerTelefono = (obj: any) => {
      if (!obj) return '';
      return (
        (obj.phones?.[0]?.number ?? obj.phones?.[0]?.value ?? obj.phoneNumbers?.[0]?.number ?? obj.phoneNumbers?.[0]?.value ?? '') + ''
      ).trim();
    };

    // 1) Si la nueva API expone un picker, usarlo.
    try {
      if (ContactClass && typeof ContactClass.presentPickerAsync === 'function') {
        const picked: any = await ContactClass.presentPickerAsync();
        if (!picked) return null;
        let telefono = extraerTelefono(picked);
        const nombre = picked.fullName || picked.name || [picked.firstName, picked.lastName].filter(Boolean).join(' ') || 'Sin nombre';

        // Si no tiene teléfono, intentar obtener detalles desde la instancia Contact.
        if (!telefono && picked.id) {
          try {
            const instance = new ContactClass(picked.id);
            const details = typeof instance.getDetails === 'function'
              ? await instance.getDetails(((Contacts as any).ContactField ? [ (Contacts as any).ContactField.PHONES ] : []))
              : null;
            telefono = extraerTelefono(details || picked);
          } catch {
            // ignore
          }
        }

        return { id: picked.id || nombre, nombre, telefono };
      }

      // 2) Fallback: la API legacy aún puede estar disponible en la raíz.
      if (typeof (Contacts as any).presentContactPickerAsync === 'function') {
        const contacto = await (Contacts as any).presentContactPickerAsync();
        if (!contacto) return null;

        let telefono = (contacto.phoneNumbers?.[0]?.number ?? '').trim();
        const nombre = contacto.name || [contacto.firstName, contacto.lastName].filter(Boolean).join(' ') || 'Sin nombre';

        if (!telefono && contacto.id) {
          try {
            let fullContact: any = null;
            try {
              fullContact = await (Contacts as any).getContactByIdAsync(contacto.id, [Contacts.Fields.PhoneNumbers]);
            } catch {
              try {
                fullContact = await (Contacts as any).getContactByIdAsync(contacto.id, { fields: [Contacts.Fields.PhoneNumbers] });
              } catch {
                fullContact = null;
              }
            }
            telefono = (fullContact?.phoneNumbers?.[0]?.number ?? '').trim();
          } catch {
            // ignore
          }
        }

        return { id: contacto.id || nombre, nombre, telefono };
      }
    } catch (e) {
      // Si hay cualquier error con la nueva API, continuar a otros intentos.
    }

    // 3) Último recurso: intentar cargar contactos mediante ContactClass.getAllDetails y mostrar el primero.
    try {
      if (ContactClass && typeof ContactClass.getAllDetails === 'function') {
        const ContactField = (Contacts as any).ContactField || (Contacts as any).Fields || {};
        const FIELDS = [ContactField.FULL_NAME || ContactField.NAME, ContactField.PHONES || ContactField.PhoneNumbers].filter(Boolean);
        const detalles = await ContactClass.getAllDetails(FIELDS, { limit: 1 });
        const first = detalles?.[0];
        if (first) {
          const nombre = first.fullName || first.name || [first.firstName, first.lastName].filter(Boolean).join(' ') || 'Sin nombre';
          const telefono = extraerTelefono(first);
          return { id: first.id || nombre, nombre, telefono };
        }
      }
    } catch {
      // ignore
    }

    // Si no se pudo obtener nada, devolver null para indicar cancelación/error.
    return null;
  },


  /**
   * Obtener un enlace de Google Maps con la ubicación actual.
   * Devuelve null si no hay permiso o falla.
   */
  async getUbicacionActual(): Promise<UbicacionEmergencia | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = loc.coords;
      return {
        latitude,
        longitude,
        link: `https://www.google.com/maps?q=${latitude},${longitude}`,
      };
    } catch {
      return null;
    }
  },

  /**
   * Construir el mensaje de emergencia.
   */
  construirMensaje(nombreUsuario: string, ubicacionLink: string | null): string {
    let msg = `🆘 EMERGENCIA - MyVita\n\n${nombreUsuario || 'Tu contacto'} necesita ayuda urgente.`;
    if (ubicacionLink) {
      msg += `\n\n📍 Mi ubicación actual:\n${ubicacionLink}`;
    }
    msg += `\n\nPor favor, contáctame lo antes posible.`;
    return msg;
  },

  /**
   * Normalizar teléfono para WhatsApp (solo dígitos + lada).
   * Si son 10 dígitos (México), antepone 52.
   */
  formatoWhatsApp(telefono: string): string {
    let digits = telefono.replace(/\D/g, '');
    if (digits.length === 10) digits = '52' + digits;
    return digits;
  },

  /**
   * Enviar la alerta por WhatsApp a un contacto (abre WhatsApp con el mensaje).
   */
  async enviarWhatsApp(telefono: string, mensaje: string): Promise<boolean> {
    const numero = this.formatoWhatsApp(telefono);
    const url = `whatsapp://send?phone=${numero}&text=${encodeURIComponent(mensaje)}`;
    const fallback = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
    try {
      const soportado = await Linking.canOpenURL(url);
      await Linking.openURL(soportado ? url : fallback);
      return true;
    } catch {
      try {
        await Linking.openURL(fallback);
        return true;
      } catch {
        return false;
      }
    }
  },

  /**
   * Enviar la alerta por SMS a uno o varios contactos (abre la app de SMS).
   */
  async enviarSMS(
    telefonos: string[],
    mensaje: string,
  ): Promise<'sent' | 'cancelled' | 'unknown' | 'unavailable'> {
    const disponible = await SMS.isAvailableAsync();
    if (!disponible) return 'unavailable';
    const numeros = telefonos.map((t) => t.replace(/\s/g, '')).filter(Boolean);
    if (numeros.length === 0) return 'unavailable';
    const response = await SMS.sendSMSAsync(numeros, mensaje);
    return response.result;
  },
};

export default EmergencyService;
