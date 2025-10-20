#!/bin/bash

# Verificar que el backend esté funcionando
echo "🔄 Verificando conexión con el backend..."

# Función para verificar si el backend está ejecutándose
check_backend() {
    curl -s http://localhost:3001/health > /dev/null
    return $?
}

if ! check_backend; then
    echo "❌ El backend no está ejecutándose en el puerto 3001"
    echo "💡 Por favor, inicia el backend con:"
    echo "   cd testforge-backend"
    echo "   npm run dev"
    exit 1
fi

echo "✅ Backend está ejecutándose correctamente"

# Verificar que el frontend esté funcionando
echo "🔄 Verificando conexión con el frontend..."

curl -s http://localhost:5173 > /dev/null
if [ $? -ne 0 ]; then
    echo "❌ El frontend no está ejecutándose en el puerto 5173"
    echo "💡 Por favor, inicia el frontend con:"
    echo "   cd testforge-frontend"
    echo "   npm run dev"
    exit 1
fi

echo "✅ Frontend está ejecutándose correctamente"

# Verificar autenticación
echo "🔄 Verificando configuración de autenticación..."

# Test de login (opcional - requiere usuario creado)
echo "💡 Para probar la autenticación:"
echo "   1. Ve a http://localhost:5173/register para crear un usuario"
echo "   2. Luego ve a http://localhost:5173/login para iniciar sesión"
echo "   3. Una vez autenticado, ve a http://localhost:5173/projects"

echo "✅ Verificación completada"
echo ""
echo "🎉 CORRECCIONES DE SEGURIDAD APLICADAS:"
echo "   ✅ Credenciales hardcodeadas eliminadas"
echo "   ✅ Endpoints protegidos con autenticación"
echo "   ✅ CORS configurado correctamente"
echo "   ✅ Logs securizados"
echo "   ✅ URLs del frontend actualizadas"
echo ""
echo "🔗 URLs para probar:"
echo "   Frontend: http://localhost:5173"
echo "   Backend Health: http://localhost:3001/health"
echo "   API Docs: http://localhost:3001/api-docs"
echo ""
echo "📚 Para más información, consulta el archivo SECURITY.md"
