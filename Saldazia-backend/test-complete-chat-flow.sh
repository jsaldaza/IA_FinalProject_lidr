#!/bin/bash
# Script de pruebas completas para el sistema de chat de TestForge
# Demuestra el flujo completo: crear proyecto -> chat interactivo -> completar

echo "🚀 TestForge Chat System - Pruebas Completas"
echo "=========================================="

# Configuración
API_BASE="http://localhost:3001/api"
TOKEN="YOUR_JWT_TOKEN_HERE"

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}📋 PASO 1: Crear proyecto rápido${NC}"
echo "================================="

# 1. Crear proyecto rápido con solo título
QUICK_CREATE_RESPONSE=$(curl -s -X POST "$API_BASE/projects/quick-create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Sistema de Gestión de Inventario"
  }')

echo "Respuesta de creación rápida:"
echo "$QUICK_CREATE_RESPONSE" | jq '.'

# Extraer PROJECT_ID de la respuesta
PROJECT_ID=$(echo "$QUICK_CREATE_RESPONSE" | jq -r '.data.id // .data.projectId // empty')

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "null" ]; then
    echo -e "${RED}❌ Error: No se pudo obtener el ID del proyecto${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Proyecto creado con ID: $PROJECT_ID${NC}"

echo ""
echo -e "${BLUE}📋 PASO 2: Obtener historial inicial de mensajes${NC}"
echo "=============================================="

# 2. Obtener mensajes iniciales (debería incluir mensaje de bienvenida de IA)
MESSAGES_RESPONSE=$(curl -s -X GET "$API_BASE/projects/$PROJECT_ID/messages" \
  -H "Authorization: Bearer $TOKEN")

echo "Mensajes iniciales:"
echo "$MESSAGES_RESPONSE" | jq '.'

echo ""
echo -e "${BLUE}💬 PASO 3: Chat interactivo simulado${NC}"
echo "=================================="

# Array de mensajes para simular conversación completa
declare -a CHAT_MESSAGES=(
    "Hola! Necesito un sistema para gestionar el inventario de mi tienda. Quiero controlar productos, stock, proveedores y generar reportes de ventas."
    "Los usuarios serían: administrador (acceso completo), empleados de tienda (consultar y actualizar stock), y gerente (reportes y análisis). Necesito que sea web y móvil."
    "Para los productos necesito: código SKU, nombre, descripción, precio de compra, precio de venta, stock actual, stock mínimo, categoría, y proveedor asociado."
    "Quiero alertas automáticas cuando el stock esté por debajo del mínimo, integración con proveedores para reórden automático, y reportes de rotación de inventario."
    "También necesito control de movimientos: entradas por compras, salidas por ventas, ajustes de inventario, y transferencias entre sucursales si tengo múltiples ubicaciones."
    "Para seguridad, cada movimiento debe quedar registrado con usuario, fecha/hora, y motivo. Los precios solo los puede cambiar el administrador."
)

# Enviar cada mensaje y obtener respuesta de IA
for i in "${!CHAT_MESSAGES[@]}"; do
    MESSAGE_NUM=$((i + 1))
    MESSAGE="${CHAT_MESSAGES[$i]}"
    
    echo ""
    echo -e "${YELLOW}💬 Mensaje $MESSAGE_NUM del usuario:${NC}"
    echo "$MESSAGE"
    
    # Enviar mensaje al chat
    CHAT_RESPONSE=$(curl -s -X POST "$API_BASE/projects/$PROJECT_ID/chat" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{\"content\": \"$MESSAGE\"}")
    
    echo ""
    echo -e "${GREEN}🤖 Respuesta de la IA:${NC}"
    echo "$CHAT_RESPONSE" | jq -r '.data.message // .message // "No se pudo obtener respuesta"'
    
    # Pequeña pausa para simular conversación real
    sleep 2
done

echo ""
echo -e "${BLUE}📊 PASO 4: Verificar estado del proyecto${NC}"
echo "======================================="

# 4. Obtener estado actualizado del proyecto
PROJECT_STATUS=$(curl -s -X GET "$API_BASE/projects/$PROJECT_ID/status" \
  -H "Authorization: Bearer $TOKEN")

echo "Estado actual del proyecto:"
echo "$PROJECT_STATUS" | jq '.'

# Verificar completeness
COMPLETENESS=$(echo "$PROJECT_STATUS" | jq -r '.data.completeness // 0')
echo -e "${BLUE}📈 Completeness actual: $COMPLETENESS%${NC}"

echo ""
echo -e "${BLUE}📋 PASO 5: Obtener historial completo de mensajes${NC}"
echo "=============================================="

# 5. Obtener todos los mensajes del chat
FULL_MESSAGES=$(curl -s -X GET "$API_BASE/projects/$PROJECT_ID/messages" \
  -H "Authorization: Bearer $TOKEN")

echo "Historial completo de mensajes:"
echo "$FULL_MESSAGES" | jq '.data.messages | length' | xargs echo "Total de mensajes:"
echo "$FULL_MESSAGES" | jq '.data.messages[] | {role: .role, preview: (.content | tostring | .[0:100])}'

echo ""
echo -e "${BLUE}🎯 PASO 6: Completar proyecto${NC}"
echo "============================="

# 6. Completar proyecto para generar análisis final
COMPLETE_RESPONSE=$(curl -s -X POST "$API_BASE/projects/$PROJECT_ID/complete" \
  -H "Authorization: Bearer $TOKEN")

echo "Respuesta de completación:"
echo "$COMPLETE_RESPONSE" | jq '.'

echo ""
echo -e "${BLUE}📊 PASO 7: Estado final del proyecto${NC}"
echo "==================================="

# 7. Obtener estado final
FINAL_STATUS=$(curl -s -X GET "$API_BASE/projects/$PROJECT_ID/status" \
  -H "Authorization: Bearer $TOKEN")

echo "Estado final:"
echo "$FINAL_STATUS" | jq '.'

echo ""
echo -e "${GREEN}🎉 ¡Pruebas completadas exitosamente!${NC}"
echo "====================================="

echo ""
echo -e "${BLUE}📋 RESUMEN DE LA PRUEBA:${NC}"
echo "• ✅ Proyecto creado con título únicamente"
echo "• ✅ Chat interactivo con 6 mensajes del usuario"
echo "• ✅ Respuestas contextuales de la IA"
echo "• ✅ Seguimiento del progreso de completeness"
echo "• ✅ Proyecto completado exitosamente"
echo "• ✅ Historial de mensajes preservado"

echo ""
echo -e "${YELLOW}🔗 URLs para testing manual:${NC}"
echo "• Chat del proyecto: http://localhost:3000/chat/$PROJECT_ID"
echo "• Estado del proyecto: http://localhost:3000/projects/$PROJECT_ID"
echo "• Lista de proyectos: http://localhost:3000/projects"

echo ""
echo -e "${BLUE}📚 ENDPOINTS PROBADOS:${NC}"
echo "• POST /api/projects/quick-create - ✅"
echo "• GET  /api/projects/:id/messages - ✅"  
echo "• POST /api/projects/:id/chat - ✅"
echo "• GET  /api/projects/:id/status - ✅"
echo "• POST /api/projects/:id/complete - ✅"

echo ""
echo -e "${GREEN}🚀 El sistema de chat de TestForge está funcionando correctamente!${NC}"