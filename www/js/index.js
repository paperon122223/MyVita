// Simular el evento deviceready en un navegador
if (!window.cordova) {
    console.warn('Cordova no está disponible. Simulando el evento deviceready.');
    document.dispatchEvent(new Event('deviceready'));
}

document.addEventListener('deviceready', function() {
    var loginButton = document.getElementById('loginButton');
    var emailInput = document.getElementById('email');
    var passwordInput = document.getElementById('password');

    if (loginButton && emailInput && passwordInput) {
        loginButton.addEventListener('click', function() {
            var email = emailInput.value;
            var password = passwordInput.value;

            if (email && password) {
                window.location.href = 'main.html';
            } else {
                alert('Por favor, ingresa tu correo y contraseña.');
            }
        });
    } else {
        console.error('No se encontraron los elementos necesarios en el DOM.');
    }
}, false);