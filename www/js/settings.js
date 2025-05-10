document.addEventListener('deviceready', function() {
    // Verificar que los botones existan
    var audioButton = document.getElementById('audioButton');
    var gamesButton = document.getElementById('gamesButton');
    var suggestionsButton = document.getElementById('suggestionsButton');
    var aboutButton = document.getElementById('aboutButton');
    var backButton = document.getElementById('backButton');

    if (audioButton && gamesButton && suggestionsButton && aboutButton && backButton) {
        // Configurar el evento para el botón de desactivar audios
        audioButton.addEventListener('click', function() {
            alert('Audios desactivados');
        });

        // Configurar el evento para el botón de minijuegos
        gamesButton.addEventListener('click', function() {
            alert('Minijuegos no disponibles aún');
        });

        // Configurar el evento para el botón de sugerencias
        suggestionsButton.addEventListener('click', function() {
            alert('Envía tus sugerencias a soporte@meditime.com');
        });

        // Configurar el evento para el botón de acerca de
        aboutButton.addEventListener('click', function() {
            alert('MediTime v1.0 - Cuidando tu salud');
        });

        // Configurar el evento para el botón de regresar
        backButton.addEventListener('click', function() {
            window.location.href = 'main.html'; // Redirige al menú principal
        });
    } else {
        console.error('No se encontraron los botones necesarios en el DOM.');
    }
}, false);