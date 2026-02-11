// @ts-nocheck
// 🚀 SERVICIO DE PERSISTENCIA SIMPLIFICADO PARA SUPABASE
// ======================================================
import { prisma } from '../lib/prisma';
import { StructuredLogger } from '../utils/structured-logger';
import { 
  ConversationalAnalysis, 
  ConversationalMessage, 
  MessageRole,
  MessageType,
  QuestionCategory 
} from '@prisma/client';

export class ConversationalPersistenceService {
  
  // ===============================================
  // 📊 OPERACIONES DE ANÁLISIS CONVERSACIONAL
  // ===============================================

  /**
   * Crear nuevo análisis conversacional
   */
  static async createAnalysis(data: {
    title: string;
    description: string;
    epicContent: string;
    userId: string;
  }): Promise<ConversationalAnalysis> {
    try {
      const analysis = await prisma.conversationalAnalysis.create({
        data: {
          title: data.title,
          description: data.description,
          epicContent: data.epicContent,
          userId: data.userId,
          currentPhase: 'ANALYSIS',
          status: 'IN_PROGRESS',
          completeness: 0.0,
          startedAt: new Date(),
        }
      });

      StructuredLogger.info('Análisis conversacional creado', {
        analysisId: analysis.id,
        title: analysis.title,
        userId: analysis.userId
      } as any);

      return analysis;
    } catch (error) {
      StructuredLogger.error('Error creando análisis conversacional:', error as Error);
      throw error;
    }
  }

  /**
   * Obtener análisis por ID
   */
  static async getAnalysisById(id: string, userId: string): Promise<ConversationalAnalysis | null> {
    try {
      return await prisma.conversationalAnalysis.findFirst({
        where: { id, userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 50 // Últimos 50 mensajes
          },
          testCases: {
            orderBy: { createdAt: 'desc' },
            take: 20
          },
          analysisSummit: true
        }
      });
    } catch (error) {
      StructuredLogger.error('Error obteniendo análisis:', error as Error);
      throw error;
    }
  }

  /**
   * Actualizar análisis
   */
  static async updateAnalysis(
    id: string, 
    updates: Partial<ConversationalAnalysis>
  ): Promise<ConversationalAnalysis> {
    try {
      const analysis = await prisma.conversationalAnalysis.update({
        where: { id },
        data: {
          ...updates,
          updatedAt: new Date(),
        }
      });

      StructuredLogger.info('Análisis actualizado', {
        analysisId: id,
        updates: Object.keys(updates)
      } as any);

      return analysis;
    } catch (error) {
      StructuredLogger.error('Error actualizando análisis:', error as Error);
      throw error;
    }
  }

  // ===============================================
  // 💬 OPERACIONES DE MENSAJES
  // ===============================================

  /**
   * Agregar mensaje al análisis
   */
  static async addMessage(data: {
    analysisId: string;
    content: string;
    role: MessageRole;
    messageType?: MessageType;
    category?: QuestionCategory;
    tokenCount?: number;
    confidence?: number;
  }): Promise<ConversationalMessage> {
    try {
      const message = await prisma.conversationalMessage.create({
        data: {
          analysisId: data.analysisId,
          content: data.content,
          role: data.role,
          messageType: data.messageType || 'QUESTION',
          category: data.category,
          isImportant: data.confidence ? data.confidence > 0.8 : false,
        }
      });

      // Actualizar contador de mensajes en el análisis
      await this.updateMessageCount(data.analysisId);

      return message;
    } catch (error) {
      StructuredLogger.error('Error agregando mensaje:', error as Error);
      throw error;
    }
  }

  /**
   * Obtener mensajes de un análisis
   */
  static async getMessages(
    analysisId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<ConversationalMessage[]> {
    try {
      return await prisma.conversationalMessage.findMany({
        where: { analysisId },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset
      });
    } catch (error) {
      StructuredLogger.error('Error obteniendo mensajes:', error as Error);
      throw error;
    }
  }

  // ===============================================
  // 📊 OPERACIONES DE ESTADÍSTICAS
  // ===============================================

  /**
   * Obtener estadísticas de un usuario
   */
  static async getUserStats(userId: string) {
    try {
      const [
        totalAnalyses,
        completedAnalyses,
        totalMessages,
        totalTestCases
      ] = await Promise.all([
        prisma.conversationalAnalysis.count({ where: { userId } }),
        prisma.conversationalAnalysis.count({ 
          where: { userId, status: 'COMPLETED' } 
        }),
        prisma.conversationalMessage.count({
          where: { analysis: { userId } }
        }),
        prisma.testCase.count({ where: { userId } })
      ]);

      return {
        totalAnalyses,
        completedAnalyses,
        totalMessages,
        totalTestCases,
        completionRate: totalAnalyses > 0 ? (completedAnalyses / totalAnalyses) * 100 : 0
      };
    } catch (error) {
      StructuredLogger.error('Error obteniendo estadísticas de usuario:', error as Error);
      throw error;
    }
  }

  /**
   * Health check del servicio
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    database: boolean;
    details: any;
  }> {
    try {
      // Test simple de conexión
      await prisma.$queryRaw`SELECT 1`;
      
      // Obtener estadísticas básicas
      const [userCount, analysisCount, messageCount] = await Promise.all([
        prisma.user.count(),
        prisma.conversationalAnalysis.count(),
        prisma.conversationalMessage.count()
      ]);

      return {
        status: 'healthy',
        database: true,
        details: {
          users: userCount,
          analyses: analysisCount,
          messages: messageCount,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      StructuredLogger.error('Health check failed:', error as Error);
      return {
        status: 'unhealthy',
        database: false,
        details: {
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  // ===============================================
  // 🛠️ MÉTODOS PRIVADOS UTILITARIOS
  // ===============================================

  /**
   * Actualizar contador de mensajes en análisis
   */
  private static async updateMessageCount(analysisId: string): Promise<void> {
    try {
      const messageCount = await prisma.conversationalMessage.count({
        where: { analysisId }
      });

      await prisma.conversationalAnalysis.update({
        where: { id: analysisId },
        data: { 
          updatedAt: new Date(),
          // Calcular progreso basado en número de mensajes
          completeness: Math.min(messageCount / 20, 1.0) // 20 mensajes = 100%
        }
      });
    } catch (error) {
      StructuredLogger.warn('Error actualizando contador de mensajes:', {
        error: (error as Error).message,
        analysisId
      } as any);
    }
  }

  // ===============================================
  // 🧹 OPERACIONES DE LIMPIEZA
  // ===============================================

  /**
   * Limpiar análisis antiguos (más de 90 días)
   */
  static async cleanupOldAnalyses(): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const result = await prisma.conversationalAnalysis.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
          status: 'COMPLETED'
        }
      });

      StructuredLogger.info('Análisis antiguos limpiados', {
        deletedCount: result.count,
        cutoffDate: cutoffDate.toISOString()
      } as any);

      return result.count;
    } catch (error) {
      StructuredLogger.error('Error en limpieza de análisis:', error as Error);
      throw error;
    }
  }
}

export default ConversationalPersistenceService;