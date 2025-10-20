@echo off
echo Iniciando Frontend de TestForge...
echo ================================

cd /d "c:\Users\Lenovo\Desktop\TestForge\testforge-frontend"

echo Directorio actual: %CD%
echo.

echo Verificando package.json...
type package.json | findstr "\"dev\""

echo.
echo Iniciando servidor de desarrollo...
echo (Presiona Ctrl+C para detener)
echo.

start "TestForge Frontend" cmd /k "npm run dev"

echo.
echo Servidor iniciado en nueva ventana.
echo Ve a: http://localhost:5173
echo.

timeout /t 5 /nobreak >nul
start "" http://localhost:5173

pause
