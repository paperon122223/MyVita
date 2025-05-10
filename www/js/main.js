// Simular el evento deviceready en un navegador
if (!window.cordova) {
    console.warn('Cordova no está disponible. Simulando el evento deviceready.');
    document.dispatchEvent(new Event('deviceready'));
}

document.addEventListener('deviceready', function() {
    var alarmButton = document.getElementById('alarmButton');
    var settingsButton = document.getElementById('settingsButton');
    var contactsButton = document.getElementById('contactsButton');

    if (alarmButton && settingsButton && contactsButton) {
        alarmButton.addEventListener('click', function() {
            window.location.href = 'alarm.html';
        });

        settingsButton.addEventListener('click', function() {
            window.location.href = 'settings.html';
        });

        contactsButton.addEventListener('click', function() {
            window.location.href = 'contacts.html';
        });
    } else {
        console.error('No se encontraron los botones necesarios en el DOM.');
    }
}, false);