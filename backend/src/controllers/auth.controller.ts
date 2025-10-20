import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { TokenBlacklistService } from '../services/token-blacklist.service';
import { StructuredLogger } from '../utils/structured-logger';

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

class AuthError extends Error {
    constructor(public statusCode: number, message: string) {
        super(message);
        this.name = 'AuthError';
    }
}

export class AuthController {
    private static generateToken(payload: { id: string; email: string }): string {
        // Generate JWT token (do not log payload or token)
        return jwt.sign(payload, config.jwt.secret, { expiresIn: '24h' });
    }

    static async register(req: Request, res: Response): Promise<void> {
        try {
            // Validate input
            const { email, password, name } = registerSchema.parse(req.body);

            // Check if user already exists (optimized)
            const existingUser = await prisma.user.findUnique({
                where: { email },
                select: { id: true }
            });

            if (existingUser) {
                throw new AuthError(400, 'User already exists');
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

            res.status(201).json({
                status: 'success',
                data: {
                    user,
                    token
                }
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    status: 'error',
                    errors: error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message
                    }))
                });
                return;
            }
            if (error instanceof AuthError) {
                res.status(error.statusCode).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }
            console.error('Registration error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    static async login(req: Request, res: Response): Promise<void> {
        try {
            // Validate input
            const { email, password } = loginSchema.parse(req.body);

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

            if (!user) throw new AuthError(401, 'Invalid credentials');

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) throw new AuthError(401, 'Invalid credentials');

            // Generate JWT token
            const token = AuthController.generateToken({ id: user.id, email: user.email });

            // Return user data without password
            const { password: _, ...userWithoutPassword } = user;

            res.json({ status: 'success', data: { user: userWithoutPassword, token } });
        } catch (error) {
            console.error('LOGIN ERROR:', error);
            
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    status: 'error',
                    errors: error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message
                    }))
                });
                return;
            }
            if (error instanceof AuthError) {
                res.status(error.statusCode).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }
            console.error('Login error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    static async getProfile(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;

            if (!userId) {
                throw new AuthError(401, 'Not authenticated');
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
                throw new AuthError(404, 'User not found');
            }

            res.json({
                status: 'success',
                data: user
            });
        } catch (error) {
            if (error instanceof AuthError) {
                res.status(error.statusCode).json({
                    status: 'error',
                    message: error.message
                });
                return;
            }
            console.error('Get profile error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Internal server error'
            });
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
            
            res.json({
                status: 'success',
                message: 'Logged out successfully'
            });
        } catch (error) {
            StructuredLogger.error('Logout error', error as Error, {
                userId: req.user?.id
            });
            
            // Aunque haya error, limpiar cookie local
            res.clearCookie('token');
            res.json({
                status: 'success',
                message: 'Logged out successfully'
            });
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