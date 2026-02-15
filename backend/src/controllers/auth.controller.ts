import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { TokenBlacklistService } from '../services/token-blacklist.service';
import { StructuredLogger } from '../utils/structured-logger';
import { ResponseHandler } from '../utils/response-handler';
import { ValidationError, UnauthorizedError, ConflictError, InternalServerError, NotFoundError, AppError } from '../utils/error-handler';

// Validation schemas
const registerSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
});

const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

export class AuthController {
    private static generateToken(payload: { id: string; email: string }): string {
        // Generate JWT token (do not log payload or token)
        return jwt.sign(payload, config.jwt.secret, { expiresIn: '24h' });
    }

    static async register(req: Request, res: Response): Promise<void> {
        try {
            const parsed = registerSchema.safeParse(req.body);
            if (!parsed.success) {
                throw new ValidationError('Invalid input', parsed.error.errors);
            }
            const { email, password, name } = parsed.data;

            // Check if user already exists (optimized)
            const existingUser = await prisma.user.findUnique({
                where: { email },
                select: { id: true }
            });

            if (existingUser) {
                throw new ConflictError('User already exists');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            // Create user
            const user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    createdAt: true
                }
            });

            // Generate JWT token
            const token = AuthController.generateToken({
                id: user.id,
                email: user.email
            });

            // Set cookie for additional security
            res.cookie('token', token, {
                httpOnly: true,
                secure: config.nodeEnv === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });

            ResponseHandler.created(res, { user, token });
        } catch (error) {
            const appError = error instanceof AppError ? error : new InternalServerError('Internal server error');
            StructuredLogger.error('Registration error', error as Error, { email: req.body?.email });
            ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
        }
    }

    static async login(req: Request, res: Response): Promise<void> {
        try {
            const parsed = loginSchema.safeParse(req.body);
            if (!parsed.success) {
                throw new ValidationError('Invalid input', parsed.error.errors);
            }
            const { email, password } = parsed.data;

            // Find user (optimized - only select needed fields)
            const user = await prisma.user.findUnique({ 
                where: { email },
                select: {
                    id: true,
                    email: true,
                    password: true,
                    name: true,
                    createdAt: true,
                    updatedAt: true
                }
            });

            if (!user) throw new UnauthorizedError('Invalid credentials');

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) throw new UnauthorizedError('Invalid credentials');

            // Generate JWT token
            const token = AuthController.generateToken({ id: user.id, email: user.email });

            // Return user data without password
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password: _password, ...userWithoutPassword } = user;

            ResponseHandler.success(res, { user: userWithoutPassword, token });
        } catch (error) {
            const appError = error instanceof AppError ? error : new InternalServerError('Internal server error');
            StructuredLogger.error('LOGIN ERROR', error as Error, { email: req.body?.email });
            ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
        }
    }

    static async getProfile(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;

            if (!userId) {
                throw new UnauthorizedError('Not authenticated');
            }

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    createdAt: true,
                    conversationalAnalyses: {
                        select: {
                            id: true,
                            title: true,
                            description: true
                        }
                    }
                }
            });

            if (!user) {
                throw new NotFoundError('User');
            }

            ResponseHandler.success(res, user);
        } catch (error) {
            const appError = error instanceof AppError ? error : new InternalServerError('Internal server error');
            StructuredLogger.error('Get profile error', error as Error, { userId: req.user?.id });
            ResponseHandler.error(res, appError.message, appError.statusCode, appError.code, appError.details);
        }
    }

    static async logout(req: Request, res: Response): Promise<void> {
        try {
            // Extraer token del header o cookie
            const token = extractTokenFromRequest(req);
            
            if (token && req.user?.id) {
                // Invalidar el token agregándolo a la blacklist
                await TokenBlacklistService.invalidateToken(token, req.user.id, 'LOGOUT');
                
                StructuredLogger.security('User logged out successfully', {
                    action: 'logout',
                    success: true,
                    userId: req.user.id
                });
            }
            
            // Limpiar cookie
            res.clearCookie('token', {
                httpOnly: true,
                secure: config.nodeEnv === 'production',
                sameSite: 'strict'
            });
            
            ResponseHandler.success(res, { message: 'Logged out successfully' });
        } catch (error) {
            StructuredLogger.error('Logout error', error as Error, {
                userId: req.user?.id
            });
            
            // Aunque haya error, limpiar cookie local
            res.clearCookie('token');
            ResponseHandler.success(res, { message: 'Logged out successfully' });
        }
    }
}

/**
 * Función auxiliar para extraer token de la request
 */
function extractTokenFromRequest(req: Request): string | null {
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