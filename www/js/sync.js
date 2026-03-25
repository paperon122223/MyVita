// ================================================================
// sync.js — Sincronización SQLite ↔ Supabase (CORREGIDO)
// ================================================================

const SUPABASE_URL  = ;
const SUPABASE_ANON = ;

let _syncInitialized = false;

function getSupabaseToken() {
  return localStorage.getItem('sb_access_token') || SUPABASE_ANON;
}

function headers() {
  return {
    'Content-Type'  : 'application/json',
    'apikey'        : SUPABASE_ANON,
    'Authorization' : `Bearer ${getSupabaseToken()}`
  };
}

function mostrarDebug(mensaje, tipo = 'info') {
  console.log(`[${tipo}] ${mensaje}`);
  if (typeof mostrarNotificacion === 'function') {
    mostrarNotificacion(mensaje, tipo, 4000);
  }
}

// ══════════════════════════════════════════
// FUNCIÓN DE UPSERT CORREGIDA
// ══════════════════════════════════════════
async function upsertRecord(tabla, data, idColumn = 'id') {
  try {
    // 1. Intentar verificar si existe
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/${tabla}?${idColumn}=eq.${data[idColumn]}&select=*`,
      {
        method: 'GET',
        headers: headers()
      }
    );

    if (!checkRes.ok) {
      throw new Error(`Error verificando existencia: ${checkRes.status}`);
    }

    const exists = await checkRes.json();
    
    if (exists && exists.length > 0) {
      // 2. ACTUALIZAR si existe
      console.log(`📝 Actualizando ${tabla}:`, data[idColumn]);
      
      const updateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/${tabla}?${idColumn}=eq.${data[idColumn]}`,
        {
          method: 'PATCH',
          headers: headers(),
          body: JSON.stringify(data)
        }
      );

      if (!updateRes.ok) {
        const errorText = await updateRes.text();
        throw new Error(`Error UPDATE: ${updateRes.status} - ${errorText}`);
      }

      return { action: 'updated', data };

    } else {
      // 3. INSERTAR si no existe
      console.log(`➕ Insertando ${tabla}:`, data[idColumn]);
      
      const insertRes = await fetch(
        `${SUPABASE_URL}/rest/v1/${tabla}`,
        {
          method: 'POST',
          headers: {
            ...headers(),
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(data)
        }
      );

      if (!insertRes.ok) {
        const errorText = await insertRes.text();
        throw new Error(`Error INSERT: ${insertRes.status} - ${errorText}`);
      }

      const result = await insertRes.json();
      return { action: 'inserted', data: result };
    }

  } catch (error) {
    console.error(`❌ Error en upsert de ${tabla}:`, error);
    throw error;
  }
}

// ══════════════════════════════════════════
// SINCRONIZAR PRESCRIPCIONES (CORREGIDO)
// ══════════════════════════════════════════
async function sincronizarPrescripciones() {
  if (!window.DB) {
    mostrarDebug('⚠️ DB no disponible', 'advertencia');
    return;
  }

  const userId = localStorage.getItem('currentUserId');
  if (!userId) {
    mostrarDebug('⚠️ No hay usuario activo', 'advertencia');
    return;
  }

  try {
    const noSync = await window.DB.Prescripciones.getNoSincronizadas(userId);
    
    if (noSync.length === 0) {
      console.log('✅ Prescripciones ya sincronizadas');
      return;
    }

    mostrarDebug(`📤 Sincronizando ${noSync.length} prescripción(es)...`, 'info');

    let exitosas = 0;
    let errores = 0;

    for (const presc of noSync) {
      try {
        // ✅ DATOS CORRECTOS (sin hora_toma que no existe en prescripciones)
        const body = {
          id                : presc.id,
          usuario_id        : userId,
          medicamento_id    : presc.medicamento_id,
          dosis             : presc.dosis || null,
          frecuencia        : presc.frecuencia || null,
          fecha_inicio      : presc.fecha_inicio || null,
          fecha_fin         : presc.fecha_fin || null,
          nombre_medico     : presc.nombre_medico || null,
          contacto_medico   : presc.contacto_medico || null,
          via_administracion: presc.via_administracion || null,
          notas             : presc.notas || null,
          esta_activa       : presc.esta_activa !== undefined ? presc.esta_activa : 1,
          created_at        : presc.created_at || new Date().toISOString(),
          updated_at        : presc.updated_at || new Date().toISOString()
        };

        // Usar función de upsert mejorada
        await upsertRecord('prescripciones', body);

        // Marcar como sincronizada en SQLite local
        await window.DB.Prescripciones.marcarSincronizada(presc.id);
        
        exitosas++;
        console.log(`✅ Prescripción ${presc.id} sincronizada`);

      } catch (err) {
        console.error(`❌ Error con prescripción ${presc.id}:`, err.message);
        mostrarDebug(`❌ ${err.message.substring(0, 80)}`, 'error');
        errores++;
      }
    }

    if (exitosas > 0) {
      mostrarDebug(`✅ ${exitosas} prescripción(es) sincronizada(s)`, 'exito');
    }
    
    if (errores > 0) {
      mostrarDebug(`⚠️ ${errores} error(es)`, 'advertencia');
    }

  } catch (err) {
    console.error('❌ Error general en sincronización de prescripciones:', err);
    mostrarDebug(`❌ Error: ${err.message}`, 'error');
  }
}

// ══════════════════════════════════════════
// SINCRONIZAR ALARMAS (CORREGIDO)
// ══════════════════════════════════════════
async function sincronizarAlarmas() {
  if (!window.DB) {
    console.log('⚠️ DB no disponible');
    return;
  }

  const userId = localStorage.getItem('currentUserId');
  if (!userId) {
    console.log('⚠️ No hay usuario activo');
    return;
  }

  try {
    const noSync = await window.DB.Alarmas.getNoSincronizadas(userId);
    
    if (noSync.length === 0) {
      console.log('✅ Alarmas ya sincronizadas');
      return;
    }

    console.log(`📤 Sincronizando ${noSync.length} alarma(s)...`);

    let exitosas = 0;
    let errores = 0;

    for (const alarma of noSync) {
      try {
        const body = {
          id              : alarma.id,
          usuario_id      : userId,
          prescripcion_id : alarma.prescripcion_id,
          fecha           : alarma.fecha,
          hora_toma       : alarma.hora_toma,
          tomado          : alarma.tomado !== undefined ? alarma.tomado : 0,
          hora_tomado     : alarma.hora_tomado || null,
          notas           : alarma.notas || null,
          esta_activa     : alarma.esta_activa !== undefined ? alarma.esta_activa : 1,
          created_at      : alarma.created_at || new Date().toISOString(),
          updated_at      : alarma.updated_at || new Date().toISOString()
        };

        await upsertRecord('alarmas', body);
        await window.DB.Alarmas.marcarSincronizada(alarma.id);
        
        exitosas++;

      } catch (err) {
        console.error(`❌ Error con alarma ${alarma.id}:`, err.message);
        errores++;
      }
    }

    if (exitosas > 0) {
      console.log(`✅ ${exitosas} alarma(s) sincronizada(s)`);
    }

  } catch (err) {
    console.error('❌ Error general en sincronización de alarmas:', err);
  }
}

// ══════════════════════════════════════════
// SINCRONIZAR TODO
// ══════════════════════════════════════════
async function sincronizar() {
  if (!navigator.onLine) {
    console.log('📴 Sin internet, sincronización pospuesta');
    return;
  }

  console.log('🔄 Iniciando sincronización...');
  
  try {
    await sincronizarPrescripciones();
    await sincronizarAlarmas();
    
    // Actualizar última sincronización
    localStorage.setItem('last_sync', new Date().toISOString());
    
    console.log('✅ Sincronización completada');
  } catch (error) {
    console.error('❌ Error en sincronización general:', error);
  }
}

// ══════════════════════════════════════════
// SERVICIO DE SINCRONIZACIÓN
// ══════════════════════════════════════════
const SyncService = {
  _intervalo: null,

  iniciar(intervaloMs = 30000) {
    if (_syncInitialized) {
      console.log('ℹ️ SyncService ya estaba iniciado');
      return;
    }

    _syncInitialized = true;
    console.log(`🔄 SyncService iniciado (intervalo: ${intervaloMs/1000}s)`);
    
    // Eventos de red
    window.addEventListener('online', () => {
      console.log('🌐 Conexión recuperada');
      mostrarDebug('🌐 Conexión recuperada, sincronizando...', 'exito');
      sincronizar();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Sin conexión');
      mostrarDebug('📴 Sin conexión', 'advertencia');
    });

    // Sincronización periódica
    this._intervalo = setInterval(() => {
      if (navigator.onLine) {
        sincronizar();
      }
    }, intervaloMs);

    // Primera sincronización después de 3 segundos
    setTimeout(() => {
      if (navigator.onLine) {
        sincronizar();
      }
    }, 3000);
  },

  detener() {
    if (this._intervalo) {
      clearInterval(this._intervalo);
      this._intervalo = null;
      _syncInitialized = false;
      console.log('⏸️ SyncService detenido');
    }
  },

  forzar() {
    console.log('⚡ Forzando sincronización manual...');
    mostrarDebug('⚡ Sincronizando ahora...', 'info');
    return sincronizar();
  },

  estado() {
    const lastSync = localStorage.getItem('last_sync');
    return {
      activo: _syncInitialized,
      online: navigator.onLine,
      ultimaSinc: lastSync ? new Date(lastSync) : null
    };
  }
};

// ══════════════════════════════════════════
// API PÚBLICA
// ══════════════════════════════════════════
window.Sync = {
  sincronizarPrescripciones,
  sincronizarAlarmas,
  sincronizar,
  iniciar: (intervalo) => SyncService.iniciar(intervalo),
  detener: () => SyncService.detener(),
  forzar: () => SyncService.forzar(),
  estado: () => SyncService.estado()
};

console.log('✅ sync.js cargado (versión corregida)');

// ══════════════════════════════════════════
// AUTO-INICIALIZACIÓN
// ══════════════════════════════════════════
document.addEventListener('deviceready', () => {
  setTimeout(() => {
    if (window.DB && localStorage.getItem('currentUserId')) {
      console.log('📱 Cordova detectado, iniciando sync...');
      SyncService.iniciar();
    }
  }, 1000);
});

// Para desarrollo en navegador
if (!window.cordova) {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (window.DB && localStorage.getItem('currentUserId')) {
        console.log('🌐 Navegador detectado, iniciando sync...');
        SyncService.iniciar();
      }
    }, 1000);
  });
}
