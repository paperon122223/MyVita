// ================================================================
// demoDataService.ts — Datos de ejemplo para presentaciones
// Siembra medicamentos, alarmas con historial, inventario y diario
// para que la app se vea con contenido real en una demostración.
// No se usa en el uso normal de la app.
// ================================================================

import DatabaseService from './database';
import { addLocalDays, localDateKey } from '../utils/localDate';

interface MedicamentoDemo {
  nombre: string;
  dosis: string;
  unidad: string;
  descripcion: string;
  horas: string[];
  /** Existencias iniciales; un valor bajo dispara el aviso de "compra más". */
  existencias: number;
}

const MEDICAMENTOS: MedicamentoDemo[] = [
  {
    nombre: 'Losartán',
    dosis: '50',
    unidad: 'mg',
    descripcion: 'Para la presión arterial. Tomar con alimentos.',
    horas: ['08:00', '20:00'],
    existencias: 3, // dispara el aviso de por agotarse
  },
  {
    nombre: 'Metformina',
    dosis: '850',
    unidad: 'mg',
    descripcion: 'Para la diabetes. Después de comer.',
    horas: ['09:00', '21:00'],
    existencias: 42,
  },
  {
    nombre: 'Atorvastatina',
    dosis: '20',
    unidad: 'mg',
    descripcion: 'Para el colesterol. Por la noche.',
    horas: ['22:00'],
    existencias: 18,
  },
  {
    nombre: 'Aspirina',
    dosis: '100',
    unidad: 'mg',
    descripcion: 'Preventivo. Una vez al día.',
    horas: ['08:30'],
    existencias: 60,
  },
];

const DIARIO = [
  { diasAtras: 0, emocion: 'bien', sintomas: '', contenido: 'Me sentí con energía todo el día.' },
  {
    diasAtras: 2,
    emocion: 'normal',
    sintomas: 'Dolor de cabeza leve',
    contenido: 'Dormí poco, pero mejoré por la tarde.',
  },
  {
    diasAtras: 5,
    emocion: 'muy_bien',
    sintomas: '',
    contenido: 'Salí a caminar 30 minutos con mi hija.',
  },
];

/** Patrón de adherencia por día (14 días): true = se tomó. */
const PATRON_ADHERENCIA = [
  true, true, true, false, true, true, true,
  true, false, true, true, true, true, true,
];

class DemoDataService {
  /**
   * Crea datos de ejemplo de los últimos 14 días.
   * Devuelve un resumen de lo insertado.
   */
  async cargar(usuarioId: string): Promise<{ medicamentos: number; alarmas: number }> {
    if (!usuarioId) throw new Error('Falta el usuario');

    const hoy = new Date();
    let alarmasCreadas = 0;

    for (const med of MEDICAMENTOS) {
      const medicamentoId = await DatabaseService.crearMedicamento({
        usuarioId,
        nombre: med.nombre,
        dosis: med.dosis,
        unidad: med.unidad,
        descripcion: med.descripcion,
      });

      await DatabaseService.guardarInventario(usuarioId, medicamentoId, med.existencias);

      // Historial de los últimos 14 días (13 atrás + hoy)
      for (let diasAtras = 13; diasAtras >= 0; diasAtras--) {
        const fecha = localDateKey(addLocalDays(hoy, -diasAtras));
        const esHoy = diasAtras === 0;

        for (const hora of med.horas) {
          const alarmaId = await DatabaseService.crearAlarma({
            usuarioId,
            medicamentoId,
            medicamentoNombre: med.nombre,
            dosis: `${med.dosis} ${med.unidad}`,
            horaToma: hora,
            fecha,
          });
          alarmasCreadas++;

          // Las de hoy se dejan pendientes salvo las de la mañana, para que
          // el panel muestre a la vez tomas hechas y por hacer.
          const tomada = esHoy
            ? hora < '12:00'
            : PATRON_ADHERENCIA[diasAtras % PATRON_ADHERENCIA.length];

          if (tomada) {
            await DatabaseService.ejecutar(`UPDATE alarmas SET tomado = 1 WHERE id = ?`, [
              alarmaId,
            ]);
          }
        }
      }
    }

    // Entradas de diario
    const ahora = new Date().toISOString();
    for (const entrada of DIARIO) {
      await DatabaseService.ejecutar(
        `INSERT INTO diario_entradas (
           id, usuario_id, fecha, contenido, sintomas, emocion, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `diario_demo_${entrada.diasAtras}_${Date.now()}`,
          usuarioId,
          localDateKey(addLocalDays(hoy, -entrada.diasAtras)),
          entrada.contenido,
          entrada.sintomas,
          entrada.emocion,
          ahora,
          ahora,
        ],
      );
    }

    return { medicamentos: MEDICAMENTOS.length, alarmas: alarmasCreadas };
  }

  /**
   * Borra TODOS los medicamentos, alarmas, inventario y diario del usuario.
   * Se usa para dejar la app limpia antes de volver a sembrar los datos.
   */
  async limpiar(usuarioId: string): Promise<void> {
    if (!usuarioId) throw new Error('Falta el usuario');

    const tablas = ['alarmas', 'tomas', 'inventario', 'diario_entradas', 'medicamentos'];
    for (const tabla of tablas) {
      await DatabaseService.ejecutar(`DELETE FROM ${tabla} WHERE usuario_id = ?`, [usuarioId]);
    }
  }
}

export default new DemoDataService();
