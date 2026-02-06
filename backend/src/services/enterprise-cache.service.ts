// Simple EnterpriseCache service stub
import { createClient, RedisClientType } from 'redis';
import { StructuredLogger } from '../utils/structured-logger';

export class EnterpriseCache {
  private redis: RedisClientType | null = null;
  private memoryCache = new Map<string, { value: any; expiry: number }>();
  private isRedisEnabled = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    const redisEnabled = process.env.REDIS_ENABLED !== 'false';

    if (redisUrl && redisEnabled) {
      void this.initializeRedis();
    } else {
      StructuredLogger.info('EnterpriseCache: Redis disabled, using memory cache only');
    }
  }

  private async initializeRedis(): Promise<void> {
    try {
      this.redis = createClient({
        url: process.env.REDIS_URL,
        socket: {
          connectTimeout: 10000,
          commandTimeout: 5000,
        }
      });

      this.redis.on('error', (err) => {
        StructuredLogger.error('Redis connection error', err);
        this.isRedisEnabled = false;
      });

      this.redis.on('connect', () => {
        StructuredLogger.info('Redis connected successfully');
        this.isRedisEnabled = true;
      });

      await this.redis.connect();
    } catch (err) {
      StructuredLogger.warn('Redis initialization failed, using memory cache', { error: err });
      this.isRedisEnabled = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis && this.isRedisEnabled) {
      try {
        const value = await this.redis.get(key);
        if (value !== null) {
          return JSON.parse(value) as T;
        }
      } catch (err) {
        StructuredLogger.error('Redis GET error', err, { key });
      }
    }

    return this.getFromMemory<T>(key);
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    const serialized = JSON.stringify(value);
    this.setInMemory(key, value, ttlSeconds);

    if (this.redis && this.isRedisEnabled) {
      try {
        if (ttlSeconds) {
          await this.redis.setEx(key, ttlSeconds, serialized);
        } else {
          await this.redis.set(key, serialized);
        }
        return true;
      } catch (err) {
        StructuredLogger.error('Redis SET error', err, { key });
      }
    }

    return false;
  }

  async delete(key: string): Promise<boolean> {
    this.memoryCache.delete(key);

    if (this.redis && this.isRedisEnabled) {
      try {
        await this.redis.del(key);
        return true;
      } catch (err) {
        StructuredLogger.error('Redis DEL error', err, { key });
      }
    }

    return false;
  }

  private getFromMemory<T>(key: string): T | null {
    const item = this.memoryCache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.memoryCache.delete(key);
      return null;
    }

    return item.value as T;
  }

  private setInMemory(key: string, value: any, ttlSeconds?: number): void {
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : Date.now() + 3600 * 1000;
    this.memoryCache.set(key, { value, expiry });

    if (this.memoryCache.size > 10000) {
      this.cleanupMemoryCache();
    }
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [k, v] of this.memoryCache.entries()) {
      if (now > v.expiry) {
        this.memoryCache.delete(k);
        cleaned++;
      }
      if (cleaned > 1000) break;
    }
  }

  async healthCheck(): Promise<{ redis: boolean; memory: boolean }> {
    let redisHealth = false;

    if (this.redis && this.isRedisEnabled) {
      try {
        await this.redis.ping();
        redisHealth = true;
      } catch (err) {
        redisHealth = false;
      }
    }

    return {
      redis: redisHealth,
      memory: this.memoryCache.size < 10000
    };
  }

  async shutdown(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.disconnect();
      } catch (err) {
        StructuredLogger.error('Error disconnecting Redis', err);
      }
    }
    this.memoryCache.clear();
  }
}
