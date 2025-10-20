@echo off
echo 🚀 TESTFORGE AI - INSTALACION COMPLETA PARA WINDOWS
echo ==================================================

echo.
echo 📋 Verificando requisitos del sistema...
node --version >nul 2>&1 || (
    echo ❌ Node.js no está instalado
    echo 📥 Descarga Node.js LTS desde: https://nodejs.org/
    echo 💡 Versión recomendada: Node.js 18.x o superior
    pause
    exit /b 1
)

echo ✅ Node.js encontrado
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo 📦 Versión: %NODE_VERSION%

REM Verificar npm
npm --version >nul 2>&1 || (
    echo ❌ npm no está disponible
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo 📦 npm versión: %NPM_VERSION%

echo.
echo 🔧 Configurando workspace del proyecto...

REM Instalar dependencias del workspace principal
echo � Instalando dependencias del workspace principal...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Error instalando dependencias del workspace principal
    pause
    exit /b 1
)

echo.
echo �📁 Configurando variables de entorno...

REM Crear .env para el proyecto principal si no existe
if not exist ".env" (
    echo 📝 Creando archivo .env principal...
    copy ".env.example" ".env"
    echo ⚠️  Configura las variables en .env si es necesario
) else (
    echo ✅ Archivo .env principal ya existe
)

REM Crear .env para el backend si no existe
if not exist "Saldazia-backend\.env" (
    echo 📝 Creando archivo .env para backend...
    copy "Saldazia-backend\.env.example" "Saldazia-backend\.env"
    echo ⚠️  IMPORTANTE: Configura las variables en Saldazia-backend\.env
) else (
    echo ✅ Archivo .env del backend ya existe
)

REM Crear .env para el frontend si no existe
if not exist "Saldazia-frontend\.env" (
    echo 📝 Creando archivo .env para frontend...
    copy "Saldazia-frontend\.env.example" "Saldazia-frontend\.env"
) else (
    echo ✅ Archivo .env del frontend ya existe
)

echo.
echo 📦 Instalando dependencias del BACKEND...
cd Saldazia-backend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Error instalando dependencias del backend
    pause
    exit /b 1
)

echo.
echo 🔄 Generando cliente Prisma...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ❌ Error generando cliente Prisma
    echo 💡 Verifica que DATABASE_URL esté configurada en .env
    pause
    exit /b 1
)

cd..

echo.
echo 📦 Instalando dependencias del FRONTEND...
cd Saldazia-frontend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Error instalando dependencias del frontend
    pause
    exit /b 1
)

cd..

echo.
echo ✅ INSTALACION COMPLETADA EXITOSAMENTE
echo ========================================
echo.
echo � CONFIGURACION REQUERIDA:
echo.
echo 🔧 1. Configura Saldazia-backend\.env con:
echo    💾 DATABASE_URL=mongodb+srv://usuario:password@cluster.mongodb.net/testforge
echo    🤖 OPENAI_API_KEY=sk-tu-api-key-aqui
echo    🔐 JWT_SECRET=tu-super-secreto-jwt-key-de-32-caracteres
echo.
echo 🔧 2. Opcional - Configura Saldazia-frontend\.env:
echo    🌐 VITE_API_URL=http://localhost:3000/api (ya configurado)
echo.
echo 🚀 3. EJECUTAR EL PROYECTO:
echo    ⚡ Opción rápida: ejecutar-proyecto.bat
echo    📋 Opción manual:
echo       - Terminal 1: cd Saldazia-backend ^&^& npm run dev
echo       - Terminal 2: cd Saldazia-frontend ^&^& npm run dev
echo.
echo 🌐 4. URLs una vez iniciado:
echo    📊 Frontend: http://localhost:5173
echo    ⚙️  Backend:  http://localhost:3000
echo    📚 API Docs: http://localhost:3000/api-docs
echo    🩺 Health:   http://localhost:3000/health
echo.
echo 💡 CONSEJOS:
echo    - Usa MongoDB Atlas (gratuito) para la base de datos
echo    - Obtén tu OpenAI API key en platform.openai.com
echo    - Genera JWT_SECRET con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
echo.
pause