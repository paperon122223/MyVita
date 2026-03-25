// ================================================================
// db.js — Capa SQLite central · MediTime (INICIALIZACIÓN ÚNICA)
// ================================================================

// ── Generador de UUID v4 ──────────────────────────────────────
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ── Timestamp ISO ──────────────────────────────────────────────
function nowISO() {
  return new Date().toISOString();
}

// ── Instancia de DB (global) ─────────────────────────────────
let _db = null;
let _dbInitialized = false;  // ← FLAG para evitar reinicializar

// ================================================================
// INICIALIZACIÓN - SOLO UNA VEZ
// ================================================================
function initDB() {
  return new Promise((resolve, reject) => {
    // ✅ Si ya está inicializada, devolver inmediatamente
    if (_dbInitialized && _db) {
      console.log('✅ BD ya inicializada, reutilizando conexión');
      resolve(_db);
      return;
    }

    if (!window.sqlitePlugin) {
      console.error('❌ SQLite plugin no disponible');
      reject(new Error('SQLite no disponible'));
      return;
    }

    console.log('⏳ Inicializando BD por primera vez...');
    
    _db = window.sqlitePlugin.openDatabase(
      { name: 'meditime.db', location: 'default', androidDatabaseImplementation: 2 },
      function () {
        console.log('✅ BD abierta');
        crearTablas(_db)
          .then(() => {
            _dbInitialized = true;  // ← Marcar como inicializada
            console.log('✅ DB inicializada correctamente');
            resolve(_db);
          })
          .catch(reject);
      },
      function (err) {
        console.error('❌ Error abriendo BD:', err);
        reject(err);
      }
    );
  });
}

// ================================================================
// CREAR TABLAS (si no existen)
// ================================================================
function crearTablas(db) {
  return new Promise((resolve, reject) => {
    db.transaction(
      function (tx) {
        // USUARIOS
        tx.executeSql(`CREATE TABLE IF NOT EXISTS usuarios (
          id              TEXT PRIMARY KEY,
          nombre          TEXT NOT NULL,
          email           TEXT UNIQUE NOT NULL,
          password        TEXT NOT NULL,
          usuario         TEXT UNIQUE,
          telefono        TEXT,
          fecha_nacimiento TEXT,
          direccion       TEXT,
          esta_activo     INTEGER DEFAULT 1,
          created_at      TEXT NOT NULL,
          updated_at      TEXT NOT NULL,
          synced_at       TEXT,
          deleted_at      TEXT
        )`, []);

        // MEDICAMENTOS
        tx.executeSql(`CREATE TABLE IF NOT EXISTS medicamentos (
          id              TEXT PRIMARY KEY,
          usuario_id      TEXT NOT NULL REFERENCES usuarios(id),
          nombre          TEXT NOT NULL,
          descripcion     TEXT,
          created_at      TEXT NOT NULL,
          updated_at      TEXT NOT NULL,
          synced_at       TEXT,
          deleted_at      TEXT
        )`, []);

        // PRESCRIPCIONES
        tx.executeSql(`CREATE TABLE IF NOT EXISTS prescripciones (
          id                  TEXT PRIMARY KEY,
          usuario_id          TEXT NOT NULL REFERENCES usuarios(id),
          medicamento_id      TEXT REFERENCES medicamentos(id),
          dosis               TEXT,
          hora_toma           TEXT,
          frecuencia          TEXT,
          fecha_inicio        TEXT,
          fecha_fin           TEXT,
          esta_activa         INTEGER DEFAULT 1,
          nombre_medico       TEXT,
          contacto_medico     TEXT,
          via_administracion  TEXT,
          notas               TEXT,
          created_at          TEXT NOT NULL,
          updated_at          TEXT NOT NULL,
          synced_at           TEXT,
          deleted_at          TEXT
        )`, []);

        // ALARMAS
        tx.executeSql(`CREATE TABLE IF NOT EXISTS alarmas (
          id              TEXT PRIMARY KEY,
          usuario_id      TEXT NOT NULL REFERENCES usuarios(id),
          prescripcion_id TEXT REFERENCES prescripciones(id),
          nombre          TEXT,
          tono            TEXT DEFAULT 'alarm.mp3',
          fecha           TEXT NOT NULL,
          hora_toma       TEXT NOT NULL,
          tomado          INTEGER DEFAULT 0,
          hora_tomado     TEXT,
          esta_activa     INTEGER DEFAULT 1,
          created_at      TEXT NOT NULL,
          updated_at      TEXT NOT NULL,
          synced_at       TEXT,
          deleted_at      TEXT
        )`, []);

        // INVENTARIO
        tx.executeSql(`CREATE TABLE IF NOT EXISTS inventario (
          id                  TEXT PRIMARY KEY,
          usuario_id          TEXT NOT NULL REFERENCES usuarios(id),
          medicamento_id      TEXT REFERENCES medicamentos(id),
          stock_actual        INTEGER DEFAULT 0,
          stock_minimo        INTEGER DEFAULT 10,
          fecha_vencimiento   TEXT,
          created_at          TEXT NOT NULL,
          updated_at          TEXT NOT NULL,
          synced_at           TEXT,
          deleted_at          TEXT
        )`, []);

        // CONTACTOS
        tx.executeSql(`CREATE TABLE IF NOT EXISTS contactos (
          id              TEXT PRIMARY KEY,
          usuario_id      TEXT NOT NULL REFERENCES usuarios(id),
          nombre          TEXT NOT NULL,
          telefono        TEXT,
          relacion        TEXT,
          es_emergencia   INTEGER DEFAULT 0,
          created_at      TEXT NOT NULL,
          updated_at      TEXT NOT NULL,
          synced_at       TEXT,
          deleted_at      TEXT
        )`, []);

        // DIARIO
        tx.executeSql(`CREATE TABLE IF NOT EXISTS diario (
          id              TEXT PRIMARY KEY,
          usuario_id      TEXT NOT NULL REFERENCES usuarios(id),
          fecha           TEXT NOT NULL,
          sintomas        TEXT,
          notas           TEXT,
          estado_animo    TEXT,
          foto_url        TEXT,
          created_at      TEXT NOT NULL,
          updated_at      TEXT NOT NULL,
          synced_at       TEXT,
          deleted_at      TEXT
        )`, []);

        // SYNC QUEUE
        tx.executeSql(`CREATE TABLE IF NOT EXISTS sync_queue (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          tabla           TEXT NOT NULL,
          record_id       TEXT NOT NULL,
          operacion       TEXT NOT NULL,
          datos           TEXT NOT NULL,
          synced          INTEGER DEFAULT 0,
          created_at      TEXT NOT NULL
        )`, []);

        // ÍNDICES
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email)`, []);
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_medicamentos_usuario ON medicamentos(usuario_id)`, []);
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_prescripciones_usuario ON prescripciones(usuario_id)`, []);
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_alarmas_usuario ON alarmas(usuario_id)`, []);
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_alarmas_fecha ON alarmas(fecha)`, []);
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced)`, []);
      },
      function (err) { 
        console.error('❌ Error creando tablas:', err); 
        reject(err); 
      },
      function () { 
        console.log('✅ Tablas verificadas/creadas');
        // Migraciones seguras — cada ALTER en su propia transacción
        // para que un error de "duplicate column" no cancele las demás
        const migraciones = [
          'ALTER TABLE prescripciones ADD COLUMN notas TEXT',
          'ALTER TABLE alarmas ADD COLUMN recordatorio_silenciado INTEGER DEFAULT 0',
          'ALTER TABLE inventario ADD COLUMN prescripcion_id TEXT',
          'ALTER TABLE inventario ADD COLUMN nombre_medicamento TEXT',
          'ALTER TABLE inventario ADD COLUMN tomas_dia INTEGER DEFAULT 1',
          'ALTER TABLE alarmas ADD COLUMN esta_activa INTEGER DEFAULT 1',
        ];
        let idx = 0;
        function siguienteMigracion() {
          if (idx >= migraciones.length) { resolve(); return; }
          const sql = migraciones[idx++];
          _db.transaction(
            tx => tx.executeSql(sql, []),
            ()  => siguienteMigracion(), // error (columna ya existe) → continuar
            ()  => siguienteMigracion()  // éxito → continuar
          );
        }
        siguienteMigracion();
      }
    );
  });
}

// ================================================================
// HELPERS DE TRANSACCIÓN
// ================================================================

function dbSelect(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!_db || !_dbInitialized) {
      reject(new Error('BD no inicializada'));
      return;
    }
    
    _db.transaction(function (tx) {
      tx.executeSql(sql, params,
        function (tx, res) {
          const rows = [];
          for (let i = 0; i < res.rows.length; i++) {
            rows.push(res.rows.item(i));
          }
          resolve(rows);
        },
        function (tx, err) { 
          console.error('❌ SELECT error:', sql, err);
          reject(err); 
        }
      );
    });
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!_db || !_dbInitialized) {
      reject(new Error('BD no inicializada'));
      return;
    }
    
    _db.transaction(function (tx) {
      tx.executeSql(sql, params,
        function (tx, res) { resolve(res); },
        function (tx, err) { 
          console.error('❌ RUN error:', sql, err);
          reject(err); 
        }
      );
    });
  });
}

function encolarSync(tabla, recordId, operacion, datos) {
  const sql = `INSERT INTO sync_queue (tabla, record_id, operacion, datos, created_at)
               VALUES (?, ?, ?, ?, ?)`;
  return dbRun(sql, [tabla, recordId, operacion, JSON.stringify(datos), nowISO()]);
}

// ================================================================
// CRUD POR DOMINIO (igual que antes)
// ================================================================

const Usuarios = {
  crear(datos) {
    const id  = generateUUID();
    const now = nowISO();
    const sql = `INSERT INTO usuarios
      (id, nombre, email, password, usuario, telefono, fecha_nacimiento, direccion, esta_activo, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`;
    return dbRun(sql, [
      id, datos.nombre, datos.email, datos.password,
      datos.usuario || null, datos.telefono || null,
      datos.fecha_nacimiento || null, datos.direccion || null,
      now, now
    ]).then(() => {
      encolarSync('usuarios', id, 'INSERT', { id, ...datos, created_at: now });
      return id;
    });
  },

  autenticar(usuario, password) {
    return dbSelect(
      `SELECT id, nombre, usuario, email FROM usuarios
       WHERE (usuario = ? OR email = ?) AND password = ? AND deleted_at IS NULL`,
      [usuario, usuario, password]
    ).then(rows => {
      if (rows.length === 0) throw new Error('Usuario o contraseña incorrectos');
      return rows[0];
    });
  },

  existeUsuario(usuario, email) {
    return dbSelect(
      `SELECT id FROM usuarios WHERE (usuario = ? OR email = ?) AND deleted_at IS NULL`,
      [usuario, email]
    ).then(rows => rows.length > 0);
  },

  getPerfil(userId) {
    return dbSelect(
      `SELECT id, nombre, email, usuario, telefono, fecha_nacimiento, direccion
       FROM usuarios WHERE id = ? AND deleted_at IS NULL`,
      [userId]
    ).then(rows => rows[0] || null);
  },

  actualizar(userId, datos) {
    const now    = nowISO();
    const campos = Object.keys(datos).map(k => `${k} = ?`).join(', ');
    const vals   = [...Object.values(datos), now, userId];
    return dbRun(
      `UPDATE usuarios SET ${campos}, updated_at = ?, synced_at = NULL WHERE id = ?`,
      vals
    ).then(() => encolarSync('usuarios', userId, 'UPDATE', datos));
  }
};

const Medicamentos = {
  getAll(userId) {
    return dbSelect(
      `SELECT * FROM medicamentos
       WHERE usuario_id = ? AND deleted_at IS NULL ORDER BY nombre ASC`,
      [userId]
    );
  },

  crear(userId, datos) {
    const id  = generateUUID();
    const now = nowISO();
    return dbRun(
      `INSERT INTO medicamentos (id, usuario_id, nombre, descripcion, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userId, datos.nombre, datos.descripcion || null, now, now]
    ).then(() => {
      encolarSync('medicamentos', id, 'INSERT', { id, usuario_id: userId, ...datos, created_at: now });
      return id;
    });
  },

  eliminar(id) {
    const now = nowISO();
    return dbRun(
      `UPDATE medicamentos SET deleted_at = ?, updated_at = ?, synced_at = NULL WHERE id = ?`,
      [now, now, id]
    ).then(() => encolarSync('medicamentos', id, 'DELETE', { deleted_at: now }));
  }
};

const Prescripciones = {
  getActivas(userId) {
    return dbSelect(
      `SELECT p.*, m.nombre as medicamento_nombre
       FROM prescripciones p
       LEFT JOIN medicamentos m ON p.medicamento_id = m.id
       WHERE p.usuario_id = ? AND p.esta_activa = 1 AND p.deleted_at IS NULL
       ORDER BY p.created_at DESC`,
      [userId]
    );
  },

  getNoSincronizadas(userId) {
    return dbSelect(
      `SELECT p.*, m.nombre as medicamento_nombre
       FROM prescripciones p
       LEFT JOIN medicamentos m ON p.medicamento_id = m.id
       WHERE p.usuario_id = ? AND p.deleted_at IS NULL AND p.synced_at IS NULL
       ORDER BY p.created_at DESC`,
      [userId]
    );
  },

  marcarSincronizada(id) {
    return dbRun(
      `UPDATE prescripciones SET synced_at = ? WHERE id = ?`,
      [nowISO(), id]
    );
  },

  crear(userId, datos) {
    const id  = generateUUID();
    const now = nowISO();
    return dbRun(
      `INSERT INTO prescripciones
        (id, usuario_id, medicamento_id, dosis, hora_toma, frecuencia, fecha_inicio, fecha_fin,
         esta_activa, nombre_medico, contacto_medico, via_administracion, notas, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
      [
        id, userId, datos.medicamento_id || null, datos.dosis,
        datos.hora_toma || null,
        datos.frecuencia || 'una_vez_dia', datos.fecha_inicio, datos.fecha_fin || null,
        datos.nombre_medico || null, datos.contacto_medico || null,
        datos.via_administracion || 'Oral',
        datos.notas || null,
        now, now
      ]
    ).then(() => id);
    // sync.js sincroniza vía getNoSincronizadas() — no se usa encolarSync aquí
  },

  desactivar(id) {
    const now = nowISO();
    return dbRun(
      `UPDATE prescripciones SET esta_activa = 0, updated_at = ?, synced_at = NULL WHERE id = ?`,
      [now, id]
    );
    // sync.js detectará synced_at = NULL y actualizará en Supabase
  }
};

const Alarmas = {
  getDelDia(userId, fecha) {
    return dbSelect(
      `SELECT a.*, p.dosis, m.nombre as medicamento_nombre
       FROM alarmas a
       LEFT JOIN prescripciones p ON a.prescripcion_id = p.id
       LEFT JOIN medicamentos m ON p.medicamento_id = m.id
       WHERE a.usuario_id = ? AND a.fecha = ? AND a.esta_activa = 1 AND a.deleted_at IS NULL
       ORDER BY a.hora_toma ASC`,
      [userId, fecha]
    );
  },

  getPendientes(userId) {
    const hoy = new Date().toISOString().split('T')[0];
    return dbSelect(
      `SELECT a.*, p.dosis, m.nombre as medicamento_nombre
       FROM alarmas a
       LEFT JOIN prescripciones p ON a.prescripcion_id = p.id
       LEFT JOIN medicamentos m ON p.medicamento_id = m.id
       WHERE a.usuario_id = ? AND a.fecha = ? AND a.tomado = 0
         AND a.esta_activa = 1 AND a.deleted_at IS NULL
       ORDER BY a.hora_toma ASC`,
      [userId, hoy]
    );
  },

  getNoSincronizadas(userId) {
    // Sincronizar TODAS las alarmas (con o sin prescripcion_id)
    return dbSelect(
      `SELECT a.*, p.dosis, m.nombre as medicamento_nombre
       FROM alarmas a
       LEFT JOIN prescripciones p ON a.prescripcion_id = p.id
       LEFT JOIN medicamentos m ON p.medicamento_id = m.id
       WHERE a.usuario_id = ? AND a.deleted_at IS NULL
         AND a.synced_at IS NULL
       ORDER BY a.created_at DESC`,
      [userId]
    );
  },

  marcarSincronizada(id) {
    return dbRun(
      `UPDATE alarmas SET synced_at = ? WHERE id = ?`,
      [nowISO(), id]
    );
  },

  crear(userId, datos) {
    const id  = generateUUID();
    const now = nowISO();
    return dbRun(
      `INSERT INTO alarmas
        (id, usuario_id, prescripcion_id, nombre, tono, fecha, hora_toma,
         tomado, esta_activa, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`,
      [
        id, userId,
        datos.prescripcion_id || null,
        datos.nombre || null,
        datos.tono   || 'alarm.mp3',
        datos.fecha,
        datos.hora_toma,
        now, now
      ]
    ).then(() => id);
    // sync.js sincroniza vía getNoSincronizadas() — no se usa encolarSync aquí
  },

  marcarTomada(id) {
    const now = nowISO();
    return dbRun(
      `UPDATE alarmas SET tomado = 1, hora_tomado = ?, updated_at = ?, synced_at = NULL WHERE id = ?`,
      [now, now, id]
    );
  },

  silenciarRecordatorio(id) {
    const now = nowISO();
    return dbRun(
      `UPDATE alarmas SET recordatorio_silenciado = 1, updated_at = ? WHERE id = ?`,
      [now, id]
    );
  },

  desactivar(id) {
    const now = nowISO();
    return dbRun(
      `UPDATE alarmas SET esta_activa = 0, updated_at = ?, synced_at = NULL WHERE id = ?`,
      [now, id]
    );
  },

  eliminar(id) {
    const now = nowISO();
    return dbRun(
      `UPDATE alarmas SET deleted_at = ?, updated_at = ?, synced_at = NULL WHERE id = ?`,
      [now, now, id]
    );
  }
};

const Inventario = {
  getAll(userId) {
    return dbSelect(
      `SELECT i.*,
              COALESCE(i.nombre_medicamento, p.dosis, m.nombre, 'Medicamento') as nombre_display
       FROM inventario i
       LEFT JOIN medicamentos m ON i.medicamento_id = m.id
       LEFT JOIN prescripciones p ON i.prescripcion_id = p.id
       WHERE i.usuario_id = ? AND i.deleted_at IS NULL
       ORDER BY i.stock_actual ASC`,
      [userId]
    );
  },

  getStockBajo(userId) {
    return dbSelect(
      `SELECT i.*,
              COALESCE(i.nombre_medicamento, p.dosis, m.nombre, 'Medicamento') as nombre_display
       FROM inventario i
       LEFT JOIN medicamentos m ON i.medicamento_id = m.id
       LEFT JOIN prescripciones p ON i.prescripcion_id = p.id
       WHERE i.usuario_id = ? AND i.stock_actual <= i.stock_minimo AND i.deleted_at IS NULL
       ORDER BY i.stock_actual ASC LIMIT 5`,
      [userId]
    );
  },

  // Obtener inventario por prescripcion_id (relación directa sin medicamento_id)
  getByPrescripcion(userId, prescripcionId) {
    return dbSelect(
      `SELECT i.* FROM inventario i
       JOIN prescripciones p ON i.medicamento_id = p.medicamento_id OR i.prescripcion_id = p.id
       WHERE i.usuario_id = ? AND p.id = ? AND i.deleted_at IS NULL
       LIMIT 1`,
      [userId, prescripcionId]
    ).catch(() => []);
  },

  // Descontar 1 pastilla del stock cuando se marca tomada
  async descontarStock(userId, prescripcionId) {
    const now = nowISO();
    // Buscar inventario ligado a esta prescripción
    const rows = await dbSelect(
      `SELECT id, stock_actual, stock_minimo FROM inventario
       WHERE usuario_id = ? AND prescripcion_id = ? AND deleted_at IS NULL LIMIT 1`,
      [userId, prescripcionId]
    ).catch(() => []);

    if (!rows.length) return null; // No hay inventario registrado para esta prescripción

    const inv = rows[0];
    const nuevo = Math.max(0, (inv.stock_actual || 0) - 1);

    await dbRun(
      `UPDATE inventario SET stock_actual = ?, updated_at = ?, synced_at = NULL WHERE id = ?`,
      [nuevo, now, inv.id]
    );

    return { id: inv.id, stock_actual: nuevo, stock_minimo: inv.stock_minimo };
  },

  // Crear inventario ligado directamente a una prescripción (sin catálogo de medicamentos)
  crearParaPrescripcion(userId, prescripcionId, datos) {
    const id  = generateUUID();
    const now = nowISO();
    return dbRun(
      `INSERT INTO inventario
        (id, usuario_id, medicamento_id, prescripcion_id, stock_actual, stock_minimo,
         fecha_vencimiento, nombre_medicamento, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, userId,
        datos.medicamento_id      || null,
        prescripcionId,
        datos.stock_actual        ?? 30,
        datos.stock_minimo        ?? 7,
        datos.fecha_vencimiento   || null,
        datos.nombre_medicamento  || null,
        now, now
      ]
    ).then(() => id);
  },

  upsert(userId, medicamentoId, datos) {
    return dbSelect(
      `SELECT id FROM inventario WHERE usuario_id = ? AND medicamento_id = ? AND deleted_at IS NULL`,
      [userId, medicamentoId]
    ).then(rows => {
      if (rows.length > 0) {
        const id  = rows[0].id;
        const now = nowISO();
        const campos = Object.keys(datos).map(k => `${k} = ?`).join(', ');
        return dbRun(
          `UPDATE inventario SET ${campos}, updated_at = ?, synced_at = NULL WHERE id = ?`,
          [...Object.values(datos), now, id]
        ).then(() => encolarSync('inventario', id, 'UPDATE', datos));
      } else {
        const id  = generateUUID();
        const now = nowISO();
        return dbRun(
          `INSERT INTO inventario
            (id, usuario_id, medicamento_id, stock_actual, stock_minimo, fecha_vencimiento, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, userId, medicamentoId,
            datos.stock_actual  ?? 0,
            datos.stock_minimo  ?? 10,
            datos.fecha_vencimiento || null,
            now, now
          ]
        ).then(() => {
          encolarSync('inventario', id, 'INSERT', { id, usuario_id: userId, medicamento_id: medicamentoId, ...datos, created_at: now });
          return id;
        });
      }
    });
  }
};

const Contactos = {
  getAll(userId) {
    return dbSelect(
      `SELECT * FROM contactos
       WHERE usuario_id = ? AND deleted_at IS NULL
       ORDER BY es_emergencia DESC, nombre ASC`,
      [userId]
    );
  },

  crear(userId, datos) {
    const id  = generateUUID();
    const now = nowISO();
    return dbRun(
      `INSERT INTO contactos (id, usuario_id, nombre, telefono, relacion, es_emergencia, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, userId, datos.nombre, datos.telefono || null,
        datos.relacion || null, datos.es_emergencia ? 1 : 0,
        now, now
      ]
    ).then(() => {
      encolarSync('contactos', id, 'INSERT', { id, usuario_id: userId, ...datos, created_at: now });
      return id;
    });
  },

  eliminar(id) {
    const now = nowISO();
    return dbRun(
      `UPDATE contactos SET deleted_at = ?, updated_at = ?, synced_at = NULL WHERE id = ?`,
      [now, now, id]
    ).then(() => encolarSync('contactos', id, 'DELETE', { deleted_at: now }));
  }
};

const Diario = {
  getAll(userId) {
    return dbSelect(
      `SELECT * FROM diario WHERE usuario_id = ? AND deleted_at IS NULL
       ORDER BY fecha DESC LIMIT 30`,
      [userId]
    );
  },

  crear(userId, datos) {
    const id  = generateUUID();
    const now = nowISO();
    return dbRun(
      `INSERT INTO diario (id, usuario_id, fecha, sintomas, notas, estado_animo, foto_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, userId, datos.fecha || new Date().toISOString().split('T')[0],
        datos.sintomas || null, datos.notas || null,
        datos.estado_animo || null, datos.foto_url || null,
        now, now
      ]
    ).then(() => {
      encolarSync('diario', id, 'INSERT', { id, usuario_id: userId, ...datos, created_at: now });
      return id;
    });
  },

  actualizar(userId, id, datos) {
    const now = nowISO();
    return dbRun(
      `UPDATE diario SET fecha=?, sintomas=?, notas=?, estado_animo=?, updated_at=?, synced_at=NULL
       WHERE id=? AND usuario_id=?`,
      [
        datos.fecha, datos.sintomas || null, datos.notas || null,
        datos.estado_animo || null, now, id, userId
      ]
    ).then(() => {
      encolarSync('diario', id, 'UPDATE', { id, usuario_id: userId, ...datos, updated_at: now });
    });
  },

  eliminar(userId, id) {
    const now = nowISO();
    return dbRun(
      `UPDATE diario SET deleted_at=?, updated_at=?, synced_at=NULL WHERE id=? AND usuario_id=?`,
      [now, now, id, userId]
    ).then(() => {
      encolarSync('diario', id, 'DELETE', { id, deleted_at: now });
    });
  }
};

const Stats = {
  async getResumenHoy(userId) {
    const hoy = new Date().toISOString().split('T')[0];
    const rows = await dbSelect(
      `SELECT tomado FROM alarmas
       WHERE usuario_id = ? AND fecha = ? AND esta_activa = 1 AND deleted_at IS NULL`,
      [userId, hoy]
    );
    const total      = rows.length;
    const tomadas    = rows.filter(r => r.tomado).length;
    const pendientes = total - tomadas;
    const adherencia = total > 0 ? Math.round((tomadas / total) * 100) : 0;
    return { total, tomadas, pendientes, adherencia };
  },

  async getMedicamentosActivos(userId) {
    const rows = await dbSelect(
      `SELECT COUNT(*) as cnt FROM prescripciones
       WHERE usuario_id = ? AND esta_activa = 1 AND deleted_at IS NULL`,
      [userId]
    );
    return rows[0]?.cnt || 0;
  },

  async getRachaDias(userId) {
    const hace30 = new Date();
    hace30.setDate(hace30.getDate() - 30);
    const desde = hace30.toISOString().split('T')[0];

    const rows = await dbSelect(
      `SELECT DISTINCT fecha FROM alarmas
       WHERE usuario_id = ? AND tomado = 1 AND fecha >= ? AND deleted_at IS NULL
       ORDER BY fecha DESC`,
      [userId, desde]
    );

    const fechas  = new Set(rows.map(r => r.fecha));
    let racha = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      if (fechas.has(ds)) { racha++; }
      else if (i > 0) { break; }
    }
    return racha;
  },

  async getSemana(userId) {
    const labels = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const fechas = [], lbls = [], tomadas = [], perdidas = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      fechas.push(d.toISOString().split('T')[0]);
      lbls.push(labels[d.getDay()]);
    }

    const hoy = new Date().toISOString().split('T')[0];
    const rows = await dbSelect(
      `SELECT fecha, tomado FROM alarmas
       WHERE usuario_id = ? AND fecha >= ? AND deleted_at IS NULL`,
      [userId, fechas[0]]
    );

    fechas.forEach(f => {
      const del = rows.filter(r => r.fecha === f);
      tomadas.push(del.filter(r => r.tomado).length);
      perdidas.push(f < hoy ? del.filter(r => !r.tomado).length : 0);
    });
    return { labels: lbls, tomadas, perdidas };
  },

  async getResumenMes(userId, mes, anio) {
    const primerDia = `${anio}-${String(mes+1).padStart(2,'0')}-01`;
    const ultimoDia = new Date(anio, mes+1, 0).toISOString().split('T')[0];

    const rows = await dbSelect(
      `SELECT tomado FROM alarmas
       WHERE usuario_id = ? AND fecha BETWEEN ? AND ? AND deleted_at IS NULL`,
      [userId, primerDia, ultimoDia]
    );
    const total      = rows.length;
    const tomadas    = rows.filter(r => r.tomado).length;
    const perdidas   = total - tomadas;
    const adherencia = total > 0 ? Math.round((tomadas / total) * 100) : 0;
    return { tomadas, perdidas, adherencia };
  }
};

// ── Exponer al scope global ───────────────────────────────────
window.DB = {
  init : initDB,
  run  : dbRun,
  select: dbSelect,
  encolarSync,
  generateUUID,
  nowISO,
  Usuarios,
  Medicamentos,
  Prescripciones,
  Alarmas,
  Inventario,
  Contactos,
  Diario,
  Stats
};

console.log('✅ db.js cargado - Inicialización única');