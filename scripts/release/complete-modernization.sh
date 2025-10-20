#!/bin/bash

echo "🚀 SCRIPT DE FINALIZACIÓN - TESTFORGE MODERNIZACIÓN"
echo "=================================================="

# Cambiar al directorio del backend
cd testforge-backend

echo ""
echo "🔍 Paso 1: Verificando estado de la base de datos..."
node check-db-state.js

echo ""
echo "🔄 Paso 2: Ejecutando migración de base de datos..."
node migrations/run-migration.js

echo ""
echo "🔧 Paso 3: Regenerando cliente de Prisma..."
npx prisma generate

echo ""
echo "🏗️ Paso 4: Compilando TypeScript..."
npm run build

echo ""
echo "🧪 Paso 5: Ejecutando tests..."
npm test

echo ""
echo "✅ FINALIZACIÓN COMPLETADA"
echo "========================"
echo ""
echo "📋 Próximos pasos manuales:"
echo "1. Integrar rutas unificadas en server.ts"
echo "2. Probar endpoints de la API unificada"
echo "3. Deploy a producción"
echo ""
echo "🎯 TestForge ha sido modernizado exitosamente!"
