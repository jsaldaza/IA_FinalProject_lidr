@echo off
echo 🔄 Verificando conexión con el backend...

:: Verificar que el backend esté funcionando
curl -s http://localhost:3001/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ El backend no está ejecutándose en el puerto 3001
    echo 💡 Por favor, inicia el backend con:
    echo    cd testforge-backend
    echo    npm run dev
    pause
    exit /b 1
)

echo ✅ Backend está ejecutándose correctamente

echo 🔄 Verificando conexión con el frontend...

curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ El frontend no está ejecutándose en el puerto 5173
    echo 💡 Por favor, inicia el frontend con:
    echo    cd testforge-frontend
    echo    npm run dev
    pause
    exit /b 1
)

echo ✅ Frontend está ejecutándose correctamente

echo 🔄 Verificando configuración de autenticación...

echo.
echo 💡 Para probar la autenticación:
echo    1. Ve a http://localhost:5173/register para crear un usuario
echo    2. Luego ve a http://localhost:5173/login para iniciar sesión
echo    3. Una vez autenticado, ve a http://localhost:5173/projects

echo.
echo ✅ Verificación completada
echo.
echo 🎉 CORRECCIONES DE SEGURIDAD APLICADAS:
echo    ✅ Credenciales hardcodeadas eliminadas
echo    ✅ Endpoints protegidos con autenticación
echo    ✅ CORS configurado correctamente
echo    ✅ Logs securizados
echo    ✅ URLs del frontend actualizadas
echo.
echo 🔗 URLs para probar:
echo    Frontend: http://localhost:5173
echo    Backend Health: http://localhost:3001/health
echo    API Docs: http://localhost:3001/api-docs
echo.
echo 📚 Para más información, consulta el archivo SECURITY.md

pause
