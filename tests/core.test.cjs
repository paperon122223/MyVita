const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');

// Ejecuta el código real con SQLite en memoria; sustituye únicamente el puente nativo.
function loader(mocks = {}) {
  const cache = new Map();
  return function load(file) {
    file = path.resolve(__dirname, '..', file);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    new Function('require', 'module', 'exports', js)((name) => {
      if (name in mocks) return mocks[name];
      if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name + '.ts'));
      return require(name);
    }, module, module.exports);
    return module.exports;
  };
}
const load = loader();
test('sesión: cerrar sesión con 401 elimina credenciales sin renovar ni repetir logout', async () => {
  const axios = require('axios');
  const service = loader({
    '@react-native-async-storage/async-storage': {},
    'expo-secure-store': {},
    './database': {},
    './offlineAuthService': {},
  })('src/services/authService.ts').default;
  let requests = 0, refreshes = 0, tokensDeleted = false, userDeleted = false;
  service.getStoredToken = async () => 'expired-test';
  service.refreshAccessToken = async () => { refreshes++; throw new Error('Renovación fallida'); };
  service.deleteStoredToken = async () => { tokensDeleted = true; };
  service.deleteStoredUserId = async () => { userDeleted = true; };
  service.client.defaults.adapter = async config => {
    requests++;
    // Corta la regresión sin dejar que una implementación defectuosa se cuelgue.
    if (requests > 2) return { status: 200, data: {}, headers: {}, config };
    throw new axios.AxiosError('No autorizado', 'ERR_BAD_REQUEST', config, {}, { status: 401, data: {}, headers: {}, config });
  };
  await service.logout();
  assert.equal(requests, 1);
  assert.equal(refreshes, 0);
  assert.equal(tokensDeleted, true);
  assert.equal(userDeleted, true);
});
const dates = load('src/utils/localDate.ts');
const validators = load('src/utils/validators.ts');

test('fechas: bisiestos, fin de mes y rechazo de fechas inexistentes', () => {
  assert.equal(dates.localDateKey(dates.localDateFromKey('2024-02-29')), '2024-02-29');
  assert.throws(() => dates.localDateFromKey('2025-02-29'));
  assert.throws(() => dates.localDateFromKey('2026-13-01'));
  assert.equal(dates.localDateKey(dates.addLocalDays(dates.localDateFromKey('2026-12-31'), 1)), '2027-01-01');
});
test('hora: límites y rechazo de texto sobrante', () => {
  assert.equal(dates.localDateTime('2026-09-05', '23:59').getHours(), 23);
  for (const value of ['24:00', '12:60', '12:30basura']) assert.throws(() => dates.localDateTime('2026-09-05', value));
});
test('validación de fechas de calendario', () => {
  assert.equal(validators.isValidDate('2024-02-29'), true);
  assert.equal(validators.isValidDate('2026-02-30'), false);
});
test('contactos requieren dígitos; edades y recordatorios finitos', () => {
  assert.equal(validators.isValidPhone('-------'), false);
  assert.equal(validators.isValidPhone('+52 811 234 5678'), true);
  assert.equal(validators.isValidAge(20.5), false);
  assert.ok(validators.validateAlarmForm('med', '08:00', ['lunes'], NaN).recordatorio);
});
test('formularios rechazan campos vacíos', () => {
  assert.ok(validators.validateLoginForm('', '').email);
  assert.ok(validators.validateMedicationForm('', '', '').nombre);
  assert.ok(validators.validateDiaryForm('', '').contenido);
});

async function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  const native = {
    execAsync: async sql => sqlite.exec(sql),
    runAsync: async (sql, args = []) => sqlite.prepare(sql).run(...args),
    getFirstAsync: async (sql, args = []) => sqlite.prepare(sql).get(...args) ?? null,
    getAllAsync: async (sql, args = []) => sqlite.prepare(sql).all(...args),
    closeAsync: async () => sqlite.close(),
    withExclusiveTransactionAsync: async callback => {
      sqlite.exec('BEGIN IMMEDIATE');
      try { await callback(native); sqlite.exec('COMMIT'); }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  let opens = 0;
  const service = loader({ 'expo-sqlite': { openDatabaseAsync: async () => { opens++; return native; } } })('src/services/database.ts').default;
  await Promise.all([service.init(), service.init()]);
  assert.equal(opens, 1);
  await service.crearUsuario({ id: 'qa', nombre: 'Prueba', email: 'qa@example.invalid' });
  return { service, sqlite, native };
}
test('SQLite: migraciones repetibles, CRUD y cola sin conexión', async () => {
  const { service: db, sqlite, native } = await fixture();
  try {
    await db.runMigrations(native);
    const id = await db.crearMedicamento({ usuarioId: 'qa', nombre: 'PRUEBA', dosis: '1' });
    assert.equal((await db.getMedicamentos('qa')).length, 1);
    assert.equal((await db.getMedicamentos('otro')).length, 0);
    assert.equal((await db.getSyncQueuePendiente()).length, 1);
    await db.eliminarMedicamento(id);
    assert.equal((await db.getMedicamentos('qa')).length, 0);
    assert.equal((await db.getSyncQueuePendiente()).length, 0);
  } finally { sqlite.close(); }
});
test('SQLite: confirmar dos veces una dosis no duplica historial ni descuenta dos unidades', async () => {
  const { service: db, sqlite } = await fixture();
  try {
    const med = await db.crearMedicamento({ usuarioId: 'qa', nombre: 'PRUEBA', dosis: '1' });
    await db.guardarInventario('qa', med, 10);
    const alarm = await db.crearAlarma({ usuarioId: 'qa', medicamentoId: med, horaToma: '08:00', fecha: '2026-09-05' });
    await db.marcarAlamaComoTomada(alarm);
    await new Promise(resolve => setTimeout(resolve, 2));
    await db.marcarAlamaComoTomada(alarm);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM tomas').get().n, 1);
    assert.equal(sqlite.prepare('SELECT cantidad FROM inventario').get().cantidad, 9);
  } finally { sqlite.close(); }
});
test('SQLite: recurrencia diaria respeta la fecha final', async () => {
  const { service: db, sqlite } = await fixture();
  try {
    await db.crearAlarmaConRecurrencia({ usuarioId: 'qa', horaToma: '08:00', fecha: '2026-09-05' }, 'diaria', undefined, '2026-09-07');
    assert.deepEqual(sqlite.prepare('SELECT fecha FROM alarmas ORDER BY fecha').all().map(r => r.fecha), ['2026-09-05', '2026-09-06', '2026-09-07']);
  } finally { sqlite.close(); }
});

test('SQLite: un fallo de inventario revierte la toma completa', async () => {
  const { service: db, sqlite } = await fixture();
  try {
    const med = await db.crearMedicamento({ usuarioId: 'qa', nombre: 'PRUEBA' });
    await db.guardarInventario('qa', med, 10);
    const alarm = await db.crearAlarma({ usuarioId: 'qa', medicamentoId: med, horaToma: '08:00', fecha: '2026-09-05' });
    sqlite.exec("CREATE TRIGGER fallo BEFORE UPDATE ON inventario BEGIN SELECT RAISE(ABORT, 'fallo simulado'); END");
    await assert.rejects(db.marcarAlamaComoTomada(alarm), /fallo simulado/);
    assert.equal(sqlite.prepare('SELECT tomado FROM alarmas').get().tomado, 0);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM tomas').get().n, 0);
    assert.equal(sqlite.prepare('SELECT cantidad FROM inventario').get().cantidad, 10);
  } finally { sqlite.close(); }
});

test('respaldo: un archivo incompatible conserva los datos existentes', async () => {
  const { service: db, sqlite } = await fixture();
  try {
    await db.crearMedicamento({ usuarioId: 'qa', nombre: 'CONSERVAR' });
    class File {
      static async pickFileAsync() { return { uri: 'test.json' }; }
      textSync() { return JSON.stringify({ formato: 1, datos: { medicamentos: [{ id: 'x', columna_inexistente: 'x' }] } }); }
    }
    const backup = loader({
      'expo-sharing': {}, 'expo-file-system': { File, Paths: {} }, './database': { __esModule: true, default: db },
    })('src/services/respaldoService.ts').default;
    await assert.rejects(backup.importar('qa'));
    assert.equal((await db.getMedicamentos('qa'))[0]?.nombre, 'CONSERVAR');
  } finally { sqlite.close(); }
});

for (const broken of [false, true]) {
  test(`respaldo: ${broken ? 'revierte una importación que falla a mitad' : 'restaura un archivo válido'}`, async () => {
    const { service: db, sqlite } = await fixture();
    try {
      await db.crearMedicamento({ usuarioId: 'qa', nombre: 'ORIGINAL' });
      const row = { ...(await db.getMedicamentos('qa'))[0], id: 'restaurado', nombre: 'RESTAURADO' };
      const rows = broken ? [row, { ...row, id: 'roto', nombre: null }] : [row];
      class File {
        static async pickFileAsync() { return { uri: 'test.json' }; }
        textSync() { return JSON.stringify({ formato: 1, datos: { medicamentos: rows } }); }
      }
      const backup = loader({
        'expo-sharing': {}, 'expo-file-system': { File, Paths: {} },
        './database': { __esModule: true, default: db },
      })('src/services/respaldoService.ts').default;
      if (broken) {
        await assert.rejects(backup.importar('qa'), /NOT NULL/);
        assert.equal((await db.getMedicamentos('qa'))[0].nombre, 'ORIGINAL');
      } else {
        assert.equal(await backup.importar('qa'), 1);
        assert.equal((await db.getMedicamentos('qa'))[0].nombre, 'RESTAURADO');
      }
    } finally { sqlite.close(); }
  });
}

function notificationFixture() {
  const scheduled = [], cancelled = [], storage = new Map();
  const native = {
    AndroidImportance: { MAX: 5, DEFAULT: 3 }, AndroidNotificationPriority: { MAX: 2 },
    AndroidNotificationVisibility: { PUBLIC: 1 }, SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
    setNotificationHandler() {}, addNotificationReceivedListener: () => ({ remove() {} }),
    addNotificationResponseReceivedListener: () => ({ remove() {} }),
    setNotificationChannelAsync: async () => {}, setNotificationCategoryAsync: async () => {},
    getPermissionsAsync: async () => ({ granted: false }), requestPermissionsAsync: async () => ({ granted: false }),
    scheduleNotificationAsync: async value => { scheduled.push(value); return value.identifier; },
    cancelScheduledNotificationAsync: async id => { cancelled.push(id); },
    getAllScheduledNotificationsAsync: async () => [{ identifier: 'scheduled_obsoleta' }, { identifier: 'snooze_existente' }],
  };
  const service = loader({
    'react-native': { Platform: { OS: 'android' }, AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } },
    '@react-native-async-storage/async-storage': { __esModule: true, default: { getItem: async k => storage.get(k) ?? null, setItem: async (k, v) => storage.set(k, v) } },
    '../utils/notificationsModule': { Notifications: native, isExpoGo: false },
    './database': { __esModule: true, default: {} },
  })('src/services/notificationService.ts').default;
  return { service, scheduled, cancelled };
}
test('notificaciones: permiso denegado se informa sin lanzar error', async () => {
  const { service } = notificationFixture();
  assert.equal(await service.requestPermissions(), false);
});
test('notificaciones: fecha, preferencias y limpieza de alarmas obsoletas', async () => {
  const { service, scheduled, cancelled } = notificationFixture();
  await service.setPrefs({ sonido: false, vibrar: false });
  const fecha = new Date('2030-01-01T08:00:00');
  await service.programarNotificacionesAlarmas([{ alarma: { id: 'qa', usuarioId: 'qa', medicamentoNombre: 'PRUEBA' }, fecha }]);
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].trigger.date, fecha);
  assert.equal(scheduled[0].trigger.channelId, 'myvita-alarmas-sv');
  assert.equal(scheduled[0].content.sound, undefined);
  assert.equal(scheduled[0].content.data.alarmaId, 'qa');
  assert.ok(cancelled.includes('scheduled_obsoleta'));
  assert.ok(!cancelled.includes('snooze_existente'));
});

function sessionFixture({ offline = false, refreshFails = false, persistent401 = false, changeUser = false } = {}) {
  const axios = require('axios');
  let token = offline ? 'offline-test' : 'expired-test', userId = 'qa';
  let refreshes = 0, requests = 0;
  const auth = {
    getStoredToken: async () => token,
    getStoredUserId: async () => userId,
    refreshAccessToken: async () => {
      refreshes++;
      await new Promise(resolve => setTimeout(resolve, 5));
      if (refreshFails) throw new Error('Red no disponible');
      token = 'renewed-test';
      if (changeUser) userId = 'otra-cuenta';
    },
  };
  const client = loader({
    './authService': { __esModule: true, default: auth },
    './offlineAuthService': { TOKEN_SESION_OFFLINE: 'offline-test' },
  })('src/services/authenticatedClient.ts').default;
  client.defaults.adapter = async config => {
    requests++;
    if (persistent401 || config.headers.get('Authorization') !== 'Bearer renewed-test') {
      throw new axios.AxiosError('No autorizado', 'ERR_BAD_REQUEST', config, {}, { status: 401, data: {}, headers: {}, config });
    }
    return { status: 200, data: { ok: true }, headers: {}, config };
  };
  return { client, counts: () => ({ requests, refreshes }) };
}
test('sesión: dos peticiones 401 comparten una renovación y se recuperan', async () => {
  const { client, counts } = sessionFixture();
  const result = await Promise.all([client.get('/sync/medicamentos'), client.get('/sync/alarmas')]);
  assert.ok(result.every(r => r.status === 200));
  assert.deepEqual(counts(), { requests: 4, refreshes: 1 });
});
test('sesión: un segundo 401 se devuelve sin bucle infinito', async () => {
  const { client, counts } = sessionFixture({ persistent401: true });
  await assert.rejects(client.get('/sync/alarmas'), /No autorizado/);
  assert.deepEqual(counts(), { requests: 2, refreshes: 1 });
});
test('sesión: falla la red durante renovación y se informa el error', async () => {
  const { client, counts } = sessionFixture({ refreshFails: true });
  await assert.rejects(client.get('/sync/alarmas'), /Red no disponible/);
  assert.deepEqual(counts(), { requests: 1, refreshes: 1 });
});
test('sesión: modo offline no envía un token local al servidor', async () => {
  const { client, counts } = sessionFixture({ offline: true });
  await assert.rejects(client.get('/sync/alarmas'), /Inicia sesión/);
  assert.deepEqual(counts(), { requests: 0, refreshes: 0 });
});
test('sesión: no repite una operación con la identidad de otra cuenta', async () => {
  const { client, counts } = sessionFixture({ changeUser: true });
  await assert.rejects(client.post('/sync/medicamentos', { nombre: 'PRUEBA' }), /La sesión cambió/);
  assert.deepEqual(counts(), { requests: 1, refreshes: 1 });
});

function realAuthFixture() {
  const values = new Map([
    ['myvita.auth_token', 'expired'], ['myvita.refresh_token', 'refresh-old'], ['myvita.user_id', 'qa'],
  ]);
  const service = loader({
    '@react-native-async-storage/async-storage': {
      multiGet: async keys => keys.map(key => [key, null]),
      multiRemove: async () => {}, removeItem: async () => {},
    },
    'expo-secure-store': {
      getItemAsync: async key => values.get(key) ?? null,
      setItemAsync: async (key, value) => { values.set(key, value); },
      deleteItemAsync: async key => { values.delete(key); },
    },
    './database': {}, './offlineAuthService': {},
  })('src/services/authService.ts').default;
  return { service, values };
}
test('sesión real: renovaciones concurrentes comparten una petición y guardan ambas credenciales', async () => {
  const { service, values } = realAuthFixture();
  let requests = 0;
  service.client.defaults.adapter = async config => {
    requests++;
    await new Promise(resolve => setTimeout(resolve, 5));
    return { status: 200, data: { session: { access_token: 'new', refresh_token: 'refresh-new' } }, headers: {}, config };
  };
  await Promise.all([service.refreshAccessToken(), service.refreshAccessToken()]);
  assert.equal(requests, 1);
  assert.equal(values.get('myvita.auth_token'), 'new');
  assert.equal(values.get('myvita.refresh_token'), 'refresh-new');
});
test('sesión real: renovación rechazada retira credenciales y avisa una vez sin borrar identidad', async () => {
  const { service, values } = realAuthFixture();
  let expired = 0;
  service.onSessionExpired(() => expired++);
  service.client.defaults.adapter = async config => {
    throw new (require('axios').AxiosError)('Unauthorized', 'ERR_BAD_REQUEST', config, {}, { status: 401, data: { error: 'Invalid Refresh Token: Already Used' }, headers: {}, config });
  };
  await Promise.all([
    assert.rejects(service.refreshAccessToken(), /Tu sesión venció/),
    assert.rejects(service.refreshAccessToken(), /Tu sesión venció/),
  ]);
  assert.equal(expired, 1);
  assert.equal(values.has('myvita.auth_token'), false);
  assert.equal(values.has('myvita.refresh_token'), false);
  assert.equal(values.get('myvita.user_id'), 'qa');
});
test('sesión real: fallo de red conserva credenciales y permite reintentar', async () => {
  const { service, values } = realAuthFixture();
  let requests = 0, expired = 0;
  service.onSessionExpired(() => expired++);
  service.client.defaults.adapter = async () => { requests++; throw new Error('Network Error'); };
  await assert.rejects(service.refreshAccessToken(), /conexión/);
  await assert.rejects(service.refreshAccessToken(), /conexión/);
  assert.equal(requests, 2);
  assert.equal(expired, 0);
  assert.equal(values.get('myvita.refresh_token'), 'refresh-old');
});
test('sesión real: contraseña rechazada no intenta renovar ni cerrar sesión', async () => {
  const { service, values } = realAuthFixture();
  const urls = [];
  service.client.defaults.adapter = async config => {
    urls.push(config.url);
    throw new (require('axios').AxiosError)('Unauthorized', 'ERR_BAD_REQUEST', config, {}, { status: 401, data: { error: 'Credenciales incorrectas' }, headers: {}, config });
  };
  await assert.rejects(service.login({ email: 'qa@example.invalid', password: 'incorrecta' }), /Credenciales incorrectas/);
  assert.deepEqual(urls, ['/auth/login']);
  assert.equal(values.get('myvita.refresh_token'), 'refresh-old');
});
test('sesión real: una renovación pendiente no restaura la sesión después de salir', async () => {
  const { service, values } = realAuthFixture();
  let release, started;
  const waiting = new Promise(resolve => { started = resolve; });
  service.client.defaults.adapter = async config => {
    if (config.url === '/auth/refresh') {
      started();
      await new Promise(resolve => { release = resolve; });
    }
    return { status: 200, data: { session: { access_token: 'new', refresh_token: 'refresh-new' } }, headers: {}, config };
  };
  const refresh = service.refreshAccessToken();
  await waiting;
  await service.logout();
  release();
  await assert.rejects(refresh, /sesión cambió/);
  assert.equal(values.has('myvita.auth_token'), false);
});
