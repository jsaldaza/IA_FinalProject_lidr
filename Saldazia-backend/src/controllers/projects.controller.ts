import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
// import { projectService } from '../services/project.service'; // Unused for now
import { conversationalService } from '../services/conversational.service';
import { projectValidationService } from '../services/project-validation.service';
import { ProjectMapper } from '../services/project-mapper.service';
import { conversationalWorkflowService } from '../services/conversational/workflow.service';
import { conversationalDatabaseService } from '../services/conversational/database.service';
import { ConversationalStatus } from '../types/conversational.types';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const sendMessageSchema = z.union([
  z.object({
    content: z.string().min(1, 'El mensaje no puede estar vacío'),
    messageType: z.string().optional()
  }),
  z.object({
    instruction: z.string().min(1, 'La instrucción no puede estar vacía'),
    requirement: z.string().optional(),
    messageType: z.string().optional()
  })
]);

export class ProjectsController {

  /**
   * POST /api/projects/quick-create
   * Crear proyecto rápido solo con título para luego desarrollar en chat
   */
  async quickCreate(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      const userValidation = projectValidationService.validateUserId(userId);
      if (!userValidation.success) {
        return res.status(401).json(ProjectMapper.createErrorResponse(userValidation.error!));
      }

      const validUserId = userId as string;
      const { title } = req.body;

      if (!title || title.trim().length < 3) {
        return res.status(400).json(ProjectMapper.createErrorResponse(
          'Project title is required and must be at least 3 characters'
        ));
      }

      // Check project limit
      const userProjectsInProgress = await conversationalWorkflowService.getUserWorkflows(validUserId);
      const inProgressCount = userProjectsInProgress.filter(p =>
        p.status === ConversationalStatus.IN_PROGRESS ||
        p.status === ConversationalStatus.READY_TO_ADVANCE
      ).length;

      if (inProgressCount >= 50) {
        return res.status(400).json(ProjectMapper.createErrorResponse(
          'Project limit reached',
          `You have reached the limit of 50 projects in progress. Current count: ${inProgressCount}`
        ));
      }

      // Create basic conversation with minimal description
      const basicDescription = `Proyecto: ${title.trim()}. Desarrollaremos los requisitos a través del chat interactivo.`;
      
      const analysis = await conversationalService.startConversation(validUserId, {
        title: title.trim(),
        description: basicDescription,
        epicContent: `Como usuario del sistema ${title.trim()}, quiero desarrollar los requisitos detallados a través de una conversación interactiva con la IA para obtener un análisis completo y preciso.`
      });

      if (!analysis || !analysis.id) {
        return res.status(500).json(ProjectMapper.createErrorResponse('Error creating conversational analysis'));
      }

      const projectData = ProjectMapper.fromConversationalEntity(analysis);
      return res.status(201).json(ProjectMapper.createFrontendCreateResponse(projectData));

    } catch (error) {
      console.error('❌ QUICK CREATE ERROR:', error);
      return res.status(500).json(ProjectMapper.createErrorResponse(
        'Internal server error',
        error instanceof Error ? error.message : String(error)
      ));
    }
  }

  /**
   * POST /api/projects/create-and-start
   * Crear nuevo proyecto y automáticamente iniciar chat conversacional - OPTIMIZADO
   */
  async createAndStart(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      const userValidation = projectValidationService.validateUserId(userId);
      if (!userValidation.success) {
        return res.status(401).json(ProjectMapper.createErrorResponse(userValidation.error!));
      }

      // At this point userId is validated to be a string
      const validUserId = userId as string;

      // Permitir tanto el nuevo formato (title) como el legacy (name para backward compatibility)
      const bodyData = req.body;
      const projectTitle = bodyData.title || bodyData.name;
      const projectDescription = bodyData.description;

      if (!projectTitle || !projectDescription) {
        return res.status(400).json(ProjectMapper.createErrorResponse(
          'Project title and description are required',
          'Both title and description are required'
        ));
      }

      // Validar longitud
      if (projectTitle.length < 3) {
        return res.status(400).json(ProjectMapper.createErrorResponse('Title must be at least 3 characters'));
      }

      if (projectTitle.length > 200) {
        return res.status(400).json(ProjectMapper.createErrorResponse('Title cannot exceed 200 characters'));
      }

      if (projectDescription.length < 20) {
        return res.status(400).json(ProjectMapper.createErrorResponse('Description must be at least 20 characters'));
      }

      if (projectDescription.length > 5000) {
        return res.status(400).json(ProjectMapper.createErrorResponse('Description cannot exceed 5000 characters'));
      }

      // Check project limit
      const userProjectsInProgress = await conversationalWorkflowService.getUserWorkflows(validUserId);
      const inProgressCount = userProjectsInProgress.filter(p =>
        p.status === ConversationalStatus.IN_PROGRESS ||
        p.status === ConversationalStatus.READY_TO_ADVANCE
      ).length;

      if (inProgressCount >= 50) {
        return res.status(400).json(ProjectMapper.createErrorResponse(
          'Project limit reached',
          `You have reached the limit of 50 projects in progress. Current count: ${inProgressCount}`
        ));
      }

      // Create conversation
      const analysis = await conversationalService.startConversation(validUserId, {
        title: projectTitle,
        description: projectDescription,
        epicContent: projectDescription
      });

      if (!analysis || !analysis.id) {
        return res.status(500).json(ProjectMapper.createErrorResponse('Error creating conversational analysis'));
      }

      const projectData = ProjectMapper.fromConversationalEntity(analysis);
      return res.status(201).json(ProjectMapper.createFrontendCreateResponse(projectData));

    } catch (error) {
      console.error('❌ CREATE AND START:', error);
      return res.status(500).json(ProjectMapper.createErrorResponse(
        'Internal server error',
        error instanceof Error ? error.message : String(error)
      ));
    }
  }

  /**
   * POST /api/projects
   * Crear nuevo proyecto (método estándar)
   */
  async createProject(req: AuthRequest, res: Response): Promise<Response> {
    try {
  // Creating project (standard flow)
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
      }

      const bodyData = req.body;
      const projectTitle = bodyData.title || bodyData.name;
      const projectDescription = bodyData.description;

      if (!projectTitle) {
        return res.status(400).json({
          success: false,
          error: 'Project title is required'
        });
      }

      if (!projectDescription) {
        return res.status(400).json({
          success: false,
          error: 'Project description is required'
        });
      }

      // Crear análisis conversacional (tabla principal)
      const analysis = await conversationalWorkflowService.startConversation(
        userId,
        projectTitle,
        projectDescription,
        projectDescription // epicContent = description por ahora
      );

      return res.status(201).json({
        status: 'success',
        data: {
          project: {
            id: analysis.id,
            title: projectTitle,
            description: projectDescription,
            userId: userId,
            createdAt: analysis.createdAt,
            updatedAt: analysis.updatedAt
          }
        }
      });

    } catch (error) {
      console.error('❌ CREATE PROJECT: Error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * POST /api/projects/draft
   * Crear un borrador de proyecto con solo título (no inicia IA)
   */
  async createDraft(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Usuario no autenticado' });

      const bodyData = req.body;
      const projectTitle = bodyData.title || bodyData.name;

      if (!projectTitle || projectTitle.length < 3) {
        return res.status(400).json({ success: false, error: 'El título debe tener al menos 3 caracteres' });
      }

      // Crear análisis conversacional como borrador con description vacío
      const analysis = await conversationalDatabaseService.createAnalysis({
        title: projectTitle,
        description: '',
        epicContent: '',
        userId
      });

      return res.status(201).json({ status: 'success', data: { project: { id: analysis.id, title: analysis.title, createdAt: analysis.createdAt } } });

    } catch (error) {
      console.error('❌ CREATE DRAFT: Error:', error);
      return res.status(500).json({ success: false, error: 'Error interno al crear borrador', details: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * PATCH /api/projects/:id
   * Actualizar campos del proyecto (description, epicContent, title)
   */
  async updateProject(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Usuario no autenticado' });

      const { id } = req.params;
      const updates = req.body;

      // Permitir actualizar title, description, epicContent
      const allowed: any = {};
      if (updates.title) allowed.title = updates.title;
      if (updates.description !== undefined) allowed.description = updates.description;
      if (updates.epicContent !== undefined) allowed.epicContent = updates.epicContent;

      // Usar servicio de persistencia para update (usa conversationalDatabaseService.updateAnalysis)
  // Try to update via Prisma directly for flexible fields
  const prisma = new PrismaClient();
  const prismaUpdateData: any = {};
  if (allowed.title) prismaUpdateData.title = allowed.title;
  if (allowed.description !== undefined) prismaUpdateData.description = allowed.description;
  if (allowed.epicContent !== undefined) prismaUpdateData.epicContent = allowed.epicContent;

  const result = await prisma.conversationalAnalysis.update({ where: { id }, data: prismaUpdateData });
  return res.status(200).json({ success: true, data: { id: result.id, title: result.title, description: result.description, epicContent: result.epicContent } });

    } catch (error) {
      console.error('❌ UPDATE PROJECT ERROR:', error);
      return res.status(500).json({ success: false, error: 'Error al actualizar proyecto', details: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * POST /api/projects/:id/start
   * Iniciar la conversación IA sobre un análisis existente (usa description/epicContent guardados)
   */
  async startExistingProject(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Usuario no autenticado' });

      const { id } = req.params;

      // Obtener análisis actual
  const existing = await conversationalDatabaseService.getAnalysisById(id);
      if (!existing) return res.status(404).json({ success: false, error: 'Análisis no encontrado' });

      if (existing.userId !== userId) return res.status(403).json({ success: false, error: 'No autorizado' });

      // Llamar a una variante de startConversation que opere sobre un analysis existente.
      // Implementación: si description/epicContent están vacíos usar body, sino usar existentes.
      const body = req.body || {};
      const title = body.title || existing.title;
      const description = body.description !== undefined ? body.description : existing.description || '';
      const epicContent = body.epicContent !== undefined ? body.epicContent : existing.epicContent || description;

      // Actualizar la entidad con la info si se proporcionó
      const prisma = new PrismaClient();
      await prisma.conversationalAnalysis.update({ where: { id }, data: { title, description, epicContent } });

      // Ahora ejecutar la generación inicial de IA similar a startConversation but for existing id
      // Reuse the workflow service but we need a method that seeds the AI on an existing analysis
      if ((conversationalWorkflowService as any).startConversationOnExisting) {
        const result = await conversationalWorkflowService.startConversationOnExisting(id, userId);
        // result may be { analysis, alreadyStarted }
        if ((result as any).analysis) {
          const { analysis, alreadyStarted } = result as any;
          return res.status(200).json({ success: true, data: { project: analysis, alreadyStarted: !!alreadyStarted } });
        }
        // fallback to old behaviour if service returned plain entity
        return res.status(200).json({ success: true, data: { project: result } });
      }

      // Fallback simple: call process to generate a welcome message using OpenAI prompt flow
      // For now, reuse startConversation by creating a minor wrapper: call startConversation with same params
      const analysisCreated = await conversationalWorkflowService.startConversation(userId, title, description, epicContent);

      return res.status(200).json({ success: true, data: { project: analysisCreated } });

    } catch (error) {
      console.error('❌ START EXISTING PROJECT ERROR:', error);
      return res.status(500).json({ success: false, error: 'Error al iniciar IA en proyecto existente', details: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * GET /api/projects/in-progress
   * Obtener proyectos en progreso (ConversationalAnalysis con status IN_PROGRESS)
   */
  async getProjectsInProgress(req: AuthRequest, res: Response): Promise<Response> {
    try {
  // Getting projects in progress
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Usar ConversationalAnalysis como tabla principal de proyectos
      const projectsInProgress = await prisma.conversationalAnalysis.findMany({
        where: {
          userId: userId,
          status: {
            in: ['IN_PROGRESS']
          }
        },
        select: {
          id: true,
          title: true,
          description: true,
          epicContent: true,
          currentPhase: true,
          status: true,
          completeness: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: 20 // Limite para mejor performance
      });

      return res.status(200).json({
        status: 'success',
        data: projectsInProgress.map(project => ({
          id: project.id,
          title: project.title,
          description: project.description,
          status: project.status,
          phase: project.currentPhase,
          progress: project.completeness,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        }))
      });

    } catch (error) {
  console.error('GET PROJECTS ERROR:', error);
      return res.status(500).json({
        error: 'Error al obtener proyectos en progreso',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * GET /api/projects/completed
   * Obtener proyectos completados
   */
  async getCompletedProjects(req: AuthRequest, res: Response): Promise<Response> {
    try {
  // Getting completed projects
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const completedProjects = await prisma.conversationalAnalysis.findMany({
        where: {
          userId: userId,
          status: 'COMPLETED'
        },
        select: {
          id: true,
          title: true,
          description: true,
          epicContent: true,
          currentPhase: true,
          status: true,
          completeness: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: 20
      });

      return res.status(200).json({
        success: true,
        data: {
          items: completedProjects.map(project => ({
            id: project.id,
            name: project.title, // Mapear title a name para compatibilidad con frontend
            title: project.title,
            description: project.description,
            // Include requirement (epicContent or description) so frontend can show it for completed projects
            requirement: project.epicContent || project.description || '',
            status: project.status,
            phase: project.currentPhase,
            progress: project.completeness,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt
          }))
        }
      });

    } catch (error) {
  console.error('GET COMPLETED ERROR:', error);
      return res.status(500).json({
        error: 'Error al obtener proyectos completados',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * GET /api/projects
   * Obtener todos los proyectos relevantes (en progreso y completados)
   * Respuesta: { success: true, data: { inProgress: [...], completed: [...] } }
   */
  async getAllProjects(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Fetch in-progress projects
      const inProgress = await prisma.conversationalAnalysis.findMany({
        where: { userId: userId, status: 'IN_PROGRESS' },
        select: {
          id: true,
          title: true,
          description: true,
          epicContent: true,
          currentPhase: true,
          status: true,
          completeness: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { updatedAt: 'desc' },
        take: 50
      });

      // Fetch completed projects
      const completed = await prisma.conversationalAnalysis.findMany({
        where: { userId: userId, status: 'COMPLETED' },
        select: {
          id: true,
          title: true,
          description: true,
          epicContent: true,
          currentPhase: true,
          status: true,
          completeness: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { updatedAt: 'desc' },
        take: 50
      });

      return res.status(200).json({
        success: true,
        data: {
          inProgress: inProgress.map(p => ({
            id: p.id,
            title: p.title,
            description: p.description,
            status: p.status,
            phase: p.currentPhase,
            progress: p.completeness,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt
          })),
          completed: completed.map(p => ({
            id: p.id,
            name: p.title,
            title: p.title,
            description: p.description,
            requirement: p.epicContent || p.description || '',
            status: p.status,
            phase: p.currentPhase,
            progress: p.completeness,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt
          }))
        }
      });
    } catch (error) {
      console.error('GET ALL PROJECTS ERROR:', error);
      return res.status(500).json({ error: 'Error al obtener proyectos', details: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * GET /api/projects/:id/status
   * Obtener status de un proyecto específico
   */
  async getProjectStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const project = await prisma.conversationalAnalysis.findFirst({
        where: {
          id: id,
          userId: userId
        },
        select: {
          id: true,
          title: true,
          description: true,
          currentPhase: true,
          status: true,
          completeness: true,
          epicContent: true, // Incluir el análisis para proyectos completados
          createdAt: true,
          updatedAt: true
        }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Debug: log message counts to help diagnose duplicate display issues
      try {
        const msgs = (project as any).messages || [];
        console.log(`ℹ️ GET /api/projects/${project.id}/status - messages returned: ${Array.isArray(msgs) ? msgs.length : 'unknown'}`);
      } catch (e) {
        // ignore
      }

      return res.status(200).json({
        status: 'success',
        data: {
          id: project.id,
          title: project.title,
          description: project.description,
          status: project.status,
          phase: project.currentPhase,
          progress: project.completeness,
          analysis: project.epicContent || '', // Incluir el análisis final
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          // Include messages only if present (frontend reads via conversationalWorkflowService when needed)
          messages: (project as any).messages || []
        }
      });

    } catch (error) {
  console.error('GET PROJECT STATUS ERROR:', error);
      return res.status(500).json({
        error: 'Error al obtener status del proyecto',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * GET /api/projects/:id/messages
   * Obtener historial de mensajes del chat del proyecto
   */
  async getMessages(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Verificar que el proyecto existe y pertenece al usuario
      const project = await prisma.conversationalAnalysis.findFirst({
        where: {
          id: id,
          userId: userId
        }
      });

      if (!project) {
        return res.status(404).json({ error: 'Proyecto no encontrado' });
      }

      // Obtener análisis con mensajes usando el servicio conversacional
      const analysis = await conversationalWorkflowService.getAnalysisById(id);
      
      if (!analysis) {
        return res.status(404).json({ error: 'Análisis no encontrado' });
      }
      
      // Obtener mensajes desde la base de datos
      const messages = await conversationalDatabaseService.getMessagesForAnalysis(id);
      
      return res.status(200).json({
        status: 'success',
        data: {
          messages: messages || [],
          projectInfo: {
            id: analysis.id,
            title: analysis.title,
            status: analysis.status,
            completeness: analysis.completeness,
            currentPhase: analysis.currentPhase,
            description: analysis.description
          }
        }
      });

    } catch (error) {
      console.error('GET MESSAGES ERROR:', error);
      return res.status(500).json({
        error: 'Error al obtener mensajes',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * POST /api/projects/:id/chat
   * Enviar mensaje al chat del proyecto
   */
  async sendMessage(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const validationResult = sendMessageSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: validationResult.error.errors
        });
      }

      // Normalizar payload: soportar legacy { content } y nuevo { instruction, requirement }
      let content: string;
      const parsed = validationResult.data as any;
      if (parsed.content) {
        content = parsed.content;
      } else {
        // Build a concatenated content so existing processing logic continues to work
        content = parsed.instruction;
        if (parsed.requirement) {
          content += `\n\n---\nRequerimiento editado:\n${parsed.requirement}`;
        }
      }

      // Procesar mensaje con el servicio conversacional
      const response = await conversationalWorkflowService.processUserMessage(id, content);

      return res.status(200).json({
        status: 'success',
        data: {
          message: response,
          timestamp: new Date().toISOString(),
          projectId: id
        }
      });

    } catch (error) {
  console.error('SEND MESSAGE ERROR:', error);
      return res.status(500).json({
        error: 'Error al procesar mensaje',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * DELETE /api/projects/:id
   * Eliminar proyecto
   */
  async deleteProject(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Verificar que el proyecto existe y pertenece al usuario
      const project = await prisma.conversationalAnalysis.findFirst({
        where: {
          id: id,
          userId: userId
        }
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Eliminar el proyecto
      await prisma.conversationalAnalysis.delete({
        where: {
          id: id
        }
      });

      return res.status(200).json({
        status: 'success',
        message: 'Proyecto eliminado exitosamente'
      });

    } catch (error) {
  console.error('DELETE PROJECT ERROR:', error);
      return res.status(500).json({
        error: 'Error al eliminar proyecto',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * POST /api/projects/:id/complete
   * Completar proyecto - Guarda último mensaje IA como análisis y limpia historial
   */
  async completeProject(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Obtener el proyecto y sus mensajes
      const project = await prisma.conversationalAnalysis.findFirst({
        where: {
          id: id,
          userId: userId
        },
        include: {
          messages: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 1,
            where: {
              role: 'ASSISTANT'
            }
          }
        }
      });

      if (!project) {
        return res.status(404).json({ error: 'Proyecto no encontrado' });
      }

      // Buscar el levantamiento final usando marcadores o fallback al último mensaje
      let finalAnalysis = '';
      
      // Obtener todos los mensajes de la IA (no solo el último)
      const aiMessages = await prisma.conversationalMessage.findMany({
        where: {
          analysisId: id,
          role: 'ASSISTANT'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Buscar mensaje con marcadores de levantamiento
      const messageWithMarkers = aiMessages.find(msg => 
        msg.content.includes('=== LEVANTAMIENTO DE REQUISITOS FINAL ===') &&
        msg.content.includes('=== FIN LEVANTAMIENTO ===')
      );
      
      if (messageWithMarkers) {
        // Extraer contenido entre marcadores
        const startMarker = '=== LEVANTAMIENTO DE REQUISITOS FINAL ===';
        const endMarker = '=== FIN LEVANTAMIENTO ===';
        const startIndex = messageWithMarkers.content.indexOf(startMarker) + startMarker.length;
        const endIndex = messageWithMarkers.content.indexOf(endMarker);
        
        if (startIndex > 0 && endIndex > startIndex) {
          finalAnalysis = messageWithMarkers.content.substring(startIndex, endIndex).trim();
        } else {
          // Si los marcadores no están bien formados, usar el mensaje completo
          finalAnalysis = messageWithMarkers.content;
        }
        
        console.log('✅ Levantamiento extraído usando marcadores');
      } else {
        // Fallback: usar el último mensaje de la IA
        const lastAIMessage = aiMessages[0];
        if (lastAIMessage && lastAIMessage.content) {
          finalAnalysis = lastAIMessage.content;
          console.log('⚠️ Fallback: usando último mensaje de IA (sin marcadores)');
        } else {
          // Si no hay mensaje de IA, usar la descripción del proyecto como fallback
          finalAnalysis = project.description || 'Análisis completado sin conversación específica.';
          console.log('⚠️ Fallback: usando descripción del proyecto');
        }
      }

      // Transacción para actualizar proyecto y limpiar mensajes
      const updatedProject = await prisma.$transaction(async (tx) => {
        // 1. Limpiar todo el historial de mensajes (ya tenemos el análisis final)
        await tx.conversationalMessage.deleteMany({
          where: {
            analysisId: id
          }
        });

        // 2. Actualizar el proyecto con el análisis final
        const updated = await tx.conversationalAnalysis.update({
          where: {
            id: id,
            userId: userId
          },
          data: {
            status: 'COMPLETED',
            completeness: 100,
            currentPhase: 'COMPLETED',
            // Guardar el análisis final en el campo epicContent o crear nuevo campo
            epicContent: finalAnalysis,
            updatedAt: new Date()
          }
        });

        return updated;
      });

      return res.status(200).json({
        status: 'success',
        data: {
          id: updatedProject.id,
          title: updatedProject.title,
          status: updatedProject.status,
          completeness: updatedProject.completeness,
          finalAnalysis: finalAnalysis
        }
      });

    } catch (error) {
      console.error('COMPLETE PROJECT ERROR:', error);
      return res.status(500).json({
        error: 'Error al completar proyecto',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * PUT /api/projects/:id/analysis
   * Actualizar el análisis del proyecto (edición manual)
   */
  async updateAnalysis(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { analysis } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!analysis || typeof analysis !== 'string') {
        return res.status(400).json({ error: 'El análisis es requerido' });
      }

      // Verificar que el proyecto existe y pertenece al usuario
      const project = await prisma.conversationalAnalysis.findFirst({
        where: {
          id: id,
          userId: userId
        }
      });

      if (!project) {
        return res.status(404).json({ error: 'Proyecto no encontrado' });
      }

      // Actualizar el análisis
      const updatedProject = await prisma.conversationalAnalysis.update({
        where: {
          id: id,
          userId: userId
        },
        data: {
          epicContent: analysis.trim(),
          updatedAt: new Date()
        }
      });

      return res.status(200).json({
        status: 'success',
        data: {
          id: updatedProject.id,
          title: updatedProject.title,
          analysis: updatedProject.epicContent
        }
      });

    } catch (error) {
      console.error('UPDATE ANALYSIS ERROR:', error);
      return res.status(500).json({
        error: 'Error al actualizar análisis',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * POST /api/projects/:id/restart-chat
   * Reiniciar chat con análisis editado (nuevo análisis desde IA)
   */
  async restartChatWithAnalysis(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { analysis } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!analysis || typeof analysis !== 'string') {
        return res.status(400).json({ error: 'El análisis es requerido' });
      }

      // Verificar que el proyecto existe
      const project = await prisma.conversationalAnalysis.findFirst({
        where: {
          id: id,
          userId: userId
        }
      });

      if (!project) {
        return res.status(404).json({ error: 'Proyecto no encontrado' });
      }

      // Transacción para limpiar mensajes y crear nuevo análisis inicial
      await prisma.$transaction(async (tx) => {
        // 1. Eliminar todos los mensajes previos
        await tx.conversationalMessage.deleteMany({
          where: {
            analysisId: id
          }
        });

        // 2. Limpiar epicContent anterior y cambiar estado a EN_PROGRESO
        await tx.conversationalAnalysis.update({
          where: {
            id: id,
            userId: userId
          },
          data: {
            status: 'IN_PROGRESS',
            currentPhase: 'ANALYSIS',
            completeness: 50.0,
            epicContent: '', // Limpiar análisis anterior para evitar duplicados
            updatedAt: new Date()
          }
        });

        // 3. Crear mensaje inicial del usuario con el análisis editado
        await tx.conversationalMessage.create({
          data: {
            content: analysis.trim(), // Solo el contenido del análisis, el prompt ya viene del frontend
            role: 'USER',
            messageType: 'QUESTION',
            analysisId: id
          }
        });

      });

      // 4. Procesar automáticamente el mensaje del usuario para obtener respuesta de la IA
      try {
        const aiResponse = await conversationalWorkflowService.processUserMessage(id, analysis.trim());
        
        return res.status(200).json({
          status: 'success',
          data: {
            id: id,
            message: 'Chat reiniciado y IA procesando',
            aiResponse: aiResponse.aiResponse,
            readyForAI: true
          }
        });
      } catch (aiError) {
        console.error('Error procesando respuesta IA:', aiError);
        
        // Si falla la IA, al menos devolver éxito del reinicio
        return res.status(200).json({
          status: 'success',
          data: {
            id: id,
            message: 'Chat reiniciado, pero error procesando IA',
            readyForAI: true
          }
        });
      }

    } catch (error) {
      console.error('RESTART CHAT ERROR:', error);
      return res.status(500).json({
        error: 'Error al reiniciar chat',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

// Exportar instancia del controlador unificado
export const projectsController = new ProjectsController();
