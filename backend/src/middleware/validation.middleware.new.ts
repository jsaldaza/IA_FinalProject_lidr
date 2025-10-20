import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { StructuredLogger } from '../utils/structured-logger';

export interface ValidationErrorDetails {
    field: string;
    message: string;
    code: string;
    received?: any;
}

/**
 * Middleware de validación empresarial unificado usando Zod
 * Características:
 * - Type-safe validation
 * - Detailed error reporting
 * - Sanitización automática
 * - Logging estructurado
 * - Soporte para validación de body, params, query
 */
export const validateRequest = (schemas: {
    body?: ZodSchema;
    params?: ZodSchema;
    query?: ZodSchema;
}) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const errors: ValidationErrorDetails[] = [];

            // Validar body
            if (schemas.body && req.body) {
                try {
                    req.body = await schemas.body.parseAsync(req.body);
                } catch (error) {
                    if (error instanceof ZodError) {
                        errors.push(...formatZodErrors(error, 'body'));
                    }
                }
            }

            // Validar params
            if (schemas.params && req.params) {
                try {
                    req.params = await schemas.params.parseAsync(req.params);
                } catch (error) {
                    if (error instanceof ZodError) {
                        errors.push(...formatZodErrors(error, 'params'));
                    }
                }
            }

            // Validar query
            if (schemas.query && req.query) {
                try {
                    req.query = await schemas.query.parseAsync(req.query);
                } catch (error) {
                    if (error instanceof ZodError) {
                        errors.push(...formatZodErrors(error, 'query'));
                    }
                }
            }

            // Si hay errores, enviar respuesta de error
            if (errors.length > 0) {
                StructuredLogger.error('Validation failed', undefined, {
                    method: req.method,
                    url: req.originalUrl,
                    userId: req.user?.id,
                    ip: req.ip
                });

                res.status(400).json({
                    status: 'error',
                    message: 'Datos de entrada inválidos',
                    code: 'VALIDATION_ERROR',
                    errors,
                    timestamp: new Date().toISOString()
                });
                return;
            }

            next();
        } catch (error) {
            StructuredLogger.error('Validation middleware error', error as Error, {
                method: req.method,
                url: req.originalUrl
            });

            res.status(500).json({
                status: 'error',
                message: 'Error interno del servidor',
                code: 'INTERNAL_ERROR',
                timestamp: new Date().toISOString()
            });
        }
    };
};

/**
 * Formatea errores de Zod para respuesta consistente
 */
function formatZodErrors(error: ZodError, section: string): ValidationErrorDetails[] {
    return error.errors.map(err => ({
        field: `${section}.${err.path.join('.')}`,
        message: err.message,
        code: err.code,
        received: 'received' in err ? err.received : undefined
    }));
}

/**
 * Middleware de sanitización de entrada mejorado
 */
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
    try {
        // Sanitizar body
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body);
        }

        // Sanitizar query parameters
        if (req.query && typeof req.query === 'object') {
            req.query = sanitizeObject(req.query);
        }

        // Sanitizar params
        if (req.params && typeof req.params === 'object') {
            req.params = sanitizeObject(req.params);
        }

        next();
    } catch (error) {
        StructuredLogger.error('Sanitization error', error as Error, {
            method: req.method,
            url: req.originalUrl
        });
        next();
    }
};

/**
 * Sanitiza un objeto recursivamente
 */
function sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === 'string') {
        return sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }

    if (typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
            // Omitir campos potencialmente peligrosos
            if (!isDangerousField(key)) {
                sanitized[sanitizeString(key)] = sanitizeObject(value);
            }
        }
        return sanitized;
    }

    return obj;
}

/**
 * Sanitiza strings removiendo caracteres peligrosos
 */
function sanitizeString(str: string): string {
    if (typeof str !== 'string') return str;

    return str
        .trim()
        // Remover caracteres de control
        .replace(/[\x00-\x1F\x7F]/g, '')
        // Escapar caracteres HTML peligrosos
        .replace(/[<>]/g, '')
        // Limitar longitud para prevenir ataques DoS
        .substring(0, 10000);
}

/**
 * Verifica si un campo es potencialmente peligroso
 */
function isDangerousField(fieldName: string): boolean {
    const dangerousFields = [
        '__proto__',
        'constructor',
        'prototype',
        'hasOwnProperty',
        'valueOf',
        'toString'
    ];
    
    return dangerousFields.includes(fieldName.toLowerCase());
}

/**
 * Schemas comunes reutilizables
 */
export const commonSchemas = {
    uuid: z.string().uuid('ID debe ser un UUID válido'),
    email: z.string().email('Formato de email inválido'),
    password: z.string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'La contraseña debe contener al menos una minúscula, una mayúscula y un número'),
    name: z.string()
        .min(2, 'El nombre debe tener al menos 2 caracteres')
        .max(50, 'El nombre no puede tener más de 50 caracteres'),
    pagination: z.object({
        page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
        limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional()
    })
};

/**
 * Wrapper para crear validaciones de parámetros de ruta
 */
export const createParamsSchema = (fields: Record<string, ZodSchema>) => {
    return z.object(fields);
};

/**
 * Wrapper para crear validaciones de query parameters
 */
export const createQuerySchema = (fields: Record<string, ZodSchema>) => {
    return z.object(fields);
};
