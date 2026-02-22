# Auditoría de Producción (Reanálisis desde cero) — TestForge AI

Fecha: 2026-02-12
Alcance: Backend + Frontend + CI/CD + Deploy (Vercel/Railway) + Seguridad + QA

## A) Inventario inicial

### Apps/paquetes detectados
- Monorepo npm workspaces con `backend` y `frontend` en el mismo repositorio.
- Backend: Node.js + TypeScript + Express + Prisma + MongoDB + Redis opcional.
- Frontend: React 19 + Vite + TypeScript + Chakra UI + Zustand + React Query.
- Infra: Dockerfiles backend/frontend, `docker-compose.yml`, `backend/railway.json`.
- CI: GitHub Actions con pipeline principal y health check programado.

### Diagrama textual (repo-driven)
1. Usuario usa app React (Vite build estático).
2. Frontend consume backend por Axios (`/api`) con token JWT.
3. Backend Express aplica middlewares (helmet/cors/rate-limit/logging), enruta módulos (`/api/auth`, `/api/projects`, etc.).
4. Persistencia en MongoDB mediante Prisma y cache Redis opcional.
5. CI ejecuta jobs separados backend/frontend y despliegues condicionales (Railway/Vercel).

---

## B) Verificación ejecutada

### Resultado de checks
- `npm run lint` (root): pasa con deuda alta de warnings (backend 211, frontend 10).
- `npm run test` (root): falla al inicio por dependencias no presentes en backend (`jest: not found`).
- `backend`: tras `npm ci`, tests pasan; build falla sin `prisma generate` y luego compila.
- `frontend`: tras `npm ci`, tests pasan (42/42) y build pasa con warning de chunks >500kb.

### Conclusión operativa
- El repositorio **funciona**, pero aún no es completamente reproducible “1 comando = todo verde” sin pasos manuales.

---

## 1) Resumen ejecutivo (máximo 12 bullets)

### 3 fortalezas reales
- Monorepo bien encaminado: facilita cambios coordinados backend/frontend y DX común.
- Existe baseline serio de seguridad backend (helmet, cors, rate limiting, logging estructurado).
- CI/CD activo con separación por jobs y despliegue controlado por variables/secretos.

### 5 riesgos críticos
- Configuración y runtime con señales de drift (múltiples fuentes de config y flujo build backend dependiente de paso manual).
- Sesión/JWT todavía expuesta a riesgo XSS por almacenamiento web en frontend.
- Calidad bloqueada por deuda de lint (muchos `any`, non-null assertions y warnings de hooks).
- Testing backend insuficiente para riesgos core (suite mínima actual).
- Supply chain/security scanning incompleto (auditoría de dependencias no robusta en entorno actual).

### 4 quick wins (<2h)
- QW1: agregar `prebuild: prisma generate` en backend.
- QW2: volver obligatorios tests frontend en CI (sin flag opcional por defecto).
- QW3: eliminar logs de debug sensibles/ruidosos en runtime productivo.
- QW4: crear PR template con checklist de seguridad/QA/reproducibilidad.

---

## 2) Scorecard

| Categoría | Score 1-10 | Riesgo | Nota corta |
|---|---:|---|---|
| Arquitectura | 6 | Medio | Monorepo correcto, pero con acoplamientos técnicos pendientes. |
| Backend | 6 | Medio-Alto | Buen baseline, problemas de consistencia/build y deuda tipado. |
| Frontend | 5 | Alto | UX funcional, riesgos de auth storage y deuda de hooks/logging. |
| Seguridad | 4 | Alto | Falta cerrar puntos críticos de sesión y hardening end-to-end. |
| Testing | 4 | Alto | Falta cobertura sobre riesgos críticos de negocio/seguridad. |
| CI/CD | 6 | Medio | Pipeline existe, quality gates aún mejorables. |
| Deploy | 6 | Medio | Railway/Vercel presentes, falta mayor formalización operativa. |
| Documentación | 5 | Medio-Alto | Mucha documentación, pero dispersa y parcialmente desalineada. |
| Observabilidad | 5 | Medio-Alto | Logging existe; falta correlación/metricas/tracing consistentes. |
| Mantenibilidad | 4 | Alto | Warnings y duplicidad técnica elevan costo de cambio. |

---

## 3) Hallazgos priorizados (Top 20)

### H-01
- Severidad: **Bloqueante**
- Impacto: compilación backend frágil en flujos limpios CI/local.
- Evidencia: build backend requiere `prisma generate` previo manual.
- Recomendación concreta: definir `prebuild` y validar en CI.
- Ejemplo:
  ```json
  "prebuild": "prisma generate",
  "build": "tsc"
  ```
- Esfuerzo: S
- Owner: Backend/DevOps

### H-02
- Severidad: **Alta**
- Impacto: tokens en storage web exponen sesión ante XSS.
- Evidencia: frontend usa session/localStorage para JWT.
- Recomendación: migrar a cookie httpOnly + CSRF strategy.
- Ejemplo:
  ```ts
  res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'lax' })
  ```
- Esfuerzo: M
- Owner: Backend + Frontend

### H-03
- Severidad: **Alta**
- Impacto: deuda de lint alta oculta defectos reales y aumenta costo de revisión.
- Evidencia: 211 warnings backend + 10 frontend.
- Recomendación: plan de reducción por paquetes, convertir reglas críticas a error progresivamente.
- Ejemplo: `no-explicit-any` en capas de controladores/servicios primero.
- Esfuerzo: M
- Owner: Backend + Frontend

### H-04
- Severidad: **Alta**
- Impacto: testing backend no cubre auth/autorización/casos críticos.
- Evidencia: tests backend observados muy básicos.
- Recomendación: agregar integration tests con Supertest para rutas críticas.
- Ejemplo: suite auth (login/refresh/logout/token-blacklist/rate-limit).
- Esfuerzo: M
- Owner: QA + Backend

### H-05
- Severidad: **Alta**
- Impacto: root test no estable sin preparación por workspace.
- Evidencia: `npm run test` falla por binarios no instalados según estado inicial.
- Recomendación: script bootstrap estandarizado en README + CI parity local.
- Ejemplo: `npm run install:all && npm run test` en clean env.
- Esfuerzo: S
- Owner: DX/DevOps

### H-06
- Severidad: **Alta**
- Impacto: frontend test gate parcialmente opcional en CI aumenta riesgo de merge con regresiones.
- Evidencia: pipeline tiene bandera para habilitar tests frontend.
- Recomendación: ejecutar siempre en PR y main.
- Ejemplo: remover condición `if` del job de test frontend.
- Esfuerzo: S
- Owner: DevOps/QA

### H-07
- Severidad: **Media-Alta**
- Impacto: chunks frontend muy grandes afectan performance inicial.
- Evidencia: `vite build` advierte chunk principal >500kb.
- Recomendación: `manualChunks`, lazy loading y presupuesto de bundle.
- Ejemplo:
  ```ts
  build: { rollupOptions: { output: { manualChunks: { vendor: ['react','react-dom'] }}}}
  ```
- Esfuerzo: M
- Owner: Frontend

### H-08
- Severidad: **Media-Alta**
- Impacto: logs de pruebas/errores muy verbosos contaminan observabilidad.
- Evidencia: test output con múltiples `console` de interceptores y stores.
- Recomendación: centralizar logger por ambiente y silenciar en prod/test cuando no agrega valor.
- Ejemplo: wrapper logger con niveles y redacción.
- Esfuerzo: S
- Owner: Frontend + Backend

### H-09
- Severidad: **Media-Alta**
- Impacto: riesgo de lifecycle incorrecto de Prisma por instanciación dispersa.
- Evidencia: patrón con múltiples `new PrismaClient` en módulos backend.
- Recomendación: consolidar singleton `lib/prisma` y reutilizar.
- Ejemplo:
  ```ts
  import { prisma } from '../lib/prisma'
  ```
- Esfuerzo: M
- Owner: Backend

### H-10
- Severidad: **Media**
- Impacto: inconsistencias de documentación afectan onboarding y operación.
- Evidencia: documentación abundante pero parcialmente desalineada con scripts/paths reales.
- Recomendación: consolidar “single source of truth” para setup local/deploy.
- Ejemplo: README corto + docs profundas enlazadas.
- Esfuerzo: S
- Owner: DX

### H-11
- Severidad: **Media**
- Impacto: falta de versionado explícito de API aumenta riesgo de breaking changes.
- Evidencia: rutas en `/api/...` sin versión `/v1`.
- Recomendación: introducir `/api/v1` para contratos públicos nuevos.
- Ejemplo: `app.use('/api/v1/auth', authRouter)`.
- Esfuerzo: M
- Owner: Backend

### H-12
- Severidad: **Media**
- Impacto: falta contract testing impide detectar cambios incompatibles temprano.
- Evidencia: no suites de contrato API detectadas.
- Recomendación: agregar pruebas de contrato (OpenAPI snapshot + schema assertions).
- Ejemplo: verificar shape estable de respuestas críticas.
- Esfuerzo: M
- Owner: QA + Backend

### H-13
- Severidad: **Media**
- Impacto: no hay E2E smoke en pipeline para flujo crítico.
- Evidencia: dependencia Playwright presente pero sin gate de e2e estable en CI.
- Recomendación: E2E mínimo (login → crear proyecto → ver dashboard).
- Ejemplo: suite nightly + smoke en PR críticos.
- Esfuerzo: M
- Owner: QA

### H-14
- Severidad: **Media**
- Impacto: ausencia de request-id end-to-end dificulta troubleshooting.
- Evidencia: logging estructurado existe pero no correlación universal fuerte.
- Recomendación: middleware que genere/propague `x-request-id`.
- Ejemplo: set header en request y response.
- Esfuerzo: S
- Owner: Backend/SRE

### H-15
- Severidad: **Media**
- Impacto: security headers frontend incompletos en serving estático.
- Evidencia: CSP y políticas estrictas no definidas uniformemente.
- Recomendación: definir CSP base + headers de seguridad en nginx/Vercel.
- Ejemplo: `Content-Security-Policy`, `X-Content-Type-Options`.
- Esfuerzo: S
- Owner: DevOps + Frontend

### H-16
- Severidad: **Media**
- Impacto: falta runbook de incidente/rollback reduce tiempo de respuesta.
- Evidencia: no runbook operativo corto y accionable único.
- Recomendación: runbook con “detectar, contener, rollback, verificar”.
- Ejemplo: documento en `docs/runbooks/production-incident.md`.
- Esfuerzo: S
- Owner: SRE/DevOps

### H-17
- Severidad: **Media**
- Impacto: secret/dependency scanning sin cobertura completa sostenida.
- Evidencia: auditoría de paquetes no confiable en entorno actual.
- Recomendación: Dependabot + CodeQL + secret scanning estricto.
- Ejemplo: workflow semanal y policy de bloqueo por severidad alta.
- Esfuerzo: S
- Owner: Security/DevOps

### H-18
- Severidad: **Media**
- Impacto: observabilidad incompleta para costos IA y saturación recursos.
- Evidencia: sin métricas/tracing unificado de latencia, error rate y consumo IA.
- Recomendación: métricas básicas + alertas SLO.
- Ejemplo: Prometheus/OpenTelemetry + dashboard.
- Esfuerzo: L
- Owner: SRE + Backend

### H-19
- Severidad: **Baja-Media**
- Impacto: warnings de npm (`http-proxy`) ensucian señal en pipelines.
- Evidencia: presente en todos los comandos npm ejecutados.
- Recomendación: sanear config npm de entorno CI/dev.
- Ejemplo: `npm config delete http-proxy` en runners si no aplica.
- Esfuerzo: S
- Owner: DevOps

### H-20
- Severidad: **Baja-Media**
- Impacto: falta formalización de gobierno de repo (PR template/CODEOWNERS).
- Evidencia: prácticas no completamente estandarizadas.
- Recomendación: agregar plantillas y ownership por áreas.
- Ejemplo: `.github/pull_request_template.md`, `.github/CODEOWNERS`.
- Esfuerzo: S
- Owner: Tech Lead

---

## 4) “Lo que falta” (checklist producción)

- [ ] Auth robusta con cookie httpOnly + estrategia anti-CSRF definida.
- [ ] `prebuild` backend con `prisma generate` para reproducibilidad.
- [ ] Contract tests API y E2E smoke en CI.
- [ ] Versionado de API (`/v1`) para contratos estables.
- [ ] Request-id end-to-end y dashboard de métricas base.
- [ ] Secret scanning + SAST/CodeQL + dependencia automatizada.
- [ ] Runbook de incidentes y rollback operable en <15 min.
- [ ] PR template y CODEOWNERS con quality gates explícitos.

---

## 5) Plan de remediación por fases

### Fase 0 (hoy) — quick wins
1. `prebuild: prisma generate` backend.
2. CI: tests frontend obligatorios.
3. PR template con checklist de seguridad/QA.
4. Bajar ruido de logs en producción.

### Fase 1 (esta semana) — estabilización
1. Reducir warnings críticos de lint en módulos de auth/routing.
2. Tests integración backend para auth/rate-limit/ownership.
3. Introducir request-id y trazabilidad básica.
4. Bundle splitting inicial en frontend.

### Fase 2 (2–4 semanas) — hardening + escala
1. Migración de JWT storage a cookie httpOnly.
2. Contract testing + E2E smoke estable.
3. Observabilidad completa (métricas + trazas + alertas).
4. Runbook operativo y estrategia formal de rollback.

---

## 6) Entregable para developer (PR Review)

### Must Fix
- Estabilizar build backend (`prisma generate` automático).
- Cerrar riesgo de token en storage frontend.
- Hacer obligatorios tests frontend en CI.
- Aumentar cobertura de tests backend en riesgos críticos.

### Should Fix
- Reducir deuda de lint en áreas core.
- Añadir versionado de API y pruebas de contrato.
- Implementar request-id y métricas operativas mínimas.

### Nice to Have
- Optimización fina de bundle frontend.
- Formalización de CODEOWNERS/PR templates/runbooks.

### Set sugerido de commits (incrementales)
1. `chore(backend): add prisma generate prebuild for reproducible builds`
2. `ci: enforce frontend tests on PR and main`
3. `test(backend): add integration tests for auth rate limits and ownership`
4. `refactor(frontend-auth): migrate token handling toward httpOnly cookie strategy`
5. `chore(repo): add PR template and CODEOWNERS`

---

## Top 10 pruebas a agregar primero (QA)

1. Login brute-force (IP + email throttling).
2. Token blacklisted no reutilizable.
3. Ownership estricto entre usuarios en proyectos.
4. CORS deny para origen no permitido en modo prod.
5. Health readiness falla cuando DB cae.
6. Contrato estable de `/auth/login` y `/projects/*`.
7. E2E smoke: login → crear proyecto → listar dashboard.
8. Manejo de 429 en frontend sin loops/fallas de UX.
9. Error handling OpenAI timeout/retry/backoff.
10. Pipeline clean-room (install/lint/test/build) sin pasos manuales.

Nota QA Architect: priorizar pruebas estables de integración y contrato; evitar waits fijos y estado compartido global.
