/**
 * Servicio de configuración centralizada
 * Valida y gestiona todas las variables de entorno y configuraciones del sistema
 */
export class ConfigService {
  private static instance: ConfigService;
  private config: Record<string, any> = {};

  private constructor() {
    this.loadConfiguration();
    this.validateRequired();
  }

  /**
   * Singleton pattern para asegurar una sola instancia
   */
  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Carga toda la configuración desde variables de entorno
   */
  private loadConfiguration(): void {
    this.config = {
      // Base de datos
      database: {
        url: process.env.DATABASE_URL,
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
        connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '3'),
      },

      // Redis Cache
      redis: {
        url: process.env.REDIS_URL,
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
        retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000'),
      },

      // OpenAI
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
        timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000'),
      },

      // Servidor
      server: {
        port: parseInt(process.env.PORT || '3000'),
        host: process.env.HOST || 'localhost',
        nodeEnv: process.env.NODE_ENV || 'development',
        corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      },

      // JWT
      jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      },

      // Cache
      cache: {
        defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '3600'),
        maxMemoryItems: parseInt(process.env.CACHE_MAX_MEMORY_ITEMS || '1000'),
        cleanupInterval: parseInt(process.env.CACHE_CLEANUP_INTERVAL || '300000'),
      },

      // Circuit Breaker
      circuitBreaker: {
        maxFailures: parseInt(process.env.CIRCUIT_BREAKER_MAX_FAILURES || '5'),
        timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000'),
        resetAttemptInterval: parseInt(process.env.CIRCUIT_BREAKER_RESET_INTERVAL || '30000'),
      },

      // Event Store
      eventStore: {
        batchSize: parseInt(process.env.EVENT_STORE_BATCH_SIZE || '100'),
        retentionDays: parseInt(process.env.EVENT_STORE_RETENTION_DAYS || '365'),
        compressionEnabled: process.env.EVENT_STORE_COMPRESSION === 'true',
      },

      // Logging
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'json',
        maxFileSize: process.env.LOG_MAX_FILE_SIZE || '10m',
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
      },

      // Features flags
      features: {
        conversationalAnalysis: process.env.FEATURE_CONVERSATIONAL_ANALYSIS !== 'false',
        aiIntegration: process.env.FEATURE_AI_INTEGRATION !== 'false',
        realTimeUpdates: process.env.FEATURE_REAL_TIME_UPDATES === 'true',
        advancedMetrics: process.env.FEATURE_ADVANCED_METRICS === 'true',
      },
    };
  }

  /**
   * Valida que todas las configuraciones requeridas estén presentes
   */
  private validateRequired(): void {
    const requiredConfig = [
      { path: 'database.url', env: 'DATABASE_URL' },
      { path: 'openai.apiKey', env: 'OPENAI_API_KEY' },
      { path: 'jwt.secret', env: 'JWT_SECRET' },
    ];

    const missing: string[] = [];

    requiredConfig.forEach(({ path, env }) => {
      if (!this.get(path)) {
        missing.push(env);
      }
    });

    if (missing.length > 0) {
      throw new Error(
        `❌ Configuración faltante. Variables de entorno requeridas: ${missing.join(', ')}\n` +
        `💡 Asegúrate de tener un archivo .env con estas variables configuradas.`
      );
    }

    console.log('✅ Configuración validada correctamente');
  }

  /**
   * Obtiene un valor de configuración usando dot notation
   */
  get(path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, this.config);
  }

  /**
   * Verifica si el entorno es desarrollo
   */
  isDevelopment(): boolean {
    return this.get('server.nodeEnv') === 'development';
  }

  /**
   * Verifica si el entorno es producción
   */
  isProduction(): boolean {
    return this.get('server.nodeEnv') === 'production';
  }

  /**
   * Verifica si el entorno es testing
   */
  isTesting(): boolean {
    return this.get('server.nodeEnv') === 'test';
  }

  /**
   * Obtiene toda la configuración (sin datos sensibles)
   */
  getAllSafe(): Record<string, any> {
    const safeCopy = JSON.parse(JSON.stringify(this.config));
    
    // Ocultar datos sensibles
    if (safeCopy.database?.url) {
      safeCopy.database.url = this.maskSensitiveData(safeCopy.database.url);
    }
    if (safeCopy.redis?.url) {
      safeCopy.redis.url = this.maskSensitiveData(safeCopy.redis.url);
    }
    if (safeCopy.openai?.apiKey) {
      safeCopy.openai.apiKey = this.maskSensitiveData(safeCopy.openai.apiKey);
    }
    if (safeCopy.jwt?.secret) {
      safeCopy.jwt.secret = this.maskSensitiveData(safeCopy.jwt.secret);
    }
    if (safeCopy.redis?.password) {
      safeCopy.redis.password = this.maskSensitiveData(safeCopy.redis.password);
    }

    return safeCopy;
  }

  /**
   * Enmascara datos sensibles para logging seguro
   */
  private maskSensitiveData(value: string): string {
    if (!value || value.length <= 8) {
      return '***';
    }
    return value.substring(0, 4) + '***' + value.substring(value.length - 4);
  }

  /**
   * Valida una configuración específica
   */
  validateSpecific(validations: Array<{ path: string; type: string; min?: number; max?: number }>): string[] {
    const errors: string[] = [];

    validations.forEach(({ path, type, min, max }) => {
      const value = this.get(path);

      if (value === undefined) {
        errors.push(`${path} is required`);
        return;
      }

      switch (type) {
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push(`${path} must be a valid number`);
          } else {
            if (min !== undefined && value < min) {
              errors.push(`${path} must be at least ${min}`);
            }
            if (max !== undefined && value > max) {
              errors.push(`${path} must be at most ${max}`);
            }
          }
          break;

        case 'string':
          if (typeof value !== 'string') {
            errors.push(`${path} must be a string`);
          } else {
            if (min !== undefined && value.length < min) {
              errors.push(`${path} must be at least ${min} characters`);
            }
            if (max !== undefined && value.length > max) {
              errors.push(`${path} must be at most ${max} characters`);
            }
          }
          break;

        case 'url':
          if (typeof value !== 'string' || !this.isValidUrl(value)) {
            errors.push(`${path} must be a valid URL`);
          }
          break;

        case 'email':
          if (typeof value !== 'string' || !this.isValidEmail(value)) {
            errors.push(`${path} must be a valid email`);
          }
          break;
      }
    });

    return errors;
  }

  /**
   * Valida si una cadena es una URL válida
   */
  private isValidUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Valida si una cadena es un email válido
   */
  private isValidEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  /**
   * Recarga la configuración (útil para testing)
   */
  reload(): void {
    this.config = {};
    this.loadConfiguration();
    this.validateRequired();
  }

  /**
   * Obtiene configuración para un componente específico
   */
  getDatabaseConfig() {
    return this.get('database');
  }

  getRedisConfig() {
    return this.get('redis');
  }

  getOpenAIConfig() {
    return this.get('openai');
  }

  getServerConfig() {
    return this.get('server');
  }

  getJWTConfig() {
    return this.get('jwt');
  }

  getCacheConfig() {
    return this.get('cache');
  }

  getCircuitBreakerConfig() {
    return this.get('circuitBreaker');
  }

  getEventStoreConfig() {
    return this.get('eventStore');
  }

  getLoggingConfig() {
    return this.get('logging');
  }

  getFeaturesConfig() {
    return this.get('features');
  }
}

// Exportar instancia singleton
export const configService = ConfigService.getInstance();
