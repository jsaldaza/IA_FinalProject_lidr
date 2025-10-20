import { Request, Response, NextFunction } from 'express';
import { RedisClientType } from 'redis';
import { StructuredLogger } from '../utils/structured-logger';

// Configuración de límites diarios
const DAILY_TOKEN_LIMITS = {
  FREE_USER: 2000,    // ~$0.06/día para usuarios gratuitos
  PAID_USER: 20000,   // ~$0.60/día para usuarios pagos
  DEMO: 500          // Para demos y pruebas
};

const COST_PER_1K_TOKENS = {
  'gpt-3.5-turbo': 0.003,     // $0.003 por 1K tokens
  'gpt-4': 0.03,              // $0.03 por 1K tokens  
  'gpt-4-turbo': 0.01         // $0.01 por 1K tokens
};

export class TokenCostControlMiddleware {
  private static redis: RedisClientType | null = null;

  static async checkDailyTokenBudget(
    req: Request, 
    res: Response, 
    next: NextFunction
  ): Promise<void> {
  try {
      const userId = req.user?.id || 'anonymous';
      const userTier = 'FREE_USER'; // Por ahora todos son FREE_USER
      const estimatedTokens = req.body.estimatedTokens || 800; // Estimación conservadora
      
      // Generar key para Redis basada en usuario y fecha
      const today = new Date().toISOString().split('T')[0];
      const redisKey = `token_usage:${userId}:${today}`;
      
      // Obtener uso actual del día
  const currentUsage = await TokenCostControlMiddleware.getTokenUsage(redisKey);
      const dailyLimit = DAILY_TOKEN_LIMITS[userTier as keyof typeof DAILY_TOKEN_LIMITS] || DAILY_TOKEN_LIMITS.FREE_USER;
      
      // Verificar si excede el límite
      if (currentUsage + estimatedTokens > dailyLimit) {
        StructuredLogger.warn('Daily token limit reached', {
          userId,
          method: 'checkDailyTokenBudget'
        });

        res.status(429).json({
          success: false,
          error: 'Límite diario de tokens alcanzado',
          details: {
            currentUsage,
            dailyLimit,
            estimatedTokens,
            resetTime: 'Medianoche UTC'
          },
          suggestion: userTier === 'FREE_USER' 
            ? 'Considera actualizar tu plan para obtener más tokens diarios' 
            : 'Intenta con prompts más cortos o regresa mañana'
        });
        return;
      }

      // Agregar información al request para tracking posterior
      req.tokenBudget = {
        userId,
        userTier,
        currentUsage,
        dailyLimit,
        estimatedTokens,
        redisKey
      };

      next();
    } catch (error) {
      StructuredLogger.error('Error in TokenCostControlMiddleware.checkDailyTokenBudget', error as Error, {
        method: 'checkDailyTokenBudget'
      });
      // **Fail-closed**: if Redis or the control layer errors, block the operation
      // to avoid uncontrolled AI usage. Return 503 to indicate service unavailable.
      res.status(503).json({
        success: false,
        error: 'Token budget service unavailable. Try again later.'
      });
    }
  }

  static async recordTokenUsage(
    userId: string,
    model: string,
    promptTokens: number,
    completionTokens: number,
    redisKey?: string
  ): Promise<void> {
    try {
      const totalTokens = promptTokens + completionTokens;
      const costPer1K = COST_PER_1K_TOKENS[model as keyof typeof COST_PER_1K_TOKENS] || COST_PER_1K_TOKENS['gpt-3.5-turbo'];
      const estimatedCost = (totalTokens / 1000) * costPer1K;

      // Usar redisKey si se proporciona, sino generar uno nuevo
      const key = redisKey || `token_usage:${userId}:${new Date().toISOString().split('T')[0]}`;
      
      // Incrementar contador de tokens del día
      await TokenCostControlMiddleware.incrementTokenUsage(key, totalTokens);
      
      // Registrar métrica detallada para análisis posterior
      const detailedKey = `token_details:${userId}:${Date.now()}`;
      await TokenCostControlMiddleware.recordDetailedUsage(detailedKey, {
        model,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost,
        timestamp: new Date().toISOString()
      });

      StructuredLogger.ai('Token usage recorded', {
        userId,
        model,
        promptTokens,
        completionTokens,
        totalTokens,
        cost: estimatedCost
      });
    } catch (error) {
      StructuredLogger.error('Error recording token usage', error as Error, { method: 'recordTokenUsage' });
    }
  }

  private static async getTokenUsage(redisKey: string): Promise<number> {
    try {
      if (!TokenCostControlMiddleware.redis) return 0;
      const usage = await TokenCostControlMiddleware.redis.get(redisKey);
      return parseInt(usage || '0', 10);
    } catch (error) {
      StructuredLogger.error('Error getting token usage', error as Error, { method: 'getTokenUsage' });
      // Fail-closed: if we cannot get usage assume limit reached for safety
      throw error;
    }
  }

  private static async incrementTokenUsage(redisKey: string, tokens: number): Promise<void> {
    try {
      if (!TokenCostControlMiddleware.redis) return;
      
      await TokenCostControlMiddleware.redis.incrBy(redisKey, tokens);
      // Establecer expiración a final del día (24 horas)
      await TokenCostControlMiddleware.redis.expire(redisKey, 86400);
    } catch (error) {
      StructuredLogger.error('Error incrementing token usage', error as Error, { method: 'incrementTokenUsage' });
      throw error;
    }
  }

  private static async recordDetailedUsage(redisKey: string, details: any): Promise<void> {
    try {
      if (!TokenCostControlMiddleware.redis) return;
      
      await TokenCostControlMiddleware.redis.setEx(redisKey, 604800, JSON.stringify(details)); // 7 días
    } catch (error) {
      StructuredLogger.error('Error recording detailed usage', error as Error, { method: 'recordDetailedUsage' });
      throw error;
    }
  }

  static initializeRedis(redisInstance: RedisClientType): void {
  this.redis = redisInstance;
  StructuredLogger.info('TokenCostControlMiddleware redis initialized', { method: 'initializeRedis' });
  }

  // Método para obtener estadísticas de uso
  static async getUserTokenStats(userId: string): Promise<{
    todayUsage: number;
    weeklyUsage: number;
    totalCost: number;
    dailyLimit: number;
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayKey = `token_usage:${userId}:${today}`;
      const todayUsage = await TokenCostControlMiddleware.getTokenUsage(todayKey);

      // Calcular uso semanal
      const weeklyUsage = await TokenCostControlMiddleware.calculateWeeklyUsage(userId);
      
      return {
        todayUsage,
        weeklyUsage,
        totalCost: (weeklyUsage / 1000) * COST_PER_1K_TOKENS['gpt-3.5-turbo'],
        dailyLimit: DAILY_TOKEN_LIMITS.FREE_USER
      };
    } catch (error) {
      StructuredLogger.error('Error getting user token stats', error as Error, { method: 'getUserTokenStats' });
      return {
        todayUsage: 0,
        weeklyUsage: 0,
        totalCost: 0,
        dailyLimit: DAILY_TOKEN_LIMITS.FREE_USER
      };
    }
  }

  private static async calculateWeeklyUsage(userId: string): Promise<number> {
    try {
      let totalWeekly = 0;
      const today = new Date();
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const key = `token_usage:${userId}:${dateStr}`;
        const usage = await TokenCostControlMiddleware.getTokenUsage(key);
        totalWeekly += usage;
      }
      
      return totalWeekly;
    } catch (error) {
      StructuredLogger.error('Error calculating weekly usage', error as Error, { method: 'calculateWeeklyUsage' });
      return 0;
    }
  }
}

// Extender el tipo Request para incluir tokenBudget
declare global {
  namespace Express {
    interface Request {
      tokenBudget?: {
        userId: string;
        userTier: string;
        currentUsage: number;
        dailyLimit: number;
        estimatedTokens: number;
        redisKey: string;
      };
    }
  }
}
