import { PrismaClient } from '@prisma/client';
import { 
  ConversationalAnalysisEntity, 
  ConversationalPhase, 
  ConversationalStatus,
  MessageRole,
  MessageType,
  QuestionCategory
} from '../../types/conversational.types';

const prisma = new PrismaClient();

// Importar el enum de forma dinámica desde el cliente
const { QuestionCategory: PrismaQuestionCategory } = require('@prisma/client');

// Mapeo de enums TypeScript a enums de Prisma
const categoryToPrismaMap: Record<QuestionCategory, string> = {
  [QuestionCategory.FUNCTIONAL_REQUIREMENTS]: PrismaQuestionCategory.FUNCTIONAL_REQUIREMENTS,
  [QuestionCategory.NON_FUNCTIONAL_REQUIREMENTS]: PrismaQuestionCategory.NON_FUNCTIONAL_REQUIREMENTS,
  [QuestionCategory.BUSINESS_RULES]: PrismaQuestionCategory.BUSINESS_RULES,
  [QuestionCategory.USER_INTERFACE]: PrismaQuestionCategory.USER_INTERFACE,
  [QuestionCategory.DATA_HANDLING]: PrismaQuestionCategory.DATA_HANDLING,
  [QuestionCategory.INTEGRATION]: PrismaQuestionCategory.INTEGRATION,
  [QuestionCategory.SECURITY]: PrismaQuestionCategory.SECURITY,
  [QuestionCategory.PERFORMANCE]: PrismaQuestionCategory.PERFORMANCE,
  [QuestionCategory.ERROR_HANDLING]: PrismaQuestionCategory.ERROR_HANDLING,
  [QuestionCategory.ACCEPTANCE_CRITERIA]: PrismaQuestionCategory.ACCEPTANCE_CRITERIA
};

export class ConversationalDatabaseService {

  /**
   * Crear nuevo análisis conversacional en la base de datos
   */
  async createAnalysis(data: {
    title: string;
    description: string;
    epicContent: string;
    projectId?: string;
    userId: string;
  }): Promise<ConversationalAnalysisEntity> {
    
    const analysis = await prisma.conversationalAnalysis.create({
      data: {
        title: data.title,
        description: data.description,
        epicContent: data.epicContent,
        userId: data.userId,
        status: 'IN_PROGRESS',
        completeness: 0.0
      },
      include: {
        messages: true,
        user: true
      }
    });

    return await this.mapToEntity(analysis);
  }

  /**
   * Obtener análisis por ID
   */
  async getAnalysisById(id: string): Promise<ConversationalAnalysisEntity | null> {
    const analysis = await prisma.conversationalAnalysis.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        user: true
      }
    });

    if (!analysis) return null;
    return await this.mapToEntity(analysis);
  }

  /**
   * Purge old messages for analyses that are COMPLETED.
   * For each completed analysis, keep only the last ASSISTANT message (if any) and optionally
   * keep the immediately previous USER message when keepLastUser is true.
   * If dryRun is true, only return counts and previews without deleting.
   */
  async purgeOldMessagesForCompletedAnalyses(options?: { dryRun?: boolean; keepLastUser?: boolean }) {
    const dryRun = !!options?.dryRun;
    const keepLastUser = !!options?.keepLastUser;

    // Find all analyses with status COMPLETED
    const completedAnalyses = await prisma.conversationalAnalysis.findMany({
      where: { status: 'COMPLETED' },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    const results: Array<{ analysisId: string; totalMessages: number; toDeleteCount: number; keptMessageIds: string[]; previewDeleteIds: string[] }> = [];

    for (const analysis of completedAnalyses) {
      const msgs: any[] = analysis.messages || [];
      const assistantIndices = msgs.map((m, idx) => ({ m, idx })).filter(x => (x.m.role || '').toLowerCase() === 'assistant');

      let keepIds = new Set<string>();

      if (assistantIndices.length > 0) {
        // Keep only the last assistant message
        const lastAssistant = assistantIndices[assistantIndices.length - 1];
        keepIds.add(lastAssistant.m.id);

        if (keepLastUser) {
          // Find the last USER message before that assistant
          for (let i = lastAssistant.idx - 1; i >= 0; i--) {
            const cand = msgs[i];
            if ((cand.role || '').toLowerCase() === 'user') {
              keepIds.add(cand.id);
              break;
            }
          }
        }
      } else {
        // No assistant messages; by default remove everything (keep none)
      }

      const allIds = msgs.map(m => m.id);
      const toDelete = allIds.filter(id => !keepIds.has(id));

      results.push({
        analysisId: analysis.id,
        totalMessages: allIds.length,
        toDeleteCount: toDelete.length,
        keptMessageIds: Array.from(keepIds.values()),
        previewDeleteIds: toDelete.slice(0, 5)
      });

      if (!dryRun && toDelete.length > 0) {
        // Delete messages in a transaction for safety
        try {
          await prisma.$transaction([
            prisma.conversationalMessage.deleteMany({ where: { id: { in: toDelete } } })
          ]);
        } catch (err) {
          console.error('Error deleting conversational messages for analysis', analysis.id, err);
        }
      }
    }

    return results;
  }

  /**
   * Purge messages for a single analysis (targeted).
   * If dryRun is true, returns summary without deleting. Options:
   *  - keepLastAssistant: keep the last assistant message if any
   *  - keepLastUser: keep the last user message preceding the last assistant (only if keepLastAssistant)
   */
  async purgeMessagesForAnalysis(analysisId: string, options?: { dryRun?: boolean; keepLastAssistant?: boolean; keepLastUser?: boolean }) {
    const dryRun = !!options?.dryRun;
    const keepLastAssistant = !!options?.keepLastAssistant;
    const keepLastUser = !!options?.keepLastUser;

    const analysis = await prisma.conversationalAnalysis.findUnique({
      where: { id: analysisId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    if (!analysis) {
      return { analysisId, totalMessages: 0, toDeleteCount: 0, keptMessageIds: [], previewDeleteIds: [], error: 'Analysis not found' };
    }

    const msgs: any[] = analysis.messages || [];
    const allIds = msgs.map(m => m.id);

    const keepIds = new Set<string>();

    if (keepLastAssistant) {
      // find last assistant
      for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i];
        if ((m.role || '').toString().toLowerCase() === 'assistant') {
          keepIds.add(m.id);
          if (keepLastUser) {
            // find previous user
            for (let j = i - 1; j >= 0; j--) {
              const prev = msgs[j];
              if ((prev.role || '').toString().toLowerCase() === 'user') {
                keepIds.add(prev.id);
                break;
              }
            }
          }
          break;
        }
      }
    }

    // If not keeping assistant and not keeping user, we'll delete everything
    const toDelete = allIds.filter(id => !keepIds.has(id));

    const result = {
      analysisId: analysis.id,
      totalMessages: allIds.length,
      toDeleteCount: toDelete.length,
      keptMessageIds: Array.from(keepIds.values()),
      previewDeleteIds: toDelete.slice(0, 10)
    };

    if (!dryRun && toDelete.length > 0) {
      try {
        await prisma.$transaction([
          prisma.conversationalMessage.deleteMany({ where: { id: { in: toDelete } } })
        ]);
      } catch (err) {
        console.error('Error deleting messages for analysis', analysis.id, err);
      }
    }

    return result;
  }

  /**
   * Marca el análisis como iniciado (startedAt) de forma atómica solo si aún no fue marcado.
   * Retorna { acquired: boolean, analysis: ConversationalAnalysisEntity }
   */
  async markAnalysisAsStartedIfNot(id: string): Promise<{ acquired: boolean; analysis: ConversationalAnalysisEntity | null }> {
    // Usar una transacción para intentar actualizar startedAt solo si es NULL
    try {
      const now = new Date();
      // Prisma no soporta un WHERE condicional en updateMany con returning en algunos drivers,
      // pero updateMany devuelve count; usaremos updateMany para setear si estaba NULL
      const updated = await prisma.conversationalAnalysis.updateMany({
        where: { id, startedAt: null },
        data: { startedAt: now }
      });

      if (updated.count && updated.count > 0) {
        // We acquired the start right
        const analysis = await this.getAnalysisById(id);
        return { acquired: true, analysis };
      }

      // Someone else already set startedAt; return existing
      const analysis = await this.getAnalysisById(id);
      return { acquired: false, analysis };
    } catch (error) {
      console.error('Error marking analysis as started atomically:', error);
      const analysis = await this.getAnalysisById(id);
      return { acquired: false, analysis };
    }
  }

  /**
   * Obtener todos los análisis de un usuario (OPTIMIZADO)
   * Versión paginada y sin cargar mensajes por defecto para mejor performance
   */
  async getUserAnalyses(userId: string, options?: {
    includeMessages?: boolean;
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<ConversationalAnalysisEntity[]> {
    const {
      includeMessages = false,
      limit = 50,
      offset = 0,
      status
    } = options || {};

    const where: any = { userId };
    if (status) where.status = status;

    const analyses = await prisma.conversationalAnalysis.findMany({
      where,
      include: includeMessages ? {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 10 // Limitar mensajes por análisis para performance
        }
      } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    return Promise.all(analyses.map(analysis => this.mapToEntity(analysis)));
  }

  /**
   * Obtener análisis de usuario con estadísticas optimizadas (sin mensajes)
   */
  async getUserAnalysesWithStats(userId: string): Promise<Array<ConversationalAnalysisEntity & { messageCount: number }>> {
    // Primera consulta: obtener análisis básicos
    const analyses = await prisma.conversationalAnalysis.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // Segunda consulta optimizada: contar mensajes por análisis
    const analysisIds = analyses.map(a => a.id);
    const messageCounts = await prisma.conversationalMessage.groupBy({
      by: ['analysisId'],
      where: { analysisId: { in: analysisIds } },
      _count: { id: true }
    });

    // Crear mapa de conteos para lookup O(1)
    const countMap = new Map(messageCounts.map(mc => [mc.analysisId, mc._count.id]));

    // Combinar datos
    const entities = await Promise.all(analyses.map(analysis => this.mapToEntity(analysis)));
    return entities.map((entity, index) => ({
      ...entity,
      messageCount: countMap.get(analyses[index].id) || 0
    }));
  }

  /**
   * Actualizar análisis
   */
  async updateAnalysis(id: string, updates: Partial<{
    status: ConversationalStatus;
    completeness: number;
    currentPhase: ConversationalPhase;
  }>): Promise<ConversationalAnalysisEntity> {
    const data: any = { updatedAt: new Date() };
    if (updates.status !== undefined) data.status = updates.status as any;
    if (updates.completeness !== undefined) data.completeness = updates.completeness;

    const updatedAnalysis = await prisma.conversationalAnalysis.update({
      where: { id },
      data,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        user: true
      }
    });

    return await this.mapToEntity(updatedAnalysis);
  }

  /**
   * Agregar mensaje a la conversación
   */
  async addMessage(analysisId: string, message: {
    content: string;
    role: MessageRole;
    messageType: MessageType;
    category?: QuestionCategory;
  }): Promise<void> {
    
    // Mapear la categoría si existe
    const prismaCategory = message.category ? categoryToPrismaMap[message.category] : undefined;
    
    console.log('🔍 DEBUG - Original category:', message.category);
    console.log('🔍 DEBUG - Mapped category:', prismaCategory);
    console.log('🔍 DEBUG - Available mappings:', Object.keys(categoryToPrismaMap));
    // Avoid inserting exact duplicate assistant messages that already exist for this analysis.
    try {
      const duplicate = await prisma.conversationalMessage.findFirst({
        where: {
          analysisId,
          role: message.role,
          content: message.content
        }
      });

      if (duplicate) {
        console.log('⚠️ Skipping duplicate conversational message insert for analysis', analysisId, { role: message.role, preview: (message.content || '').toString().substring(0, 160) });
        return;
      }

      // Log create attempt (preview only to avoid leaking long contents in logs)
      console.log('✨ Creating conversational message', { analysisId, role: message.role, preview: (message.content || '').toString().substring(0, 160) });

      await prisma.conversationalMessage.create({
        data: {
          content: message.content,
          role: message.role,
          messageType: message.messageType,
          category: prismaCategory,
          analysisId: analysisId
        }
      });
    } catch (err) {
      console.error('Error adding message to DB, falling back to create attempt:', err);
      // Best-effort create - if the duplicate check failed for some reason, try to create anyway
      await prisma.conversationalMessage.create({
        data: {
          content: message.content,
          role: message.role,
          messageType: message.messageType,
          category: prismaCategory,
          analysisId: analysisId
        }
      });
    }
  }

  /**
   * Obtener mensajes de un análisis específico
   */
  async getMessagesForAnalysis(analysisId: string): Promise<Array<{
    id: string;
    content: string;
    role: string;
    messageType: string;
    category?: string;
    createdAt: Date;
  }>> {
    try {
      const messages = await prisma.conversationalMessage.findMany({
        where: { 
          analysisId: analysisId 
        },
        orderBy: { 
          createdAt: 'asc' 
        },
        select: {
          id: true,
          content: true,
          role: true,
          messageType: true,
          category: true,
          createdAt: true
        }
      });

      return messages.map(msg => ({
        ...msg,
        role: msg.role as string,
        messageType: msg.messageType as string,
        category: msg.category as string | undefined
      }));
    } catch (error) {
      console.error('Error getting messages for analysis:', error);
      return [];
    }
  }

  /**
   * Marcar análisis como completado
   */
  async completeAnalysis(id: string): Promise<ConversationalAnalysisEntity> {
    const completedAnalysis = await prisma.conversationalAnalysis.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completeness: 100.0,
        updatedAt: new Date()
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        user: true
      }
    });

    return await this.mapToEntity(completedAnalysis);
  }

  /**
   * Crear resumen final (summit) del análisis
   */
  async createAnalysisSummit(analysisId: string, summitData: {
    refinedRequirements: any;
    functionalAspects: any;
    nonFunctionalAspects: any;
    identifiedRisks: any;
    businessRules: any;
    acceptanceCriteria: any;
    suggestedTestCases: any;
    completenessScore: number;
  }): Promise<void> {
    
  await (prisma as any).analysisSummit.create({
      data: {
        conversationalAnalysisId: analysisId,
        refinedRequirements: summitData.refinedRequirements,
        functionalAspects: summitData.functionalAspects,
        nonFunctionalAspects: summitData.nonFunctionalAspects,
        identifiedRisks: summitData.identifiedRisks,
        businessRules: summitData.businessRules,
        acceptanceCriteria: summitData.acceptanceCriteria,
        suggestedTestCases: summitData.suggestedTestCases,
        completenessScore: summitData.completenessScore
      }
    });
  }

  /**
   * Obtener analysisSummit por analysisId
   */
  async getAnalysisSummit(analysisId: string) {
    const summit = await (prisma as any).analysisSummit.findFirst({
      where: { conversationalAnalysisId: analysisId }
    });
    return summit || null;
  }

  /**
   * Actualizar analysisSummit existente
   */
  async updateAnalysisSummit(analysisId: string, summitData: Partial<{
    refinedRequirements: any;
    functionalAspects: any;
    nonFunctionalAspects: any;
    identifiedRisks: any;
    businessRules: any;
    acceptanceCriteria: any;
    suggestedTestCases: any;
    completenessScore: number;
  }>) {
    const existing = await (prisma as any).analysisSummit.findFirst({ where: { conversationalAnalysisId: analysisId } });
    if (!existing) throw new Error('AnalysisSummit not found');
    const updated = await (prisma as any).analysisSummit.update({
      where: { id: existing.id },
      data: {
        refinedRequirements: summitData.refinedRequirements ?? existing.refinedRequirements,
        functionalAspects: summitData.functionalAspects ?? existing.functionalAspects,
        nonFunctionalAspects: summitData.nonFunctionalAspects ?? existing.nonFunctionalAspects,
        identifiedRisks: summitData.identifiedRisks ?? existing.identifiedRisks,
        businessRules: summitData.businessRules ?? existing.businessRules,
        acceptanceCriteria: summitData.acceptanceCriteria ?? existing.acceptanceCriteria,
        suggestedTestCases: summitData.suggestedTestCases ?? existing.suggestedTestCases,
        completenessScore: summitData.completenessScore ?? existing.completenessScore,
        updatedAt: new Date()
      }
    });

    return updated;
  }

  /**
   * Mapear de Prisma model a entidad de dominio (OPTIMIZADO)
   */
  private async mapToEntity(prismaAnalysis: any): Promise<ConversationalAnalysisEntity> {
    // Calcular cobertura de forma optimizada si no tenemos mensajes cargados
    let coverage;
    if (prismaAnalysis.messages) {
      // Si tenemos mensajes cargados, usar cálculo legacy para compatibilidad
      coverage = {
        overallScore: prismaAnalysis.completeness,
        functionalCoverage: this.calculateCoverageLegacy(prismaAnalysis.messages, 'FUNCTIONAL'),
        nonFunctionalCoverage: this.calculateCoverageLegacy(prismaAnalysis.messages, 'NON_FUNCTIONAL'),
        businessRulesCoverage: this.calculateCoverageLegacy(prismaAnalysis.messages, 'BUSINESS_LOGIC'),
        acceptanceCriteriaCoverage: this.calculateCoverageLegacy(prismaAnalysis.messages, 'ACCEPTANCE_CRITERIA')
      };
    } else {
      // Usar cálculo optimizado basado en SQL
      coverage = await this.calculateAnalysisCoverage(prismaAnalysis.id);
    }

    // Defensive read-side deduplication solo si tenemos mensajes
    let messagesForEntity: any[] = [];
    if (prismaAnalysis.messages) {
      const rawMessages: any[] = prismaAnalysis.messages || [];
      const dedupMap = new Map<string, any>();
      rawMessages.forEach(msg => {
        const key = `${(msg.role || '').toString()}|${(msg.content || '').toString().trim()}`;
        const existing = dedupMap.get(key);
        if (!existing) {
          dedupMap.set(key, msg);
        } else {
          // Keep the earliest createdAt
          try {
            const existingTime = new Date(existing.createdAt).getTime();
            const msgTime = new Date(msg.createdAt).getTime();
            if (msgTime < existingTime) dedupMap.set(key, msg);
          } catch {
            // ignore parse issues and keep existing
          }
        }
      });

      messagesForEntity = Array.from(dedupMap.values()).sort((a, b) => {
        const ta = new Date(a.createdAt).getTime();
        const tb = new Date(b.createdAt).getTime();
        return ta - tb;
      });
    }

    return {
      id: prismaAnalysis.id,
      title: prismaAnalysis.title,
      description: prismaAnalysis.description,
      epicContent: prismaAnalysis.epicContent,
      projectId: prismaAnalysis.projectId,
      userId: prismaAnalysis.userId,
      currentPhase: this.mapPhaseFromStatus(prismaAnalysis.status, prismaAnalysis.completeness),
      status: this.mapStatus(prismaAnalysis.status),
      completeness: coverage,
      messages: messagesForEntity?.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        role: msg.role as MessageRole,
        messageType: msg.messageType as MessageType,
        category: msg.category as QuestionCategory,
        analysisId: msg.analysisId,
        createdAt: msg.createdAt
      })) || [],
      createdAt: prismaAnalysis.createdAt,
      updatedAt: prismaAnalysis.updatedAt
    };
  }

  private mapPhaseFromStatus(status: string, completeness: number): ConversationalPhase {
    if (status === 'COMPLETED') return ConversationalPhase.COMPLETED;
    
    // Determinar fase basada en completeness
    if (completeness < 30) return ConversationalPhase.ANALYSIS;
    if (completeness < 70) return ConversationalPhase.STRATEGY;
    return ConversationalPhase.TEST_PLANNING;
  }

  private mapStatus(prismaStatus: string): ConversationalStatus {
    switch (prismaStatus) {
      case 'IN_PROGRESS': return ConversationalStatus.IN_PROGRESS;
      case 'COMPLETED': return ConversationalStatus.COMPLETED;
      default: return ConversationalStatus.IN_PROGRESS;
    }
  }

  /**
   * Calcular cobertura de análisis de forma optimizada (usando SQL en lugar de procesamiento en memoria)
   */
  async calculateAnalysisCoverage(analysisId: string): Promise<{
    overallScore: number;
    functionalCoverage: number;
    nonFunctionalCoverage: number;
    businessRulesCoverage: number;
    acceptanceCriteriaCoverage: number;
  }> {
    // Consultas optimizadas para contar mensajes por categoría
    const [functionalCount, nonFunctionalCount, businessRulesCount, acceptanceCriteriaCount, totalUserMessages] = await Promise.all([
      prisma.conversationalMessage.count({
        where: {
          analysisId,
          role: 'USER',
          category: PrismaQuestionCategory.FUNCTIONAL_REQUIREMENTS
        }
      }),
      prisma.conversationalMessage.count({
        where: {
          analysisId,
          role: 'USER',
          category: PrismaQuestionCategory.NON_FUNCTIONAL_REQUIREMENTS
        }
      }),
      prisma.conversationalMessage.count({
        where: {
          analysisId,
          role: 'USER',
          category: PrismaQuestionCategory.BUSINESS_RULES
        }
      }),
      prisma.conversationalMessage.count({
        where: {
          analysisId,
          role: 'USER',
          category: PrismaQuestionCategory.ACCEPTANCE_CRITERIA
        }
      }),
      prisma.conversationalMessage.count({
        where: { analysisId, role: 'USER' }
      })
    ]);

    // Calcular porcentajes basados en mensajes por categoría
    const functionalCoverage = totalUserMessages > 0 ? Math.min(100, (functionalCount / Math.max(1, totalUserMessages * 0.3)) * 100) : 0;
    const nonFunctionalCoverage = totalUserMessages > 0 ? Math.min(100, (nonFunctionalCount / Math.max(1, totalUserMessages * 0.2)) * 100) : 0;
    const businessRulesCoverage = totalUserMessages > 0 ? Math.min(100, (businessRulesCount / Math.max(1, totalUserMessages * 0.25)) * 100) : 0;
    const acceptanceCriteriaCoverage = totalUserMessages > 0 ? Math.min(100, (acceptanceCriteriaCount / Math.max(1, totalUserMessages * 0.25)) * 100) : 0;

    const overallScore = Math.round((functionalCoverage + nonFunctionalCoverage + businessRulesCoverage + acceptanceCriteriaCoverage) / 4);

    return {
      overallScore,
      functionalCoverage: Math.round(functionalCoverage),
      nonFunctionalCoverage: Math.round(nonFunctionalCoverage),
      businessRulesCoverage: Math.round(businessRulesCoverage),
      acceptanceCriteriaCoverage: Math.round(acceptanceCriteriaCoverage)
    };
  }

  private calculateCoverageLegacy(messages: any[], category: string): number {
    if (!messages || messages.length === 0) return 0;
    
    const categoryMessages = messages.filter(msg => 
      msg.category && msg.category.includes(category) && msg.role === 'USER'
    );
    
    // Simple calculation - could be more sophisticated
    return Math.min(100, categoryMessages.length * 25);
  }
}

export const conversationalDatabaseService = new ConversationalDatabaseService();
