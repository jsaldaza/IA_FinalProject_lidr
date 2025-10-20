import { RateLimiterRes } from 'rate-limiter-flexible';
import { JwtPayload } from 'jsonwebtoken';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role?: string;
            };
        }
    }

    interface Error {
        statusCode?: number;
        status?: string;
    }
}

// Custom error types
export class AppError extends Error {
    constructor(public statusCode: number, message: string) {
        super(message);
        this.name = 'AppError';
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        Error.captureStackTrace(this, this.constructor);
    }
}

export interface AuthTokenPayload extends JwtPayload {
    id: string;
    email: string;
    role?: string;
}

export interface ApiResponse<T> {
    status: 'success' | 'error' | 'fail';
    data?: T;
    message?: string;
    errors?: Array<{
        field: string;
        message: string;
    }>;
}

// Export to make the file a module
export { }; 