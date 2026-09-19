// ================================================================
// database.ts — Servicio SQLite (expo-sqlite)
// Maneja todas las operaciones de BD local: usuarios, medicamentos,
// alarmas, tomas, cuidadores, etc.
// ================================================================

import * as SQLite from 'expo-sqlite';
import { addLocalDays, localDateFromKey, localDateKey } from '../utils/localDate';

let db: SQLite.SQLiteDatabase | null = null;
let dbInitialized = false;
// Candado de inicialización: evita que dos llamadas concurrentes a init()
// abran la misma BD dos veces (causaba NullPointerException en Android)
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// ═══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════

export const DatabaseService = {
  /**
   * Inicializar BD (solo una vez, seguro ante llamadas concurrentes)
   */
  async init(): Promise<SQLite.SQLiteDatabase> {
    if (dbInitialized && db) {
      return db;
    }

    if (initPromise) {
      return initPromise;
    }

    initPromise = (async () => {
      try {
        console.log('⏳ Inicializando BD...');

        const database = await SQLite.openDatabaseAsync('myvita.db');
        await this.createTables(database);
        await this.runMigrations(database);

        db = database;
        dbInitialized = true;

        console.log('✅ BD inicializada correctamente');
        return database;
      } catch (error) {
        console.error('❌ Error inicializando BD:', error);
        initPromise = null; // permitir reintento si falló
        throw error;
      }
    })();

    return initPromise;
  },

  /**
   * Crear tablas si no existen
   */
  async createTables(database: SQLite.SQLiteDatabase): Promise<void> {
    const tables = [
      // Usuarios
      `CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        usuario TEXT UNIQUE,
        telefono TEXT,
        fecha_nacimiento TEXT,
        direccion TEXT,
        esta_activo INTEGER DEFAULT 1,
        rol TEXT DEFAULT 'paciente',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted_at TEXT
      )`,

      // Medicamentos
      `CREATE TABLE IF NOT EXISTS medicamentos (
        id TEXT PRIMARY KEY,
        usuario_id TEXT NOT NULL REFERENCES usuarios(id),
        nombre TEXT NOT NULL,
        descripcion TEXT,
        dosis TEXT,
        unidad TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted_at TEXT
      )`,

      // Prescripciones
      `CREATE TABLE IF NOT EXISTS prescripciones (
        id TEXT PRIMARY KEY,
        usuario_id TEXT NOT NULL REFERENCES usuarios(id),
        medicamento_id TEXT NOT NULL REFERENCES medicamentos(id),
        medico TEXT,
        fecha_inicio TEXT,
        fecha_fin TEXT,
        notas TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted_at TEXT
      )`,

      // Alarmas (CRÍTICO)
      `CREATE TABLE IF NOT EXISTS alarmas (
        id TEXT PRIMARY KEY,
        usuario_id TEXT NOT NULL REFERENCES usuarios(id),
        medicamento_id TEXT REFERENCES medicamentos(id),
        medicamento_nombre TEXT,
        dosis TEXT,
        hora_toma TEXT NOT NULL,
        fecha TEXT NOT NULL,
        tono TEXT DEFAULT 'default.mp3',
        volumen INTEGER DEFAULT 80,
        esta_activa INTEGER DEFAULT 1,
        recordatorio_silenciado INTEGER DEFAULT 0,
        tomado INTEGER DEFAULT 0,
        crear_evento_calendario INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted_at TEXT
      )`,

      // Tomas (Historial)
      `CREATE TABLE IF NOT EXISTS tomas (
        id TEXT PRIMARY KEY,
        alarma_id TEXT NOT NULL REFERENCES alarmas(id),
        usuario_id TEXT NOT NULL REFERENCES usuarios(id),
        medicamento_id TEXT REFERENCES medicamentos(id),
        hora_toma TEXT NOT NULL,
        hora_tomada TEXT,
        confirmado INTEGER DEFAULT 0,
        notas TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted_at TEXT
      )`,

      // Cuidadores
      `CREATE TABLE IF NOT EXISTS cuidadores (
        id TEXT PRIMARY KEY,
        usuario_id TEXT NOT NULL REFERENCES usuarios(id),
        cuidador_id TEXT NOT NULL REFERENCES usuarios(id),
        rol TEXT DEFAULT 'cuidador',
        telefono TEXT,
        email TEXT,
        autorizado INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted_at TEXT
      )`,

      // Diario
      `CREATE TABLE IF NOT EXISTS diario_entradas (
        id TEXT PRIMARY KEY,
        usuario_id TEXT NOT NULL REFERENCES usuarios(id),
        fecha TEXT NOT NULL,
        contenido TEXT,
        sintomas TEXT,
        emocion TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted_at TEXT
      )`,

      // Contactos de Emergencia
      `CREATE TABLE IF NOT EXISTS contactos_emergencia (
        id TEXT PRIMARY KEY,
        usuario_id TEXT NOT NULL REFERENCES usuarios(id),
        nombre TEXT NOT NULL,
        relacion TEXT,
        telefono TEXT NOT NULL,
        email TEXT,
        prioridad INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted_at TEXT
      )`,

      // Eventos SOS
      `CREATE TABLE IF NOT EXISTS eventos_sos (
        id TEXT PRIMARY KEY,
        usuario_id TEXT NOT NULL REFERENCES usuarios(id),
        latitud REAL,
        longitud REAL,
        mensaje TEXT,
        contactos_notificados TEXT,
        estado TEXT DEFAULT 'enviado',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted_at TEXT
      )`,

      // Chat History (IA)
      `CREATE TABLE IF NOT EXISTS chat_history (
        id TEXT PRIMARY KEY,
        usuario_id TEXT NOT NULL REFERENCES usuarios(id),
        rol TEXT,
        contenido TEXT,
        timestamp TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,

      // Inventario
      `CREATE TABLE IF NOT EXISTS inventario (
        id TEXT PRIMARY KEY,
        usuario_id TEXT NOT NULL REFERENCES usuarios(id),
        medicamento_id TEXT REFERENCES medicamentos(id),
        cantidad INTEGER,
        unidad TEXT,
        fecha_vencimiento TEXT,
        ubicacion TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        deleted_at TEXT
      )`,

      // Cola persistente para cambios realizados sin conexión
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        tabla TEXT NOT NULL,
        operacion TEXT NOT NULL,
        record_id TEXT NOT NULL,
        datos TEXT NOT NULL,
        intentos INTEGER DEFAULT 0,
        ultimo_error TEXT,
        created_at TEXT NOT NULL,
        synced_at TEXT
      )`,
    ];

    for (const sql of tables) {
      try {
        await database.execAsync(sql);
      } catch (error) {
        console.error('Error creando tabla:', error);
      }
    }

    // Crear índices para optimizar
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_alarmas_usuario_fecha ON alarmas(usuario_id, fecha)`,
      `CREATE INDEX IF NOT EXISTS idx_tomas_usuario_fecha ON tomas(usuario_id, hora_toma)`,
      `CREATE INDEX IF NOT EXISTS idx_medicamentos_usuario ON medicamentos(usuario_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sync_queue_pendiente ON sync_queue(synced_at, created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_sync_queue_registro ON sync_queue(tabla, record_id, synced_at)`,
    ];

    for (const sql of indexes) {
      try {
        await database.execAsync(sql);
      } catch (error) {
        console.error('Error creando índice:', error);
      }
    }
  },

  /**
   * Migraciones: agrega columnas nuevas a tablas existentes.
   * ALTER TABLE lanza error si la columna ya existe — se ignora de forma segura.
   */
  async runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
    const migraciones = [
      `ALTER TABLE alarmas ADD COLUMN frecuencia TEXT DEFAULT 'una_vez'`,
      `ALTER TABLE alarmas ADD COLUMN dias_semana TEXT`,
      `ALTER TABLE alarmas ADD COLUMN fecha_fin TEXT`,
      `ALTER TABLE alarmas ADD COLUMN recurrencia_id TEXT`,
      // Umbral para avisar "te quedan pocas"; 5 unidades por defecto.
      `ALTER TABLE inventario ADD COLUMN umbral_aviso INTEGER DEFAULT 5`,
      // Ruta local de la foto del medicamento (identificar por color y forma).
      `ALTER TABLE medicamentos ADD COLUMN foto_uri TEXT`,
    ];
    for (const sql of migraciones) {
      try {
        await database.execAsync(sql);
      } catch {
        // La columna ya existe — seguro ignorar
      }
    }

    // Versiones anteriores guardaban la contraseña sin cifrar para login
    // offline. Se elimina de todas las instalaciones durante la migración.
    await database.runAsync(
      `UPDATE usuarios SET password = '__remote_auth__' WHERE password != '__remote_auth__'`,
    );
  },

  /** Guarda o combina un cambio pendiente para que sobreviva al cierre de la app. */
  async encolarCambio(
    tabla: string,
    operacion: 'INSERT' | 'UPDATE' | 'DELETE',
    recordId: string,
    datos: Record<string, any>,
  ): Promise<void> {
    const database = await this.getDB();
    const existente = await database.getFirstAsync<any>(
      `SELECT * FROM sync_queue
       WHERE tabla = ? AND record_id = ? AND synced_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [tabla, recordId],
    );

    // Si se creó y eliminó antes de subirlo, no hay nada que enviar.
    if (existente?.operacion === 'INSERT' && operacion === 'DELETE') {
      await database.runAsync(
        `DELETE FROM sync_queue WHERE tabla = ? AND record_id = ? AND synced_at IS NULL`,
        [tabla, recordId],
      );
      return;
    }

    const operacionFinal = existente?.operacion === 'INSERT' ? 'INSERT' : operacion;
    await database.runAsync(
      `DELETE FROM sync_queue WHERE tabla = ? AND record_id = ? AND synced_at IS NULL`,
      [tabla, recordId],
    );
    await database.runAsync(
      `INSERT INTO sync_queue
       (id, tabla, operacion, record_id, datos, intentos, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [
        `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        tabla,
        operacionFinal,
        recordId,
        JSON.stringify(datos),
        new Date().toISOString(),
      ],
    );
  },

  async getSyncQueuePendiente(limite = 100): Promise<any[]> {
    const database = await this.getDB();
    return database.getAllAsync(
      `SELECT * FROM sync_queue WHERE synced_at IS NULL ORDER BY created_at ASC LIMIT ?`,
      [limite],
    );
  },

  async marcarSyncQueueCompleto(id: string): Promise<void> {
    const database = await this.getDB();
    await database.runAsync(`UPDATE sync_queue SET synced_at = ?, ultimo_error = NULL WHERE id = ?`, [
      new Date().toISOString(),
      id,
    ]);
  },

  async registrarErrorSyncQueue(id: string, error: string): Promise<void> {
    const database = await this.getDB();
    await database.runAsync(
      `UPDATE sync_queue SET intentos = intentos + 1, ultimo_error = ? WHERE id = ?`,
      [error.slice(0, 500), id],
    );
  },

  // ═══════════════════════════════════════════════════════════════
  // RECURRENCIA DE ALARMAS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Crear alarma con recurrencia: genera instancias para los próximos
   * `diasAdelante` días según la frecuencia indicada.
   * Devuelve el recurrencia_id (= ID de la primera instancia).
   */
  async crearAlarmaConRecurrencia(
    alarma: any,
    frecuencia: 'una_vez' | 'diaria' | 'semanal',
    diasSemana?: number[],
    fechaFin?: string,
    diasAdelante = 30,
  ): Promise<string> {
    const database = await this.getDB();
    const now = new Date().toISOString();

    const inicio = alarma.fecha ? localDateFromKey(alarma.fecha) : localDateFromKey(localDateKey());

    const fechaFinDate = fechaFin ? new Date(fechaFin + 'T00:00:00') : null;
    const diasSemanaJson = diasSemana && diasSemana.length > 0 ? JSON.stringify(diasSemana) : null;

    // El ID de la primera instancia se convierte en recurrencia_id para toda la serie
    const recurrenciaId = `alarm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const limiteLoop = frecuencia === 'una_vez' ? 0 : diasAdelante;
    let insertadas = 0;

    for (let i = 0; i <= limiteLoop; i++) {
      const fecha = addLocalDays(inicio, i);

      if (fechaFinDate && fecha > fechaFinDate) break;

      if (frecuencia === 'semanal' && diasSemana && diasSemana.length > 0) {
        if (!diasSemana.includes(fecha.getDay())) continue;
      }

      const fechaStr = localDateKey(fecha);
      const id =
        insertadas === 0
          ? recurrenciaId
          : `alarm_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`;

      await database.runAsync(
        `INSERT INTO alarmas (
          id, usuario_id, medicamento_id, medicamento_nombre, dosis,
          hora_toma, fecha, tono, volumen, esta_activa,
          frecuencia, dias_semana, fecha_fin, recurrencia_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          alarma.usuarioId,
          alarma.medicamentoId || null,
          alarma.medicamentoNombre || null,
          alarma.dosis || null,
          alarma.horaToma,
          fechaStr,
          alarma.tono || 'default.mp3',
          alarma.volumen || 80,
          1,
          frecuencia,
          diasSemanaJson,
          fechaFin || null,
          frecuencia === 'una_vez' ? null : recurrenciaId,
          now,
          now,
        ],
      );
      const row = await database.getFirstAsync<any>(`SELECT * FROM alarmas WHERE id = ?`, [id]);
      if (row) await this.encolarCambio('alarmas', 'INSERT', id, row);
      insertadas++;
    }

    return recurrenciaId;
  },

  /**
   * Provisiona instancias faltantes para todas las series activas.
   * Se llama en cada init del AlarmService para garantizar que los
   * próximos `diasAdelante` días tengan sus filas en BD.
   */
  async generarInstanciasSiFaltan(usuarioId: string, diasAdelante = 30): Promise<void> {
    const database = await this.getDB();

    // Un representante por serie (la fila con fecha más antigua)
    const templates = await database.getAllAsync<any>(
      `SELECT recurrencia_id, medicamento_id, medicamento_nombre, dosis,
              hora_toma, frecuencia, dias_semana, fecha_fin, tono, volumen
       FROM alarmas
       WHERE usuario_id = ? AND frecuencia != 'una_vez'
         AND recurrencia_id IS NOT NULL AND deleted_at IS NULL
       GROUP BY recurrencia_id`,
      [usuarioId],
    );

    if (templates.length === 0) return;

    const hoy = localDateFromKey(localDateKey());
    const now = new Date().toISOString();

    for (const tpl of templates) {
      const diasSemana: number[] = tpl.dias_semana ? JSON.parse(tpl.dias_semana) : [];
      const fechaFinDate = tpl.fecha_fin ? new Date(tpl.fecha_fin + 'T00:00:00') : null;

      for (let i = 0; i <= diasAdelante; i++) {
        const fecha = addLocalDays(hoy, i);

        if (fechaFinDate && fecha > fechaFinDate) break;

        if (tpl.frecuencia === 'semanal') {
          if (!diasSemana.includes(fecha.getDay())) continue;
        }

        const fechaStr = localDateKey(fecha);

        const existe = await database.getFirstAsync<{ id: string }>(
          `SELECT id FROM alarmas
           WHERE recurrencia_id = ? AND fecha = ? AND deleted_at IS NULL`,
          [tpl.recurrencia_id, fechaStr],
        );

        if (!existe) {
          const id = `alarm_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`;
          await database.runAsync(
            `INSERT INTO alarmas (
              id, usuario_id, medicamento_id, medicamento_nombre, dosis,
              hora_toma, fecha, tono, volumen, esta_activa,
              frecuencia, dias_semana, fecha_fin, recurrencia_id,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              usuarioId,
              tpl.medicamento_id || null,
              tpl.medicamento_nombre,
              tpl.dosis || null,
              tpl.hora_toma,
              fechaStr,
              tpl.tono || 'default.mp3',
              tpl.volumen || 80,
              1,
              tpl.frecuencia,
              tpl.dias_semana || null,
              tpl.fecha_fin || null,
              tpl.recurrencia_id,
              now,
              now,
            ],
          );
          const row = await database.getFirstAsync<any>(`SELECT * FROM alarmas WHERE id = ?`, [id]);
          if (row) await this.encolarCambio('alarmas', 'INSERT', id, row);
        }
      }
    }
  },

  /**
   * Soft-delete de una sola instancia de alarma
   */
  async eliminarAlarma(alarmaId: string): Promise<void> {
    const database = await this.getDB();
    const now = new Date().toISOString();
    await database.runAsync(
      `UPDATE alarmas SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, alarmaId],
    );
    const row = await database.getFirstAsync<any>(`SELECT * FROM alarmas WHERE id = ?`, [alarmaId]);
    if (row) await this.encolarCambio('alarmas', 'DELETE', alarmaId, row);
  },

  /**
   * Soft-delete de todas las instancias futuras (incluyendo hoy) de una serie
   */
  async eliminarInstanciasFuturas(recurrenciaId: string, desdeFecha: string): Promise<void> {
    const database = await this.getDB();
    const now = new Date().toISOString();
    const rows = await database.getAllAsync<any>(
      `SELECT * FROM alarmas WHERE recurrencia_id = ? AND fecha >= ? AND deleted_at IS NULL`,
      [recurrenciaId, desdeFecha],
    );
    await database.runAsync(
      `UPDATE alarmas SET deleted_at = ?, updated_at = ?
       WHERE recurrencia_id = ? AND fecha >= ? AND deleted_at IS NULL`,
      [now, now, recurrenciaId, desdeFecha],
    );
    for (const row of rows) {
      await this.encolarCambio('alarmas', 'DELETE', row.id, { ...row, deleted_at: now, updated_at: now });
    }
  },

  /** IDs de una serie que pueden tener notificaciones nativas pendientes. */
  async getIdsSerieDesde(recurrenciaId: string, desdeFecha: string): Promise<string[]> {
    const database = await this.getDB();
    const rows = await database.getAllAsync<{ id: string }>(
      `SELECT id FROM alarmas
       WHERE recurrencia_id = ? AND fecha >= ? AND deleted_at IS NULL`,
      [recurrenciaId, desdeFecha],
    );
    return rows.map((row) => row.id);
  },

  /**
   * Obtener instancia de BD
   */
  async getDB(): Promise<SQLite.SQLiteDatabase> {
    if (!db) {
      return this.init();
    }
    return db;
  },

  /**
   * Cerrar BD
   */
  async close(): Promise<void> {
    if (db) {
      await db.closeAsync();
      db = null;
      dbInitialized = false;
      initPromise = null;
    }
  },

  /**
   * ALARMAS - Obtener alarmas del día
   */
  async getAlarmasDelDia(usuarioId: string, fecha: string): Promise<any[]> {
    const database = await this.getDB();
    return database.getAllAsync(
      `SELECT * FROM alarmas
       WHERE usuario_id = ? AND fecha = ? AND deleted_at IS NULL
       ORDER BY hora_toma ASC`,
      [usuarioId, fecha],
    );
  },

  /** Instancias desde hoy para mostrar la próxima toma aunque aún no sea hoy. */
  async getAlarmasDesde(
    usuarioId: string,
    desdeFecha: string,
    hastaFecha: string,
  ): Promise<any[]> {
    const database = await this.getDB();
    return database.getAllAsync(
      `SELECT * FROM alarmas
       WHERE usuario_id = ? AND fecha BETWEEN ? AND ? AND deleted_at IS NULL
       ORDER BY fecha ASC, hora_toma ASC`,
      [usuarioId, desdeFecha, hastaFecha],
    );
  },

  /** Alarmas activas que deben quedar programadas en el sistema operativo. */
  async getAlarmasProgramables(
    usuarioId: string,
    desdeFecha: string,
    hastaFecha: string,
  ): Promise<any[]> {
    const database = await this.getDB();
    return database.getAllAsync(
      `SELECT * FROM alarmas
       WHERE usuario_id = ? AND fecha BETWEEN ? AND ?
         AND esta_activa = 1
         AND recordatorio_silenciado = 0
         AND tomado = 0
         AND deleted_at IS NULL
       ORDER BY fecha ASC, hora_toma ASC`,
      [usuarioId, desdeFecha, hastaFecha],
    );
  },

  /**
   * Crear alarma
   */
  async crearAlarma(alarma: any): Promise<string> {
    const database = await this.getDB();
    const now = new Date().toISOString();
    const id = `alarm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await database.runAsync(
      `INSERT INTO alarmas (
        id, usuario_id, medicamento_id, medicamento_nombre, dosis,
        hora_toma, fecha, tono, volumen, esta_activa,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        alarma.usuarioId,
        alarma.medicamentoId || null,
        alarma.medicamentoNombre || null,
        alarma.dosis || null,
        alarma.horaToma,
        alarma.fecha,
        alarma.tono || 'default.mp3',
        alarma.volumen || 80,
        1,
        now,
        now,
      ],
    );

    const row = await database.getFirstAsync<any>(`SELECT * FROM alarmas WHERE id = ?`, [id]);
    if (row) await this.encolarCambio('alarmas', 'INSERT', id, row);

    return id;
  },

  /**
   * Marcar alarma como tomada
   */
  async marcarAlamaComoTomada(alarmaId: string): Promise<void> {
    const database = await this.getDB();
    const now = new Date().toISOString();

    let confirmada = false;
    // La toma y el inventario se confirman juntos. El UPDATE condicional
    // también protege frente a dos confirmaciones concurrentes.
    await database.withExclusiveTransactionAsync(async (transaction) => {
      const result = await transaction.runAsync(
        `UPDATE alarmas SET tomado = 1, updated_at = ?
         WHERE id = ? AND tomado = 0 AND deleted_at IS NULL`,
        [now, alarmaId],
      );
      if (result.changes === 0) return;
      const alarma = await transaction.getFirstAsync<any>(
        'SELECT * FROM alarmas WHERE id = ?', [alarmaId],
      );
      if (!alarma) throw new Error('No se encontró la alarma');
      await transaction.runAsync(
        `INSERT INTO tomas (
          id, alarma_id, usuario_id, medicamento_id,
          hora_toma, hora_tomada, confirmado, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`toma_${alarmaId}`, alarmaId, alarma.usuario_id, alarma.medicamento_id,
          alarma.hora_toma, now, 1, now, now],
      );
      if (alarma.medicamento_id) {
        await transaction.runAsync(
          `UPDATE inventario SET cantidad = MAX(0, cantidad - 1),
             updated_at = ?, synced_at = NULL
           WHERE medicamento_id = ? AND deleted_at IS NULL`,
          [now, alarma.medicamento_id],
        );
      }
      confirmada = true;
    });
    if (confirmada) {
      const actualizada = await database.getFirstAsync<any>('SELECT * FROM alarmas WHERE id = ?', [alarmaId]);
      if (actualizada) await this.encolarCambio('alarmas', 'UPDATE', alarmaId, actualizada);
    }
  },

  /**
   * USUARIOS - Crear usuario
   */
  async crearUsuario(usuario: any): Promise<string> {
    const database = await this.getDB();
    const now = new Date().toISOString();
    // Si viene del backend (Supabase) respetamos su UUID; si no, generamos uno local
    const id = usuario.id || `user_${Date.now()}`;

    await database.runAsync(
      `INSERT INTO usuarios (
        id, nombre, email, password, usuario, telefono,
        fecha_nacimiento, direccion, rol,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        usuario.nombre,
        usuario.email,
        usuario.password || '__remote_auth__',
        usuario.usuario || null,
        usuario.telefono || null,
        usuario.fechaNacimiento || null,
        usuario.direccion || null,
        usuario.rol || 'paciente',
        now,
        now,
      ],
    );

    return id;
  },

  /**
   * USUARIOS - Buscar por id (restaurar sesión)
   */
  async getUsuarioPorId(id: string): Promise<any | null> {
    const database = await this.getDB();
    const row = await database.getFirstAsync<any>(
      `SELECT * FROM usuarios WHERE id = ? AND deleted_at IS NULL`,
      [id],
    );
    return row ?? null;
  },

  /**
   * USUARIOS - Buscar por email (auth local offline)
   */
  async getUsuarioPorEmail(email: string): Promise<any | null> {
    const database = await this.getDB();
    const row = await database.getFirstAsync<any>(
      `SELECT * FROM usuarios WHERE email = ? AND deleted_at IS NULL`,
      [email],
    );
    return row ?? null;
  },

  /**
   * MEDICAMENTOS - Obtener medicamentos del usuario
   */
  async getMedicamentos(usuarioId: string): Promise<any[]> {
    const database = await this.getDB();
    return database.getAllAsync(
      `SELECT * FROM medicamentos
       WHERE usuario_id = ? AND deleted_at IS NULL
       ORDER BY nombre ASC`,
      [usuarioId],
    );
  },

  /**
   * Crear medicamento
   */
  async crearMedicamento(medicamento: any): Promise<string> {
    const database = await this.getDB();
    const now = new Date().toISOString();
    const id = `med_${Date.now()}`;

    await database.runAsync(
      `INSERT INTO medicamentos (
        id, usuario_id, nombre, descripcion, dosis, unidad, foto_uri,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        medicamento.usuarioId,
        medicamento.nombre,
        medicamento.descripcion || null,
        medicamento.dosis || null,
        medicamento.unidad || null,
        medicamento.fotoUri || null,
        now,
        now,
      ],
    );

    const row = await database.getFirstAsync<any>(`SELECT * FROM medicamentos WHERE id = ?`, [id]);
    if (row) await this.encolarCambio('medicamentos', 'INSERT', id, row);

    return id;
  },

  /**
   * Actualizar medicamento. Solo cambia los campos editables; el resto
   * (usuario_id, created_at) se conserva. Marca el registro como pendiente
   * de sincronizar.
   */
  async actualizarMedicamento(
    id: string,
    datos: {
      nombre: string;
      descripcion?: string;
      dosis?: string;
      unidad?: string;
      fotoUri?: string | null;
    },
  ): Promise<void> {
    const database = await this.getDB();
    const now = new Date().toISOString();

    await database.runAsync(
      `UPDATE medicamentos
         SET nombre = ?, descripcion = ?, dosis = ?, unidad = ?, foto_uri = ?,
             updated_at = ?, synced_at = NULL
       WHERE id = ? AND deleted_at IS NULL`,
      [
        datos.nombre,
        datos.descripcion || null,
        datos.dosis || null,
        datos.unidad || null,
        datos.fotoUri ?? null,
        now,
        id,
      ],
    );

    const row = await database.getFirstAsync<any>(`SELECT * FROM medicamentos WHERE id = ?`, [id]);
    if (row) await this.encolarCambio('medicamentos', 'UPDATE', id, row);
  },

  /**
   * Borrado suave del medicamento (deleted_at), para que la sincronización
   * pueda propagarlo y no se pierda el histórico de tomas asociado.
   */
  async eliminarMedicamento(id: string): Promise<void> {
    const database = await this.getDB();
    const now = new Date().toISOString();

    await database.runAsync(
      `UPDATE medicamentos
         SET deleted_at = ?, updated_at = ?, synced_at = NULL
       WHERE id = ?`,
      [now, now, id],
    );

    const row = await database.getFirstAsync<any>(`SELECT * FROM medicamentos WHERE id = ?`, [id]);
    if (row) await this.encolarCambio('medicamentos', 'DELETE', id, row);
  },

  /** Cuántas alarmas activas (aún no pasadas) dependen de un medicamento. */
  async contarAlarmasDeMedicamento(medicamentoId: string): Promise<number> {
    const database = await this.getDB();
    const hoy = localDateKey(new Date());
    const row = await database.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM alarmas
       WHERE medicamento_id = ? AND deleted_at IS NULL AND fecha >= ?`,
      [medicamentoId, hoy],
    );
    return row?.total ?? 0;
  },

  // ═══════════════════════════════════════════════════════════════
  // INVENTARIO — existencias por medicamento y aviso de "quedan pocas"
  // ═══════════════════════════════════════════════════════════════

  /** Existencias de todos los medicamentos del usuario, por medicamento_id. */
  async getInventario(usuarioId: string): Promise<Record<string, any>> {
    const database = await this.getDB();
    const filas = await database.getAllAsync<any>(
      `SELECT medicamento_id, cantidad, umbral_aviso
         FROM inventario
        WHERE usuario_id = ? AND deleted_at IS NULL`,
      [usuarioId],
    );

    const porMedicamento: Record<string, any> = {};
    for (const fila of filas) {
      if (fila.medicamento_id) porMedicamento[fila.medicamento_id] = fila;
    }
    return porMedicamento;
  },

  /**
   * Guarda las existencias de un medicamento (crea el registro o lo actualiza).
   * `cantidad` null borra el control de inventario de ese medicamento.
   */
  async guardarInventario(
    usuarioId: string,
    medicamentoId: string,
    cantidad: number | null,
    umbralAviso = 5,
  ): Promise<void> {
    const database = await this.getDB();
    const now = new Date().toISOString();

    const existente = await database.getFirstAsync<any>(
      `SELECT id FROM inventario WHERE medicamento_id = ? AND deleted_at IS NULL`,
      [medicamentoId],
    );

    if (cantidad === null) {
      if (existente) {
        await database.runAsync(
          `UPDATE inventario SET deleted_at = ?, updated_at = ? WHERE id = ?`,
          [now, now, existente.id],
        );
      }
      return;
    }

    if (existente) {
      await database.runAsync(
        `UPDATE inventario
            SET cantidad = ?, umbral_aviso = ?, updated_at = ?, synced_at = NULL
          WHERE id = ?`,
        [cantidad, umbralAviso, now, existente.id],
      );
    } else {
      await database.runAsync(
        `INSERT INTO inventario (
           id, usuario_id, medicamento_id, cantidad, umbral_aviso, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`inv_${Date.now()}`, usuarioId, medicamentoId, cantidad, umbralAviso, now, now],
      );
    }
  },

  /**
   * Descuenta una unidad al confirmar una toma. No baja de cero: si el conteo
   * ya está en 0 significa que el usuario no lo ha actualizado, y un número
   * negativo confundiría más que ayudar.
   */
  async descontarInventario(medicamentoId: string, unidades = 1): Promise<void> {
    if (!medicamentoId) return;
    const database = await this.getDB();
    await database.runAsync(
      `UPDATE inventario
          SET cantidad = MAX(0, cantidad - ?), updated_at = ?, synced_at = NULL
        WHERE medicamento_id = ? AND deleted_at IS NULL AND cantidad IS NOT NULL`,
      [unidades, new Date().toISOString(), medicamentoId],
    );
  },

  /** Medicamentos cuyas existencias llegaron al umbral de aviso. */
  async getMedicamentosPorAgotarse(usuarioId: string): Promise<any[]> {
    const database = await this.getDB();
    return database.getAllAsync(
      `SELECT m.id, m.nombre, i.cantidad, i.umbral_aviso
         FROM inventario i
         JOIN medicamentos m ON m.id = i.medicamento_id
        WHERE i.usuario_id = ? AND i.deleted_at IS NULL AND m.deleted_at IS NULL
          AND i.cantidad IS NOT NULL
          AND i.cantidad <= COALESCE(i.umbral_aviso, 5)
        ORDER BY i.cantidad ASC`,
      [usuarioId],
    );
  },

  /**
   * Historial de tomas de los últimos N días.
   *
   * Se lee de `alarmas` y no de `tomas` a propósito: `tomas` solo guarda las
   * dosis confirmadas, así que por sí sola no permite ver las omitidas.
   * `alarmas` tiene fecha, hora, medicamento y el estado de cada dosis.
   * Se excluye el futuro: una dosis que aún no toca no es "omitida".
   */
  async getHistorialTomas(usuarioId: string, dias = 30): Promise<any[]> {
    const database = await this.getDB();
    const hoy = localDateKey(new Date());
    const desde = localDateKey(addLocalDays(new Date(), -(dias - 1)));

    return database.getAllAsync(
      `SELECT id, fecha, hora_toma, medicamento_nombre, dosis, tomado
         FROM alarmas
        WHERE usuario_id = ? AND deleted_at IS NULL
          AND fecha >= ? AND fecha <= ?
        ORDER BY fecha DESC, hora_toma ASC`,
      [usuarioId, desde, hoy],
    );
  },

  /**
   * SINCRONIZACIÓN - Obtener registros no sincronizados
   */
  async getNoSincronizados(tabla: string, usuarioId: string): Promise<any[]> {
    const database = await this.getDB();
    return database.getAllAsync(
      `SELECT * FROM ${tabla}
       WHERE usuario_id = ?
         AND (synced_at IS NULL OR updated_at > synced_at)
       ORDER BY updated_at ASC`,
      [usuarioId],
    );
  },

  /**
   * Marcar como sincronizado
   */
  async marcarComoSincronizado(tabla: string, id: string): Promise<void> {
    const database = await this.getDB();
    const now = new Date().toISOString();
    await database.runAsync(`UPDATE ${tabla} SET synced_at = ? WHERE id = ?`, [now, id]);
  },

  /**
   * STATS - Resumen de hoy (port de DB.Stats.getResumenHoy)
   */
  async getResumenHoy(usuarioId: string): Promise<{
    total: number;
    tomadas: number;
    pendientes: number;
    adherencia: number;
  }> {
    const hoy = localDateKey();
    const rows = await this.getAlarmasDelDia(usuarioId, hoy);
    const total = rows.length;
    const tomadas = rows.filter((r: any) => r.tomado === 1).length;
    const pendientes = total - tomadas;
    const adherencia = total > 0 ? Math.round((tomadas / total) * 100) : 0;
    return { total, tomadas, pendientes, adherencia };
  },

  /**
   * STATS - Cantidad de medicamentos activos
   */
  async getMedicamentosActivos(usuarioId: string): Promise<number> {
    const database = await this.getDB();
    const row = await database.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM medicamentos WHERE usuario_id = ? AND deleted_at IS NULL`,
      [usuarioId],
    );
    return row?.n ?? 0;
  },

  /**
   * STATS - Racha de días consecutivos con todas las tomas cumplidas
   * (port de DB.Stats.getRachaDias)
   */
  async getRachaDias(usuarioId: string): Promise<number> {
    const database = await this.getDB();
    let racha = 0;

    for (let i = 0; i < 60; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const fecha = localDateKey(d);

      const rows = await database.getAllAsync<any>(
        `SELECT tomado FROM alarmas WHERE usuario_id = ? AND fecha = ? AND deleted_at IS NULL`,
        [usuarioId, fecha],
      );

      if (rows.length === 0) {
        // Hoy sin alarmas no rompe la racha; un día anterior sin alarmas sí la corta
        if (i === 0) continue;
        break;
      }

      const todasTomadas = rows.every((r) => r.tomado === 1);
      if (todasTomadas) {
        racha++;
      } else {
        // Hoy con pendientes aún no rompe la racha
        if (i === 0) continue;
        break;
      }
    }

    return racha;
  },

  /**
   * STATS - Datos de la semana para la gráfica (port de DB.Stats.getSemana)
   */
  async getSemana(usuarioId: string): Promise<{
    labels: string[];
    tomadas: number[];
    perdidas: number[];
  }> {
    const database = await this.getDB();
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const labels: string[] = [];
    const tomadas: number[] = [];
    const perdidas: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const fecha = localDateKey(d);
      labels.push(dias[d.getDay()]);

      const rows = await database.getAllAsync<any>(
        `SELECT tomado FROM alarmas WHERE usuario_id = ? AND fecha = ? AND deleted_at IS NULL`,
        [usuarioId, fecha],
      );
      tomadas.push(rows.filter((r) => r.tomado === 1).length);
      perdidas.push(rows.filter((r) => r.tomado !== 1).length);
    }

    return { labels, tomadas, perdidas };
  },

  /**
   * DIARIO - Entradas recientes (para contexto del chat IA)
   */
  async getDiarioReciente(usuarioId: string, limite = 5): Promise<any[]> {
    const database = await this.getDB();
    return database.getAllAsync(
      `SELECT * FROM diario_entradas
       WHERE usuario_id = ? AND deleted_at IS NULL
       ORDER BY fecha DESC LIMIT ?`,
      [usuarioId, limite],
    );
  },

  /**
   * CHAT - Guardar mensaje en historial
   */
  async guardarMensajeChat(usuarioId: string, rol: string, contenido: string): Promise<void> {
    const database = await this.getDB();
    const now = new Date().toISOString();
    await database.runAsync(
      `INSERT INTO chat_history (id, usuario_id, rol, contenido, timestamp, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [`chat_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`, usuarioId, rol, contenido, now, now],
    );
  },

  /**
   * CHAT - Obtener historial reciente
   */
  async getHistorialChat(usuarioId: string, limite = 50): Promise<any[]> {
    const database = await this.getDB();
    const rows = await database.getAllAsync<any>(
      `SELECT * FROM chat_history WHERE usuario_id = ? ORDER BY timestamp DESC LIMIT ?`,
      [usuarioId, limite],
    );
    return rows.reverse();
  },

  /**
   * SOS - Registrar evento de emergencia
   */
  async registrarEventoSOS(
    usuarioId: string,
    latitud?: number,
    longitud?: number,
    mensaje?: string,
    estado = 'abierto',
    contactosNotificados: string[] = [],
  ): Promise<string> {
    const database = await this.getDB();
    const now = new Date().toISOString();
    const id = `sos_${Date.now()}`;
    await database.runAsync(
      `INSERT INTO eventos_sos
       (id, usuario_id, latitud, longitud, mensaje, contactos_notificados, estado, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        usuarioId,
        latitud ?? null,
        longitud ?? null,
        mensaje ?? null,
        JSON.stringify(contactosNotificados),
        estado,
        now,
        now,
      ],
    );
    return id;
  },

  /**
   * Ejecutar query personalizada.
   * SELECT → devuelve array de filas; otros → resultado de runAsync.
   */
  async ejecutar(sql: string, params: any[] = []): Promise<any> {
    const database = await this.getDB();
    if (/^\s*select/i.test(sql)) {
      return database.getAllAsync(sql, params);
    }
    return database.runAsync(sql, params);
  },
};

export default DatabaseService;
