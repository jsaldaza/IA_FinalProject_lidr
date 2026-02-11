import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { router as authRouter } from './routes/auth.routes';
import { router as conversationalWorkflowRouter } from './routes/conversational-workflow.routes';
import { router as dashboardRouter } from './routes/dashboard.routes';
import projectsRouter from './routes/projects.routes';
import testCasesRouter from './routes/test-cases.routes';
import { globalErrorHandler, notFoundHandler } from './utils/error-handler';
import { StructuredLogger, requestLogger } from './utils/structured-logger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import globalRateLimiter from './middleware/rate-limit.middleware';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { RedisCache } from './utils/redis-cache';

const app = express();
const prisma = new PrismaClient();

// Behind Railway/Vercel we must trust the proxy so rate limiting and IPs work correctly
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
    crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production'
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Structured logging middleware
app.use(requestLogger);

// Cookie parser (required if token extraction from cookies is used)
app.use(cookieParser());

// Centralized global rate limiter
app.use(globalRateLimiter);

// CORS configuration - SECURE
const defaultProdOrigins = [
    'https://testforge.com',
    'https://qnexia.vercel.app',
    'https://iafinalprojectlidr-production.up.railway.app'
];

const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : defaultProdOrigins)
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            StructuredLogger.warn(`CORS: Blocked request from origin`, { origin } as any);
            return callback(new Error('Not allowed by CORS'), false);
        }
    },
    // Include PATCH so browser preflight permits PATCH requests
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // Allow common headers sent by browsers and libraries (Cache-Control is required for some fetch/axios requests)
    allowedHeaders: ['Content-Type', 'Authorization', 'user-id', 'Cache-Control', 'X-Requested-With', 'Accept'],
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Documentación Swagger
if (process.env.NODE_ENV !== 'production') {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'TestForge API Documentation'
    }));
}

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/conversational-workflow', conversationalWorkflowRouter);
app.use('/api/projects', projectsRouter); // ✅ UNIFICADO: API de proyectos completamente unificada
app.use('/api/test-cases', testCasesRouter);

// Development-only aliases: mount same routers without the /api prefix so
// legacy Postman collections or tests that expect root paths continue to work
// during local testing. These MUST NOT be enabled in production.
if (process.env.NODE_ENV !== 'production') {
    app.use('/auth', authRouter);
    app.use('/dashboard', dashboardRouter);
    app.use('/conversational-workflow', conversationalWorkflowRouter);
    app.use('/projects', projectsRouter);
    app.use('/test-cases', testCasesRouter);
}

// Health check endpoints mejorados
import { HealthCheckService } from './services/health-check.service';

/**
 * @swagger
 * /health:
 *   get:
 *     tags:
 *       - Health Check
 *     summary: Health check básico
 *     description: Verifica que el servicio esté funcionando
 *     responses:
 *       200:
 *         description: Servicio funcionando correctamente
 */
app.get('/health', HealthCheckService.basic);

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     tags:
 *       - Health Check
 *     summary: Health check detallado
 *     description: Verifica estado de dependencias y métricas del sistema
 *     responses:
 *       200:
 *         description: Sistema completamente saludable
 *       503:
 *         description: Problema detectado en el sistema
 */
app.get('/health/detailed', HealthCheckService.detailed);

/**
 * @swagger
 * /health/readiness:
 *   get:
 *     tags:
 *       - Health Check
 *     summary: Readiness probe
 *     description: Verifica si el servicio está listo para recibir tráfico
 *     responses:
 *       200:
 *         description: Listo para recibir tráfico
 *       503:
 *         description: No listo para recibir tráfico
 */
app.get('/health/readiness', HealthCheckService.readiness);

/**
 * @swagger
 * /health/liveness:
 *   get:
 *     tags:
 *       - Health Check
 *     summary: Liveness probe
 *     description: Verifica que el proceso esté vivo
 *     responses:
 *       200:
 *         description: Proceso funcionando
 */
app.get('/health/liveness', HealthCheckService.liveness);

// Database test endpoint
app.get('/db-test', async (_req, res) => {
    try {
        await prisma.$connect();
        const stats = await Promise.all([
            prisma.user.count(),
            prisma.project.count(),
            prisma.conversationalAnalysis.count(),
            prisma.analysis.count()
        ]);

        res.json({
            status: 'connected',
            stats: {
                users: stats[0],
                projects: stats[1],
                conversationalAnalyses: stats[2],
                analyses: stats[3]
            }
        });
    } catch (error) {
        StructuredLogger.error('Database error in /db-test', error as Error, { method: 'db-test' });
        res.status(500).json({
            status: 'error',
            message: 'Database connection failed'
        });
    }
});

// Middleware para rutas no encontradas
app.use(notFoundHandler);

// Error handling middleware global
app.use(globalErrorHandler);

// Start server
const port = process.env.PORT || 3000;
const server = app.listen(port, async () => {
    // Initialize Redis cache (will handle missing config internally)
    try {
        await RedisCache.connect();
    } catch (error) {
        StructuredLogger.error('Redis initialization failed, continuing without cache', error as Error);
    }

    StructuredLogger.info('Server started', {
        method: 'start',
        url: `http://localhost:${port}`,
        ip: 'localhost',
        statusCode: 200
    });
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    StructuredLogger.info('SIGTERM signal received. Closing server...', { method: 'SIGTERM' });
    server.close(async () => {
        // Disconnect from Redis
        await RedisCache.disconnect();
        // Disconnect from database
        await prisma.$disconnect();
        StructuredLogger.info('Server closed', { method: 'shutdown' });
        process.exit(0);
    });
});

process.on('uncaughtException', async (error) => {
    StructuredLogger.error('Uncaught Exception', error as Error, { method: 'uncaughtException' });
    server.close(async () => {
        // Disconnect from Redis
        await RedisCache.disconnect();
        // Disconnect from database
        await prisma.$disconnect();
        process.exit(1);
    });
});

export { app }; 