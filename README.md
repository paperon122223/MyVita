# 💊 MyVita - Aplicación Móvil

## 📱 Descripción

**MyVita** es una aplicación móvil diseñada como complemento de un **pastillero inteligente IoT**, enfocada en mejorar la adherencia al tratamiento médico de los pacientes.

Esta versión del repositorio contiene **únicamente la aplicación móvil**, la cual permite gestionar medicamentos, alarmas y funciones de apoyo al usuario.

---

## 🚀 Funcionalidades principales

* ⏰ **Alarmas de medicamentos**

  * Programación de horarios
  * Recordatorios activos tipo alarma
  * Posibilidad de seleccionar sonidos personalizados

* 📦 **Gestión de medicamentos**

  * Registro de medicamentos
  * Organización de tomas diarias

* 📍 **Ubicación del paciente**

  * Integración con geolocalización

* 🧠 **Asistente inteligente (IA)**

  * Apoyo informativo sobre medicamentos
  * Explicaciones (NO sustituye diagnóstico médico)

* 📊 **Dashboard**

  * Visualización del cumplimiento de tomas

* 🆘 **Funciones de emergencia**

  * Envío de SMS
  * Integración con WhatsApp

* ⚙️ **Configuraciones**

  * Ajustes accesibles desde la app

---

## 🛠️ Tecnologías utilizadas

* Apache Cordova
* HTML5, CSS3, JavaScript
* Plugins:

  * `cordova-plugin-local-notification`
  * `cordova-plugin-geolocation`
  * `cordova-plugin-contacts`
  * `cordova-plugin-dialogs`
  * `cordova-plugin-intent`

---

## 📦 Instalación

1. Clona el repositorio:

```bash
git clone https://github.com/paperon122223/MyVita.git
```

2. Entra al proyecto:

```bash
cd MyVita
```

3. Instala dependencias:

```bash
npm install
```

4. Ejecuta la app:

```bash
cordova run android
```

---

## 📡 Proyecto completo (visión general)

Este proyecto forma parte de un sistema más grande que incluye:

* 🧰 Pastillero inteligente (hardware con ESP32)
* 📱 Aplicación móvil (este repositorio)
* ☁️ Integración con servicios en la nube

---

## ⚠️ Aviso importante

Esta aplicación **NO proporciona diagnósticos médicos**.
Su propósito es únicamente **apoyar al usuario en la gestión de medicamentos**.

---

## 👨‍💻 Autor

Desarrollado por **Edgar Azcari Pérez García**

---

## 📄 Licencia

Este proyecto es de uso académico y educativo.
