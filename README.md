# TestForge AI

_Última actualización automática: 2026-02-15_

Plataforma de testing asistida por IA: genera, gestiona y analiza casos de prueba a partir de requisitos conversacionales.

## Stack
- Backend: Node.js 20 + TypeScript + Express + Prisma (MongoDB), JWT, rate limiting, Redis opcional
- Frontend: React 19 + TypeScript + Vite + Chakra UI, Zustand, React Query
- IA: OpenAI GPT-4o-mini para generación y refinamiento de requisitos
- Infra: MongoDB Atlas, Redis opcional, despliegues sugeridos en Railway (API) y Vercel (SPA)

## Estructura del repo
- [backend](backend): API REST y servicios IA
- [frontend](frontend): SPA de dashboard y chat
- [docs](docs): documentación vigente (ver índice en [docs/README.md](docs/README.md))
- scripts/tools: utilidades y fixtures (la carpeta scripts/ fue podada; ver tareas en package.json)

## Requisitos
- Node.js 20+
- Cuenta MongoDB Atlas y cadena `DATABASE_URL`
- OpenAI API key (`OPENAI_API_KEY`)
- Redis opcional (`REDIS_URL`)

## Setup rápido (Windows)
1) Instala dependencias en la raíz (workspaces)
```
npm install
```

2) Backend
```
cd backend
npm install
```
Crea `.env` (ejemplo):
```
NODE_ENV=development
PORT=3000
DATABASE_URL=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/testforge
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
JWT_SECRET=cambia_esta_llave
CORS_ORIGIN=http://localhost:5173
REDIS_URL=redis://localhost:6379
```
Ejecuta:
```
npm run dev
```

3) Frontend
```
cd frontend
npm install
```
Configura `.env` (Vite):
```
VITE_API_URL=http://localhost:3000/api
```
Arranca:
```
npm run dev -- --host --port 5173
```

4) Scripts rápidos (Windows)
- Instalación automatizada: instalar-testforge.bat (obsoleta para rutas actuales; usar pasos manuales arriba)
- Levantar ambos servicios: ejecutar-proyecto.bat (actualizar rutas si usas otra carpeta)

## Tests y calidad
- Monorepo: `npm run lint` y `npm run test` (ejecuta backend y frontend desde raíz)
- Backend: `npm test`, `npm run test:unit`, `npm run test:integration`, `npm run test:coverage`
- Frontend: `npm run test:run`, `npm run test:coverage`

## API rápida (principales)
- Auth: `/api/auth/login`, `/api/auth/register`, `/api/auth/profile`
- Proyectos: `/api/projects/in-progress`, `/api/projects/completed`, `/api/projects/:id/status`, `/api/projects/:id/chat`, `/api/projects/:id/messages`
- Test Cases: `/api/test-cases` (GET), `/api/test-cases/generate` (POST con `conversationalAnalysisId` o `projectId`)
- Conversational workflow: `/api/conversational-workflow/user/completed`, `/api/conversational-workflow/:id/chat`, `/api/conversational-workflow/:id/summit`

## Documentación
Consulta el índice unificado en [docs/README.md](docs/README.md) para arquitectura, operaciones, roadmap y estado de entregables.

## Licencia
ISC

---
_Última edición: 15 de febrero de 2026_

> Documentación revisada y validada tras integración CI/CD.
