import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Esquema de validación para los parámetros de paginación
const paginationSchema = z.object({
    page: z.string().optional().transform(val => parseInt(val || '1')),
    limit: z.string().optional().transform(val => parseInt(val || '10')),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
});

// Interfaz para los parámetros de paginación
export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder: 'asc' | 'desc';
    skip: number;
}

// Extender la interfaz Request de Express
declare global {
    namespace Express {
        interface Request {
            pagination?: PaginationParams;
        }
    }
}

export const paginationMiddleware = () => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            // Validar y transformar los parámetros de paginación
            const { page, limit, sortBy, sortOrder } = paginationSchema.parse(req.query);

            // Calcular el offset
            const skip = (page - 1) * limit;

            // Agregar los parámetros de paginación a la request
            req.pagination = {
                page,
                limit,
                sortBy,
                sortOrder,
                skip
            };

            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    status: 'error',
                    message: 'Parámetros de paginación inválidos',
                    errors: error.errors
                });
                return;
            }
            next(error);
        }
    };
}; 