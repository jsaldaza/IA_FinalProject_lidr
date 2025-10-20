# TestForge Backend

Este es el backend de la plataforma TestForge, desarrollado en Node.js y TypeScript usando Express.

## Requisitos
- Node.js v18+
- PostgreSQL
- Redis (opcional)
- OpenAI API Key (para funciones de IA)

## Instalación
```bash
npm install
```

## Configuración de entorno
Copia el archivo `.env.example` a `.env` y completa los valores:
```bash
cp .env.example .env
```

## Migraciones de base de datos
```bash
npm run migrate
```

## Ejecución
```bash
npm run dev
```

## Scripts útiles
- `npm run dev` - Ejecuta el servidor en modo desarrollo
- `npm run build` - Compila el proyecto
- `npm run test` - Ejecuta los tests

## Variables de entorno
Ver `.env.example` para los valores requeridos.

## Endpoints principales
- `/api/auth/*` - Autenticación
- `/api/projects/*` - Gestión de proyectos
- `/api/analysis/*` - Análisis y generación de tests

## Licencia
ISC
