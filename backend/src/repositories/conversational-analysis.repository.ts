// @ts-nocheck
import { 
  ConversationalAnalysis, 
  ConversationalMessage,
  Prisma,
  ConversationalStatus,
  MessageRole,
  MessageType,
  QuestionCategory
} from '@prisma/client';
import { BaseRepository } from './base.repository';

/**
 * Tipos para el repositorio conversacional
 */
export interface ConversationalAnalysisWithRelations extends ConversationalAnalysis {
  messages?: ConversationalMessage[];
  user?: { id: string; name: string; email: string };
}

export interface CreateConversationalAnalysisInput {
  title: string;
  description: string;
  epicContent: string;
  userId: string;
  projectId?: string;
  currentPhase?: string;
  status?: ConversationalStatus;
}

export interface UpdateConversationalAnalysisInput {
  title?: string;
  description?: string;
  epicContent?: string;
  currentPhase?: string;
  status?: ConversationalStatus;
  completeness?: number;
}

export interface ConversationalAnalysisFilters {
  userId?: string;
  status?: ConversationalStatus;
  currentPhase?: string;
  completenessRange?: { min: number; max: number };
  dateRange?: { from: Date; to: Date };
  searchTerm?: string;
}

/**
 * Repository especializado para análisis conversacional
 * Implementa Domain-Driven Design y Clean Architecture
 */
export class ConversationalAnalysisRepository extends BaseRepository<
  ConversationalAnalysisWithRelations,
  CreateConversationalAnalysisInput,
  UpdateConversationalAnalysisInput,
  ConversationalAnalysisFilters
> {
  protected readonly model = 'conversationalAnalysis';

  /**
   * Encuentra análisis con todas sus relaciones
   */
  async findByIdWithRelations(id: string): Promise<ConversationalAnalysisWithRelations | null> {
    try {
      return await this.prisma.conversationalAnalysis.findUnique({
        where: { id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    } catch (error) {
      this.handleDatabaseError(error, 'findByIdWithRelations');
      return null;
    }
  }

  /**
   * Búsqueda avanzada con filtros empresariales
   */
  async findWithAdvancedFilters(
    filters: ConversationalAnalysisFilters,
    pagination: { skip: number; take: number },
    orderBy: Prisma.ConversationalAnalysisOrderByWithRelationInput = { updatedAt: 'desc' }
  ): Promise<{ data: ConversationalAnalysisWithRelations[]; total: number; hasMore: boolean }> {
    try {
      const where: Prisma.ConversationalAnalysisWhereInput = this.buildWhereClause(filters);

      const [data, total] = await Promise.all([
        this.prisma.conversationalAnalysis.findMany({
          where,
          include: {
            messages: {
              take: 3, // Solo los últimos 3 mensajes para overview
              orderBy: { createdAt: 'desc' },
            },
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy,
          skip: pagination.skip,
          take: pagination.take,
        }),
        this.prisma.conversationalAnalysis.count({ where }),
      ]);

      return {
        data,
        total,
        hasMore: pagination.skip + pagination.take < total,
      };
    } catch (error) {
      this.handleDatabaseError(error, 'findWithAdvancedFilters');
      throw error;
    }
  }

  /**
   * Agrega mensaje con validación de contexto
   */
  async addMessage(
    analysisId: string,
    messageData: {
      content: string;
      role: MessageRole;
      messageType?: MessageType;
      category?: QuestionCategory;
    }
  ): Promise<ConversationalMessage> {
    try {
      return await this.executeTransaction(async (tx) => {
        // Verificar que el análisis existe y está activo
        const analysis = await tx.conversationalAnalysis.findUnique({
          where: { id: analysisId },
        });

        if (!analysis) {
          throw new Error(`ConversationalAnalysis with id ${analysisId} not found`);
        }

        if (analysis.status === ConversationalStatus.ARCHIVED) {
          throw new Error('Cannot add messages to archived analysis');
        }

        // Crear el mensaje
        const message = await tx.conversationalMessage.create({
          data: {
            ...messageData,
            analysisId,
          },
        });

        // Actualizar la marca de tiempo del análisis
        await tx.conversationalAnalysis.update({
          where: { id: analysisId },
          data: { updatedAt: new Date() },
        });

        return message;
      });
    } catch (error) {
      this.handleDatabaseError(error, 'addMessage');
      throw error;
    }
  }

  /**
   * Actualiza el progreso del análisis
   */
  async updateProgress(
    id: string,
    updates: {
      currentPhase?: string;
      completeness?: number;
      status?: ConversationalStatus;
    }
  ): Promise<ConversationalAnalysis> {
    try {
      return await this.executeTransaction(async (tx) => {
        const analysis = await tx.conversationalAnalysis.findUnique({
          where: { id },
        });

        if (!analysis) {
          throw new Error(`ConversationalAnalysis with id ${id} not found`);
        }

        // Validar el rango de completeness
        if (updates.completeness !== undefined && 
            (updates.completeness < 0 || updates.completeness > 100)) {
          throw new Error('Completeness must be between 0 and 100');
        }

        return await tx.conversationalAnalysis.update({
          where: { id },
          data: {
            ...updates,
            updatedAt: new Date(),
          },
        });
      });
    } catch (error) {
      this.handleDatabaseError(error, 'updateProgress');
      throw error;
    }
  }

  /**
   * Archiva análisis con cleanup de datos
   */
  async archiveAnalysis(id: string): Promise<boolean> {
    try {
      await this.executeTransaction(async (tx) => {
        // Cambiar estado a archivado
        await tx.conversationalAnalysis.update({
          where: { id },
          data: {
            status: ConversationalStatus.ARCHIVED,
            updatedAt: new Date(),
          },
        });
      });

      return true;
    } catch (error) {
      this.handleDatabaseError(error, 'archiveAnalysis');
      return false;
    }
  }

  /**
   * Obtiene estadísticas del análisis
   */
  async getAnalysisStats(analysisId: string): Promise<{
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    categoryCounts: Record<string, number>;
    lastActivity: Date | null;
  }> {
    try {
      const [messages, lastMessage] = await Promise.all([
        this.prisma.conversationalMessage.findMany({
          where: { analysisId },
          select: { role: true, category: true },
        }),
        this.prisma.conversationalMessage.findFirst({
          where: { analysisId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
      ]);

      const userMessages = messages.filter(m => m.role === MessageRole.USER).length;
      const assistantMessages = messages.filter(m => m.role === MessageRole.ASSISTANT).length;
      
      const categoryCounts: Record<string, number> = {};
      messages.forEach(message => {
        if (message.category) {
          categoryCounts[message.category] = (categoryCounts[message.category] || 0) + 1;
        }
      });

      return {
        totalMessages: messages.length,
        userMessages,
        assistantMessages,
        categoryCounts,
        lastActivity: lastMessage?.createdAt || null,
      };
    } catch (error) {
      this.handleDatabaseError(error, 'getAnalysisStats');
      throw error;
    }
  }

  /**
   * Construye cláusulas WHERE complejas
   */
  private buildWhereClause(filters: ConversationalAnalysisFilters): Prisma.ConversationalAnalysisWhereInput {
    const where: Prisma.ConversationalAnalysisWhereInput = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    // Note: projectId field not available in ConversationalAnalysis model
    // if (filters.projectId) {
    //   where.projectId = filters.projectId;
    // }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.completenessRange) {
      where.completeness = {
        gte: filters.completenessRange.min,
        lte: filters.completenessRange.max,
      };
    }

    if (filters.dateRange) {
      where.createdAt = {
        gte: filters.dateRange.from,
        lte: filters.dateRange.to,
      };
    }

    if (filters.searchTerm) {
      where.OR = [
        { title: { contains: filters.searchTerm, mode: 'insensitive' } },
        { description: { contains: filters.searchTerm, mode: 'insensitive' } },
        { epicContent: { contains: filters.searchTerm, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  /**
   * Limpieza periódica de datos antiguos
   */
  async cleanupOldData(daysToKeep: number = 90): Promise<{
    deletedAnalyses: number;
    deletedMessages: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      return await this.executeTransaction(async (tx) => {
        // Encontrar análisis antiguos archivados
        const oldAnalyses = await tx.conversationalAnalysis.findMany({
          where: {
            status: ConversationalStatus.ARCHIVED,
            updatedAt: { lt: cutoffDate },
          },
          select: { id: true },
        });

        const analysisIds = oldAnalyses.map(a => a.id);

        // Eliminar mensajes asociados
        const deletedMessages = await tx.conversationalMessage.deleteMany({
          where: { analysisId: { in: analysisIds } },
        });

        // Eliminar análisis
        const deletedAnalyses = await tx.conversationalAnalysis.deleteMany({
          where: { id: { in: analysisIds } },
        });

        return {
          deletedAnalyses: deletedAnalyses.count,
          deletedMessages: deletedMessages.count,
        };
      });
    } catch (error) {
      this.handleDatabaseError(error, 'cleanupOldData');
      throw error;
    }
  }
}
