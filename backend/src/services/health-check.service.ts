import { Request, Response } from 'express';
import { RedisCache } from '../utils/redis-cache';
import { StructuredLogger } from '../utils/structured-logger';
import { ResponseHandler } from '../utils/response-handler';
import { prisma } from '../lib/prisma';

/**
 * Health Check Service con verificaciones detalladas
 * 
 * Características:
 * - Health check básico (liveness)
 * - Health check detallado (readiness) 
 * - Verificación de dependencias
 * - Métricas de performance
 * - Estado de configuración
 */

interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  details?: unknown;
  error?: string;
}

interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: HealthCheckResult[];
}

export class HealthCheckService {
  
  /**
   * Health check básico - solo verifica que el servicio responda
   */
  static async basic(req: Request, res: Response): Promise<void> {
    const healthData = {
      status: 'healthy' as const,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      service: 'TestForge API'
    };

    StructuredLogger.debug('Basic health check requested', {
      url: req.url,
      method: req.method,
      ip: req.ip
    });

    res.status(200).json(healthData);
  }

  /**
   * Health check detallado con verificación de dependencias
   */
  static async detailed(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const checks: HealthCheckResult[] = [];

    // Verificar base de datos
    const dbCheck = await HealthCheckService.checkDatabase();
    checks.push(dbCheck);

    // Verificar Redis cache
    const cacheCheck = await HealthCheckService.checkCache();
    checks.push(cacheCheck);

    // Verificar configuración crítica
    const configCheck = HealthCheckService.checkConfiguration();
    checks.push(configCheck);

    // Verificar métricas del sistema
    const systemCheck = HealthCheckService.checkSystemMetrics();
    checks.push(systemCheck);

    // Determinar estado general
    const hasUnhealthy = checks.some(check => check.status === 'unhealthy');
    const hasDegraded = checks.some(check => check.status === 'degraded');
    
    const systemStatus: SystemHealth['status'] = hasUnhealthy 
      ? 'unhealthy' 
      : hasDegraded 
        ? 'degraded' 
        : 'healthy';

    const result: SystemHealth = {
      status: systemStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks
    };

    const totalResponseTime = Date.now() - startTime;
    
    StructuredLogger.info('Detailed health check completed', {
      status: systemStatus,
      responseTime: totalResponseTime,
      checksCount: checks.length,
      url: req.url,
      ip: req.ip
    });

    const statusCode = systemStatus === 'healthy' ? 200 : 503;
    res.status(statusCode).json(result);
  }

  /**
   * Verificar estado de la base de datos
   */
  private static async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      await prisma.$connect();
      
      // Test query simple
      const userCount = await prisma.user.count();
      const projectCount = await prisma.conversationalAnalysis.count();
      
      const responseTime = Date.now() - startTime;
      
      await prisma.$disconnect();

      return {
        name: 'database',
        status: responseTime > 1000 ? 'degraded' : 'healthy',
        responseTime,
        details: {
          connected: true,
          users: userCount,
          projects: projectCount,
          performance: responseTime < 500 ? 'good' : 'slow'
        }
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Database connection failed',
        details: {
          connected: false
        }
      };
    }
  }

  /**
   * Verificar estado del cache Redis
   */
  private static async checkCache(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const isHealthy = await RedisCache.healthCheck();
      const responseTime = Date.now() - startTime;

      if (!isHealthy) {
        return {
          name: 'cache',
          status: 'degraded',
          responseTime,
          details: {
            connected: false,
            fallback: 'memory',
            note: 'Using memory fallback'
          }
        };
      }

      const stats = await RedisCache.getStats();
      
      return {
        name: 'cache',
        status: 'healthy',
        responseTime,
        details: {
          ...stats,
          connected: true
        }
      };
    } catch (error) {
      return {
        name: 'cache',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Cache check failed',
        details: {
          connected: false,
          fallback: 'memory'
        }
      };
    }
  }

  /**
   * Verificar configuración crítica
   */
  private static checkConfiguration(): HealthCheckResult {
    const config = {
      databaseUrl: !!process.env.DATABASE_URL,
      jwtSecret: !!process.env.JWT_SECRET,
      openaiApiKey: !!process.env.OPENAI_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT
    };

    const missingConfig = Object.entries(config)
      .filter(([key, value]) => key !== 'nodeEnv' && key !== 'port' && !value)
      .map(([key]) => key);

    const status = missingConfig.length > 0 ? 'unhealthy' : 'healthy';

    return {
      name: 'configuration',
      status,
      details: {
        ...config,
        missingRequired: missingConfig.length > 0 ? missingConfig : undefined
      },
      error: missingConfig.length > 0 
        ? `Missing required configuration: ${missingConfig.join(', ')}`
        : undefined
    };
  }

  /**
   * Verificar métricas del sistema
   */
  private static checkSystemMetrics(): HealthCheckResult {
    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.rss / 1024 / 1024);
    
    // Considerar degradado si usa más de 512MB
    const isMemoryHigh = memUsageMB > 512;
    
    // Considerar degradado si el uptime es muy bajo (< 30 segundos, posible restart)
    const uptime = process.uptime();
    const isUptimeLow = uptime < 30;

    const status = isMemoryHigh ? 'degraded' : 'healthy';

    return {
      name: 'system',
      status,
      details: {
        uptime: Math.floor(uptime),
        memory: {
          rss: `${memUsageMB}MB`,
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
          status: isMemoryHigh ? 'high' : 'normal'
        },
        cpu: {
          // Node.js no proporciona CPU usage directamente
          // En producción se podría usar librerías como 'pidusage'
          status: 'not_monitored'
        },
        platform: process.platform,
        nodeVersion: process.version
      },
      error: isMemoryHigh 
        ? `Memory usage high: ${memUsageMB}MB` 
        : isUptimeLow 
          ? 'Low uptime detected' 
          : undefined
    };
  }

  /**
   * Health check de readiness (listo para recibir tráfico)
   */
  static async readiness(req: Request, res: Response): Promise<void> {
    try {
      // Verificaciones mínimas para readiness
      await prisma.$connect();
      await prisma.user.count(); // Test query mínimo
      await prisma.$disconnect();

      ResponseHandler.success(res, {
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: ['database']
      }, 'Service ready to receive traffic');
    } catch (error) {
      StructuredLogger.error('Readiness check failed', error as Error, {
        url: req.url,
        method: req.method
      });

      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: 'Service not ready to receive traffic'
      });
    }
  }

  /**
   * Health check de liveness (servicio está vivo)
   */
  static async liveness(_req: Request, res: Response): Promise<void> {
    // Liveness solo verifica que el proceso esté funcionando
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      pid: process.pid
    });
  }
}