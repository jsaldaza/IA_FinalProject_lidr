import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../utils/cache';
import { logDebug } from '../utils/logger';

export const cacheMiddleware = (ttlSeconds: number = 300) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // Solo cachear solicitudes GET
        if (req.method !== 'GET') {
            next();
            return;
        }

        const key = `cache:${req.originalUrl}`;

        try {
            // Intentar obtener datos del caché
            const cachedData = await cacheService.get(key);

            if (cachedData) {
                logDebug('Cache hit', { key });
                res.json(cachedData);
                return;
            }

            // Si no hay datos en caché, modificar la respuesta para guardar en caché
            const originalJson = res.json;
            res.json = function (data: any) {
                cacheService.set(key, data, ttlSeconds)
                    .catch(error => {
                        logDebug('Error al guardar en caché', { key, error });
                    });

                return originalJson.call(this, data);
            };

            next();
        } catch (error) {
            logDebug('Error en middleware de caché', { key, error });
            next();
        }
    };
}; 