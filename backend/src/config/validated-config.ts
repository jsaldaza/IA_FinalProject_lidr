/**
 * Enhanced Configuration Validation and Management System
 * Provides type-safe configuration with validation and environment-specific settings
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment validation schema
const EnvironmentSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().min(1000).max(65535).default(5000),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  
  // Database Configuration
  DATABASE_URL: z.string().min(1, 'Database URL is required'),
  REDIS_URL: z.string().optional(),
  
  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT Secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  
  // OpenAI Configuration
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  OPENAI_MODEL: z.string().default('gpt-3.5-turbo'),
  OPENAI_MAX_TOKENS: z.coerce.number().min(1).max(4000).default(1500),
  OPENAI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),
  
  // Security Configuration
  BCRYPT_ROUNDS: z.coerce.number().min(10).max(15).default(12),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  
  // Circuit Breaker Configuration
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: z.coerce.number().min(1).default(5),
  CIRCUIT_BREAKER_TIMEOUT_MS: z.coerce.number().min(1000).default(60000),
  CIRCUIT_BREAKER_RESET_TIMEOUT_MS: z.coerce.number().min(10000).default(30000),
  
  // AI Cost Management
  AI_COST_BUDGET_DAILY: z.coerce.number().min(0).default(50),
  AI_COST_BUDGET_MONTHLY: z.coerce.number().min(0).default(1000),
  AI_COST_WARNING_THRESHOLD: z.coerce.number().min(0).max(1).default(0.8),
  
  // Cache Configuration
  CACHE_TTL_SECONDS: z.coerce.number().min(60).default(3600), // 1 hour
  CACHE_MAX_ENTRIES: z.coerce.number().min(100).default(1000),
  
  // Logging Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE_MAX_SIZE: z.string().default('10m'),
  LOG_FILE_MAX_FILES: z.coerce.number().default(5),
});

// Parse and validate environment variables
let config: z.infer<typeof EnvironmentSchema>;

try {
  config = EnvironmentSchema.parse(process.env);
} catch (error) {
  console.error('❌ Configuration validation failed:');
  if (error instanceof z.ZodError) {
    error.errors.forEach(err => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
  }
  process.exit(1);
}

// Enhanced configuration with computed values
export const enhancedConfig = {
  ...config,
  
  // Computed values
  isDevelopment: config.NODE_ENV === 'development',
  isProduction: config.NODE_ENV === 'production',
  isTest: config.NODE_ENV === 'test',
  
  // Server settings
  server: {
    port: config.PORT,
    host: '0.0.0.0',
    cors: {
      origin: config.FRONTEND_URL,
      credentials: true,
    },
  },
  
  // Database settings
  database: {
    url: config.DATABASE_URL,
    redis: config.REDIS_URL,
  },
  
  // Authentication settings
  auth: {
    jwt: {
      secret: config.JWT_SECRET,
      expiresIn: config.JWT_EXPIRES_IN,
    },
    bcrypt: {
      rounds: config.BCRYPT_ROUNDS,
    },
  },
  
  // OpenAI settings
  openai: {
    apiKey: config.OPENAI_API_KEY,
    model: config.OPENAI_MODEL,
    maxTokens: config.OPENAI_MAX_TOKENS,
    temperature: config.OPENAI_TEMPERATURE,
  },
  
  // Security settings
  security: {
    rateLimit: {
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      maxRequests: config.RATE_LIMIT_MAX_REQUESTS,
    },
  },
  
  // Circuit breaker settings
  circuitBreaker: {
    failureThreshold: config.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
    timeout: config.CIRCUIT_BREAKER_TIMEOUT_MS,
    resetTimeout: config.CIRCUIT_BREAKER_RESET_TIMEOUT_MS,
  },
  
  // AI cost management
  aiCost: {
    budgetDaily: config.AI_COST_BUDGET_DAILY,
    budgetMonthly: config.AI_COST_BUDGET_MONTHLY,
    warningThreshold: config.AI_COST_WARNING_THRESHOLD,
  },
  
  // Cache settings
  cache: {
    ttl: config.CACHE_TTL_SECONDS,
    maxEntries: config.CACHE_MAX_ENTRIES,
  },
  
  // Logging settings
  logging: {
    level: config.LOG_LEVEL,
    file: {
      maxSize: config.LOG_FILE_MAX_SIZE,
      maxFiles: config.LOG_FILE_MAX_FILES,
    },
  },
};

// Configuration validation function
export const validateConfig = (): boolean => {
  try {
    EnvironmentSchema.parse(process.env);
    return true;
  } catch {
    return false;
  }
};

// Get configuration value with type safety
export const getConfig = <K extends keyof typeof enhancedConfig>(key: K): typeof enhancedConfig[K] => {
  return enhancedConfig[key];
};

// Configuration summary for logging
export const getConfigSummary = () => ({
  environment: config.NODE_ENV,
  port: config.PORT,
  database: config.DATABASE_URL ? '✓ Connected' : '✗ Missing',
  redis: config.REDIS_URL ? '✓ Connected' : '✗ Optional',
  openai: config.OPENAI_API_KEY ? '✓ Configured' : '✗ Missing',
  jwt: config.JWT_SECRET ? '✓ Configured' : '✗ Missing',
});

export default enhancedConfig;