# Auditoría de Producción — TestForge AI

Fecha: 2026-02-12

## A) Inventario inicial

### Apps/paquetes detectados
- **Monorepo npm workspaces** con `backend` (Node/Express/TypeScript/Prisma) y `frontend` (React 19 + Vite + TypeScript).  
- **DB declarada en código**: MongoDB con Prisma (`provider = "mongodb"`).
- **Cache opcional**: Redis.
- **Infra/despliegue**: Railway (backend Dockerfile + `backend/railway.json`) y Vercel (pipeline CI/CD con action de Vercel).
- **CI/CD**: GitHub Actions (`ci-cd.yml`, `health-check.yml`).
- **Testing**: Jest backend, Vitest frontend; no e2e activos en pipeline por defecto.

### Diagrama textual (basado en repo)
1. Usuario navega en frontend React (Vite build estático).  
2. Frontend usa Axios hacia backend (`/api`) y envía JWT en header Authorization desde storage local/sesión.  
3. Backend Express aplica Helmet + CORS + rate limiting global, luego routers (`/api/auth`, `/api/projects`, etc.).  
4. Backend persiste datos vía Prisma hacia MongoDB y usa Redis opcional para cache/blacklist.  
5. Healthchecks (`/health`, `/health/readiness`, `/health/liveness`) y endpoint `/db-test` para conectividad.

---

## B) Ejecución de verificación

### Comandos ejecutados
- `npm run lint` (root): **OK con warnings** (211 backend, 10 frontend).
- `npm test` (root): **inestable** por resolución de dependencias/workspace (`jest`/`vitest` no encontrados según estado de instalación).
- `npm run build` (root): inicialmente falla por tipos; backend compila tras `npx prisma generate`.
- `npm ci --ignore-scripts` + `npm test` + `npm run build` en `backend`: test y build pasan (build requiere `prisma generate`).
- `npm ci --ignore-scripts` + `npm run test:run` + `npm run build` en `frontend`: pasan; build avisa chunks >500KB.
- `npm audit --omit=dev --json` en backend: no evaluable por `403 Forbidden` del endpoint de advisories.

### Lectura ejecutable
- El pipeline local no es reproducible de forma confiable a nivel raíz sin pasos manuales de instalación/generación por paquete.

---

## 1) Resumen ejecutivo (máx 12 bullets)

### 3 fortalezas reales
- Se ve intención de seguridad en backend: Helmet, CORS explícito, rate limiting global y de auth, health endpoints y logging estructurado.
- Hay base de testing automatizado en backend y frontend (Jest + Vitest).
- Existe pipeline CI/CD con jobs separados para backend/frontend y despliegues condicionados.

### 5 riesgos críticos
- **R1**: Inconsistencia severa de configuración/arquitectura (MongoDB vs PostgreSQL en tests/config/docs), alto riesgo de drift y fallos en CI/prod.
- **R2**: Manejo de JWT inseguro en frontend (token en `localStorage/sessionStorage`) + respuesta de login expone token y cookie, superficie XSS/sesión.
- **R3**: Multiplicidad de instancias `new PrismaClient()` en controllers/services (riesgo de conexión/pool y consumo en producción).
- **R4**: Pipeline no bloquea calidad de forma robusta (warnings masivos, tests frontend opcionales por variable, sin SAST/dependency scan efectivo).
- **R5**: Operación incompleta: falta runbook real de incidentes/rollback, mínimos de observabilidad (métricas/tracing/correlación consistente).

### 4 quick wins (<2h)
- QW1: Unificar fuente de verdad de configuración (`backend/src/config/*`) y eliminar duplicados muertos.
- QW2: Ejecutar `prisma generate` automáticamente antes de build/test backend (scripts + CI local parity).
- QW3: Activar tests frontend siempre en CI (eliminar feature flag por default `false`) y añadir threshold mínimo de cobertura de riesgo.
- QW4: Corregir documentación raíz (`README`) para reflejar MongoDB real y comandos ejecutables actuales.

---

## 2) Scorecard

| Categoría | Score 1-10 | Riesgo | Nota corta |
|---|---:|---|---|
| Arquitectura | 5 | Alto | Base funcional, pero duplicación y drift técnico fuerte. |
| Backend | 6 | Medio-Alto | Buenas intenciones de seguridad; deuda en consistencia, errores y DB client lifecycle. |
| Frontend | 5 | Alto | App moderna pero con exposición de token y logs ruidosos en runtime. |
| Seguridad | 4 | Alto | JWT en storage web, hardening incompleto, falta security scanning integrado. |
| Testing | 4 | Alto | Cobertura de rutas críticas baja; tests e2e/contrato inexistentes en CI. |
| CI/CD | 5 | Medio-Alto | Pipeline existe, pero quality gates incompletos y checks condicionales peligrosos. |
| Deploy | 6 | Medio | Hay Docker/Railway/Vercel, pero falta estrategia formal de rollback y verificación post-deploy. |
| Documentación | 4 | Alto | Docs extensas pero inconsistentes con implementación real. |
| Observabilidad | 5 | Medio-Alto | Logging estructurado parcial sin request-id end-to-end ni métricas/tracing estándar. |
| Mantenibilidad | 4 | Alto | Warnings masivos, duplicados, configuraciones paralelas y señales de deuda acumulada. |

---

## 3) Hallazgos priorizados (Top 20)

### F-01
- **Severidad:** Bloqueante
- **Impacto:** Drift de arquitectura y fallos en build/test/prod por supuestos de DB incompatibles.
- **Evidencia:** `backend/prisma/schema.prisma` usa MongoDB; `backend/src/__tests__/setup.ts` fuerza URL PostgreSQL; `README.md` instruye PostgreSQL.
- **Recomendación concreta:** Definir una sola DB oficial (Mongo) y alinear schema, tests, docs y variables CI.
- **Ejemplo:**
  ```diff
  - process.env.DATABASE_URL = 'postgresql://...'
  + process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || 'mongodb://127.0.0.1:27017/testforge_test'
  ```
- **Esfuerzo:** M
- **Owner sugerido:** Backend + DevOps

### F-02
- **Severidad:** Bloqueante
- **Impacto:** Robo de sesión por XSS (token JWT legible en JS por usar local/session storage).
- **Evidencia:** `frontend/src/lib/auth.ts` y `frontend/src/stores/authStore.ts` guardan token en storage; backend además retorna token en payload.
- **Recomendación concreta:** Migrar a cookie httpOnly + `SameSite=Lax/Strict`, frontend sin acceso al token.
- **Ejemplo:**
  ```ts
  // frontend: eliminar setToken/getToken
  // backend: res.cookie('token', token, { httpOnly:true, secure:true, sameSite:'lax' })
  ```
- **Esfuerzo:** M
- **Owner sugerido:** Backend + Frontend

### F-03
- **Severidad:** Alta
- **Impacto:** Riesgo de saturación de conexiones y latencia por múltiples instancias PrismaClient.
- **Evidencia:** `new PrismaClient()` en `server.ts`, varios controllers y servicios.
- **Recomendación concreta:** Usar singleton central (`lib/prisma.ts`) en todo backend.
- **Ejemplo:**
  ```diff
  - const prisma = new PrismaClient();
  + import { prisma } from '../lib/prisma';
  ```
- **Esfuerzo:** M
- **Owner sugerido:** Backend

### F-04
- **Severidad:** Alta
- **Impacto:** Configuración duplicada (3+ fuentes), comportamiento no determinista por archivo importado.
- **Evidencia:** `backend/src/config.ts`, `backend/src/config/index.ts`, `backend/src/config/validated-config.ts`, servicios extra de config.
- **Recomendación concreta:** Consolidar en 1 módulo tipado + esquema Zod + contrato por ambiente.
- **Ejemplo:**
  ```ts
  // src/config/index.ts único export
  export const config = parseEnv(process.env)
  ```
- **Esfuerzo:** M
- **Owner sugerido:** Backend

### F-05
- **Severidad:** Alta
- **Impacto:** Build backend frágil; falla si no se ejecuta `prisma generate` (developer friction y CI drift local).
- **Evidencia:** `npm run build` backend falla sin cliente Prisma generado.
- **Recomendación concreta:** Encadenar `prisma generate` en `prebuild`/`postinstall` backend y validar en CI.
- **Ejemplo:**
  ```json
  "prebuild": "prisma generate",
  "build": "tsc"
  ```
- **Esfuerzo:** S
- **Owner sugerido:** Backend/DevOps

### F-06
- **Severidad:** Alta
- **Impacto:** CI puede omitir tests frontend en PRs, permitiendo regresiones funcionales.
- **Evidencia:** `RUN_FRONTEND_TESTS` default `false` en `.github/workflows/ci-cd.yml`.
- **Recomendación concreta:** Ejecutar test frontend siempre en PR/main.
- **Ejemplo:** quitar condición `if: env.RUN_FRONTEND_TESTS == 'true'`.
- **Esfuerzo:** S
- **Owner sugerido:** DevOps/QA

### F-07
- **Severidad:** Alta
- **Impacto:** Falta de trazabilidad cross-service para incidentes (sin request-id consistente end-to-end).
- **Evidencia:** Logger consume `x-request-id` pero no lo genera ni propaga sistemáticamente.
- **Recomendación concreta:** Middleware de correlación (uuid) + header response + propagación a logs.
- **Ejemplo:**
  ```ts
  req.id = req.headers['x-request-id'] ?? randomUUID(); res.set('x-request-id', req.id)
  ```
- **Esfuerzo:** S
- **Owner sugerido:** Backend

### F-08
- **Severidad:** Alta
- **Impacto:** Fuga de información y ruido operacional por `console.log/error` extensivo en producción (frontend/backend).
- **Evidencia:** `frontend/src/App.tsx`, `frontend/src/stores/authStore.ts`, `frontend/src/lib/api.ts`, controllers backend con `console.error`.
- **Recomendación concreta:** Reemplazar por logger con niveles + desactivar debug en prod.
- **Ejemplo:** `if (import.meta.env.DEV) logger.debug(...)`.
- **Esfuerzo:** S
- **Owner sugerido:** Frontend + Backend

### F-09
- **Severidad:** Media-Alta
- **Impacto:** Ausencia de CSP frontend y headers estrictos en serving estático aumenta riesgo XSS/asset injection.
- **Evidencia:** `frontend/index.html` sin CSP; nginx conf de Docker frontend no define security headers.
- **Recomendación concreta:** Añadir CSP baseline, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- **Ejemplo:**
  ```nginx
  add_header Content-Security-Policy "default-src 'self'; connect-src 'self' https://api..." always;
  ```
- **Esfuerzo:** M
- **Owner sugerido:** DevOps + Frontend

### F-10
- **Severidad:** Media-Alta
- **Impacto:** Endpoint `/db-test` expone metadata operativa potencialmente útil para atacante.
- **Evidencia:** `backend/src/server.ts` devuelve conteos de entidades.
- **Recomendación concreta:** Restringir a entornos no productivos o proteger por auth admin.
- **Ejemplo:**
  ```ts
  if (config.nodeEnv === 'production') return res.status(404).end()
  ```
- **Esfuerzo:** S
- **Owner sugerido:** Backend

### F-11
- **Severidad:** Media-Alta
- **Impacto:** Warnings ESLint masivos ocultan defectos reales y aumentan deuda técnica.
- **Evidencia:** 211 warnings backend y 10 frontend en `npm run lint`.
- **Recomendación concreta:** Plan de reducción por lotes + convertir reglas críticas a error.
- **Ejemplo:** no-explicit-any/no-unused-vars en módulos core primero.
- **Esfuerzo:** M
- **Owner sugerido:** Backend + Frontend

### F-12
- **Severidad:** Media
- **Impacto:** Performance frontend degradada por chunk principal ~676kB gzip 221kB.
- **Evidencia:** salida de `vite build` con warning chunk >500kB.
- **Recomendación concreta:** `manualChunks`, lazy routes agresivo, split vendors pesados (charts/editor).
- **Ejemplo:**
  ```ts
  build:{ rollupOptions:{ output:{ manualChunks:{ vendor:['react','react-dom'] } } } }
  ```
- **Esfuerzo:** M
- **Owner sugerido:** Frontend

### F-13
- **Severidad:** Media
- **Impacto:** Tests backend cubren casi nada crítico (solo health infra), alto riesgo de regresión de auth/proyectos.
- **Evidencia:** suite backend observada: `src/__tests__/health.test.ts`.
- **Recomendación concreta:** priorizar tests de auth, autorización, límites, contratos de respuesta.
- **Ejemplo:** integrar Supertest + fixtures aislados por suite.
- **Esfuerzo:** M
- **Owner sugerido:** QA + Backend

### F-14
- **Severidad:** Media
- **Impacto:** Sin pruebas E2E de flujos core (login→crear proyecto→chat→test cases).
- **Evidencia:** no workflow e2e; Playwright dependencia presente pero sin pipeline activo.
- **Recomendación concreta:** agregar smoke e2e crítico en PR nightly/main.
- **Ejemplo:** Playwright + MSW/entorno staging; retries controlados y sin hard waits.
- **Esfuerzo:** M
- **Owner sugerido:** QA

### F-15
- **Severidad:** Media
- **Impacto:** Riesgo supply-chain por ausencia de scanning automatizado efectivo (audit bloqueado/403).
- **Evidencia:** `npm audit` no usable en entorno actual; no job alterno (Snyk/OSV/CodeQL dependabot enforce).
- **Recomendación concreta:** habilitar Dependabot + CodeQL + `npm audit` tolerante + fail policy por severidad.
- **Ejemplo:** `github/dependabot.yml` semanal.
- **Esfuerzo:** S
- **Owner sugerido:** DevOps/Security

### F-16
- **Severidad:** Media
- **Impacto:** Observabilidad incompleta: no métricas Prometheus ni tracing distribuido.
- **Evidencia:** solo logs estructurados y health endpoints, sin exporter/tracing.
- **Recomendación concreta:** OpenTelemetry + métricas HTTP/DB + dashboards.
- **Ejemplo:** instrumentación Express + Prisma con OTel SDK.
- **Esfuerzo:** L
- **Owner sugerido:** SRE/Backend

### F-17
- **Severidad:** Media
- **Impacto:** Instrucciones de repo pueden confundir onboarding por rutas antiguas (`testforge-backend`/`testforge-frontend`).
- **Evidencia:** `README.md` usa nombres no alineados al monorepo actual.
- **Recomendación concreta:** actualizar quickstart único (root workspaces), script bootstrap cross-platform.
- **Ejemplo:** `npm run install:all && npm run dev`.
- **Esfuerzo:** S
- **Owner sugerido:** DX

### F-18
- **Severidad:** Media
- **Impacto:** Ausencia de gobierno de repositorio (CODEOWNERS, PR template, commit policy) reduce calidad de revisión.
- **Evidencia:** `.github` solo workflows + issue template.
- **Recomendación concreta:** agregar `CODEOWNERS`, PR template con checklist seguridad/QA, conventional commits opcional.
- **Ejemplo:** `.github/pull_request_template.md`.
- **Esfuerzo:** S
- **Owner sugerido:** Engineering Manager/Tech Lead

### F-19
- **Severidad:** Media
- **Impacto:** Config de despliegue Railway potencialmente redundante/confusa (`buildCommand/startCommand` con Docker builder).
- **Evidencia:** `backend/railway.json` define builder Dockerfile y comandos extra de build/start.
- **Recomendación concreta:** dejar solo estrategia Docker o solo Nixpacks, no ambas mezcladas.
- **Ejemplo:** simplificar `railway.json` a bloque `build.builder=DOCKERFILE`.
- **Esfuerzo:** S
- **Owner sugerido:** DevOps

### F-20
- **Severidad:** Baja-Media
- **Impacto:** NPM warning repetitivo `Unknown env config "http-proxy"` indica contaminación de entorno/CI y ruido en logs.
- **Evidencia:** salida de todos los comandos npm.
- **Recomendación concreta:** limpiar configuración npm global/CI (`npm config delete http-proxy` si no aplica).
- **Ejemplo:** paso de saneamiento en CI antes de install.
- **Esfuerzo:** S
- **Owner sugerido:** DevOps

---

## 4) “Lo que falta” (checklist producción)

### Seguridad
- [ ] Modelo de threat modeling documentado (mínimo STRIDE).
- [ ] Política de rotación de secretos y procedimiento de emergencia.
- [ ] SAST/DAST automatizado en CI (CodeQL + escaneo dependencias + secret scanning estricto).
- [ ] Estrategia CSRF clara si se consolida auth en cookie.

### Calidad y testing
- [ ] Contratos API versionados (OpenAPI + tests contract).
- [ ] E2E smoke crítico en cada PR a `main`.
- [ ] Cobertura por riesgos (auth, permisos, generación AI, límites/costos).
- [ ] Dataset de pruebas determinista y aislado por suite.

### Operación/SRE
- [ ] SLO/SLI (latencia, error rate, disponibilidad) y alertas.
- [ ] Runbook de incidentes/rollback paso a paso.
- [ ] Dashboard de métricas (app, DB, Redis, costos OpenAI).
- [ ] Estrategia zero-downtime/migraciones seguras documentada.

### Repositorio/DX
- [ ] `CODEOWNERS`, PR template, release process/changelog.
- [ ] Guía onboarding real <30 min validada desde cero.
- [ ] ADRs para decisiones clave (auth method, DB, caching, deploy strategy).

---

## 5) Plan de remediación por fases

### Fase 0 (hoy) — Quick wins
1. Unificar docs de setup (Mongo, rutas reales de monorepo, scripts root).
2. Forzar `prisma generate` en backend (`prebuild`) y documentarlo.
3. Activar frontend tests por defecto en CI.
4. Quitar logs sensibles/ruidosos en producción.
5. Restringir `/db-test` a no-producción.

### Fase 1 (esta semana) — Estabilización
1. Consolidar módulo de configuración único y eliminar duplicados.
2. Refactor incremental para singleton Prisma en todo backend.
3. Añadir request-id middleware + correlación en logs.
4. Añadir 10 pruebas de mayor riesgo (lista abajo).
5. Integrar Dependabot + CodeQL + policy de bloqueo por severidad alta.

### Fase 2 (2–4 semanas) — Hardening + escalabilidad
1. Migrar auth a cookie httpOnly (sin token en JS) + estrategia CSRF.
2. Implementar OpenTelemetry (traces + métricas + dashboards).
3. Definir rollback y deploy seguro (canary/blue-green según costo).
4. Optimizar bundle frontend y budget de performance.
5. Formalizar runbooks, ADRs y estándares de PR/release.

---

## 6) Entregable para developer (PR Review style)

### Must Fix
1. Alinear DB stack real (Mongo) en código/tests/docs/CI.
2. Eliminar JWT en localStorage/sessionStorage (migrar a cookie httpOnly).
3. Unificar configuración backend y remover fuentes duplicadas.
4. Usar singleton Prisma en todos los módulos.
5. Hacer obligatorio test frontend en CI.

### Should Fix
1. Introducir request-id end-to-end.
2. Reducir warnings ESLint críticos y convertirlos a error gradualmente.
3. Endurecer security headers/CSP en frontend hosting.
4. Completar observabilidad mínima (métricas + alertas).

### Nice to Have
1. Optimización de chunks grandes Vite.
2. Mejoras DX (plantillas PR, CODEOWNERS, changelog automático).
3. E2E smoke nocturno + visual regression selectivo.

### Set sugerido de commits (incrementales)
1. `chore(config): unify backend env validation and remove duplicate config modules`
   - Archivos: `backend/src/config/**`, servicios de config duplicados.
2. `fix(auth): migrate token handling to httpOnly cookie flow`
   - Archivos: `backend/src/controllers/auth.controller.ts`, `frontend/src/lib/auth.ts`, `frontend/src/lib/api.ts`, store auth.
3. `refactor(db): replace scattered PrismaClient instantiations with shared singleton`
   - Archivos: controllers/services con `new PrismaClient()`.
4. `ci: enforce frontend tests and add dependency/security scanning`
   - Archivos: `.github/workflows/ci-cd.yml`, nuevo `dependabot.yml`, CodeQL workflow.
5. `docs: align README/deployment docs with MongoDB and real monorepo scripts`
   - Archivos: `README.md`, `DEPLOYMENT_GUIDE.md`, `docs/*deployment*.md`.
6. `test: add critical integration tests for auth, rate limits, and project ownership`
   - Archivos: `backend/src/__tests__/**`, fixtures.

---

## Top 10 pruebas a agregar primero (QA)

1. **Auth login brute-force lockout** (IP + email limit combinados).
2. **Token invalidado (blacklist) no reutilizable** en endpoints protegidos.
3. **Authorization ownership**: usuario A no accede/modifica proyectos de B.
4. **CORS enforcement**: origen no permitido bloqueado en prod.
5. **Health readiness** falla correctamente si DB no disponible.
6. **Contrato API auth/projects** (shape de respuesta estable y errores tipificados).
7. **Flujo crítico e2e**: register/login → crear proyecto → chat → generar test cases.
8. **Resiliencia OpenAI**: timeout/retry/backoff y manejo de error sin fuga de stack.
9. **Rate limit 429 UX**: frontend muestra mensaje y no entra en loop de reintentos.
10. **Build reproducibility check**: pipeline local limpia + install + build + test sin pasos manuales ocultos.

> Nota QA Automation Architect: mantener tests pequeños y estables, evitar hard waits y estado compartido global; priorizar integración API + UI smoke con selectores robustos.
