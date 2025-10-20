/**
 * Enhanced Configuration Service with Environment Validation
 */

import 'reflect-metadata';
import { StructuredLogger } from '../utils/structured-logger';

export interface DatabaseConfig {
  url: string;
  maxConnections: number;
  connectionTimeout: number;
  queryTimeout: number;
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  dailyBudget: number;
  monthlyBudget: number;
  costAlertThreshold: number;
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  requestSigningSecret: string;
  requestSigningAlgorithm: 'sha256' | 'sha512';
  requestSigningWindow: number;
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  openaiFailureThreshold: number;
  openaiRecoveryTimeout: number;
  databaseFailureThreshold: number;
  databaseRecoveryTimeout: number;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  apiPrefix: string;
  corsOrigin: string[];
  logLevel: string;
  database: DatabaseConfig;
  openai: OpenAIConfig;
  security: SecurityConfig;
  circuitBreaker: CircuitBreakerConfig;
  redis: {
    enabled: boolean;
    host: string;
    port: number;
    password?: string;
    db: number;
    ttl: number;
  };
}

export class EnhancedConfigService {
  private static instance: EnhancedConfigService;
  private config: AppConfig;
  private validationErrors: string[] = [];

  constructor() {
    this.config = this.loadAndValidateConfig();
    this.validateCriticalSettings();
  }

  static getInstance(): EnhancedConfigService {
    if (!this.instance) {
      this.instance = new EnhancedConfigService();
    }
    return this.instance;
  }

  private loadAndValidateConfig(): AppConfig {
    const requiredVars = [
      'DATABASE_URL',
      'OPENAI_API_KEY', 
      'JWT_SECRET',
      'REQUEST_SIGNING_SECRET'
    ];

    // Check required environment variables
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        this.validationErrors.push(`Missing required environment variable: ${varName}`);
      }
    }

    return {
      port: parseInt(process.env.PORT || '3001', 10),
      nodeEnv: process.env.NODE_ENV || 'development',
      apiPrefix: process.env.API_PREFIX || '/api',
      corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['*'],
      logLevel: process.env.LOG_LEVEL || 'info',
      
      database: {
        url: process.env.DATABASE_URL || '',
        maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10', 10),
        connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '30000', 10),
        queryTimeout: parseInt(process.env.DATABASE_QUERY_TIMEOUT || '15000', 10)
      },

      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000', 10),
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
        dailyBudget: parseFloat(process.env.OPENAI_DAILY_BUDGET_USD || '5.00'),
        monthlyBudget: parseFloat(process.env.OPENAI_MONTHLY_BUDGET_USD || '100.00'),
        costAlertThreshold: parseFloat(process.env.OPENAI_COST_ALERT_THRESHOLD || '0.80')
      },

      security: {
        jwtSecret: process.env.JWT_SECRET || '',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
        requestSigningSecret: process.env.REQUEST_SIGNING_SECRET || '',
        requestSigningAlgorithm: (process.env.REQUEST_SIGNING_ALGORITHM as 'sha256' | 'sha512') || 'sha256',
        requestSigningWindow: parseInt(process.env.REQUEST_SIGNING_WINDOW_MS || '300000', 10)
      },

      circuitBreaker: {
        enabled: process.env.CIRCUIT_BREAKER_ENABLED === 'true',
        openaiFailureThreshold: parseInt(process.env.CIRCUIT_BREAKER_OPENAI_FAILURE_THRESHOLD || '3', 10),
        openaiRecoveryTimeout: parseInt(process.env.CIRCUIT_BREAKER_OPENAI_RECOVERY_TIMEOUT || '30000', 10),
        databaseFailureThreshold: parseInt(process.env.CIRCUIT_BREAKER_DATABASE_FAILURE_THRESHOLD || '5', 10),
        databaseRecoveryTimeout: parseInt(process.env.CIRCUIT_BREAKER_DATABASE_RECOVERY_TIMEOUT || '15000', 10)
      },

      redis: {
        enabled: process.env.REDIS_ENABLED === 'true',
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        ttl: parseInt(process.env.REDIS_TTL || '3600', 10)
      }
    };
  }

  private validateCriticalSettings(): void {
    const config = this.config;

    // Validate port range
    if (config.port < 1 || config.port > 65535) {
      this.validationErrors.push('PORT must be between 1 and 65535');
    }

    // Validate OpenAI budget settings
    if (config.openai.dailyBudget <= 0) {
      this.validationErrors.push('OPENAI_DAILY_BUDGET_USD must be greater than 0');
    }

    if (config.openai.monthlyBudget <= 0) {
      this.validationErrors.push('OPENAI_MONTHLY_BUDGET_USD must be greater than 0');
    }

    // Validate JWT secret strength
    if (config.security.jwtSecret.length < 32) {
      this.validationErrors.push('JWT_SECRET should be at least 32 characters long');
    }

    // Validate request signing secret
    if (config.security.requestSigningSecret === 'your-super-secret-key-here') {
      this.validationErrors.push('REQUEST_SIGNING_SECRET must be changed from default value');
    }

    // Log validation results
    if (this.validationErrors.length > 0) {
      StructuredLogger.error('Configuration validation failed', new Error('Invalid configuration'), {
        method: 'validateCriticalSettings',
        errors: this.validationErrors
      });
      
      if (config.nodeEnv === 'production') {
        throw new Error(`Configuration validation failed: ${this.validationErrors.join(', ')}`);
      }
    } else {
      StructuredLogger.info('Configuration validated successfully', {
        method: 'validateCriticalSettings',
        environment: config.nodeEnv,
        circuitBreakerEnabled: config.circuitBreaker.enabled,
        redisEnabled: config.redis.enabled
      });
    }
  }

  // Getter methods
  getConfig(): AppConfig {
    return this.config;
  }

  getDatabaseConfig(): DatabaseConfig {
    return this.config.database;
  }

  getOpenAIConfig(): OpenAIConfig {
    return this.config.openai;
  }

  getSecurityConfig(): SecurityConfig {
    return this.config.security;
  }

  getCircuitBreakerConfig(): CircuitBreakerConfig {
    return this.config.circuitBreaker;
  }

  getValidationErrors(): string[] {
    return [...this.validationErrors];
  }

  isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }

  isDevelopment(): boolean {
    return this.config.nodeEnv === 'development';
  }

  // Configuration health check
  healthCheck(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check database URL format
    if (!this.config.database.url.startsWith('postgresql://')) {
      issues.push('DATABASE_URL does not appear to be a valid PostgreSQL URL');
    }

    // Check OpenAI API key format
    if (!this.config.openai.apiKey.startsWith('sk-')) {
      issues.push('OPENAI_API_KEY does not appear to be valid');
    }

    // Check for development secrets in production
    if (this.isProduction()) {
      if (this.config.security.jwtSecret.includes('development')) {
        issues.push('Using development JWT secret in production');
      }
      
      if (this.config.security.requestSigningSecret.includes('DEV')) {
        issues.push('Using development request signing secret in production');
      }
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }

  // Dynamic configuration updates (for non-critical settings)
  updateLogLevel(level: string): void {
    this.config.logLevel = level;
    StructuredLogger.info('Log level updated dynamically', { 
      method: 'updateLogLevel',
      newLevel: level 
    });
  }

  // Configuration export for debugging
  exportSafeConfig(): any {
    const safeConfig = JSON.parse(JSON.stringify(this.config));
    
    // Mask sensitive data
    safeConfig.database.url = safeConfig.database.url.replace(/:([^@]+)@/, ':***@');
    safeConfig.openai.apiKey = safeConfig.openai.apiKey.substring(0, 8) + '***';
    safeConfig.security.jwtSecret = '***';
    safeConfig.security.requestSigningSecret = '***';
    
    return safeConfig;
  }
}

// Export singleton instance
export const enhancedConfigService = EnhancedConfigService.getInstance();