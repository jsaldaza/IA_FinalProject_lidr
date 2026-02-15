/* eslint-disable @typescript-eslint/no-explicit-any */
import { createLogger, format, transports } from 'winston';

// Avoid importing config here to prevent a circular dependency with config.ts
const nodeEnv = (process.env.NODE_ENV as string) || 'development';

// Definir niveles de log personalizados
const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Colores para cada nivel
const logColors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'cyan',
};

// Configurar formato para desarrollo
const developmentFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    format.colorize({ all: true, colors: logColors }),
    format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
);

// Configurar formato para producción (JSON estructurado)
const productionFormat = format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
);

// Crear el logger principal
export const logger = createLogger({
    level: nodeEnv === 'development' ? 'debug' : 'info',
    levels: logLevels,
    format: nodeEnv === 'development' ? developmentFormat : productionFormat,
    transports: [
        // Console transport
        new transports.Console(),
        
        // File transports para producción
    ...(nodeEnv === 'production' ? [
            new transports.File({
                filename: 'logs/error.log',
                level: 'error',
                maxsize: 5242880, // 5MB
                maxFiles: 5,
            }),
            new transports.File({
                filename: 'logs/combined.log',
                maxsize: 5242880, // 5MB
                maxFiles: 5,
            })
        ] : [])
    ],
});

// Interfaces para logs estructurados
export interface LogContext {
    userId?: string;
    requestId?: string;
    method?: string;
    url?: string;
    ip?: string;
    userAgent?: string;
    duration?: number;
    statusCode?: number;
    [key: string]: any; // Allow additional properties
}

export interface SecurityLogContext extends LogContext {
    action: string;
    resource?: string;
    success: boolean;
    reason?: string;
}

export interface AILogContext extends LogContext {
    model?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    cost?: number;
    analysisId?: string;
}

export interface DatabaseLogContext extends LogContext {
    operation: string;
    table?: string;
    query?: string;
    executionTime?: number;
    recordsAffected?: number;
}

// Funciones especializadas para diferentes tipos de logs
export class StructuredLogger {
    // Redact sensitive keys from context/data before logging
    private static redactSensitive(obj?: any): any {
        if (!obj || typeof obj !== 'object') return obj;

        const cloned = Array.isArray(obj) ? [...obj] : { ...obj };

        const sensitiveKeyRegex = /token|password|authorization|auth|secret|apiKey|apikey|accessToken/i;

        const redactValue = (value: any) => {
            if (typeof value === 'string') {
                if (value.length > 120) return value.substring(0, 120) + '...[TRUNCATED]';
                return value.replace(/\S{50,}/g, (match) => match.substring(0, 20) + '...[TRUNCATED]');
            }
            return '[REDACTED]';
        };

        const recurse = (input: any): any => {
            if (input === null || input === undefined) return input;
            if (typeof input !== 'object') return input;

            if (Array.isArray(input)) return input.map(recurse);

            const out: any = {};
            for (const key of Object.keys(input)) {
                try {
                    const val = input[key];
                    if (sensitiveKeyRegex.test(key)) {
                        out[key] = redactValue(val);
                    } else if (typeof val === 'object' && val !== null) {
                        out[key] = recurse(val);
                    } else {
                        out[key] = val;
                    }
                } catch {
                    out[key] = '[UNSERIALIZABLE]';
                }
            }
            return out;
        };

        return recurse(cloned);
    }
    
    // Log de errores estructurado
    static error(message: string, error?: Error, context?: LogContext) {
        logger.error({
            message,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : undefined,
            context: StructuredLogger.redactSensitive(context),
            timestamp: new Date().toISOString()
        });
    }

    // Log de requests HTTP
    static http(message: string, context: LogContext) {
        logger.http({
            message,
            context: StructuredLogger.redactSensitive(context),
            timestamp: new Date().toISOString()
        });
    }

    // Log de seguridad
    static security(message: string, context: SecurityLogContext) {
        logger.warn({
            message,
            type: 'SECURITY',
            context: StructuredLogger.redactSensitive(context),
            timestamp: new Date().toISOString()
        });
    }

    // Log de uso de IA
    static ai(message: string, context: AILogContext) {
        logger.info({
            message,
            type: 'AI_USAGE',
            context: StructuredLogger.redactSensitive(context),
            timestamp: new Date().toISOString()
        });
    }

    // Log de base de datos
    static database(message: string, context: DatabaseLogContext) {
        logger.debug({
            message,
            type: 'DATABASE',
            context: StructuredLogger.redactSensitive(context),
            timestamp: new Date().toISOString()
        });
    }

    // Log general de información
    static info(message: string, context?: LogContext) {
        logger.info({
            message,
            context: StructuredLogger.redactSensitive(context),
            timestamp: new Date().toISOString()
        });
    }

    // Log de debugging
    static debug(message: string, data?: any, context?: LogContext) {
        logger.debug({
            message,
            data: StructuredLogger.redactSensitive(data),
            context: StructuredLogger.redactSensitive(context),
            timestamp: new Date().toISOString()
        });
    }

    // Log de warnings
    static warn(message: string, context?: LogContext) {
        logger.warn({
            message,
            context: StructuredLogger.redactSensitive(context),
            timestamp: new Date().toISOString()
        });
    }
}

// Middleware para logging de requests
export const requestLogger = (req: any, res: any, next: any) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const context: LogContext = {
            userId: req.user?.id,
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            duration,
            statusCode: res.statusCode
        };

        const message = `${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`;
        
        if (res.statusCode >= 400) {
            StructuredLogger.error(message, undefined, context);
        } else {
            StructuredLogger.http(message, context);
        }
    });

    next();
};

// Exportar también el logger básico para compatibilidad
export { logger as basicLogger };
