import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role?: string;
                [key: string]: any;
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