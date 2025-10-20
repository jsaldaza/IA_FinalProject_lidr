# 🚀 TestForge API Unificada - Documentación

## 📋 Visión General

La API Unificada de TestForge consolida toda la funcionalidad de proyectos en un solo endpoint profesional. Esta nueva implementación:

- ✅ **Elimina duplicación**: Un solo endpoint `/api/projects` para todo
- ✅ **Mejora consistencia**: Naming estándar usando "title" como campo principal  
- ✅ **Aumenta flexibilidad**: Soporte tanto para proyectos básicos como análisis con IA
- ✅ **Mantiene compatibilidad**: Transición gradual sin breaking changes

## 🔗 Endpoints Disponibles

### 📁 CRUD Básico de Proyectos

#### `GET /api/projects`
Lista proyectos del usuario con filtros y paginación.

**Query Parameters:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Registros por página (default: 20, max: 100)
- `status` (opcional): Filtrar por estado (`DRAFT`, `ACTIVE`, `COMPLETED`, `ARCHIVED`)
- `withAnalysis` (opcional): Incluir datos de análisis IA (`true`/`false`)
- `includeArchived` (opcional): Incluir proyectos archivados

**Respuesta:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "cld123...",
      "title": "Mi Proyecto",
      "description": "Descripción del proyecto",
      "status": "ACTIVE",
      "analysisEnabled": true,
      "isArchived": false,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T14:20:00.000Z",
      "analyses": [...]  // Si withAnalysis=true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

#### `POST /api/projects`
Crear nuevo proyecto básico.

**Body:**
```json
{
  "title": "Nombre del Proyecto",
  "description": "Descripción opcional",
  "enableAnalysis": false  // Si true, crea análisis automáticamente
}
```

#### `GET /api/projects/:id`
Obtener detalles completos de un proyecto específico.

**Respuesta:**
```json
{
  "status": "success",
  "data": {
    "project": {
      "id": "cld123...",
      "title": "Mi Proyecto",
      "description": "Descripción completa",
      "status": "ACTIVE",
      "analysisEnabled": true,
      "analyses": [...]
    },
    "conversationalAnalysis": {
      "id": "cld456...",
      "title": "Análisis IA",
      "status": "IN_PROGRESS",
      "currentPhase": "requirements_gathering",
      "completeness": 65
    }
  }
}
```

#### `PUT /api/projects/:id`
Actualizar proyecto existente.

**Body (todos los campos opcionales):**
```json
{
  "title": "Nuevo título",
  "description": "Nueva descripción",
  "status": "COMPLETED"
}
```

#### `DELETE /api/projects/:id`
Eliminar proyecto (y análisis relacionados).

### 🤖 Funcionalidad con IA

#### `POST /api/projects/create-and-start`
Crear proyecto y automáticamente iniciar análisis conversacional con IA.

**Body:**
```json
{
  "title": "Proyecto con IA",
  "description": "Descripción detallada de al menos 50 caracteres para que la IA pueda analizarla efectivamente..."
}
```

**Respuesta:**
```json
{
  "status": "success",
  "data": {
    "project": {
      "id": "cld123...",
      "title": "Proyecto con IA",
      "userId": "user456...",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "analysis": {
      "id": "cld789...",
      "status": "INITIATED",
      "currentPhase": "requirements_analysis",
      "completeness": 0
    }
  }
}
```

### 🔄 Métodos Adicionales (En Desarrollo)

Los siguientes endpoints están preparados para implementación futura:

- `POST /api/projects/:id/enable-analysis` - Habilitar análisis IA en proyecto existente
- `POST /api/projects/:id/messages` - Enviar mensaje al chat conversacional
- `GET /api/projects/:id/analysis-status` - Estado detallado del análisis IA
- `POST /api/projects/:id/complete-analysis` - Finalizar análisis IA

## 🔐 Autenticación

Todos los endpoints requieren autenticación mediante token JWT en el header:

```http
Authorization: Bearer <your-jwt-token>
```

## 📊 Códigos de Estado

- `200` - Éxito
- `201` - Recurso creado exitosamente
- `400` - Error en datos de entrada (validación)
- `401` - No autenticado
- `403` - Sin permisos
- `404` - Recurso no encontrado
- `500` - Error interno del servidor

## 🔄 Migración desde APIs Anteriores

### Cambios de Naming
- ✅ `name` → `title` (más profesional y consistente)
- ✅ Mantenimiento de `description` como campo detallado
- ✅ Estados estandarizados (`DRAFT`, `ACTIVE`, `COMPLETED`, `ARCHIVED`)

### Compatibilidad Temporal
El endpoint anterior `/api/analysis-project` sigue funcionando durante la transición, pero está marcado como **deprecated**. Se recomienda migrar a `/api/projects` lo antes posible.

### Guía de Migración

**Antes (API antigua):**
```javascript
// Obtener proyectos
GET /api/analysis-project/projects-in-progress
GET /api/analysis-project/completed-projects

// Crear proyecto
POST /api/analysis-project/create-and-start
```

**Después (API unificada):**
```javascript
// Obtener proyectos
GET /api/projects?status=ACTIVE
GET /api/projects?status=COMPLETED

// Crear proyecto
POST /api/projects/create-and-start
```

## 📝 Validaciones

### Crear Proyecto Básico
- `title`: Mínimo 3 caracteres, requerido
- `description`: Opcional
- `enableAnalysis`: Boolean opcional

### Crear Proyecto con IA
- `title`: Mínimo 3 caracteres, requerido  
- `description`: 50-10,000 caracteres, requerido para análisis IA efectivo

### Actualizar Proyecto
- Todos los campos son opcionales
- Se validan solo los campos enviados

## 🛠️ Ejemplos de Uso

### JavaScript/Fetch
```javascript
// Obtener proyectos con análisis
const response = await fetch('/api/projects?withAnalysis=true', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const data = await response.json();

// Crear proyecto con IA
const newProject = await fetch('/api/projects/create-and-start', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Mi Nuevo Proyecto',
    description: 'Necesito desarrollar una aplicación web que permita a los usuarios gestionar tareas de manera eficiente...'
  })
});
```

### cURL
```bash
# Listar proyectos
curl -H "Authorization: Bearer <token>" \
     "http://localhost:3000/api/projects"

# Crear proyecto con IA
curl -X POST \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"title":"Proyecto Test","description":"Descripción completa del proyecto que debe tener al menos 50 caracteres para el análisis de IA..."}' \
     "http://localhost:3000/api/projects/create-and-start"
```

## 🚀 Estado del Desarrollo

- ✅ **CRUD Básico**: Completamente implementado
- ✅ **Creación con IA**: Implementado y funcional
- ✅ **Validaciones**: Esquemas Zod completos
- ✅ **Tipado TypeScript**: Type-safe end-to-end
- 🔄 **Métodos adicionales**: En desarrollo incremental
- 🔄 **Testing**: Suites de prueba en preparación

---

**📞 Soporte:** Para dudas sobre la API, revisar logs del servidor o contactar al equipo de desarrollo.
