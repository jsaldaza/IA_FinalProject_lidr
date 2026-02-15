/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { StructuredLogger } from '../utils/structured-logger';

/**
 * Middleware de validación unificado y mejorado
 * Características:
 * - Validación de body, query, params simultáneamente  
 * - Transformación de datos (trim, parse numbers, etc.)
 * - Mensajes de error detallados y localizados
 * - Logging de errores de validación
 * - Soporte para esquemas opcionales
 */

interface ValidationSchema {
  body?: ZodSchema<any>;
  query?: ZodSchema<any>;
  params?: ZodSchema<any>;
  headers?: ZodSchema<any>;
}

interface ValidationOptions {
  // Si true, continúa aunque falte alguna sección opcional
  allowPartial?: boolean;
  // Si true, loggea los errores de validación para debugging
  logErrors?: boolean;
  // Prefijo para los mensajes de error
  errorPrefix?: string;
}

/**
 * Crea un middleware de validación con esquemas Zod
 */
export function validateRequest(
  schemas: ValidationSchema,
  options: ValidationOptions = {}
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { 
      logErrors = true, 
      errorPrefix = 'Datos de entrada inválidos' 
    } = options;

    try {
      const validationResults: any = {};

      // Validar cada sección si el esquema está presente
      if (schemas.body) {
        validationResults.body = await schemas.body.parseAsync(req.body);
        req.body = validationResults.body;
      }

      if (schemas.query) {
        validationResults.query = await schemas.query.parseAsync(req.query);
        req.query = validationResults.query;
      }

      if (schemas.params) {
        validationResults.params = await schemas.params.parseAsync(req.params);
        req.params = validationResults.params;
      }

      if (schemas.headers) {
        validationResults.headers = await schemas.headers.parseAsync(req.headers);
        // No modificamos req.headers para evitar problemas
      }

      // Si llegamos aquí, todas las validaciones pasaron
      next();

    } catch (error) {
      if (error instanceof ZodError) {
        if (logErrors) {
          StructuredLogger.warn('Validation error in request', {
            url: req.originalUrl,
            method: req.method,
            userId: (req as any).user?.id,
            errors: error.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message,
              code: err.code
            }))
          });
        }

        // Formatear errores de manera legible
        const formattedErrors = error.errors.map(err => {
          const field = err.path.length > 0 ? err.path.join('.') : 'root';
          return {
            field,
            message: err.message,
            code: err.code,
            received: err.code === 'invalid_type' ? typeof (err as any).received : undefined
          };
        });

        res.status(400).json({
          status: 'error',
          message: errorPrefix,
          errors: formattedErrors,
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Error inesperado durante la validación
      StructuredLogger.error('Unexpected validation error', error as Error, {
        url: req.originalUrl,
        method: req.method,
        userId: (req as any).user?.id
      });

      res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor durante la validación',
        code: 'VALIDATION_INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      });
      return;
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>, options?: ValidationOptions) {
  return validateRequest({ query: schema }, options);
}

export function validateParams<T>(schema: ZodSchema<T>, options?: ValidationOptions) {
  return validateRequest({ params: schema }, options);
}

/**
 * Middleware especializado para validar IDs de MongoDB ObjectId
 */
export function validateObjectIdParam(paramName: string = 'id') {
  const schema = z.object({
    [paramName]: z.string().regex(/^[0-9a-fA-F]{24}$/, `${paramName} debe ser un ObjectId válido`)
  });
  
  return validateParams(schema, {
    errorPrefix: `Parámetro ${paramName} inválido`
  });
}

// Re-exportar para compatibilidad con código existente
export { validateRequest as default };