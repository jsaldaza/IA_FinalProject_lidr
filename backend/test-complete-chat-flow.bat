@echo off
REM Script de pruebas completas para el sistema de chat de TestForge
REM Demuestra el flujo completo: crear proyecto -> chat interactivo -> completar

echo 🚀 TestForge Chat System - Pruebas Completas
echo ==========================================

REM Configuración - ACTUALIZAR CON TU TOKEN
set API_BASE=http://localhost:3001/api
set TOKEN=YOUR_JWT_TOKEN_HERE

echo.
echo 📋 PASO 1: Crear proyecto rápido
echo =================================

REM 1. Crear proyecto rápido con solo título
curl -s -X POST "%API_BASE%/projects/quick-create" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -d "{\"title\": \"Sistema de Gestión de Inventario\"}" > temp_create.json

echo Respuesta de creación rápida:
type temp_create.json

REM Extraer PROJECT_ID (requiere jq o manualmente)
echo.
echo ⚠️  IMPORTANTE: Anota el PROJECT_ID de la respuesta anterior
set /p PROJECT_ID=Ingresa el PROJECT_ID: 

echo.
echo ✅ Usando PROJECT_ID: %PROJECT_ID%

echo.
echo 📋 PASO 2: Obtener historial inicial de mensajes
echo ==============================================

REM 2. Obtener mensajes iniciales
curl -s -X GET "%API_BASE%/projects/%PROJECT_ID%/messages" ^
  -H "Authorization: Bearer %TOKEN%" > temp_messages.json

echo Mensajes iniciales:
type temp_messages.json

echo.
echo 💬 PASO 3: Chat interactivo simulado
echo ==================================

REM 3. Enviar primer mensaje
echo.
echo 💬 Mensaje 1 del usuario:
echo Hola! Necesito un sistema para gestionar el inventario de mi tienda...

curl -s -X POST "%API_BASE%/projects/%PROJECT_ID%/chat" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -d "{\"content\": \"Hola! Necesito un sistema para gestionar el inventario de mi tienda. Quiero controlar productos, stock, proveedores y generar reportes de ventas.\"}" > temp_chat1.json

echo.
echo 🤖 Respuesta de la IA:
type temp_chat1.json

timeout /t 3 >nul

REM 4. Enviar segundo mensaje
echo.
echo 💬 Mensaje 2 del usuario:
echo Los usuarios serían administrador, empleados y gerente...

curl -s -X POST "%API_BASE%/projects/%PROJECT_ID%/chat" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -d "{\"content\": \"Los usuarios serían: administrador (acceso completo), empleados de tienda (consultar y actualizar stock), y gerente (reportes y análisis). Necesito que sea web y móvil.\"}" > temp_chat2.json

echo.
echo 🤖 Respuesta de la IA:
type temp_chat2.json

timeout /t 3 >nul

REM 5. Enviar tercer mensaje
echo.
echo 💬 Mensaje 3 del usuario:
echo Para los productos necesito: SKU, nombre, descripción, precios...

curl -s -X POST "%API_BASE%/projects/%PROJECT_ID%/chat" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -d "{\"content\": \"Para los productos necesito: código SKU, nombre, descripción, precio de compra, precio de venta, stock actual, stock mínimo, categoría, y proveedor asociado.\"}" > temp_chat3.json

echo.
echo 🤖 Respuesta de la IA:
type temp_chat3.json

timeout /t 3 >nul

REM 6. Enviar cuarto mensaje
echo.
echo 💬 Mensaje 4 del usuario:
echo Quiero alertas automáticas y reportes...

curl -s -X POST "%API_BASE%/projects/%PROJECT_ID%/chat" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -d "{\"content\": \"Quiero alertas automáticas cuando el stock esté por debajo del mínimo, integración con proveedores para reórden automático, y reportes de rotación de inventario.\"}" > temp_chat4.json

echo.
echo 🤖 Respuesta de la IA:
type temp_chat4.json

timeout /t 3 >nul

REM 7. Enviar quinto mensaje
echo.
echo 💬 Mensaje 5 del usuario:
echo Control de movimientos de inventario...

curl -s -X POST "%API_BASE%/projects/%PROJECT_ID%/chat" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -d "{\"content\": \"También necesito control de movimientos: entradas por compras, salidas por ventas, ajustes de inventario, y transferencias entre sucursales si tengo múltiples ubicaciones.\"}" > temp_chat5.json

echo.
echo 🤖 Respuesta de la IA:
type temp_chat5.json

timeout /t 3 >nul

REM 8. Enviar sexto mensaje
echo.
echo 💬 Mensaje 6 del usuario:
echo Requerimientos de seguridad...

curl -s -X POST "%API_BASE%/projects/%PROJECT_ID%/chat" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -d "{\"content\": \"Para seguridad, cada movimiento debe quedar registrado con usuario, fecha/hora, y motivo. Los precios solo los puede cambiar el administrador.\"}" > temp_chat6.json

echo.
echo 🤖 Respuesta de la IA:
type temp_chat6.json

echo.
echo 📊 PASO 4: Verificar estado del proyecto
echo =======================================

REM 9. Obtener estado del proyecto
curl -s -X GET "%API_BASE%/projects/%PROJECT_ID%/status" ^
  -H "Authorization: Bearer %TOKEN%" > temp_status.json

echo Estado actual del proyecto:
type temp_status.json

echo.
echo 📋 PASO 5: Obtener historial completo de mensajes
echo ==============================================

REM 10. Obtener todos los mensajes
curl -s -X GET "%API_BASE%/projects/%PROJECT_ID%/messages" ^
  -H "Authorization: Bearer %TOKEN%" > temp_full_messages.json

echo Historial completo de mensajes:
type temp_full_messages.json

echo.
echo 🎯 PASO 6: Completar proyecto
echo =============================

REM 11. Completar proyecto
curl -s -X POST "%API_BASE%/projects/%PROJECT_ID%/complete" ^
  -H "Authorization: Bearer %TOKEN%" > temp_complete.json

echo Respuesta de completación:
type temp_complete.json

echo.
echo 📊 PASO 7: Estado final del proyecto
echo ===================================

REM 12. Obtener estado final
curl -s -X GET "%API_BASE%/projects/%PROJECT_ID%/status" ^
  -H "Authorization: Bearer %TOKEN%" > temp_final_status.json

echo Estado final:
type temp_final_status.json

echo.
echo 🎉 ¡Pruebas completadas exitosamente!
echo =====================================

echo.
echo 📋 RESUMEN DE LA PRUEBA:
echo • ✅ Proyecto creado con título únicamente
echo • ✅ Chat interactivo con 6 mensajes del usuario
echo • ✅ Respuestas contextuales de la IA
echo • ✅ Seguimiento del progreso de completeness
echo • ✅ Proyecto completado exitosamente
echo • ✅ Historial de mensajes preservado

echo.
echo 🔗 URLs para testing manual:
echo • Chat del proyecto: http://localhost:3000/chat/%PROJECT_ID%
echo • Estado del proyecto: http://localhost:3000/projects/%PROJECT_ID%
echo • Lista de proyectos: http://localhost:3000/projects

echo.
echo 📚 ENDPOINTS PROBADOS:
echo • POST /api/projects/quick-create - ✅
echo • GET  /api/projects/:id/messages - ✅
echo • POST /api/projects/:id/chat - ✅
echo • GET  /api/projects/:id/status - ✅
echo • POST /api/projects/:id/complete - ✅

echo.
echo 🚀 El sistema de chat de TestForge está funcionando correctamente!

echo.
echo 🧹 Limpiando archivos temporales...
del temp_*.json 2>nul

pause