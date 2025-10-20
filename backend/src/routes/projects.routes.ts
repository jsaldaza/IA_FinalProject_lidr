import { Router } from 'express';
import { projectsController } from '../controllers/projects.controller';
import { authenticate } from '../middleware/auth.middleware';
import { TokenCostControlMiddleware } from '../middleware/token-cost-control.middleware';
import { validateRequest, validateUuidParam, validateObjectIdParam } from '../middleware/validation.enhanced';
import { ProjectValidation } from '../validations/projects.validation';

console.log('🔧 Cargando projects.routes.ts (API Unificada)...');

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @swagger
 * /api/projects/quick-create:
 *   post:
 *     tags:
 *       - Proyectos
 *     summary: Crear proyecto rápido con solo título
 *     description: Crea un nuevo proyecto con solo el título para desarrollar requisitos en chat
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Título del proyecto
 *                 example: "Sistema de Inventario"
 *             required:
 *               - title
 *     responses:
 *       201:
 *         description: Proyecto creado exitosamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autenticado
 */
router.post('/quick-create',
  projectsController.quickCreate.bind(projectsController)
);

/**
 * @swagger
 * /api/projects/draft:
 *   post:
 *     tags:
 *       - Proyectos
 *     summary: Crear borrador de proyecto
 *     description: Crea un borrador de proyecto con solo el título (no inicia IA)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Título del proyecto
 *                 example: "Mi Proyecto"
 *             required:
 *               - title
 *     responses:
 *       201:
 *         description: Borrador creado exitosamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autenticado
 */
router.post('/draft',
  projectsController.createDraft.bind(projectsController)
);

/**
 * @swagger
 * /api/projects/create-and-start:
 *   post:
 *     tags:
 *       - Proyectos
 *     summary: Crear proyecto e iniciar análisis IA automático
 *     description: Crea un nuevo proyecto y automáticamente inicia el análisis conversacional con IA
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 description: Título del proyecto
 *                 example: "API de E-commerce"
 *               description:
 *                 type: string
 *                 minLength: 50
 *                 description: Descripción detallada del proyecto o requerimiento
 *                 example: "Necesito crear una API REST para un sistema de e-commerce..."
 *     responses:
 *       201:
 *         description: Proyecto creado e iniciado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     project:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         title:
 *                           type: string
 *                         description:
 *                           type: string
 *                         status:
 *                           type: string
 *                           enum: [IN_PROGRESS, COMPLETED, PAUSED]
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Datos de entrada inválidos o límite de proyectos alcanzado
 *       401:
 *         description: No autenticado
 *       429:
 *         description: Límite de presupuesto diario de tokens alcanzado
 */
router.post('/create-and-start',
  validateRequest(ProjectValidation.createAndStart),
  TokenCostControlMiddleware.checkDailyTokenBudget,
  projectsController.createAndStart.bind(projectsController)
);

/**
 * @swagger
 * /api/projects:
 *   post:
 *     tags:
 *       - Proyectos
 *     summary: Crear proyecto estándar
 *     description: Crea un nuevo proyecto sin iniciar automáticamente el análisis IA
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 description: Título del proyecto
 *               description:
 *                 type: string
 *                 minLength: 1
 *                 description: Descripción del proyecto
 *     responses:
 *       201:
 *         description: Proyecto creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     project:
 *                       $ref: '#/components/schemas/Project'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autenticado
 */
router.post('/',
  validateRequest(ProjectValidation.createProject),
  projectsController.createProject.bind(projectsController)
);

/**
 * @swagger
 * /api/projects/in-progress:
 *   get:
 *     tags:
 *       - Proyectos
 *     summary: Obtener proyectos en progreso
 *     description: Retorna la lista de proyectos del usuario que están en estado IN_PROGRESS
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de proyectos en progreso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       status:
 *                         type: string
 *                         example: IN_PROGRESS
 *                       phase:
 *                         type: string
 *                         description: Fase actual del análisis
 *                       progress:
 *                         type: number
 *                         minimum: 0
 *                         maximum: 100
 *                         description: Porcentaje de completitud
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: No autenticado
 */
router.get('/in-progress', projectsController.getProjectsInProgress.bind(projectsController));

/**
 * @swagger
 * /api/projects/completed:
 *   get:
 *     tags:
 *       - Proyectos
 *     summary: Obtener proyectos completados
 *     description: Retorna la lista de proyectos del usuario que han sido completados
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de proyectos completados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                             description: Título del proyecto
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                           requirement:
 *                             type: string
 *                             description: Requerimiento original o contenido épico
 *                           status:
 *                             type: string
 *                             example: COMPLETED
 *                           phase:
 *                             type: string
 *                           progress:
 *                             type: number
 *                             example: 100
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: No autenticado
 */
router.get('/completed', projectsController.getCompletedProjects.bind(projectsController));

/**
 * @swagger
 * /api/projects/{id}/status:
 *   get:
 *     tags:
 *       - Proyectos
 *     summary: Obtener estado del proyecto
 *     description: Retorna el estado actual y detalles de un proyecto específico
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único del proyecto
 *     responses:
 *       200:
 *         description: Estado del proyecto
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [IN_PROGRESS, COMPLETED, PAUSED, ARCHIVED]
 *                     phase:
 *                       type: string
 *                       description: Fase actual del análisis
 *                     progress:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 100
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     messages:
 *                       type: array
 *                       description: Mensajes del chat (si están disponibles)
 *                       items:
 *                         type: object
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Proyecto no encontrado
 */
router.get('/:id/status',
  validateObjectIdParam('id'),
  projectsController.getProjectStatus.bind(projectsController)
);

/**
 * @swagger
 * /api/projects/{id}/chat:
 *   post:
 *     tags:
 *       - Proyectos
 *     summary: Enviar mensaje al chat del proyecto
 *     description: Permite interactuar con el análisis conversacional IA del proyecto
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único del proyecto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required:
 *                   - content
 *                 properties:
 *                   content:
 *                     type: string
 *                     minLength: 1
 *                     description: Mensaje a enviar al análisis IA
 *                     example: "¿Qué casos de prueba recomiendas para el login?"
 *                   messageType:
 *                     type: string
 *                     description: Tipo de mensaje
 *               - type: object
 *                 required:
 *                   - instruction
 *                 properties:
 *                   instruction:
 *                     type: string
 *                     minLength: 1
 *                     description: Instrucción específica para la IA
 *                   requirement:
 *                     type: string
 *                     description: Requerimiento actualizado
 *                   messageType:
 *                     type: string
 *     responses:
 *       200:
 *         description: Respuesta de la IA procesada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       description: Respuesta generada por la IA
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Datos de entrada inválidos
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Proyecto no encontrado
 *       429:
 *         description: Límite de presupuesto diario alcanzado
 */
router.post('/:id/chat',
  validateRequest(ProjectValidation.sendMessage),
  TokenCostControlMiddleware.checkDailyTokenBudget,
  projectsController.sendMessage.bind(projectsController)
);

/**
 * @swagger
 * /api/projects/{id}/messages:
 *   get:
 *     tags:
 *       - Proyectos
 *     summary: Obtener historial de mensajes del chat
 *     description: Obtiene todos los mensajes del chat conversacional del proyecto
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único del proyecto
 *     responses:
 *       200:
 *         description: Mensajes obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     messages:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           content:
 *                             type: string
 *                           role:
 *                             type: string
 *                             enum: [user, assistant]
 *                           messageType:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     projectInfo:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         status:
 *                           type: string
 *                         completeness:
 *                           type: number
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Proyecto no encontrado
 */
router.get('/:id/messages',
  validateObjectIdParam('id'),
  projectsController.getMessages.bind(projectsController)
);

/**
 * @route POST /api/projects/:id/start
 * @desc Iniciar la conversación IA sobre un análisis existente (no crea un nuevo analysis)
 * @access Private
 */
router.post('/:id/start',
  TokenCostControlMiddleware.checkDailyTokenBudget,
  projectsController.startExistingProject.bind(projectsController)
);

/**
 * @swagger
 * /api/projects/{id}/complete:
 *   post:
 *     tags:
 *       - Proyectos
 *     summary: Completar proyecto
 *     description: Marca un proyecto como completado y actualiza su estado
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único del proyecto
 *     responses:
 *       200:
 *         description: Proyecto completado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     title:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: COMPLETED
 *                     completeness:
 *                       type: number
 *                       example: 100
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Proyecto no encontrado
 *       429:
 *         description: Límite de presupuesto diario alcanzado
 */
router.post('/:id/complete',
  validateObjectIdParam('id'),
  TokenCostControlMiddleware.checkDailyTokenBudget,
  projectsController.completeProject.bind(projectsController)
);

/**
 * @swagger
 * /api/projects/{id}/analysis:
 *   put:
 *     tags:
 *       - Proyectos
 *     summary: Actualizar análisis del proyecto
 *     description: Permite editar manualmente el análisis de un proyecto completado
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único del proyecto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - analysis
 *             properties:
 *               analysis:
 *                 type: string
 *                 minLength: 1
 *                 description: Contenido del análisis actualizado
 *                 example: "Análisis de requisitos mejorado..."
 *     responses:
 *       200:
 *         description: Análisis actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     title:
 *                       type: string
 *                     analysis:
 *                       type: string
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Proyecto no encontrado
 */
router.put('/:id/analysis',
  validateRequest(ProjectValidation.updateAnalysis),
  projectsController.updateAnalysis.bind(projectsController)
);

/**
 * @swagger
 * /api/projects/{id}/restart-chat:
 *   post:
 *     tags:
 *       - Proyectos
 *     summary: Reiniciar chat con análisis editado
 *     description: Reinicia la conversación IA usando el análisis editado como base para nuevo levantamiento de requisitos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único del proyecto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - analysis
 *             properties:
 *               analysis:
 *                 type: string
 *                 minLength: 1
 *                 description: Análisis base para reiniciar la conversación IA
 *                 example: "Basándote en este análisis editado..."
 *     responses:
 *       200:
 *         description: Chat reiniciado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     message:
 *                       type: string
 *                     readyForAI:
 *                       type: boolean
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Proyecto no encontrado
 *       429:
 *         description: Límite de presupuesto diario alcanzado
 */
router.post('/:id/restart-chat',
  validateRequest(ProjectValidation.restartChat),
  TokenCostControlMiddleware.checkDailyTokenBudget,
  projectsController.restartChatWithAnalysis.bind(projectsController)
);

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     tags:
 *       - Proyectos
 *     summary: Eliminar proyecto
 *     description: Elimina permanentemente un proyecto del usuario
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único del proyecto a eliminar
 *     responses:
 *       200:
 *         description: Proyecto eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Proyecto eliminado exitosamente
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Proyecto no encontrado
 *       403:
 *         description: No autorizado para eliminar este proyecto
 */
router.delete('/:id',
  validateObjectIdParam('id'),
  projectsController.deleteProject.bind(projectsController)
);

// Legacy routes removed - use /api/projects endpoints
// Deprecated analysis-project routes have been eliminated to reduce technical debt

console.log('✅ Rutas projects configuradas con API unificada y optimizaciones de costo');

export default router;

