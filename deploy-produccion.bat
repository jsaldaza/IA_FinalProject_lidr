@echo off
title TESTFORGE AI - DEPLOY COMPLETO A PRODUCCION

echo 🚀 TESTFORGE AI - DEPLOY COMPLETO A PRODUCCION
echo ===============================================

echo.
echo 📋 Pre-requisitos de deployment:
echo ✅ MongoDB Atlas configurado
echo ✅ Cuenta Railway creada
echo ✅ Cuenta Vercel creada  
echo ✅ Repositorio GitHub listo
echo.

set /p CONFIRMAR="¿Todos los pre-requisitos están listos? (y/n): "
if /i "%CONFIRMAR%" neq "y" (
    echo ❌ Completa los pre-requisitos primero
    echo 📚 Consulta: docs/mongodb-atlas-setup.md
    echo 📚 Consulta: docs/railway-deployment.md
    echo 📚 Consulta: docs/vercel-deployment.md
    pause
    exit /b 1
)

echo.
echo 🔍 Verificando proyecto local...

REM Verificar que existe .env del backend
if not exist "Saldazia-backend\.env" (
    echo ❌ No existe Saldazia-backend\.env
    echo 📝 Ejecuta: instalar-testforge.bat primero
    pause
    exit /b 1
)

REM Verificar variables críticas
findstr /c:"DATABASE_URL=" "Saldazia-backend\.env" >nul
if %errorlevel% neq 0 (
    echo ❌ DATABASE_URL no configurada en Saldazia-backend\.env
    pause
    exit /b 1
)

findstr /c:"OPENAI_API_KEY=" "Saldazia-backend\.env" >nul
if %errorlevel% neq 0 (
    echo ❌ OPENAI_API_KEY no configurada en Saldazia-backend\.env
    pause
    exit /b 1
)

findstr /c:"JWT_SECRET=" "Saldazia-backend\.env" >nul
if %errorlevel% neq 0 (
    echo ❌ JWT_SECRET no configurada en Saldazia-backend\.env
    pause
    exit /b 1
)

echo ✅ Variables de entorno configuradas

echo.
echo 🧪 Ejecutando tests locales...

REM Test backend
echo 📦 Testing backend...
cd Saldazia-backend
call npm test
if %errorlevel% neq 0 (
    echo ❌ Tests del backend fallaron
    echo 🔧 Corrige los errores antes de continuar
    pause
    exit /b 1
)

cd..

REM Test frontend  
echo 🌐 Testing frontend...
cd Saldazia-frontend
call npm run test:run
if %errorlevel% neq 0 (
    echo ❌ Tests del frontend fallaron
    echo 🔧 Corrige los errores antes de continuar
    pause
    exit /b 1
)

cd..

echo ✅ Todos los tests pasaron

echo.
echo 🏗️ Construyendo para producción...

REM Build backend
echo 📦 Building backend...
cd Saldazia-backend
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build del backend falló
    pause
    exit /b 1
)

cd..

REM Build frontend
echo 🌐 Building frontend...
cd Saldazia-frontend
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build del frontend falló
    pause
    exit /b 1
)

cd..

echo ✅ Builds completados exitosamente

echo.
echo 📤 Preparando para deploy...

REM Verificar si git está inicializado
if not exist ".git" (
    echo 🔧 Inicializando repositorio Git...
    git init
    git branch -M main
)

REM Verificar git status
echo 📋 Estado del repositorio:
git status

echo.
set /p COMMIT_MSG="📝 Mensaje del commit (Enter para default): "
if "%COMMIT_MSG%"=="" set COMMIT_MSG=feat: deploy TestForge AI to production

echo.
echo 📤 Commiteando cambios...
git add .
git commit -m "%COMMIT_MSG%"

echo.
echo 🚀 INSTRUCCIONES DE DEPLOY MANUAL:
echo =====================================
echo.
echo 📚 1. SUBIR A GITHUB:
echo    git remote add origin https://github.com/tu-usuario/testforge-ai.git
echo    git push -u origin main
echo.
echo 🚂 2. RAILWAY (Backend):
echo    - Ve a railway.app
echo    - New Project → Deploy from GitHub
echo    - Selecciona tu repo
echo    - Root Directory: Saldazia-backend
echo    - Configura variables de entorno:
echo      * DATABASE_URL=tu-mongodb-connection-string
echo      * JWT_SECRET=tu-jwt-secret
echo      * OPENAI_API_KEY=tu-openai-key
echo      * NODE_ENV=production
echo.
echo 🌐 3. VERCEL (Frontend):
echo    - Ve a vercel.com
echo    - New Project → Import from GitHub
echo    - Root Directory: Saldazia-frontend
echo    - Variable de entorno:
echo      * VITE_API_URL=https://tu-backend.railway.app/api
echo.
echo 🔧 4. CONFIGURAR GITHUB SECRETS (para CI/CD):
echo    En GitHub → Settings → Secrets → Actions:
echo    - DATABASE_URL
echo    - JWT_SECRET  
echo    - OPENAI_API_KEY
echo    - RAILWAY_TOKEN (opcional)
echo    - VERCEL_TOKEN (opcional)
echo.
echo ✅ 5. VERIFICAR DEPLOYMENT:
echo    - Backend: https://tu-app.railway.app/health
echo    - Frontend: https://tu-app.vercel.app
echo    - API Docs: https://tu-app.railway.app/api-docs
echo.

echo 🎉 PROYECTO LISTO PARA DEPLOY
echo ==============================
echo.
echo 💡 CONSEJOS FINALES:
echo - Guarda las URLs de producción
echo - Configura monitoreo en Railway/Vercel
echo - Revisa los logs después del deploy
echo - Actualiza CORS_ORIGIN en Railway con la URL de Vercel
echo.

set /p ABRIR_DOCS="¿Abrir documentación de deployment? (y/n): "
if /i "%ABRIR_DOCS%"=="y" (
    start docs/railway-deployment.md
    start docs/vercel-deployment.md
)

pause