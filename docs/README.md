# TestForge AI — Guía Única

Documento maestro en español con visión, arquitectura, operación, deploy y próximos pasos. Seguridad detallada se mantiene en SECURITY.md.

## Visión del producto
- Plataforma para generar, gestionar y analizar casos de prueba asistidos por IA.
- Frontend React + Vite con Chakra UI, React Query, React Router.
- Backend Express + TypeScript + Prisma (MongoDB Atlas) + JWT + rate limiting; Redis opcional para caché; OpenAI para IA.

## Arquitectura
- Frontend: entrada [frontend/src/main.tsx](../frontend/src/main.tsx) con rutas en [frontend/src/App.tsx](../frontend/src/App.tsx); Vite build a `dist/`.
- Backend: servidor en [backend/src/server.ts](../backend/src/server.ts); rutas `/api/auth`, `/api/dashboard`, `/api/conversational-workflow`, `/api/projects`, `/api/test-cases`, health `/health`, `/health/detailed`, `/health/readiness`, `/health/liveness`, y `/db-test`.
- Build/arranque: `npm run build` genera `backend/dist`; `npm run dev:backend` levanta ts-node-dev; `npm run dev:frontend` levanta Vite.

## Entorno y variables clave
- Backend: `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, `NODE_ENV`, `CORS_ORIGIN` (CSV en prod); opcional `REDIS_URL`, `REDIS_ENABLED=true`.
- Frontend: `VITE_API_URL` (ej. https://tu-backend.railway.app/api).
- CI/CD típicos: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `RAILWAY_TOKEN`.

## Comandos útiles
- Raíz: `npm run dev` (full stack), `npm run lint`, `npm run test`, `npm run build`.
- Backend: `npm run dev`, `npm run build`, `npm run test`, `npm run prisma:generate`.
- Frontend: `npm run dev`, `npm run build`, `npm run test:run`, `npm run lint`.

## Deploy
### Frontend (Vercel)
1) Importar repo en Vercel. 
2) Root: `frontend/`; Build: `npm run build`; Output: `dist`.
3) Vars: `VITE_API_URL=https://<backend>/api`.
4) Deploy automático en push a main.

### Backend (Railway con Docker)
1) Railway apunta al Dockerfile en `backend/Dockerfile` (ver railway.toml/railway.json).
2) Vars: `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, `NODE_ENV=production`, opcional `REDIS_URL`/`REDIS_ENABLED`.
3) Start command: `npm start` (usa `dist/src/server.js`). Build: `npm run build` + `prisma generate`.

### Alternativa local / Docker Compose
- `docker-compose --profile full-stack up` para entorno local si los servicios están configurados.

## Operación y salud
- Health: `/health`; detallado: `/health/detailed`; readiness/liveness disponibles.
- Prueba DB: `/db-test`.
- CORS con lista blanca y rate limiting global.

## Seguridad (resumen)
- JWT con expiración, Helmet en producción, validación de entrada, rate limiting. No exponer secrets en frontend. Ver [SECURITY.md](../SECURITY.md) para política completa.

## Backlog corto (sugerido)
1) Añadir pruebas de integración API en CI y smoke e2e ligeros para rutas críticas.
2) Habilitar caché Redis en producción y métricas básicas (logs estructurados ya presentes).
3) Ajustar límites/costos OpenAI por usuario/proyecto y exponerlos en dashboard.

## Limpieza de documentación
- Este archivo es la única guía viva. Se mantiene SECURITY.md como política separada.
- Los antiguos índices y guías top-level se eliminarán; material histórico puede moverse a `docs/archive/` si se necesita conservar.
