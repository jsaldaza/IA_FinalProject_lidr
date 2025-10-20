import { z } from 'zod';
import dotenv from 'dotenv';
import { StructuredLogger } from './utils/structured-logger';

dotenv.config();

// Schema de validación robusto para variables de entorno críticas
const configSchema = z.object({
    port: z.number().default(3001),
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
    database: z.object({
        url: z.string().url('DATABASE_URL debe ser una URL válida'),
    }),
    jwt: z.object({
        secret: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres para ser seguro'),
        expiresIn: z.string().default('24h'),
    }),
    openai: z.object({
        apiKey: z.string().min(1, 'OPENAI_API_KEY es requerida'),
        model: z.string().default('gpt-3.5-turbo'),
        maxTokens: z.number().positive().default(2000),
    }),
    rateLimit: z.object({
        windowMs: z.number().positive().default(15 * 60 * 1000), // 15 minutes
        max: z.number().positive().default(100), // limit each IP to 100 requests per windowMs
    }),
});

type Config = z.infer<typeof configSchema>;

// Función para validar y cargar configuración
function loadConfig(): Config {
    const rawConfig: Config = {
        port: Number(process.env.PORT) || 3001,
        nodeEnv: (process.env.NODE_ENV as Config['nodeEnv']) || 'development',
        database: {
            url: process.env.DATABASE_URL || '',
        },
        jwt: {
            secret: process.env.JWT_SECRET || '',
            expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        },
        openai: {
            apiKey: process.env.OPENAI_API_KEY || '',
            model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
            maxTokens: Number(process.env.OPENAI_MAX_TOKENS) || 2000,
        },
        rateLimit: {
            windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
            max: Number(process.env.RATE_LIMIT_MAX) || 100,
        },
    };

    try {
        const validatedConfig = configSchema.parse(rawConfig);
        // Use StructuredLogger and avoid printing sensitive values
        StructuredLogger.info('Configuration loaded and validated successfully', {
            nodeEnv: validatedConfig.nodeEnv,
            port: validatedConfig.port,
            // Do not log database URL or secrets
        } as any);
        return validatedConfig;
    } catch (error) {
        if (error instanceof z.ZodError) {
            StructuredLogger.error('Configuration validation failed', error, {
                // Attach field paths and messages in a redacted-friendly way
                validationErrors: error.errors.map(err => ({ path: err.path.join('.'), message: err.message })) as any
            } as any);
            StructuredLogger.info('Please check your .env file and ensure all required variables are set correctly', {
                required: ['DATABASE_URL', 'JWT_SECRET', 'OPENAI_API_KEY']
            } as any);
            process.exit(1);
        }
        throw error;
    }
}

export const config = loadConfig(); 