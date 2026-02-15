/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validationResult } from 'express-validator';

export const validateRequest = (config: { body?: z.ZodSchema; query?: z.ZodSchema; params?: z.ZodSchema }) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            if (config.body) {
                const result = config.body.parse(req.body);
                req.body = result;
            }

            if (config.query) {
                const result = config.query.parse(req.query);
                // Express 5 exposes req.query via a getter; mutate in place to avoid setter errors
                Object.assign(req.query, result);
            }

            if (config.params) {
                const result = config.params.parse(req.params);
                req.params = result;
            }

            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errors = error.errors.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }));
                res.status(400).json({
                    status: 'error',
                    message: 'Datos de entrada inválidos',
                    errors
                });
                return;
            }
            next(error);
        }
    };
};

/**
 * Middleware empresarial para manejo de errores de validación
 */
export function validationErrorHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.type === 'field' ? (error as any).path : error.type,
        message: error.msg,
        value: error.type === 'field' ? (error as any).value : undefined,
      })),
    });
    return;
  }
  
  next();
}

/**
 * Middleware de sanitización de entrada
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  // Sanitizar body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitizar query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  next();
}

/**
 * Función auxiliar para sanitizar objetos
 */
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const sanitized: any = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      let value = obj[key];
      
      if (typeof value === 'string') {
        // Remover caracteres peligrosos básicos
        value = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]*>/g, '')
          .trim();
      } else if (typeof value === 'object' && value !== null) {
        value = sanitizeObject(value);
      }
      
      sanitized[key] = value;
    }
  }
  
  return sanitized;
} 