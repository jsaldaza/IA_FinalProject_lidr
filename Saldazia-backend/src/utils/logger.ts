import winston from 'winston';
import path from 'path';

const logDir = 'logs';

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: 'testforge-backend' },
    transports: [
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Función helper para logging de errores
export function logError(message: string, error: Error): void {
    logger.error(message, {
        error: {
            message: error.message,
            stack: error.stack,
            name: error.name
        }
    });
}

// Función helper para logging de información
export function logInfo(message: string, meta?: Record<string, unknown>): void {
    logger.info(message, meta);
}

// Función helper para logging de advertencias
export function logWarn(message: string, meta?: Record<string, unknown>): void {
    logger.warn(message, meta);
}

// Función helper para logging de debug
export function logDebug(message: string, meta?: Record<string, unknown>): void {
    logger.debug(message, meta);
}

export default logger; 