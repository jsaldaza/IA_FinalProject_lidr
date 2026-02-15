/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { StructuredLogger } from './structured-logger';
import { ResponseHandler as SharedResponseHandler } from './response-handler';

enum ErrorCodes {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_BLACKLISTED = 'TOKEN_BLACKLISTED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  PROJECT_LIMIT_EXCEEDED = 'PROJECT_LIMIT_EXCEEDED',
  BUDGET_LIMIT_EXCEEDED = 'BUDGET_LIMIT_EXCEEDED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly timestamp: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, code: ErrorCodes, isOperational: boolean = true, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    this.details = details;
  }

  toClientResponse() {
    return {
      status: 'error',
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp
    };
  }

  toLogObject() {
    return {
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      isOperational: this.isOperational,
      details: this.details,
      stack: this.stack,
      timestamp: this.timestamp
    };
  }
}

class UnauthorizedError extends AppError {
  constructor(message: string = 'No autorizado', details?: unknown) {
    super(message, 401, ErrorCodes.UNAUTHORIZED, true, details);
  }
}

class ForbiddenError extends AppError {
  constructor(message: string = 'Acceso denegado', details?: unknown) {
    super(message, 403, ErrorCodes.FORBIDDEN, true, details);
  }
}

class TokenExpiredError extends AppError {
  constructor(message: string = 'Token expirado', details?: unknown) {
    super(message, 401, ErrorCodes.TOKEN_EXPIRED, true, details);
  }
}

class TokenInvalidError extends AppError {
  constructor(message: string = 'Token inválido', details?: unknown) {
    super(message, 401, ErrorCodes.TOKEN_INVALID, true, details);
  }
}

class ValidationError extends AppError {
  constructor(message: string = 'Error de validación', details?: unknown) {
    super(message, 400, ErrorCodes.VALIDATION_ERROR, true, details);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string = 'Recurso', details?: unknown) {
    super(`${resource} no encontrado`, 404, ErrorCodes.RESOURCE_NOT_FOUND, true, details);
  }
}

class ConflictError extends AppError {
  constructor(message: string = 'Conflicto de recursos', details?: unknown) {
    super(message, 409, ErrorCodes.RESOURCE_CONFLICT, true, details);
  }
}

class BusinessRuleError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, ErrorCodes.BUSINESS_RULE_VIOLATION, true, details);
  }
}

class ProjectLimitError extends AppError {
  constructor(message: string = 'Límite de proyectos alcanzado', details?: unknown) {
    super(message, 400, ErrorCodes.PROJECT_LIMIT_EXCEEDED, true, details);
  }
}

class RateLimitError extends AppError {
  constructor(message: string = 'Límite de requests excedido', details?: unknown) {
    super(message, 429, ErrorCodes.RATE_LIMIT_EXCEEDED, true, details);
  }
}

class InternalServerError extends AppError {
  constructor(message: string = 'Error interno del servidor', details?: unknown) {
    super(message, 500, ErrorCodes.INTERNAL_SERVER_ERROR, false, details);
  }
}

class DatabaseError extends AppError {
  constructor(message: string = 'Error de base de datos', details?: unknown) {
    super(message, 500, ErrorCodes.DATABASE_ERROR, false, details);
  }
}

class ExternalServiceError extends AppError {
  constructor(service: string, message?: string, details?: unknown) {
    const errorMessage = message || `Error en servicio externo: ${service}`;
    super(errorMessage, 502, ErrorCodes.EXTERNAL_SERVICE_ERROR, true, details);
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Servicio no disponible', details?: unknown) {
    super(message, 503, ErrorCodes.SERVICE_UNAVAILABLE, true, details);
  }
}

const globalErrorHandler = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  const requestId = (req.headers['x-request-id'] as string) || 'unknown';
  const userId = (req as any).user?.id || 'anonymous';

  if (error instanceof AppError) {
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

    res.status(error.statusCode).json(error.toClientResponse());
    return;
  }

  if ((error as any)?.name === 'PrismaClientKnownRequestError') {
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

  if ((error as any)?.name === 'JsonWebTokenError') {
    const jwtError = new TokenInvalidError('Token inválido');
    return globalErrorHandler(jwtError, req, res, next);
  }

  if ((error as any)?.name === 'TokenExpiredError') {
    const expiredError = new TokenExpiredError();
    return globalErrorHandler(expiredError, req, res, next);
  }

  const unexpectedError = new InternalServerError(
    process.env.NODE_ENV === 'production'
      ? 'Ha ocurrido un error inesperado'
      : error?.message || 'Unexpected error',
    {
      originalError: (error as any)?.name,
      stack: process.env.NODE_ENV !== 'production' ? error?.stack : undefined
    }
  );

  globalErrorHandler(unexpectedError, req, res, next);
};

const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new NotFoundError('Endpoint', {
    method: req.method,
    path: req.originalUrl
  });
  next(error);
};

const ResponseHandler = SharedResponseHandler;

const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export {
  AppError,
  ErrorCodes,
  UnauthorizedError,
  ForbiddenError,
  TokenExpiredError,
  TokenInvalidError,
  ValidationError,
  NotFoundError,
  ConflictError,
  BusinessRuleError,
  ProjectLimitError,
  RateLimitError,
  InternalServerError,
  DatabaseError,
  ExternalServiceError,
  ServiceUnavailableError,
  globalErrorHandler,
  notFoundHandler,
  ResponseHandler,
  asyncHandler
};
