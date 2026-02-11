// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import { EnterpriseCache } from '../services/enterprise-cache.service';

/**
 * Middleware empresarial de rate limiting
 */
export function rateLimitMiddleware(
  key: string, 
  options: { 
    windowMs: number; 
    max: number; 
    skipSuccessfulRequests?: boolean;
  }
) {
  const cache = new EnterpriseCache();

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clientId = req.ip || req.socket.remoteAddress || 'unknown';
      const rateLimitKey = `ratelimit:${key}:${clientId}`;
      
      // Incrementar contador
      const count = await cache.incrementCounter(
        rateLimitKey, 
        1, 
        Math.ceil(options.windowMs / 1000)
      );

      // Headers informativos
      res.set({
        'X-RateLimit-Limit': options.max.toString(),
        'X-RateLimit-Remaining': Math.max(0, options.max - count).toString(),
        'X-RateLimit-Reset': new Date(Date.now() + options.windowMs).toISOString(),
      });

      if (count > options.max) {
        res.status(429).json({
          success: false,
          message: 'Too many requests',
          retryAfter: Math.ceil(options.windowMs / 1000),
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // En caso de error, permitir la request (fail-open)
      next();
    }
  };
}

/**
 * Middleware de cache con headers
 */
export function cacheMiddleware(cacheKey?: string, ttl: number = 300) {
  const cache = new EnterpriseCache();

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.method !== 'GET') {
        next();
        return;
      }

      const key = cacheKey 
        ? `cache:${cacheKey}:${req.originalUrl}:${req.user?.id || 'anonymous'}`
        : `cache:${req.originalUrl}:${req.user?.id || 'anonymous'}`;

      const cached = await cache.get(key);
      
      if (cached) {
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': key,
        });
        res.json(cached);
        return;
      }

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data: any) {
        if (res.statusCode === 200) {
          cache.set(key, data, ttl).catch(err => 
            console.error('Cache set error:', err)
          );
        }
        
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': key,
        });
        
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}
