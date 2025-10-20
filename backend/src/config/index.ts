import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Schema de validación para variables de entorno críticas
const envSchema = z.object({
    PORT: z.string().optional().transform(val => val ? parseInt(val, 10) : 3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().url('DATABASE_URL debe ser una URL válida'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres para ser seguro'),
    JWT_EXPIRES_IN: z.string().default('24h'),
    OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY es requerida'),
    OPENAI_MODEL: z.string().default('gpt-3.5-turbo'),
    OPENAI_MAX_TOKENS: z.string().optional().transform(val => val ? parseInt(val, 10) : 1000),
    RATE_LIMIT_WINDOW_MS: z.string().optional().transform(val => val ? parseInt(val, 10) : 15 * 60 * 1000),
    RATE_LIMIT_MAX: z.string().optional().transform(val => val ? parseInt(val, 10) : 100),
});

// Validar variables de entorno al startup
function validateEnvironment() {
    try {
        const env = envSchema.parse(process.env);
        // Environment validated
        const { StructuredLogger } = require('../utils/structured-logger');
        StructuredLogger.info('✅ Environment variables validated successfully');
        return env;
    } catch (error) {
        if (error instanceof z.ZodError) {
                const { StructuredLogger } = require('../utils/structured-logger');
                StructuredLogger.error('❌ Environment validation failed', error);
                if (error.errors && Array.isArray(error.errors)) {
                    for (const err of error.errors) {
                        StructuredLogger.error(`  - ${err.path.join('.')}: ${err.message}`);
                    }
                }
                StructuredLogger.error('\n🔧 Please check your .env file and ensure all required variables are set correctly.');
            process.exit(1);
        }
        throw error;
    }
}

const env = validateEnvironment();

export const config = {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    database: {
        url: env.DATABASE_URL
    },
    jwt: {
        secret: env.JWT_SECRET,
        expiresIn: env.JWT_EXPIRES_IN
    },
    openai: {
        apiKey: env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL,
        maxTokens: env.OPENAI_MAX_TOKENS
    },
    rateLimit: {
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        max: env.RATE_LIMIT_MAX
    },
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        enabled: !!process.env.REDIS_URL
    }
}; 