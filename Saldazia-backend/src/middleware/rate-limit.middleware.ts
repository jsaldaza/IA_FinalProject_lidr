import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { StructuredLogger } from '../utils/structured-logger';

/**
 * Centralized rate limit for the entire API. Specific routes may mount stricter
 * limiters (e.g., loginRateLimit) but they should reuse this config or be
 * placed as route-level middleware. This prevents duplications and conflicts.
 */
export const globalRateLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        StructuredLogger.security('Global rate limit exceeded', {
            action: 'global_rate_limit_exceeded',
            success: false,
            ip: req.ip,
            method: req.method,
            url: req.originalUrl
        });

        res.status(429).json({
            status: 'error',
            message: 'Too many requests. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED'
        });
    }
});

export default globalRateLimiter;
