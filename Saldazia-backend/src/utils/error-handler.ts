import { Request, Response, NextFunction } from 'express';
import { StructuredLogger } from '../utils/structured-logger';

/**
 * Sistema de manejo de errores estandarizado y profesional
 * 
 * Características:
 * - Jerarquía de errores personalizada
 * - Códigos de error consistentes
 * - Logging estructurado
 * - Respuestas estandarizadas
 * - Manejo de diferentes tipos de errores
 */

// Enums para códigos de error consistentes
export enum ErrorCodes {
  // Errores de autenticación y autorización
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_BLACKLISTED = 'TOKEN_BLACKLISTED',

  // Errores de validación
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Errores de recursos
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',

  // Errores de negocio
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  PROJECT_LIMIT_EXCEEDED = 'PROJECT_LIMIT_EXCEEDED',
  BUDGET_LIMIT_EXCEEDED = 'BUDGET_LIMIT_EXCEEDED',

  // Errores de rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // Errores del sistema
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // Errores de configuración
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

// Clase base para errores personalizados
export abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly timestamp: string;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    this.details = details;

    // Mantener stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  // Método para serializar el error para logging
  public toLogObject() {
    return {
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      isOperational: this.isOperational,
      timestamp: this.timestamp,
      stack: this.stack,
      details: this.details
    };
  }

  // Método para respuesta al cliente (sin stack trace)
  public toClientResponse() {
    return {
      status: 'error',
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      ...(this.details && { details: this.details })
    };
  }
}

// Errores específicos de autenticación
export class UnauthorizedError extends AppError {
  constructor(message: string = 'No autorizado', details?: any) {
    super(message, 401, ErrorCodes.UNAUTHORIZED, true, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Acceso prohibido', details?: any) {
    super(message, 403, ErrorCodes.FORBIDDEN, true, details);
  }
}

export class TokenExpiredError extends AppError {
  constructor(message: string = 'Token expirado', details?: any) {
    super(message, 401, ErrorCodes.TOKEN_EXPIRED, true, details);
  }
}

// Errores de validación
export class ValidationError extends AppError {
  constructor(message: string = 'Error de validación', details?: any) {
    super(message, 400, ErrorCodes.VALIDATION_ERROR, true, details);
  }
}

// Errores de recursos
export class NotFoundError extends AppError {
  constructor(resource: string = 'Recurso', details?: any) {
    super(`${resource} no encontrado`, 404, ErrorCodes.RESOURCE_NOT_FOUND, true, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflicto de recursos', details?: any) {
    super(message, 409, ErrorCodes.RESOURCE_CONFLICT, true, details);
  }
}

// Errores de negocio
export class BusinessRuleError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, ErrorCodes.BUSINESS_RULE_VIOLATION, true, details);
  }
}

export class ProjectLimitError extends AppError {
  constructor(message: string = 'Límite de proyectos alcanzado', details?: any) {
    super(message, 400, ErrorCodes.PROJECT_LIMIT_EXCEEDED, true, details);
  }
}

// Errores de rate limiting
export class RateLimitError extends AppError {
  constructor(message: string = 'Límite de requests excedido', details?: any) {
    super(message, 429, ErrorCodes.RATE_LIMIT_EXCEEDED, true, details);
  }
}

// Errores del sistema
export class InternalServerError extends AppError {
  constructor(message: string = 'Error interno del servidor', details?: any) {
    super(message, 500, ErrorCodes.INTERNAL_SERVER_ERROR, false, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Error de base de datos', details?: any) {
    super(message, 500, ErrorCodes.DATABASE_ERROR, false, details);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string, details?: any) {
    const errorMessage = message || `Error en servicio externo: ${service}`;
    super(errorMessage, 502, ErrorCodes.EXTERNAL_SERVICE_ERROR, true, details);
  }
}

/**
 * Middleware global para manejo de errores
 */
export const globalErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  const userId = (req as any).user?.id || 'anonymous';

  // Si es un AppError, manejarlo apropiadamente
  if (error instanceof AppError) {
    // Log del error estructurado
    if (error.isOperational) {
      StructuredLogger.warn('Operational error occurred', {
        requestId,
        userId,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        error: error.toLogObject()
      });
    } else {
      StructuredLogger.error('System error occurred', error, {
        requestId,
        userId,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        error: error.toLogObject()
      });
    }

    // Respuesta al cliente
    res.status(error.statusCode).json(error.toClientResponse());
    return;
  }

  // Manejar errores específicos de Prisma
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    let appError: AppError;

    switch (prismaError.code) {
      case 'P2002':
        appError = new ConflictError('Registro duplicado', { field: prismaError.meta?.target });
        break;
      case 'P2025':
        appError = new NotFoundError('Registro', { operation: prismaError.meta?.cause });
        break;
      default:
        appError = new DatabaseError('Error de base de datos', { code: prismaError.code });
    }

    return globalErrorHandler(appError, req, res, next);
  }

  // Errores de JWT
  if (error.name === 'JsonWebTokenError') {
    const jwtError = new UnauthorizedError('Token inválido');
    return globalErrorHandler(jwtError, req, res, next);
  }

  if (error.name === 'TokenExpiredError') {
    const expiredError = new TokenExpiredError();
    return globalErrorHandler(expiredError, req, res, next);
  }

  // Error no manejado - crear AppError genérico
  const unexpectedError = new InternalServerError(
    process.env.NODE_ENV === 'production' 
      ? 'Ha ocurrido un error inesperado'
      : error.message,
    {
      originalError: error.name,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    }
  );

  globalErrorHandler(unexpectedError, req, res, next);
};

/**
 * Middleware para manejar rutas no encontradas
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new NotFoundError('Endpoint', {
    method: req.method,
    path: req.originalUrl
  });
  
  next(error);
};

/**
 * Utility para crear respuestas de éxito estandarizadas
 */
export class ResponseHandler {
  static success<T>(
    res: Response, 
    data: T, 
    message: string = 'Operación exitosa',
    meta?: any
  ): Response {
    return res.json({
      status: 'success',
      message,
      data,
      timestamp: new Date().toISOString(),
      ...(meta && { meta })
    });
  }

  static created<T>(
    res: Response, 
    data: T, 
    message: string = 'Recurso creado exitosamente',
    meta?: any
  ): Response {
    return res.status(201).json({
      status: 'success',
      message,
      data,
      timestamp: new Date().toISOString(),
      ...(meta && { meta })
    });
  }

  static noContent(res: Response, message: string = 'Operación exitosa'): Response {
    return res.status(204).json({
      status: 'success',
      message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Utility para wrapping de funciones async para manejo automático de errores
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};