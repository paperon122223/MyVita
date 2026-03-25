document.addEventListener('deviceready', function() {
    var dbName = "meditime.db";  // Nombre de tu archivo .db
    var dbAssetPath = window.cordova.file.applicationDirectory + "www/" + dbName;
    var dbDevicePath = window.cordova.file.dataDirectory + dbName;

    // Verifica si ya existe en el dispositivo
    window.resolveLocalFileSystemURL(dbDevicePath, function() {
        console.log("✅ La BD ya está copiada en el dispositivo.");
        openDatabase(dbDevicePath);  // Abre la BD
    }, function() {
        // Si no existe, cópiala desde www/
        console.log("⚠️ Copiando BD desde assets...");
        copyDatabase(dbAssetPath, dbDevicePath, function() {
            console.log("✅ BD copiada con éxito.");
            openDatabase(dbDevicePath);
        }, function(error) {
            console.error("❌ Error al copiar BD:", error);
        });
    });
});

// Función para copiar la BD
function copyDatabase(fromPath, toPath, successCallback, errorCallback) {
    var fileTransfer = new FileTransfer();

    fileTransfer.download(
        encodeURI(fromPath),  // Ruta origen (desde www/)
        encodeURI(toPath),    // Ruta destino (directorio de la app)
        successCallback,
        errorCallback,
        false,  // No usar caché
        {}
    );
}

// Función para abrir la BD
function openDatabase(dbPath) {
    var db = window.sqlitePlugin.openDatabase({
        name: dbPath,
        location: 'default',  // Usa 'default' para iOS/Android
    });

    // Ejemplo: Verifica las tablas
    db.transaction(function(tx) {
        tx.executeSql(
            'SELECT name FROM sqlite_master WHERE type="table"',
            [],
            function(tx, res) {
                console.log("📊 Tablas en la BD:", res.rows);
            },
            function(tx, err) {
                console.error("❌ Error al leer tablas:", err.message);
            }
        );
    });
}