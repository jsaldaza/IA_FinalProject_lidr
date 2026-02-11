// @ts-nocheck
// 🏥 HEALTH CHECK CONTROLLER SIMPLIFICADO PARA SUPABASE
// ====================================================
import { Request, Response } from 'express';
import { ConversationalPersistenceService } from '../services/conversational-persistence.service';
import { redisHealthCheck } from '../services/redis.service';
import { checkDatabaseHealth } from '../lib/prisma';

export class HealthController {
  
  /**
   * Health check básico
   */
  async basicHealth(_req: Request, res: Response): Promise<Response> {
    try {
      const isHealthy = await checkDatabaseHealth();
      
      return res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'TestForge AI',
        version: '2.0.0'
      });
    } catch (error) {
      return res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      });
    }
  }

  /**
   * Health check detallado
   */
  async detailedHealth(_req: Request, res: Response): Promise<Response> {
    try {
      // Verificar componentes principales
      const [databaseHealth, persistenceHealth, redisHealth] = await Promise.all([
        checkDatabaseHealth(),
        ConversationalPersistenceService.healthCheck(),
        redisHealthCheck()
      ]);

      const configHealth = this.checkConfiguration();
      const overallHealth = databaseHealth && persistenceHealth.database && configHealth.isValid;

      return res.status(overallHealth ? 200 : 503).json({
        status: overallHealth ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        service: 'TestForge AI - Supabase Edition',
        version: '2.0.0',
        components: {
          database: {
            status: databaseHealth ? 'healthy' : 'unhealthy',
            description: 'MongoDB Atlas connection',
            details: persistenceHealth.details
          },
          cache: {
            status: redisHealth ? 'healthy' : 'degraded',
            description: 'Redis cache (Upstash) - Optional',
            enabled: process.env.REDIS_ENABLED === 'true'
          },
          configuration: {
            status: configHealth.isValid ? 'healthy' : 'unhealthy',
            description: 'Environment configuration',
            missing: configHealth.missing || []
          },
          ai: {
            status: process.env.OPENAI_API_KEY ? 'configured' : 'not-configured',
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
          }
        },
        performance: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version
        }
      });
    } catch (error) {
      return res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Detailed health check failed',
        message: (error as Error).message
      });
    }
  }

  /**
   * Health check de cache específicamente
   */
  async cacheHealth(_req: Request, res: Response): Promise<Response> {
    try {
      const redisHealth = await redisHealthCheck();
      
      return res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        cache: {
          redis: {
            enabled: process.env.REDIS_ENABLED === 'true',
            healthy: redisHealth,
            fallback: 'memory'
          }
        }
      });
    } catch (error) {
      return res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Cache health check failed'
      });
    }
  }

  /**
   * Verificar configuración del sistema
   */
  private checkConfiguration() {
    const requiredEnvVars = [
      'DATABASE_URL',
      'JWT_SECRET'
    ];

    const optionalEnvVars = [
      'OPENAI_API_KEY',
      'REDIS_URL'
    ];

    const missing: string[] = [];
    const configured: string[] = [];

    // Verificar variables requeridas
    requiredEnvVars.forEach(envVar => {
      if (!process.env[envVar]) {
        missing.push(envVar);
      } else {
        configured.push(envVar);
      }
    });

    // Verificar variables opcionales
    optionalEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        configured.push(envVar);
      }
    });

    return {
      isValid: missing.length === 0,
      missing,
      configured,
      nodeEnv: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Métricas de la aplicación
   */
  async metrics(_req: Request, res: Response): Promise<Response> {
    try {
      const stats = await ConversationalPersistenceService.getUserStats('all');
      
      return res.json({
        timestamp: new Date().toISOString(),
        application: {
          name: 'TestForge AI',
          version: '2.0.0',
          environment: process.env.NODE_ENV,
          uptime: process.uptime()
        },
        database: {
          provider: 'MongoDB Atlas',
          statistics: stats
        },
        performance: {
          memory: process.memoryUsage(),
          eventLoop: process.cpuUsage()
        }
      });
    } catch (error) {
      return res.status(500).json({
        error: 'Failed to get metrics',
        message: (error as Error).message
      });
    }
  }
}

export default new HealthController();