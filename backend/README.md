# TestForge Backend

Este es el backend de la plataforma TestForge, desarrollado en Node.js y TypeScript usando Express.

## Requisitos
- Node.js v20+
- MongoDB Atlas o Mongo local (cadena `mongodb://` o `mongodb+srv://`)
- Redis (opcional)
- OpenAI API Key (para funciones de IA)

## Instalación
```bash
npm install
```

## Configuración de entorno
Copia `.env.example` a `.env` y completa los valores mínimos:
```bash
cp .env.example .env
```
Variables clave:
- `DATABASE_URL` (MongoDB Atlas/local)
- `OPENAI_API_KEY` y `OPENAI_MODEL`
- `JWT_SECRET`
- `CORS_ORIGIN` (ej. http://localhost:5173)

## Migraciones / Prisma
- Generar cliente: `npm run prisma:generate`
- Sincronizar esquema: `npm run prisma:push`

## Ejecución
```bash
npm run dev
```

## Scripts útiles
- `npm run dev` - Desarrollo
- `npm run build` - Build a `dist`
- `npm run test`, `npm run test:unit`, `npm run test:integration`, `npm run test:coverage`
- `npm run lint` - ESLint
- `npm run prisma:studio` - Inspectar datos

## Variables de entorno
Ver `.env.example` para los valores requeridos.

## Endpoints principales
- `/api/auth/*` - Autenticación
- `/api/projects/*` - Gestión de proyectos (in-progress/completed/status/chat/messages)
- `/api/test-cases` - Listado y generación (`/generate`)
- `/api/conversational-workflow/*` - Flujos conversacionales y summit

## Licencia
ISC
