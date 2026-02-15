import type { JwtPayload } from 'jsonwebtoken';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role?: string;
                [key: string]: unknown;
            } & JwtPayload;
            pagination?: {
                page: number;
                limit: number;
                sortBy: string;
                sortOrder: 'asc' | 'desc';
                skip: number;
            };
        }
    }
} 