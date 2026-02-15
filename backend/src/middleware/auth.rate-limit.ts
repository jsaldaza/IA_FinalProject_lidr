import rateLimit from 'express-rate-limit';
import { RateLimiterMemory } from 'rate-limiter-flexible';
 
import { Request, Response, NextFunction } from 'express';
import { StructuredLogger } from '../utils/structured-logger';

/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Rate Limiting agresivo específico para endpoints de autenticación
 * Para prevenir ataques de fuerza bruta
 */

// Rate limiter para intentos de login - MUY RESTRICTIVO
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos de login por IP cada 15 minutos
  message: {
    status: 'error',
    message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 15 * 60 // segundos
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    StructuredLogger.security(`Login rate limit exceeded - ${req.originalUrl}`, {
      action: 'rate_limit_exceeded',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      success: false
    });
    
    res.status(429).json({
      status: 'error',
      message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 15 * 60
    });
  },
  skip: (req: Request) => {
  // In development skip strict login limits to simplify local testing
  if (process.env.NODE_ENV === 'development') return true;

  // Otherwise only skip for demo tokens when explicitly provided
  const isDemo = req.headers.authorization === 'Bearer demo-token';
  return Boolean(isDemo);
  }
});

// Rate limiter para registro - MODERADAMENTE RESTRICTIVO
export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // máximo 3 registros por IP por hora
  skip: () => {
    // In development allow registration without rate limiting
    return process.env.NODE_ENV === 'development';
  },
  message: {
    status: 'error',
    message: 'Demasiados intentos de registro. Intenta de nuevo en 1 hora.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    StructuredLogger.security(`Register rate limit exceeded - ${req.originalUrl}`, {
      action: 'register_rate_limit_exceeded',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      success: false
    });
    
    res.status(429).json({
      status: 'error',
      message: 'Demasiados intentos de registro. Intenta de nuevo en 1 hora.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 60 * 60
    });
  }
});

// Rate limiter avanzado para bloqueo por email específico
const emailLoginLimiter = new RateLimiterMemory({
  points: 3, // máximo 3 intentos
  duration: 30 * 60, // por 30 minutos
  blockDuration: 30 * 60, // bloquea por 30 minutos después de agotar intentos
});

/**
 * Middleware para rate limiting por email específico
 * Previene ataques dirigidos a cuentas específicas
 */
export const emailSpecificRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
  // Allow free requests in development to simplify local debugging
  if (process.env.NODE_ENV === 'development') return next();
    const email = req.body?.email;
    
    if (!email) {
      return next();
    }

    // Clave única por email
    const key = `login_${email}`;
    
    try {
      await emailLoginLimiter.consume(key);
      next();
    } catch (rateLimiterRes) {
      // Email específico bloqueado
      StructuredLogger.security(`Email-specific rate limit exceeded for ${email}`, {
        action: 'email_rate_limit_exceeded',
        ip: req.ip,
        url: req.originalUrl,
        success: false
      });

      const remainingMinutes = Math.ceil(((rateLimiterRes as any).msBeforeNext || 30 * 60 * 1000) / 60000);
      
      res.status(429).json({
        status: 'error',
        message: `Esta cuenta está temporalmente bloqueada por seguridad. Intenta de nuevo en ${remainingMinutes} minutos.`,
        code: 'EMAIL_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(((rateLimiterRes as any).msBeforeNext || 0) / 1000)
      });
    }
  } catch (error) {
    StructuredLogger.error(`Error in email rate limiting for ${req.body?.email}`, error as Error, {
      ip: req.ip,
      url: req.originalUrl
    });
    
    // En caso de error, continúa pero loggea el problema
    next();
  }
};

/**
 * Rate limiter global para endpoints de autenticación
 * Capa adicional de protección
 */
export const authGlobalRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // máximo 20 requests de auth por IP cada 5 minutos
  message: {
    status: 'error',
    message: 'Demasiadas solicitudes de autenticación. Intenta de nuevo en unos minutos.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: 5 * 60
  },
  skip: () => {
    // In development allow auth endpoints without global limiting
    return process.env.NODE_ENV === 'development';
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    StructuredLogger.security(`Auth global rate limit exceeded - ${req.originalUrl}`, {
      action: 'auth_global_rate_limit_exceeded',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      success: false
    });
    
    res.status(429).json({
      status: 'error',
      message: 'Demasiadas solicitudes de autenticación. Intenta de nuevo en unos minutos.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: 5 * 60
    });
  }
});
