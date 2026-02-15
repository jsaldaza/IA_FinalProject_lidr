import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import { StructuredLogger } from '../utils/structured-logger';
import { TokenBlacklistService } from '../services/token-blacklist.service';
import { AppError, UnauthorizedError, InternalServerError } from '../utils/error-handler';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
    };
}

interface JWTPayload {
    id: string;
    email: string;
    role?: string;
    iat: number;
    exp: number;
}

/**
 * Middleware de autenticación unificado y mejorado
 * Características:
 * - Soporte para Bearer tokens y cookies
 * - Tokens demo en desarrollo
 * - Verificación de usuario en base de datos
 * - Logging estructurado
 * - Manejo de errores consistente
 */
export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = extractToken(req);
        
        if (!token) {
            StructuredLogger.security('Authentication failed: No token provided', {
                action: 'authenticate',
                success: false,
                reason: 'missing_token',
                ip: req.ip,
                method: req.method,
                url: req.originalUrl
            });
            
            throw new UnauthorizedError('Authentication required. Please log in.');
        }

        // Handle demo token in development (RESTRICTED)
        if (config.nodeEnv === 'development' && token === 'demo-token' && process.env.ALLOW_DEMO_TOKEN === 'true') {
            StructuredLogger.security('Demo token authenticated - DEVELOPMENT ONLY', {
                action: 'authenticate',
                success: true,
                userId: 'demo-user-id'
            });
            
            req.user = {
                id: 'demo-user-id',
                email: 'demo@test.com'
            };
            
            return next();
        }

        // Verify JWT token
        const decoded = await verifyToken(token);
        
        // Check if token is blacklisted (invalidated)
        const isBlacklisted = await TokenBlacklistService.isTokenBlacklisted(token);
        if (isBlacklisted) {
            StructuredLogger.security('Authentication failed: Token is blacklisted', {
                action: 'authenticate',
                success: false,
                reason: 'blacklisted_token',
                userId: decoded.id,
                ip: req.ip
            });
            
            throw new UnauthorizedError('Token has been invalidated. Please log in again.');
        }
        
        // Verify user exists in database (security check)
        const user = await verifyUserExists(decoded.id);
        
        if (!user) {
            StructuredLogger.security('Authentication failed: User no longer exists', {
                action: 'authenticate',
                success: false,
                reason: 'user_not_found',
                userId: decoded.id,
                ip: req.ip
            });
            
            throw new UnauthorizedError('User account no longer exists.');
        }

        // Attach authenticated user to request
        req.user = {
            id: user.id,
            email: user.email
        };

        StructuredLogger.security('User authenticated successfully', {
            action: 'authenticate',
            success: true,
            userId: user.id
        });

        next();
    } catch (error) {
        handleAuthenticationError(error, req, res, next);
    }
};

/**
 * Extrae el token de la request (header Authorization o cookie)
 */
function extractToken(req: Request): string | null {
    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }

    // Fallback to cookie
    if (req.cookies && req.cookies.token) {
        return req.cookies.token;
    }

    return null;
}

/**
 * Verifica y decodifica el JWT token
 */
async function verifyToken(token: string): Promise<JWTPayload> {
    try {
        const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
        
        // Validate required fields
        if (!decoded.id || !decoded.email) {
            throw new UnauthorizedError('Invalid token payload');
        }

        return decoded;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new UnauthorizedError('Token has expired');
        } else if (error instanceof jwt.JsonWebTokenError) {
            throw new UnauthorizedError('Invalid token');
        }
        throw error;
    }
}

/**
 * Verifica que el usuario existe en la base de datos
 */
async function verifyUserExists(userId: string): Promise<{ id: string; email: string } | null> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true }
        });
        return user;
    } catch (error) {
        StructuredLogger.error('Database error during user verification', error as Error, {
            userId
        });
        throw new InternalServerError('Database connection error');
    }
}

/**
 * Maneja errores de autenticación de forma centralizada
 */
function handleAuthenticationError(error: unknown, req: Request, res: Response, next: NextFunction): void {
    StructuredLogger.error('Authentication error', error as Error, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip
    });

    const appError = error instanceof AppError
        ? error
        : new InternalServerError('Authentication failed');

    next(appError);
}
