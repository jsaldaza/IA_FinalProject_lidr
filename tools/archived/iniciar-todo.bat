@echo off
echo 🚀 Iniciando TestForge - Frontend y Backend
echo ===========================================
echo.

echo Matando procesos Node.js existentes...
taskkill /f /im node.exe 2>nul || echo No hay procesos Node.js para matar

echo.
echo Esperando 3 segundos...
timeout /t 3 /nobreak >nul

echo.
echo 🔧 Iniciando Backend...
start "TestForge Backend - Puerto 3000" cmd /k "cd /d c:\Users\Lenovo\Desktop\TestForge\testforge-backend && echo Iniciando backend en puerto 3000... && npm run dev"

echo.
echo Esperando 8 segundos para que el backend se inicie...
timeout /t 8 /nobreak >nul

echo.
echo 🌐 Iniciando Frontend...
start "TestForge Frontend - Puerto 5173" cmd /k "cd /d c:\Users\Lenovo\Desktop\TestForge\testforge-frontend && echo Iniciando frontend en puerto 5173... && npm run dev"

echo.
echo Esperando 10 segundos para que el frontend se inicie...
timeout /t 10 /nobreak >nul

echo.
echo 🔍 Verificando servicios...
echo.

echo Backend:
curl -s -I http://localhost:3000/health 2>nul | findstr "200" >nul && echo ✅ Backend funcionando || echo ❌ Backend no responde

echo.
echo Frontend:
curl -s -I http://localhost:5173 2>nul | findstr "200" >nul && echo ✅ Frontend funcionando || echo ❌ Frontend no responde

echo.
echo 🌐 Abriendo en el navegador...
start "" http://localhost:5173

echo.
echo 📋 Servicios iniciados:
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3000
echo.
echo ⚠️  Si ves errores, revisa las ventanas de terminal que se abrieron
echo.
pause
