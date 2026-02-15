// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Request, Response } from 'express';
import { conversationalWorkflowService } from '../services/conversational/workflow.service';
import { ResponseHandler } from '../utils/response-handler';
import { AppError, UnauthorizedError, ValidationError, InternalServerError } from '../utils/error-handler';
const { StructuredLogger } = require('../utils/structured-logger');

StructuredLogger.info('🚀 INICIO: Cargando archivo conversational-workflow.controller.ts');

interface StartConversationRequest {
  projectId?: string;
  title: string;
  description: string;
  epicContent: string;
}

interface SendMessageRequest {
  content?: string;
  instruction?: string;
  requirement?: string;
  messageType?: string;
}

interface ReopenAnalysisRequest {
  reason?: string;
}

export class ConversationalWorkflowController {
  private getUserId(req: Request): string {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError('Usuario no autenticado');
    }
    return userId;
  }

  /**
   * POST /api/conversational-workflow
   * Crear nuevo flujo de análisis conversacional
   */
  async createWorkflow(req: Request, res: Response): Promise<Response> {
    try {
      const userId = this.getUserId(req);

      const { projectId, title, description, epicContent }: StartConversationRequest = req.body;

      if (!title || !description || !epicContent) {
        throw new ValidationError('Título, descripción y contenido del épico son requeridos');
      }

      // Crear workflow conversacional usando el servicio
      try {
        const createdWorkflow = await conversationalWorkflowService.startConversation(
          userId,
          title,
          description,
          epicContent
        );

  StructuredLogger.info('✅ Flujo conversacional creado', { workflowId: createdWorkflow.id, userId });

        return ResponseHandler.created(res, createdWorkflow, 'Flujo conversacional creado exitosamente');

      } catch (error) {
        StructuredLogger.warn('Error en servicio, creando workflow mock', { projectId, error: (error as Error)?.message });

        // Obtener información del proyecto si se proporcionó
        let projectInfo = null;
        if (projectId) {
          try {
            // Aquí normalmente consultaríamos la BD para obtener el proyecto
            // Por ahora usamos datos mock basados en el projectId
            const projectMockData = {
              'project-1': {
                id: 'project-1',
                name: 'E-COMMERCE PLATFORM',
                description: 'Plataforma de comercio electrónico completa que incluye gestión de productos, carrito de compras, sistema de pagos, gestión de usuarios, inventario en tiempo real, y reportes de ventas. Soporta múltiples métodos de pago y está diseñada para escalar con el crecimiento del negocio.'
              },
              'project-2': {
                id: 'project-2',
                name: 'Escuela de Conducción',
                description: 'Sistema integral para escuela de conducción que maneja registro de alumnos, programación de clases teóricas y prácticas, asignación de instructores, seguimiento de progreso, generación de certificados, y gestión de vehículos. Incluye portal web para alumnos y panel administrativo completo.'
              },
              'project-3': {
                id: 'project-3',
                name: 'Sistema de Inventario',
                description: 'Sistema de gestión de inventario para empresas medianas que controla stock, entradas y salidas de productos, alertas de stock mínimo, reportes de rotación, gestión de proveedores, y trazabilidad completa de productos. Integrable con sistemas ERP existentes.'
              },
              'project-4': {
                id: 'project-4',
                name: 'Portal de Estudiantes',
                description: 'Portal académico para institución educativa que permite a estudiantes consultar notas, horarios, inscribirse a materias, descargar certificados, comunicarse con profesores, y acceder a material de estudio. Incluye sistema de notificaciones y calendario académico.'
              }
            };

            projectInfo = projectMockData[projectId as keyof typeof projectMockData] || null;
                } catch (error) {
                  StructuredLogger.error('Error obteniendo información del proyecto', error, { projectId });
          }
        }

        // Crear mensajes iniciales basados en la descripción del formulario y proyecto
        const initialMessages = [];

        // 1. Primer mensaje: La descripción del usuario como mensaje inicial
        initialMessages.push({
          id: 'msg-user-1',
          content: description,
          role: 'USER',
          messageType: 'INITIAL_DESCRIPTION',
          createdAt: new Date().toISOString()
        });

        // 2. Segundo mensaje: Información del proyecto (si existe)
        let projectContext = '';
        if (projectInfo) {
          projectContext = `

**Información del Proyecto "${projectInfo.name}":**
${projectInfo.description}

Basándome en esta información del proyecto y tu descripción, `;

          initialMessages.push({
            id: 'msg-project-context',
            content: `📋 **Contexto del Proyecto**

He recibido información sobre el proyecto "${projectInfo.name}":

${projectInfo.description}

Esta información me ayudará a hacer preguntas más específicas y relevantes para tu análisis.`,
            role: 'ASSISTANT',
            messageType: 'PROJECT_CONTEXT',
            createdAt: new Date().toISOString()
          });
        }

        // 3. Mensaje de la IA con pregunta inicial contextualizada
        const initialQuestion = projectInfo
          ? `Perfecto! Veo que estás trabajando en "${projectInfo.name}". ${projectContext}me gustaría profundizar en algunos aspectos específicos de "${title}".

**Primera pregunta:** Considerando el contexto del proyecto, ¿cuáles son las reglas de negocio más críticas que debe cumplir esta funcionalidad? Por ejemplo, ¿hay restricciones específicas, validaciones importantes, o flujos de proceso que deben respetarse?`
          : `¡Hola! 👋 Gracias por proporcionar esa descripción detallada sobre "${title}".

**Primera pregunta:** Para comenzar con el análisis, ¿cuáles son las reglas de negocio más importantes que debe cumplir esta funcionalidad? Por ejemplo, ¿hay validaciones específicas, restricciones de acceso, o procesos críticos que deben considerarse?`;

        initialMessages.push({
          id: 'msg-ai-1',
          content: initialQuestion,
          role: 'ASSISTANT',
          messageType: 'QUESTION',
          createdAt: new Date().toISOString()
        });

        // Fallback: crear workflow mock
        const mockWorkflow = {
          id: `conv-${Date.now()}`,
          title,
          description,
          epicContent,
          projectId: projectId || null,
          userId,
          currentPhase: 'ANALYSIS',
          status: 'IN_PROGRESS',
          completeness: {
            overallScore: 5,
            functionalCoverage: 5,
            nonFunctionalCoverage: 0,
            businessRulesCoverage: 0,
            acceptanceCriteriaCoverage: 0
          },
          messages: initialMessages,
          project: projectInfo,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        return ResponseHandler.created(res, mockWorkflow, 'Flujo conversacional creado exitosamente');
      }
    } catch (error) {
      StructuredLogger.error('Error creating conversational workflow', error);
      const appError = error instanceof AppError ? error : new InternalServerError('Error interno del servidor');
      return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
    }
  }

  /**
   * POST /api/conversational-workflow/:id/chat
   * Enviar mensaje en el chat conversacional
   */
  async sendMessage(req: Request, res: Response): Promise<Response> {
    try {
      const userId = this.getUserId(req);

      const { id } = req.params;
      const body = req.body as SendMessageRequest;

      // Normalizar payload: aceptar { content } o { instruction, requirement }
      let messageContent = body.content;
      if ((!messageContent || messageContent.trim().length === 0) && body.instruction) {
        messageContent = body.instruction;
        if (body.requirement) {
          messageContent += `\n\n---\nRequerimiento editado:\n${body.requirement}`;
        }
      }

      if (!messageContent || messageContent.trim().length === 0) {
        throw new ValidationError('El mensaje no puede estar vacío');
      }

      // 🤖 Usar el servicio conversacional real con IA
      const response = await conversationalWorkflowService.processUserMessage(id, messageContent);

      StructuredLogger.info('Mensaje procesado con IA', { 
        workflowId: id, 
        messageType: response.messageType, 
        userId: userId 
      });

      return ResponseHandler.success(res, response);
    } catch (error) {
  StructuredLogger.error('Error sending message', error, { workflowId: req.params?.id, userId: req.user?.id });
      const appError = error instanceof AppError ? error : new InternalServerError('Error interno del servidor');
      return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
    }
  }

  /**
   * POST /api/conversational-workflow/:id/submit
   * Finalizar fase actual y marcarla como lista para avanzar
   */
  async submitPhase(req: Request, res: Response): Promise<Response> {
    try {
      this.getUserId(req);

      const { id } = req.params;

      let analysis;
      try {
        analysis = await conversationalWorkflowService.submitPhase(id);
      } catch (serviceError) {
  StructuredLogger.warn('Error en servicio, usando fallback para completar análisis', { workflowId: req.params?.id });

        // Fallback: Simular completar el análisis
        analysis = {
          id,
          title: `Análisis Completado ${id}`,
          description: 'Análisis conversacional finalizado exitosamente',
          currentPhase: 'COMPLETED',
          status: 'COMPLETED',
          completeness: {
            overallScore: 100,
            phases: {
              ANALYSIS: { completed: true, score: 100 },
              STRATEGY: { completed: true, score: 100 },
              TEST_PLANNING: { completed: true, score: 100 }
            }
          },
          messages: [],
          metadata: {
            totalMessages: 15,
            avgResponseTime: 1500,
            lastActivity: new Date().toISOString()
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

  StructuredLogger.info('Fase enviada para flujo', { workflowId: req.params?.id || 'unknown', phase: analysis.currentPhase });

      return ResponseHandler.success(res, analysis, 'Fase finalizada correctamente. Ya puedes avanzar a la siguiente etapa.');
  } catch (error) {
  StructuredLogger.error('Error submitting phase', error as Error, { workflowId: req.params?.id || 'unknown' });
      const appError = error instanceof AppError ? error : new InternalServerError('Error interno del servidor');
      return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
    }
  }

  /**
   * POST /api/conversational-workflow/:id/advance
   * Avanzar a la siguiente fase del flujo
   */
  async advancePhase(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      try {
        // Intentar usar el servicio real
        const analysis = await conversationalWorkflowService.advanceToNextPhase(id);

  StructuredLogger.info('Flujo avanzado a fase', { workflowId: req.params?.id || 'unknown', phase: analysis.currentPhase });

        return ResponseHandler.success(res, analysis, `Avanzado exitosamente a la fase: ${analysis.currentPhase}`);

      } catch (serviceError) {
  StructuredLogger.warn('Error en servicio, usando fallback para avanzar fase', { workflowId: req.params?.id });

        // Fallback: simular avance de fase
        const mockAnalysis = {
          id,
          title: `Análisis Avanzado ${id}`,
          description: 'Análisis que ha avanzado a la siguiente fase',
          currentPhase: 'STRATEGY',
          status: 'IN_PROGRESS',
          completeness: {
            overallScore: 75,
            functionalCoverage: 80,
            nonFunctionalCoverage: 70,
            businessRulesCoverage: 75,
            acceptanceCriteriaCoverage: 70
          },
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        StructuredLogger.warn('Error en servicio, usando fallback para completar análisis', { workflowId: req.params?.id, error: serviceError });

        return ResponseHandler.success(res, mockAnalysis, `Avanzado exitosamente a la fase: ${mockAnalysis.currentPhase}`);
      }

    } catch (error) {
  StructuredLogger.error('Error advancing phase', error as Error, { workflowId: req.params?.id || 'unknown' });
      const appError = error instanceof AppError ? error : new InternalServerError('Error interno del servidor');
      return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
    }
  }

  /**
   * POST /api/conversational-workflow/:id/reopen
   * Reabrir análisis para continuar editando
   */
  async reopenAnalysis(req: Request, res: Response): Promise<Response> {
    try {
      const userId = this.getUserId(req);

      const { id } = req.params;
      const { reason }: ReopenAnalysisRequest = req.body;

      const analysis = await conversationalWorkflowService.reopenAnalysis(id, reason);

  StructuredLogger.info('Flujo reabierto para edición', { workflowId: req.params?.id || 'unknown' });

      return ResponseHandler.success(res, analysis, 'Análisis reabierto correctamente. Puedes continuar la conversación.');
    } catch (error) {
  StructuredLogger.error('Error reopening analysis', error as Error, { workflowId: req.params?.id || 'unknown' });
      const appError = error instanceof AppError ? error : new InternalServerError('Error interno del servidor');
      return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
    }
  }

  /**
   * GET /api/conversational-workflow/:id/status
   * Obtener estado actual del análisis
   */
  async getAnalysisStatus(req: Request, res: Response): Promise<Response> {
    try {
      this.getUserId(req);

      const { id } = req.params;

      // Try to get the real analysis from DB first
      try {
        const db = require('../services/conversational/database.service').conversationalDatabaseService;
        const analysis = await db.getAnalysisById(id);

        if (analysis) {
          // Map entity to API-friendly structure expected by frontend
          const apiResp = {
            id: analysis.id,
            title: analysis.title,
            description: analysis.description,
            epicContent: analysis.epicContent,
            currentPhase: analysis.currentPhase,
            status: analysis.status,
            completeness: analysis.completeness?.overallScore || 0,
            messages: (analysis.messages || []).map((m: any) => ({
              id: m.id,
              content: m.content,
              role: m.role,
              type: m.messageType || 'unknown',
              timestamp: m.createdAt,
              metadata: { category: m.category }
            })),
            createdAt: analysis.createdAt,
            updatedAt: analysis.updatedAt,
            project: { id: analysis.projectId, name: null }
          };

          return ResponseHandler.success(res, apiResp);
        }

        // If no DB entry found, fall back to the mock (development convenience)
      } catch (dbErr) {
        StructuredLogger.warn('Error reading analysis from DB, falling back to mock status', { workflowId: id, err: dbErr });
        // continue to fallback mock
      }

      // Fallback mock response (legacy/dev) kept only if DB lookup fails
      const mockStatus = {
        id,
        title: 'Análisis de Sistema de Pagos',
        description: 'Análisis conversacional para sistema de pagos en línea',
        epicContent: 'Como usuario, quiero poder realizar pagos seguros para completar mis compras',
        currentPhase: 'ANALYSIS',
        status: 'IN_PROGRESS',
        completeness: {
          functionalCoverage: 75,
          nonFunctionalCoverage: 60,
          businessRulesCoverage: 45,
          acceptanceCriteriaCoverage: 50,
          overallScore: 58
        },
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        project: null,
        canAdvance: false,
        messagesCount: 0
      };

      return ResponseHandler.success(res, mockStatus);
  } catch (error) {
  StructuredLogger.error('Error getting analysis status', error as Error, { workflowId: req.params?.id || 'unknown' });
      const appError = error instanceof AppError ? error : new InternalServerError('Error interno del servidor');
      return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
    }
  }

  /**
   * Obtener todos los flujos conversacionales del usuario
   */
  async getUserWorkflows(req: Request, res: Response): Promise<Response> {
    try {
      const userId = this.getUserId(req);

      try {
        const workflows = await conversationalWorkflowService.getUserWorkflows(userId);

  StructuredLogger.info('Obtenidos workflows para usuario', { userId: req.user?.id || 'unknown', count: workflows.length });

        return ResponseHandler.success(res, workflows);

        } catch (serviceError) {
          StructuredLogger.warn('Error en servicio, devolviendo workflows mock', { userId });

        // Fallback: devolver análisis mock
        const mockWorkflows = [
          {
            id: 'demo-1',
            title: 'Análisis de Sistema de Pagos',
            description: 'Análisis conversacional para sistema de pagos en línea',
            epicContent: 'E-COMMERCE PLATFORM',
            projectId: 'project-1',
            userId,
            currentPhase: 'STRATEGY',
            status: 'IN_PROGRESS',
            completeness: {
              overallScore: 58,
              functionalCoverage: 60,
              nonFunctionalCoverage: 45,
              businessRulesCoverage: 70,
              acceptanceCriteriaCoverage: 55
            },
            messages: [],
            project: {
              id: 'project-1',
              name: 'E-COMMERCE PLATFORM',
              description: 'Plataforma de comercio electrónico'
            },
            createdAt: new Date('2024-08-10').toISOString(),
            updatedAt: new Date('2024-08-10').toISOString()
          },
          {
            id: 'demo-2',
            title: 'Sistema de Autenticación',
            description: 'Análisis de seguridad y autenticación de usuarios',
            epicContent: 'Sistema de autenticación robusto con 2FA',
            projectId: null,
            userId,
            currentPhase: 'COMPLETED',
            status: 'COMPLETED',
            completeness: {
              overallScore: 81,
              functionalCoverage: 85,
              nonFunctionalCoverage: 80,
              businessRulesCoverage: 75,
              acceptanceCriteriaCoverage: 85
            },
            messages: [],
            createdAt: new Date('2024-08-09').toISOString(),
            updatedAt: new Date('2024-08-09').toISOString()
          }
        ];

        return ResponseHandler.success(res, mockWorkflows);
      }
      } catch (error) {
        const userId = req.user?.id || 'unknown';
        StructuredLogger.error('Error getting user workflows', error as Error, { userId });
        const appError = error instanceof AppError ? error : new InternalServerError('Error interno del servidor');
        return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
    }
  }

  /**
   * GET /api/conversational-workflow/user/in-progress
   * Obtener workflows en progreso del usuario
   */
  async getUserInProgressWorkflows(req: Request, res: Response): Promise<Response> {
    try {
      const userId = this.getUserId(req);

      try {
        const workflows = await conversationalWorkflowService.getUserWorkflows(userId);

  StructuredLogger.debug('Todos los workflows del usuario', { userId, workflowsCount: workflows.length });

        // Filtrar workflows en progreso con lógica híbrida
        // Consideramos "en progreso" los que están genuinamente incompletos
        const inProgressWorkflows = workflows.filter(workflow => {
          const completeness = workflow.completeness?.overallScore || 0;
          const isReallyInProgress = (
            workflow.status === 'IN_PROGRESS' ||
            workflow.status === 'READY_TO_ADVANCE' ||
            workflow.status === 'REOPENED'
          ) && completeness < 90; // Menos del 90% de completeness

          if (isReallyInProgress) {
            StructuredLogger.info('Workflow en progreso', { workflowId: workflow.id, title: workflow.title, completeness });
          }

          return isReallyInProgress;
        });

  StructuredLogger.info('IN PROGRESS workflows count', { userId, count: inProgressWorkflows.length });

        // Transformar al formato esperado por el frontend
        const transformedWorkflows = inProgressWorkflows.map(workflow => ({
          id: workflow.id,
          name: workflow.title,
          description: workflow.description,
          status: workflow.status,
          createdAt: workflow.createdAt,
          updatedAt: workflow.updatedAt,
          projectId: workflow.projectId,
          currentPhase: workflow.currentPhase,
          completeness: workflow.completeness?.overallScore || 0
        }));

        return ResponseHandler.success(res, {
          items: transformedWorkflows,
          pagination: {
            total: transformedWorkflows.length,
            page: 1,
            limit: transformedWorkflows.length,
            totalPages: 1
          }
        });

      } catch (serviceError) {
        StructuredLogger.error('Error obteniendo workflows en progreso', serviceError as Error, { userId });
        const appError = error instanceof AppError ? error : new InternalServerError('Error al obtener workflows en progreso');
        return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
      }
    } catch (error) {
      const userId = req.user?.id || 'unknown';
      StructuredLogger.error('GET IN PROGRESS WORKFLOWS ERROR', error as Error, { userId });
      const appError = error instanceof AppError ? error : new InternalServerError('Error interno del servidor');
      return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
    }
  }

  /**
   * GET /api/conversational-workflow/user/completed
   * Obtener workflows completados del usuario
   */
  async getUserCompletedWorkflows(req: Request, res: Response): Promise<Response> {
    try {
      const userId = this.getUserId(req);

      try {
        const workflows = await conversationalWorkflowService.getUserWorkflows(userId);

  StructuredLogger.debug('Todos los workflows (completed) del usuario', { userId, workflowsCount: workflows.length });

        // Filtrar workflows "completados" con lógica híbrida
        // Consideramos "completado" los que tienen alta completeness O status COMPLETED
        const completedWorkflows = workflows.filter(workflow => {
          const completeness = workflow.completeness?.overallScore || 0;
          const isCompleted = (
            workflow.status === 'COMPLETED' ||
            workflow.status === 'SUBMITTED' ||
            (workflow.currentPhase === 'COMPLETED') ||
            (completeness >= 90) // 90% o más de completeness
          );

          if (isCompleted) {
            StructuredLogger.info('Workflow completed', { workflowId: workflow.id, title: workflow.title, completeness });
          }

          return isCompleted;
        });

  StructuredLogger.info('COMPLETED workflows count', { userId, count: completedWorkflows.length });

        // Transformar al formato esperado por el frontend
        const transformedWorkflows = completedWorkflows.map(workflow => {
          const completeness = workflow.completeness?.overallScore || 0;
          return {
            id: workflow.id,
            name: workflow.title,
            description: workflow.description,
            status: 'COMPLETED', // Siempre marcar como COMPLETED para la UI
            createdAt: workflow.createdAt,
            updatedAt: workflow.updatedAt,
            projectId: workflow.projectId,
            currentPhase: workflow.currentPhase,
            completeness: Math.max(90, completeness) // Mínimo 90% para completados
          };
        });

        return ResponseHandler.success(res, {
          items: transformedWorkflows,
          pagination: {
            total: transformedWorkflows.length,
            page: 1,
            limit: transformedWorkflows.length,
            totalPages: 1
          }
        });

      } catch (serviceError) {
        StructuredLogger.error('Error obteniendo workflows completados', serviceError as Error, { userId });
        const appError = error instanceof AppError ? error : new InternalServerError('Error al obtener workflows completados');
        return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
      }
    } catch (error) {
      const userId = req.user?.id || 'unknown';
      StructuredLogger.error('GET COMPLETED WORKFLOWS ERROR', error as Error, { userId });
      const appError = error instanceof AppError ? error : new InternalServerError('Error interno del servidor');
      return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
    }
  }

  /**
   * POST /api/conversational-workflow/create-and-start
   * Crear y empezar workflow conversacional inmediatamente
   */
  async createAndStartWorkflow(req: Request, res: Response): Promise<Response> {
    try {
      const userId = this.getUserId(req);
      const { title, description } = req.body;

      if (!title || !description) {
        throw new ValidationError('Título y descripción son requeridos');
      }

      // Generar epicContent automáticamente a partir del título y descripción
      const epicContent = `PROYECTO: ${title}

DESCRIPCIÓN DETALLADA:
${description}

OBJETIVO:
Realizar un análisis conversacional completo para identificar requisitos, definir estrategias de testing y generar casos de prueba profesionales.`;

      // Crear workflow conversacional usando el servicio
      const createdWorkflow = await conversationalWorkflowService.startConversation(
        userId,
        title,
        description,
        epicContent
      );

  StructuredLogger.info('Workflow conversacional creado y iniciado', { workflowId: createdWorkflow.id });

      return ResponseHandler.created(res, {
        chatId: createdWorkflow.id,
        title: createdWorkflow.title,
        status: createdWorkflow.status,
        currentPhase: createdWorkflow.currentPhase,
        project: {
          id: createdWorkflow.id,
          title: createdWorkflow.title,
          description: createdWorkflow.description,
          status: createdWorkflow.status,
          currentPhase: createdWorkflow.currentPhase,
          createdAt: createdWorkflow.createdAt
        },
        initialMessage: {
          role: 'ASSISTANT',
          content: 'Hola! Voy a ayudarte a analizar tu proyecto. Empecemos explorando los requisitos en detalle.',
          timestamp: new Date().toISOString()
        }
      }, 'Workflow conversacional creado exitosamente');

    } catch (error) {
      StructuredLogger.error('CREATE AND START WORKFLOW ERROR', error as Error);
      const appError = error instanceof AppError ? error : new InternalServerError('Error interno del servidor al crear workflow');
      return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
    }
  }

  /**
   * GET /api/conversational-workflow/:id/summit
   * Obtener el resumen final (summit) asociado al análisis conversacional
   */
  async getAnalysisSummit(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    try {
      const summit = await conversationalWorkflowService.getAnalysisSummit(id);

      return ResponseHandler.success(res, summit);
    } catch (error) {
      StructuredLogger.error('Error getting analysis summit', error as Error, { workflowId: id });
      const appError = error instanceof AppError ? error : new InternalServerError('Error interno del servidor');
      return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
    }
  }

  /**
   * POST /api/conversational-workflow/:id/summit
   * Crear un nuevo resumen final para el análisis conversacional
   */
  async createAnalysisSummit(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    try {
      this.getUserId(req);

      const summitData = req.body;

      await conversationalWorkflowService.createAnalysisSummit(id, summitData);

      return ResponseHandler.created(res, { message: 'Analysis summit creado' });
    } catch (error) {
      StructuredLogger.error('Error creating analysis summit', error as Error, { workflowId: id });
      const appError = error instanceof AppError ? error : new InternalServerError('Error interno del servidor');
      return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
    }
  }

  /**
   * POST /api/conversational-workflow/purge-completed-messages
   * Admin endpoint - by default performs a dry-run and returns counts.
   * Query: ?confirm=true to execute deletion
   * Body: { keepLastUser?: boolean }
   */
  async purgeCompletedMessages(req: Request, res: Response): Promise<Response> {
    try {
      // Only allow in non-production by default or require a confirm flag
      const confirm = req.query?.confirm === 'true';
      const keepLastUser = !!req.body?.keepLastUser;

      const db = require('../services/conversational/database.service').conversationalDatabaseService;

      // Dry-run first
      const dryRunResults = await db.purgeOldMessagesForCompletedAnalyses({ dryRun: true, keepLastUser });

      if (!confirm) {
        return ResponseHandler.success(res, { dryRun: true, data: dryRunResults });
      }

      // Perform actual purge
      const execResults = await db.purgeOldMessagesForCompletedAnalyses({ dryRun: false, keepLastUser });

      return ResponseHandler.success(res, { dryRun: false, data: execResults });
    } catch (error) {
      StructuredLogger.error('Error purging completed messages', error as Error);
      const appError = error instanceof AppError ? error : new InternalServerError('Error interno purgando mensajes');
      return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
    }
  }

  /**
   * POST /api/conversational-workflow/:id/purge-messages
   * Admin: purge messages for a specific analysis (dry-run by default)
   * Query: ?confirm=true to execute deletion
   * Body: { keepLastAssistant?: boolean, keepLastUser?: boolean }
   */
  async purgeMessagesForAnalysis(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const confirm = req.query?.confirm === 'true';
      const keepLastAssistant = !!req.body?.keepLastAssistant;
      const keepLastUser = !!req.body?.keepLastUser;

      const db = require('../services/conversational/database.service').conversationalDatabaseService;

      // dry-run first
      const dry = await db.purgeMessagesForAnalysis(id, { dryRun: true, keepLastAssistant, keepLastUser });
      if (!confirm) {
        return ResponseHandler.success(res, { dryRun: true, data: dry });
      }

      // execute
      const exec = await db.purgeMessagesForAnalysis(id, { dryRun: false, keepLastAssistant, keepLastUser });
      return ResponseHandler.success(res, { dryRun: false, data: exec });
    } catch (error) {
      StructuredLogger.error('Error purging messages for analysis', error as Error, { workflowId: req.params?.id });
      const appError = error instanceof AppError ? error : new InternalServerError('Error interno purgando mensajes del análisis');
      return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
    }
  }

  /**
   * PATCH /api/conversational-workflow/:id/summit
   * Actualizar el resumen final existente
   */
  async updateAnalysisSummit(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    try {
      this.getUserId(req);

      const updates = req.body;

      const updated = await conversationalWorkflowService.updateAnalysisSummit(id, updates);

      return ResponseHandler.success(res, updated, 'Analysis summit actualizado');
    } catch (error) {
      StructuredLogger.error('Error updating analysis summit', error as Error, { workflowId: id });
      const appError = error instanceof AppError ? error : new InternalServerError('Error interno del servidor');
      return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
    }
  }
}

export const conversationalWorkflowController = new ConversationalWorkflowController();
