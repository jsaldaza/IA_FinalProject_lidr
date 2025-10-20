# Backend: flujo sencillo y explicaciones para principiantes

Este documento explica de forma simple cómo funciona el backend del proyecto: qué hace cada pieza, cómo fluye la información desde el frontend hasta la IA y la base de datos, y cómo puedes probar localmente la obtención del "resumen/levantamiento" que generó la IA (el `AnalysisSummit`).

## Resumen en una frase

- El frontend pide al backend que genere o continúe una conversación; el backend envía prompts a OpenAI y guarda la respuesta (y los mensajes) en la base de datos. El artefacto que contiene la historia refinada por la IA se llama `AnalysisSummit`.

---

## Checklist (qué verás en este documento)
- [x] Componentes principales y su responsabilidad.
- [x] Diagrama simple (visual) del flujo.
- [x] Secuencia paso a paso para los dos flujos más importantes.
- [x] Qué pide/espera la API y cómo se guarda el `AnalysisSummit`.
- [x] Comandos sencillos (Windows `cmd.exe`) para probar la API.
- [x] Mapa rápido de archivos relevantes en el repo.

---

## Componentes principales (en palabras muy simples)

- Frontend: la interfaz del navegador — llama a rutas HTTP del backend.
- Controllers: reciben las llamadas HTTP y validan/normalizan datos. (ej.: `projects.controller.ts`)
- Services: contienen la lógica de negocio (orquestan llamadas a la IA y a la BD). (ej.: `workflow.service.ts`)
- OpenAI wrapper: envía los prompts al servicio de IA y devuelve la respuesta.
- Database layer (Prisma): guarda `ConversationalMessage` y `AnalysisSummit`.

---

## Diagrama de componentes (Mermaid)

Pega esto en un renderizador Mermaid para ver el gráfico.

```mermaid
graph LR
  A[Frontend (browser)] -->|POST /api/projects/create-and-start| B[ProjectsController]
  A -->|POST /api/projects/:id/chat| B
  A -->|GET /api/conversational-workflow/:id/summit| C[ConversationalWorkflowController]

  B --> D[WorkflowService]
  C --> D
  D --> E[OpenAI service]
  D --> F[DatabaseService (Prisma)]
  E --> D
  F -->|stores| DB[(Database)]
```

---

## Flujos clave (explicados paso a paso)

A continuación explico dos flujos comunes con pasos claros.

### 1) Crear proyecto y generar análisis inicial ("create-and-start")
1. El frontend hace `POST /api/projects/create-and-start` con datos del proyecto.
2. `ProjectsController` recibe la petición y llama a `WorkflowService.startConversation(...)`.
3. `WorkflowService` crea un registro inicial de conversación en la base de datos.
4. `WorkflowService` llama al servicio OpenAI con el prompt (sistema + input del usuario).
5. OpenAI devuelve un texto (la IA genera el "levantamiento" o resumen).
6. `WorkflowService` guarda la respuesta en la tabla de mensajes (`ConversationalMessage`) y crea un `AnalysisSummit` con `refinedRequirements = <texto IA>`.
7. El backend responde al frontend con los ids y estado del análisis.

Resultado: la IA ya generó y se guardó un `AnalysisSummit` que el frontend puede consultar.

### 2) Enviar un mensaje en el chat (usar el requerimiento editado)
1. El frontend envía `POST /api/projects/:id/chat` con `{ instruction, requirement }` o `{ content }`.
2. El controller normaliza a un solo `content` y pasa a `WorkflowService.processUserMessage(...)`.
3. Se guarda el mensaje del usuario en BD.
4. `WorkflowService` envía el historial + nuevo user-message a OpenAI.
5. OpenAI responde; se guarda la respuesta como `ASSISTANT` message.
6. El backend devuelve la respuesta AI al frontend; el frontend actualiza la UI.

---

## ¿Qué es `AnalysisSummit` y qué contiene?

- `AnalysisSummit` es el objeto que guarda el "levantamiento" o artefacto que produjo la IA.
- Campos típicos (simplificado):
  - `id` - identificador
  - `analysisId` - referencia a la conversación/análisis
  - `refinedRequirements` - el texto (o JSON) que generó la IA
  - `functionalAspects`, `summaryText`, etc. - otros campos que la IA puede llenar

En este proyecto el viewer (frontend) llama a `GET /api/conversational-workflow/:workflowId/summit` para obtener ese objeto.

---

## Comandos sencillos para probar (Windows `cmd.exe`)

Sustituye `WORKFLOW_ID` por el id real y ajusta la URL si tu backend está en otro puerto.

1) Obtener el summit (GET):

```cmd
curl -v -X GET "http://localhost:3001/api/conversational-workflow/WORKFLOW_ID/summit" -H "Accept: application/json"
```

2) Enviar un mensaje al chat (ejemplo con `instruction` + `requirement`):

```cmd
curl -v -X POST "http://localhost:3001/api/projects/WORKFLOW_ID/chat" -H "Content-Type: application/json" -d "{ \"instruction\": \"Resume estos requisitos\", \"requirement\": \"Aquí va el texto o el levantamiento editado\" }"
```

Si el backend requiere autenticación, añade la cabecera `-H "Authorization: Bearer <TOKEN>"`.

---

## Mapa rápido de archivos (dónde mirar en el repo)

- Backend:
  - `testforge-backend/src/controllers/projects.controller.ts` — rutas y normalización de payloads.
  - `testforge-backend/src/controllers/conversational-workflow.controller.ts` — endpoints para summit y flujo conversacional.
  - `testforge-backend/src/services/conversational/workflow.service.ts` — orquesta OpenAI y persistencia.
  - `testforge-backend/src/services/conversational/database.service.ts` — funciones CRUD via Prisma.
  - `prisma/schema.prisma` — modelos `ConversationalAnalysis`, `ConversationalMessage`, `AnalysisSummit`.

- Frontend:
  - `testforge-frontend/src/components/AnalysisViewerModal.tsx` — pide el summit y muestra/edita `refinedRequirements`.
  - `testforge-frontend/src/components/ProjectChatModal.tsx` — UI del chat.
  - `testforge-frontend/src/services/conversationalWorkflow.service.ts` — funciones HTTP al backend (get/create/update summit, chat).

---

## Consejos para un principiante
- Empieza por abrir la app en el navegador (Vite) y en el inspector de red (DevTools) observa la llamada a `/conversational-workflow/:id/summit` cuando abres el modal.
- Si no ves el `refinedRequirements`, abre la consola del backend para ver si la petición fue recibida y si hay errores.
- Usa los comandos `curl` sencillos de arriba para comprobar manualmente si el backend devuelve el summit.

---

## Próximos pasos si quieres que continúe yo
- (A) Crear un pequeño `curl` script en `scripts/` para automatizar la verificación create-and-start → GET summit.
- (B) Añadir un diagrama PNG/imagen al repo (exportando el Mermaid).
- (C) Generar una colección Postman / archivo `http` para VSCode REST client con los endpoints principales.

Dime cuál de las opciones (A/B/C) prefieres o si quieres que haga los pasos de verificación aquí mismo y pegue los resultados.

---

Documento creado para ser claro y útil a quien empieza; si algo no está suficientemente explicado lo adapto y simplifico aún más.
