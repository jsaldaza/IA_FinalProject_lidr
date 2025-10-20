@echo off
echo 🚀 Ejecutando migración de limpieza de base de datos...
echo.

cd /d "%~dp0.."

echo 📦 Verificando dependencias...
call npm list prisma

if %errorlevel% neq 0 (
    echo ❌ Prisma no está instalado. Instalando...
    call npm install prisma --save-dev
)

echo 🗑️  Ejecutando migración de limpieza...
npx prisma migrate deploy

if %errorlevel% neq 0 (
    echo ❌ Error en la migración. Abortando...
    pause
    exit /b 1
)

echo ✅ Migración completada exitosamente!
echo.
echo 📊 Generando cliente Prisma actualizado...
npx prisma generate

if %errorlevel% neq 0 (
    echo ❌ Error generando cliente Prisma
    pause
    exit /b 1
)

echo ✅ Cliente Prisma generado exitosamente!
echo.
echo 🎉 Limpieza de base de datos completada!
echo.
echo Resumen de cambios:
echo - ✅ Eliminadas tablas legacy: TestSuite, TestScenario, DomainEvent
echo - ✅ Eliminado campo legacy: TestCase.analysisId
echo - ✅ Optimizados índices para dashboard y consultas frecuentes
echo - ✅ Cliente Prisma actualizado
echo.
pause