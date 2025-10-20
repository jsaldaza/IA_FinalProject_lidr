@echo off
title TESTFORGE - Ejecutor Completo

echo 🚀 TESTFORGE - INICIANDO PROYECTO COMPLETO
echo ==========================================

REM Verificar que los archivos .env existen
if not exist "Saldazia-backend\.env" (
    echo ❌ Archivo .env del backend no encontrado
    echo 📝 Ejecuta primero: instalar-testforge.bat
    pause
    exit /b 1
)

if not exist "Saldazia-frontend\.env" (
    echo ❌ Archivo .env del frontend no encontrado  
    echo 📝 Ejecuta primero: instalar-testforge.bat
    pause
    exit /b 1
)

echo ✅ Archivos de configuración encontrados

echo.
echo 🔧 Iniciando BACKEND (Puerto 3000)...
start "TestForge Backend" cmd /k "cd Saldazia-backend && npm run dev"

echo ⏳ Esperando que el backend inicie...
timeout /t 5 /nobreak >nul

echo.
echo 🌐 Iniciando FRONTEND (Puerto 5173)...
start "TestForge Frontend" cmd /k "cd Saldazia-frontend && npm run dev"

echo.
echo ✅ PROYECTO INICIADO
echo ===================
echo 🔗 URLs del proyecto:
echo 📊 Frontend: http://localhost:5173
echo ⚙️  Backend:  http://localhost:3000
echo 📚 API Docs: http://localhost:3000/api-docs
echo 🩺 Health:   http://localhost:3000/health
echo.
echo 💡 Consejos:
echo - El backend debe iniciar primero y estar disponible
echo - Verifica la conexión a MongoDB Atlas
echo - Revisa la consola de errores si algo falla
echo.
echo 🛑 Para detener: Cierra las ventanas de terminal
echo.
pause