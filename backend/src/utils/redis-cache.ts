/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { createClient, RedisClientType } from 'redis';
import { StructuredLogger } from '../utils/structured-logger';

export interface CacheConfig {
  ttl: {
    userData: number;        // 5 minutos
    analysisData: number;    // 10 minutos
    dashboardStats: number;  // 5 minutos
    metrics: number;         // 1 hora
    conversations: number;   // 15 minutos
  };
  maxRetries: number;
  retryDelay: number;
}

export class RedisCache {
  private static client: RedisClientType | null = null;
  private static isConnected = false;

  private static config: CacheConfig = {
    ttl: {
      userData: 300,        // 5 minutos
      analysisData: 600,    // 10 minutos
      dashboardStats: 300,  // 5 minutos
      metrics: 3600,        // 1 hora
      conversations: 900    // 15 minutos
    },
    maxRetries: 3,
    retryDelay: 1000
  };

  /**
   * Initialize Redis connection
   */
  static async connect(): Promise<void> {
    if (this.client && this.isConnected) {
      return;
    }

    // 🚫 NO INTENTAR REDIS SI NO ESTÁ CONFIGURADO EXPLÍCITAMENTE
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      StructuredLogger.info('Redis URL not configured - running without cache');
      return;
    }

    try {

      this.client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 5000, // Timeout más corto
          reconnectStrategy: false // NO reconectar automáticamente
        }
      });

      this.client.on('error', (err: any) => {
        StructuredLogger.error('Redis Client Error', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        StructuredLogger.info('Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        StructuredLogger.warn('Redis disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      StructuredLogger.info('Redis cache initialized successfully');

    } catch (error) {
      StructuredLogger.error('Failed to initialize Redis cache', error as Error);
      // Don't throw - allow app to continue without cache
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Disconnect from Redis
   */
  static async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.disconnect();
        this.isConnected = false;
        StructuredLogger.info('Redis disconnected successfully');
      } catch (error) {
        StructuredLogger.error('Error disconnecting from Redis', error as Error);
      }
    }
  }

  /**
   * Check if Redis is connected
   */
  static isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Get value from cache
   */
  static async get<T>(key: string): Promise<T | null> {
    if (!this.isReady()) {
      return null;
    }

    try {
      const value = await this.client!.get(key);
      if (value) {
        const parsed = JSON.parse(value);
        StructuredLogger.debug('Cache HIT', { key, type: typeof parsed });
        return parsed;
      }
      StructuredLogger.debug('Cache MISS', { key });
      return null;
    } catch (error) {
      StructuredLogger.error('Error getting from cache', error as Error, { key });
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  static async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      const options: any = {};

      if (ttlSeconds) {
        options.EX = ttlSeconds;
      }

      await this.client!.set(key, serialized, options);
      StructuredLogger.debug('Cache SET', { key, ttl: ttlSeconds, type: typeof value });
      return true;
    } catch (error) {
      StructuredLogger.error('Error setting cache', error as Error, { key });
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  static async delete(key: string): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      await this.client!.del(key);
      StructuredLogger.debug('Cache DELETE', { key });
      return true;
    } catch (error) {
      StructuredLogger.error('Error deleting from cache', error as Error, { key });
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  static async deletePattern(pattern: string): Promise<number> {
    if (!this.isReady()) {
      return 0;
    }

    try {
      const keys = await this.client!.keys(pattern);
      if (keys.length > 0) {
        await this.client!.del(keys);
        StructuredLogger.debug('Cache DELETE pattern', { pattern, deletedCount: keys.length });
        return keys.length;
      }
      return 0;
    } catch (error) {
      StructuredLogger.error('Error deleting pattern from cache', error as Error, { pattern });
      return 0;
    }
  }

  /**
   * Get or set cache with function
   */
  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const data = await fetcher();

    // Cache the result
    await this.set(key, data, ttlSeconds);

    return data;
  }

  /**
   * Cache user data
   */
  static async getUserData(userId: string): Promise<any | null> {
    const key = `user:${userId}`;
    return this.get(key);
  }

  static async setUserData(userId: string, data: any): Promise<boolean> {
    const key = `user:${userId}`;
    return this.set(key, data, this.config.ttl.userData);
  }

  /**
   * Cache dashboard statistics
   */
  static async getDashboardStats(userId: string): Promise<any | null> {
    const key = `dashboard:stats:${userId}`;
    return this.get(key);
  }

  static async setDashboardStats(userId: string, stats: any): Promise<boolean> {
    const key = `dashboard:stats:${userId}`;
    return this.set(key, stats, this.config.ttl.dashboardStats);
  }

  /**
   * Cache analysis data
   */
  static async getAnalysisData(analysisId: string): Promise<any | null> {
    const key = `analysis:${analysisId}`;
    return this.get(key);
  }

  static async setAnalysisData(analysisId: string, data: any): Promise<boolean> {
    const key = `analysis:${analysisId}`;
    return this.set(key, data, this.config.ttl.analysisData);
  }

  /**
   * Cache AI metrics
   */
  static async getAIMetrics(userId: string, period: string): Promise<any | null> {
    const key = `ai:metrics:${userId}:${period}`;
    return this.get(key);
  }

  static async setAIMetrics(userId: string, period: string, metrics: any): Promise<boolean> {
    const key = `ai:metrics:${userId}:${period}`;
    return this.set(key, metrics, this.config.ttl.metrics);
  }

  /**
   * Invalidate user-related cache
   */
  static async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      `user:${userId}`,
      `dashboard:stats:${userId}`,
      `ai:metrics:${userId}:*`,
      `analysis:*` // Invalidate all analyses (could be more specific)
    ];

    for (const pattern of patterns) {
      await this.deletePattern(pattern);
    }

    StructuredLogger.info('User cache invalidated', { userId });
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{
    connected: boolean;
    info?: any;
    error?: string;
  }> {
    if (!this.isReady()) {
      return { connected: false, error: 'Redis not connected' };
    }

    try {
      const info = await this.client!.info();
      return { connected: true, info };
    } catch (error) {
      return { connected: false, error: (error as Error).message };
    }
  }

  /**
   * Health check for Redis
   */
  static async healthCheck(): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      await this.client!.ping();
      return true;
    } catch (error) {
      StructuredLogger.error('Redis health check failed', error as Error);
      return false;
    }
  }
}