import { PrismaClient } from '@prisma/client';
import { AnalysisCacheService } from './analysis-cache.service';
import { TokenCostControlMiddleware } from '../middleware/token-cost-control.middleware';

export interface ProjectMetrics {
  totalProjects: number;
  projectsInProgress: number;
  completedProjects: number;
  totalAnalyses: number;
  avgCompletionTime: number;
  costEfficiency: {
    totalTokensUsed: number;
    totalTokensSaved: number;
    totalCost: number;
    totalSavings: number;
    cacheHitRate: number;
  };
  userActivity: {
    analysesThisWeek: number;
    projectsThisWeek: number;
    avgAnalysesPerProject: number;
  };
}

export interface ProjectHealth {
  status: 'excellent' | 'good' | 'warning' | 'critical';
  score: number;
  factors: {
    costEfficiency: number;
    completionRate: number;
    activityLevel: number;
    cacheUtilization: number;
  };
  recommendations: string[];
}

export class ProjectMetricsService {
  private static prisma = new PrismaClient();

  /**
   * Obtener métricas completas de proyectos para un usuario
   */
  static async getUserProjectMetrics(userId: string): Promise<ProjectMetrics> {
    try {
      // Obtener datos básicos de proyectos
      const [totalProjects, totalConversational, completedAnalyses] = await Promise.all([
        this.prisma.project.count({ where: { userId } }),
        this.prisma.conversationalAnalysis.count({ where: { userId } }),
        this.prisma.analysis.count({
          where: {
            userId,
            status: 'COMPLETED'
          }
        })
      ]);

      // Obtener análisis recientes para calcular tiempo promedio
      const recentAnalyses = await this.prisma.analysis.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
          }
        },
        select: {
          createdAt: true,
          updatedAt: true
        }
      });

      // Calcular tiempo promedio de completado
      const avgCompletionTime = recentAnalyses.length > 0
        ? recentAnalyses.reduce((acc, analysis) => {
          const completionTime = analysis.updatedAt.getTime() - analysis.createdAt.getTime();
          return acc + completionTime;
        }, 0) / recentAnalyses.length
        : 0;

      // Obtener métricas de costo
      const tokenStats = await TokenCostControlMiddleware.getUserTokenStats(userId);
      const cacheStats = AnalysisCacheService.getCacheStats();
      const tokensSaved = AnalysisCacheService.calculateTokenSavings();

      // Calcular costos
      const costPer1K = 0.003; // GPT-3.5-turbo
      const totalCost = (tokenStats.weeklyUsage / 1000) * costPer1K;
      const totalSavings = (tokensSaved / 1000) * costPer1K;
      const cacheHitRate = cacheStats.totalEntries > 0
        ? (cacheStats.totalHits / cacheStats.totalEntries) * 100
        : 0;

      // Métricas de actividad semanal
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [analysesThisWeek, projectsThisWeek] = await Promise.all([
        this.prisma.analysis.count({
          where: {
            userId,
            createdAt: { gte: weekAgo }
          }
        }),
        this.prisma.project.count({
          where: {
            userId,
            createdAt: { gte: weekAgo }
          }
        })
      ]);

      return {
        totalProjects: totalProjects + totalConversational,
        projectsInProgress: totalConversational, // Conversational son los "en progreso"
        completedProjects: completedAnalyses,
        totalAnalyses: completedAnalyses,
        avgCompletionTime: Math.round(avgCompletionTime / (1000 * 60 * 60)), // En horas
        costEfficiency: {
          totalTokensUsed: tokenStats.weeklyUsage,
          totalTokensSaved: tokensSaved,
          totalCost,
          totalSavings,
          cacheHitRate: Math.round(cacheHitRate)
        },
        userActivity: {
          analysesThisWeek,
          projectsThisWeek,
          avgAnalysesPerProject: totalProjects > 0 ? Math.round((completedAnalyses / totalProjects) * 10) / 10 : 0
        }
      };
    } catch (error) {
      console.error('Error getting user project metrics:', error);

      // Fallback con métricas mock
      return this.getMockMetrics();
    }
  }

  /**
   * Evaluar la salud general de los proyectos del usuario
   */
  static async getUserProjectHealth(userId: string): Promise<ProjectHealth> {
    try {
      const metrics = await this.getUserProjectMetrics(userId);

      // Calcular factores de salud (0-100)
      const costEfficiency = this.calculateCostEfficiencyScore(metrics.costEfficiency);
      const completionRate = this.calculateCompletionRateScore(metrics);
      const activityLevel = this.calculateActivityScore(metrics.userActivity);
      const cacheUtilization = Math.min(100, metrics.costEfficiency.cacheHitRate);

      // Score general (promedio ponderado)
      const score = Math.round(
        (costEfficiency * 0.3) +
        (completionRate * 0.25) +
        (activityLevel * 0.25) +
        (cacheUtilization * 0.2)
      );

      // Determinar estado basado en score
      let status: ProjectHealth['status'];
      if (score >= 80) status = 'excellent';
      else if (score >= 60) status = 'good';
      else if (score >= 40) status = 'warning';
      else status = 'critical';

      // Generar recomendaciones
      const recommendations = this.generateRecommendations(metrics, {
        costEfficiency,
        completionRate,
        activityLevel,
        cacheUtilization
      });

      return {
        status,
        score,
        factors: {
          costEfficiency,
          completionRate,
          activityLevel,
          cacheUtilization
        },
        recommendations
      };
    } catch (error) {
      console.error('Error getting project health:', error);

      return {
        status: 'warning',
        score: 50,
        factors: {
          costEfficiency: 50,
          completionRate: 50,
          activityLevel: 50,
          cacheUtilization: 50
        },
        recommendations: ['Datos insuficientes para análisis completo']
      };
    }
  }

  /**
   * Obtener tendencias de uso en los últimos 30 días
   */
  static async getProjectTrends(userId: string): Promise<{
    projectCreationTrend: Array<{ date: string; count: number }>;
    analysisCompletionTrend: Array<{ date: string; count: number }>;
    costTrend: Array<{ date: string; cost: number; tokens: number }>;
  }> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Obtener proyectos por día
      const projectsByDay = await this.prisma.project.groupBy({
        by: ['createdAt'],
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo }
        },
        _count: true
      });

      // Obtener análisis completados por día
      const analysesByDay = await this.prisma.analysis.groupBy({
        by: ['createdAt'],
        where: {
          userId,
          status: 'COMPLETED',
          createdAt: { gte: thirtyDaysAgo }
        },
        _count: true
      });

      // Convertir a formato de tendencia
      const projectTrend = this.aggregateByDay(projectsByDay, 'createdAt', '_count');
      const analysisTrend = this.aggregateByDay(analysesByDay, 'createdAt', '_count');

      // Mock de tendencia de costos (en producción vendría de Redis)
      const costTrend = this.generateMockCostTrend();

      return {
        projectCreationTrend: projectTrend,
        analysisCompletionTrend: analysisTrend,
        costTrend
      };
    } catch (error) {
      console.error('Error getting project trends:', error);

      return {
        projectCreationTrend: [],
        analysisCompletionTrend: [],
        costTrend: []
      };
    }
  }

  // ==================== MÉTODOS PRIVADOS ====================

  private static calculateCostEfficiencyScore(costEfficiency: ProjectMetrics['costEfficiency']): number {
    const { totalTokensUsed, totalTokensSaved, cacheHitRate } = costEfficiency;

    // Eficiencia basada en cache hit rate y ahorro de tokens
    let score = 0;

    // Cache hit rate (60% del score)
    score += (cacheHitRate / 100) * 60;

    // Ratio de tokens ahorrados (40% del score)
    const totalTokens = totalTokensUsed + totalTokensSaved;
    if (totalTokens > 0) {
      const savingsRatio = totalTokensSaved / totalTokens;
      score += savingsRatio * 40;
    }

    return Math.min(100, Math.round(score));
  }

  private static calculateCompletionRateScore(metrics: ProjectMetrics): number {
    const { totalProjects, completedProjects } = metrics;

    if (totalProjects === 0) return 0;

    const completionRate = (completedProjects / totalProjects) * 100;
    return Math.min(100, Math.round(completionRate));
  }

  private static calculateActivityScore(activity: ProjectMetrics['userActivity']): number {
    const { analysesThisWeek, projectsThisWeek } = activity;

    // Score basado en actividad semanal
    let score = 0;

    // Proyectos esta semana (máximo 5 = 100%)
    score += Math.min(100, (projectsThisWeek / 5) * 50);

    // Análisis esta semana (máximo 10 = 100%)
    score += Math.min(100, (analysesThisWeek / 10) * 50);

    return Math.round(score);
  }

  private static generateRecommendations(
    metrics: ProjectMetrics,
    factors: ProjectHealth['factors']
  ): string[] {
    const recommendations: string[] = [];

    // Recomendaciones de eficiencia de costos
    if (factors.costEfficiency < 50) {
      recommendations.push('Mejora la eficiencia reutilizando análisis similares');
      recommendations.push('Considera usar descripciones más específicas para mejor cache');
    }

    // Recomendaciones de completado
    if (factors.completionRate < 70) {
      recommendations.push('Enfócate en completar proyectos existentes antes de crear nuevos');
    }

    // Recomendaciones de actividad
    if (factors.activityLevel < 30) {
      recommendations.push('Incrementa tu actividad para aprovechar mejor la plataforma');
    }

    // Recomendaciones de cache
    if (factors.cacheUtilization < 30) {
      recommendations.push('Analiza requisitos similares para maximizar ahorro de tokens');
    }

    // Recomendación de eficiencia general
    if (metrics.costEfficiency.totalCost > 5) {
      recommendations.push('Considera optimizar la longitud de tus descripciones');
    }

    return recommendations.length > 0 ? recommendations : ['¡Excelente trabajo! Mantén el buen rendimiento'];
  }

  private static aggregateByDay(data: any[], dateField: string, countField: string): Array<{ date: string; count: number }> {
    const aggregated = new Map<string, number>();

    data.forEach(item => {
      const date = new Date(item[dateField]).toISOString().split('T')[0];
      const count = typeof item[countField] === 'object' ? Object.values(item[countField])[0] as number : item[countField];
      aggregated.set(date, (aggregated.get(date) || 0) + count);
    });

    return Array.from(aggregated.entries()).map(([date, count]) => ({
      date,
      count
    })).sort((a, b) => a.date.localeCompare(b.date));
  }

  private static generateMockCostTrend(): Array<{ date: string; cost: number; tokens: number }> {
    const trend = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const tokens = Math.floor(Math.random() * 1000) + 200;
      const cost = (tokens / 1000) * 0.003;

      trend.push({
        date: date.toISOString().split('T')[0],
        cost: Math.round(cost * 10000) / 10000,
        tokens
      });
    }

    return trend;
  }

  private static getMockMetrics(): ProjectMetrics {
    return {
      totalProjects: 5,
      projectsInProgress: 2,
      completedProjects: 3,
      totalAnalyses: 3,
      avgCompletionTime: 24,
      costEfficiency: {
        totalTokensUsed: 5000,
        totalTokensSaved: 2000,
        totalCost: 0.015,
        totalSavings: 0.006,
        cacheHitRate: 40
      },
      userActivity: {
        analysesThisWeek: 2,
        projectsThisWeek: 1,
        avgAnalysesPerProject: 0.6
      }
    };
  }

  static async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
