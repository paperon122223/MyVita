// ================================================================
// fotoMedicamentoService.ts — Fotos de medicamentos
// Toma la foto (cámara o galería) y la copia al almacenamiento propio
// de la app. Las rutas que devuelve el selector apuntan a caché, que
// Android puede vaciar cuando le falta espacio: si se guardara esa
// ruta, la foto desaparecería sola con el tiempo.
// ================================================================

import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';

const CARPETA = 'fotos-medicamentos';

class FotoMedicamentoService {
  /** Carpeta propia de la app donde viven las fotos ya guardadas. */
  private carpeta(): Directory {
    const dir = new Directory(Paths.document, CARPETA);
    if (!dir.exists) dir.create({ intermediates: true });
    return dir;
  }

  /** Copia la foto elegida a almacenamiento permanente y devuelve su ruta. */
  private async guardarPermanente(uriTemporal: string): Promise<string> {
    const extension = uriTemporal.split('.').pop()?.split('?')[0] || 'jpg';
    const destino = new File(this.carpeta(), `med_${Date.now()}.${extension}`);
    new File(uriTemporal).copy(destino);
    return destino.uri;
  }

  /** Abre la cámara. Devuelve la ruta guardada o null si se canceló. */
  async tomarFoto(): Promise<string | null> {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) throw new Error('sin-permiso-camara');

    const resultado = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.5, // suficiente para identificar una pastilla, sin inflar la app
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (resultado.canceled || !resultado.assets?.[0]) return null;

    return this.guardarPermanente(resultado.assets[0].uri);
  }

  /** Abre la galería. Devuelve la ruta guardada o null si se canceló. */
  async elegirDeGaleria(): Promise<string | null> {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) throw new Error('sin-permiso-galeria');

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (resultado.canceled || !resultado.assets?.[0]) return null;

    return this.guardarPermanente(resultado.assets[0].uri);
  }

  /** Borra la foto del disco. Silencioso: si ya no existe, no es un error. */
  async borrar(uri?: string | null): Promise<void> {
    if (!uri || !uri.includes(CARPETA)) return;
    try {
      const archivo = new File(uri);
      if (archivo.exists) archivo.delete();
    } catch {
      // La foto pudo borrarse por fuera; no debe interrumpir el flujo.
    }
  }
}

export default new FotoMedicamentoService();
