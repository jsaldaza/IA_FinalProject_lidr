import { ZodIssue } from 'zod';

export class AppError extends Error {
    constructor(
        message: string,
        public statusCode: number = 500,
        public errors?: { field: string; message: string }[]
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message: string, zodErrors: ZodIssue[]) {
        const errors = zodErrors.map(error => ({
            field: error.path.join('.'),
            message: error.message
        }));
        super(message, 400, errors);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string) {
        super(message, 404);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'No autorizado') {
        super(message, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Acceso denegado') {
        super(message, 403);
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, 409);
    }
}

export class RateLimitError extends AppError {
    constructor(message: string = 'Demasiadas solicitudes') {
        super(message, 429);
    }
}

export class InternalServerError extends AppError {
    constructor(message: string = 'Error interno del servidor') {
        super(message, 500);
    }
}

export class DatabaseError extends AppError {
    constructor(message: string = 'Error en la base de datos') {
        super(message, 500);
    }
} 