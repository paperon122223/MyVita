document.addEventListener('deviceready', function() {
    // Verificar que los elementos existan
    var addContactButton = document.getElementById('addContactButton');
    var backButton = document.getElementById('backButton');
    var contactsList = document.getElementById('contactsList');

    // Asegurarse de que los elementos existen antes de agregarles eventos
    if (addContactButton) {
        addContactButton.addEventListener('click', function() {
            // Aquí puedes agregar la lógica para agregar un contacto
            alert("Botón para agregar contacto presionado");
        });
    }

    if (backButton) {
        backButton.addEventListener('click', function() {
            // Volver a la pantalla anterior
            window.history.back();
        });
    }

    // Función para cargar contactos
    const options = new ContactFindOptions();
    options.filter = "";
    options.multiple = true;
    const fields = ["displayName", "name"];

    if (contactsList) {
        navigator.contacts.find(fields, function(contacts) {
            contactsList.innerHTML = ''; // Limpiar la lista antes de agregar los nuevos contactos

            if (contacts.length === 0) {
                contactsList.innerHTML = '<li>No se encontraron contactos.</li>';
            } else {
                contacts.forEach(function(contact) {
                    const name = contact.displayName || contact.name.formatted;
                    const li = document.createElement('li');
                    li.textContent = name;
                    contactsList.appendChild(li);
                });
            }
        }, function(error) {
            console.error("Error al obtener los contactos:", error);
            alert("No se pudieron cargar los contactos.");
        }, options);
    }
});
