import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { logError } from '../utils/logger';
import { AppError, ValidationError, DatabaseError, InternalServerError, ResponseHandler } from '../utils/error-handler';

export const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): Response => {
    // Si es un error de nuestra aplicación
    if (err instanceof AppError) {
        logError(`AppError: ${err.message}`, err);
        return ResponseHandler.error(res, err.message, err.statusCode, err.code, err.details);
    }

    // Si es un error de validación de Zod
    if (err instanceof ZodError) {
        logError(`ZodError: ${err.message}`, err);

        const appError = new ValidationError('Error de validación', err.errors);
        return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
    }

    // Si es un error de Prisma
    if (err instanceof PrismaClientKnownRequestError) {
        logError(`PrismaError: ${err.message}`, err);

        const appError = new DatabaseError('Error en la base de datos', { code: err.code });
        return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
    }

    // Para cualquier otro error
    logError(`Internal Server Error: ${err.message}`, err);

    const appError = new InternalServerError('Error interno del servidor');
    return ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
}; 