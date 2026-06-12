// ================================================================
// database.ts — Servicio SQLite (expo-sqlite)
// Maneja todas las operaciones de BD local: usuarios, medicamentos,
// alarmas, tomas, cuidadores, etc.
// ================================================================

import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
let dbInitialized = false;

// ═══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════

export const DatabaseService = {
  /**
   * Inicializar BD (solo una vez)
   */
  async init(): Promise<SQLite.SQLiteDatabase> {
    if (dbInitialized && db) {
      return db;
    }

    try {
      console.log('⏳ Inicializando BD...');

      db = await SQLite.openDatabaseAsync('myvita.db');
      await this.createTables(db);
      dbInitialized = true;

      console.log('✅ BD inicializada correctamente');
      return db;
    } catch (error) {
      console.error('❌ Error inicializando BD:', error);
      throw error;
    }
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

    return id;
  },

  /**
   * Marcar alarma como tomada
   */
  async marcarAlamaComoTomada(alarmaId: string): Promise<void> {
    const database = await this.getDB();
    const now = new Date().toISOString();

    await database.runAsync(`UPDATE alarmas SET tomado = 1, updated_at = ? WHERE id = ?`, [
      now,
      alarmaId,
    ]);

    // Crear registro en tabla tomas
    const alarma = await database.getFirstAsync<any>(`SELECT * FROM alarmas WHERE id = ?`, [
      alarmaId,
    ]);

    if (alarma) {
      await database.runAsync(
        `INSERT INTO tomas (
          id, alarma_id, usuario_id, medicamento_id,
          hora_toma, hora_tomada, confirmado, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `toma_${Date.now()}`,
          alarmaId,
          alarma.usuario_id,
          alarma.medicamento_id,
          alarma.hora_toma,
          now,
          1,
          now,
          now,
        ],
      );
    }
  },

  /**
   * USUARIOS - Crear usuario
   */
  async crearUsuario(usuario: any): Promise<string> {
    const database = await this.getDB();
    const now = new Date().toISOString();
    const id = `user_${Date.now()}`;

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
        usuario.password,
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
        id, usuario_id, nombre, descripcion, dosis, unidad,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        medicamento.usuarioId,
        medicamento.nombre,
        medicamento.descripcion || null,
        medicamento.dosis || null,
        medicamento.unidad || null,
        now,
        now,
      ],
    );

    return id;
  },

  /**
   * SINCRONIZACIÓN - Obtener registros no sincronizados
   */
  async getNoSincronizados(tabla: string, usuarioId: string): Promise<any[]> {
    const database = await this.getDB();
    return database.getAllAsync(
      `SELECT * FROM ${tabla} WHERE usuario_id = ? AND synced_at IS NULL AND deleted_at IS NULL`,
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
