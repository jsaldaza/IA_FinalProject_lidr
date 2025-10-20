import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logError } from '../utils/logger';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    // Si es un error de nuestra aplicación
    if (err instanceof AppError) {
        logError(`AppError: ${err.message}`, err);

        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message
        });
    }

    // Si es un error de validación de Zod
    if (err instanceof ZodError) {
        logError(`ZodError: ${err.message}`, err);

        return res.status(400).json({
            status: 'error',
            message: 'Error de validación',
            errors: err.errors
        });
    }

    // Si es un error de Prisma
    if (err instanceof PrismaClientKnownRequestError) {
        logError(`PrismaError: ${err.message}`, err);

        return res.status(400).json({
            status: 'error',
            message: 'Error en la base de datos',
            code: err.code
        });
    }

    // Para cualquier otro error
    logError(`Internal Server Error: ${err.message}`, err);

    return res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor'
    });
}; 