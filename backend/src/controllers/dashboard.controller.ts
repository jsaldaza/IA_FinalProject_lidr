/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { StructuredLogger } from '../utils/structured-logger';
import { ResponseHandler } from '../utils/response-handler';
import { RedisCache } from '../utils/redis-cache';
import { prisma } from '../lib/prisma';
import { AppError, UnauthorizedError, InternalServerError } from '../utils/error-handler';

// Extended Request interface for authenticated requests
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
    [key: string]: any;
  };
}

export class DashboardController {
  private static getUserId(req: AuthRequest): string {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError('Usuario no autenticado');
    }
    return userId;
  }
  /**
   * Get dashboard statistics for authenticated user
   */
  static async getStats(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = DashboardController.getUserId(req);

      // Get query parameters
      const { period = 'week', includeInactive = false } = req.query;
      const cacheKey = `dashboard:stats:${userId}:${period}:${includeInactive}`;

      StructuredLogger.info('Getting dashboard stats', {
        userId,
        period,
        includeInactive,
        cacheEnabled: RedisCache.isReady()
      });

      // Try to get from cache first
      if (RedisCache.isReady()) {
        const cachedStats = await RedisCache.getDashboardStats(userId);
        if (cachedStats) {
          StructuredLogger.info('Dashboard stats served from cache', { userId });
          return ResponseHandler.success(
            res,
            cachedStats,
            'Estadísticas del dashboard obtenidas desde caché'
          );
        }
      }

      // Build date filter based on period
      const dateFilter = DashboardController.getDateFilter(period as string);

      // Get statistics with optimized single query
      const stats = await DashboardController.getOptimizedStats(userId, dateFilter, includeInactive as boolean);

      // Cache the results if Redis is available
      if (RedisCache.isReady()) {
        await RedisCache.setDashboardStats(userId, stats);
        StructuredLogger.debug('Dashboard stats cached', { userId, cacheKey });
      }

      StructuredLogger.info('Dashboard stats retrieved successfully', {
        userId,
        stats
      });

      return ResponseHandler.success(
        res,
        stats,
        'Estadísticas del dashboard obtenidas exitosamente'
      );
    } catch (error) {
      StructuredLogger.error('Error getting dashboard stats', error as Error, {
        userId: req.user?.id,
        period: req.query.period
      });

      const appError = error instanceof AppError
        ? error
        : new InternalServerError('Error interno del servidor al obtener estadísticas');

      return ResponseHandler.error(
        res,
        appError.message,
        appError.statusCode,
        appError.code,
        appError.details
      );
    }
  }

  /**
   * Get recent activity for authenticated user
   */
  static async getActivity(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = DashboardController.getUserId(req);

      const { limit = 10, type = 'all' } = req.query;
      const limitNum = Math.min(parseInt(limit as string) || 10, 50); // Max 50

      StructuredLogger.info('Getting dashboard activity', {
        userId,
        limit: limitNum,
        type
      });

      // Get recent activity
      const activity = await DashboardController.getRecentActivity(userId, limitNum, type as string);

      StructuredLogger.info('Dashboard activity retrieved successfully', {
        userId,
        activityCount: activity.length
      });

      return ResponseHandler.success(
        res,
        activity,
        'Actividad reciente obtenida exitosamente'
      );
    } catch (error) {
      StructuredLogger.error('Error getting dashboard activity', error as Error, {
        userId: req.user?.id,
        limit: req.query.limit
      });

      const appError = error instanceof AppError
        ? error
        : new InternalServerError('Error interno del servidor al obtener actividad');

      return ResponseHandler.error(
        res,
        appError.message,
        appError.statusCode,
        appError.code,
        appError.details
      );
    }
  }

  /**
   * Get recent projects for authenticated user
   */
  static async getRecentProjects(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = DashboardController.getUserId(req);

      const { limit = 5, status = 'all' } = req.query;
      const limitNum = Math.min(parseInt(limit as string) || 5, 20); // Max 20
      const cacheKey = `dashboard:projects:${userId}:${limitNum}:${status}`;

      StructuredLogger.info('Getting recent projects', {
        userId,
        limit: limitNum,
        status,
        cacheEnabled: RedisCache.isReady()
      });

      // Try to get from cache first
      if (RedisCache.isReady()) {
        const cachedProjects = await RedisCache.get<any[]>(cacheKey);
        if (cachedProjects && Array.isArray(cachedProjects)) {
          StructuredLogger.info('Recent projects served from cache', { userId, count: cachedProjects.length });
          return ResponseHandler.success(
            res,
            cachedProjects,
            'Proyectos recientes obtenidos desde caché'
          );
        }
      }

      // Build where clause
      const where: any = { userId };
      if (status !== 'all') {
        where.status = status;
      }

      const recentProjects = await prisma.conversationalAnalysis.findMany({
        where,
        select: {
          id: true,
          title: true,
          status: true,
          currentPhase: true,
          completeness: true,
          updatedAt: true
        },
        orderBy: { updatedAt: 'desc' },
        take: limitNum
      });

      // Cache the results if Redis is available
      if (RedisCache.isReady()) {
        await RedisCache.set(cacheKey, recentProjects, 600); // 10 minutes TTL
        StructuredLogger.debug('Recent projects cached', { userId, cacheKey, count: recentProjects.length });
      }

      StructuredLogger.info('Recent projects retrieved successfully', {
        userId,
        projectsCount: recentProjects.length
      });

      return ResponseHandler.success(
        res,
        recentProjects,
        'Proyectos recientes obtenidos exitosamente'
      );
    } catch (error) {
      StructuredLogger.error('Error getting recent projects', error as Error, {
        userId: req.user?.id,
        limit: req.query.limit
      });

      const appError = error instanceof AppError
        ? error
        : new InternalServerError('Error interno del servidor al obtener proyectos recientes');

      return ResponseHandler.error(
        res,
        appError.message,
        appError.statusCode,
        appError.code,
        appError.details
      );
    }
  }

  /**
   * Get date filter based on period
   */
  private static getDateFilter(period: string): Date | null {
    const now = new Date();

    switch (period) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  }

  /**
   * Get optimized dashboard statistics
   */
  private static async getOptimizedStats(userId: string, dateFilter: Date | null, includeInactive: boolean) {
    // Build where clause
    const whereClause: any = { userId };
    if (dateFilter) {
      whereClause.createdAt = { gte: dateFilter };
    }
    if (!includeInactive) {
      whereClause.status = { not: 'ARCHIVED' };
    }

    // Single optimized query for all stats
    const [
      totalProjects,
      totalTestCases,
      completedAnalyses,
      inProgressAnalyses
    ] = await Promise.all([
      prisma.conversationalAnalysis.count({ where: whereClause }),
      prisma.testCase.count({ where: { userId } }),
      prisma.conversationalAnalysis.count({
        where: { ...whereClause, status: 'COMPLETED' }
      }),
      prisma.conversationalAnalysis.count({
        where: { ...whereClause, status: 'IN_PROGRESS' }
      })
    ]);

    const passRate = totalProjects > 0 ? Math.round((completedAnalyses / totalProjects) * 100) : 0;

    return {
      totalProjects,
      totalTestCases,
      completedAnalyses,
      inProgressAnalyses,
      activeProjects: inProgressAnalyses,
      passRate
    };
  }

  /**
   * Get recent activity with optimized queries
   */
  private static async getRecentActivity(userId: string, limit: number, type: string) {
    const take = Math.ceil(limit / 2); // Split between analyses and projects

    // Get recent analyses and projects
    const [recentAnalyses, recentProjects] = await Promise.all([
      prisma.analysis.findMany({
        where: { userId },
        select: {
          id: true,
          requirement: true,
          createdAt: true
        },
        take,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.conversationalAnalysis.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true
        },
        take,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Combine and format activity
    const activity = [
      ...recentAnalyses.map(analysis => ({
        id: analysis.id,
        type: 'analysis_created',
        title: `Análisis "${analysis.requirement.substring(0, 50)}..." creado`,
        description: 'Nuevo análisis de requerimientos generado',
        timestamp: analysis.createdAt.toISOString(),
        status: 'completed'
      })),
      ...recentProjects.map(project => ({
        id: project.id,
        type: 'project_created',
        title: `Proyecto "${project.title}" creado`,
        description: 'Nuevo proyecto conversacional iniciado',
        timestamp: project.createdAt.toISOString(),
        status: project.status.toLowerCase()
      }))
    ];

    // Filter by type if specified
    let filteredActivity = activity;
    if (type !== 'all') {
      filteredActivity = activity.filter(item => {
        if (type === 'analysis') return item.type === 'analysis_created';
        if (type === 'project') return item.type === 'project_created';
        if (type === 'testcase') return item.type === 'testcase_created';
        return true;
      });
    }

    // Sort by timestamp and limit
    return filteredActivity
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}