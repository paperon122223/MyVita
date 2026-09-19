@echo off
title Backend local de MyVita
cd /d "%~dp0files_context\backend\myvita-backend"
echo.
echo Backend de MyVita iniciado.
echo Mantenga esta ventana abierta durante la demostracion.
echo Direccion actual: http://192.168.1.73:3000
echo.
"C:\Users\edaga\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.js
pause
