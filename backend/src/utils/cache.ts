// @ts-nocheck
import { createClient, RedisClientType } from 'redis';
import { StructuredLogger } from './structured-logger';

interface CacheItem {
    value: any;
    expiry?: number;
}

interface CacheConfig {
    redisUrl?: string;
    enabled: boolean;
    memoryMaxSize: number;
    defaultTtl: number;
    retryAttempts: number;
    retryDelay: number;
}

class CacheService {
    private redis: RedisClientType | null = null;
    private memoryCache: Map<string, CacheItem> = new Map();
    private static instance: CacheService | null = null;
    private initialized = false;
    private isConnected = false;
    private config: CacheConfig;

    private constructor() {
        this.config = {
            redisUrl: process.env.REDIS_URL,
            enabled: process.env.REDIS_ENABLED !== 'false',
            memoryMaxSize: 1000,
            defaultTtl: 3600,
            retryAttempts: 3,
            retryDelay: 1000
        };
    }

    private async initialize() {
        if (this.initialized) return;

        if (!this.config.enabled || !this.config.redisUrl) {
            StructuredLogger.info('✓ Cache configured for memory-only mode (Redis disabled by configuration)');
            this.initialized = true;
            return;
        }

        try {
            this.redis = createClient({
                url: this.config.redisUrl,
                socket: {
                    connectTimeout: 10000,
                    reconnectStrategy: (retries) => {
                        if (retries >= this.config.retryAttempts) {
                            StructuredLogger.error('Redis max retries reached, falling back to memory cache');
                            return false;
                        }
                        return Math.min(retries * this.config.retryDelay, 5000);
                    }
                }
            });

            this.redis.on('error', (error: Error) => {
                StructuredLogger.error('Redis connection error', error);
                this.isConnected = false;
            });

            this.redis.on('connect', () => {
                StructuredLogger.info('Connected to Redis successfully');
                this.isConnected = true;
            });

            this.redis.on('disconnect', () => {
                StructuredLogger.warn('Redis disconnected');
                this.isConnected = false;
            });

            await this.redis.connect();
        } catch (error) {
            if (this.config.enabled) {
                StructuredLogger.warn('Failed to connect to Redis, using memory cache fallback', error as Error);
            } else {
                StructuredLogger.info('Redis connection skipped (disabled by configuration)');
            }
            this.redis = null;
            this.isConnected = false;
        }

        this.initialized = true;
    }

    public static getInstance(): CacheService {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }

    private isRedisAvailable(): boolean {
        return this.redis !== null && this.isConnected;
    }

    private cleanupMemoryCache(): void {
        if (this.memoryCache.size <= this.config.memoryMaxSize) return;

        const now = Date.now();
        const toDelete: string[] = [];

        // Remove expired items first
        for (const [key, item] of this.memoryCache.entries()) {
            if (item.expiry && now > item.expiry) {
                toDelete.push(key);
            }
        }

        // If still too many items, remove oldest ones
        if (this.memoryCache.size - toDelete.length > this.config.memoryMaxSize) {
            const entries = Array.from(this.memoryCache.keys());
            const excess = this.memoryCache.size - toDelete.length - this.config.memoryMaxSize;
            toDelete.push(...entries.slice(0, excess));
        }

        toDelete.forEach(key => this.memoryCache.delete(key));
    }

    private getFromMemory<T>(key: string): T | null {
        const cached = this.memoryCache.get(key);
        if (!cached) return null;

        if (cached.expiry && Date.now() > cached.expiry) {
            this.memoryCache.delete(key);
            return null;
        }

        return cached.value as T;
    }

    private setInMemory(key: string, value: any, ttlSeconds?: number): void {
        const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
        this.memoryCache.set(key, { value, expiry });
        this.cleanupMemoryCache();
    }

    async get<T>(key: string): Promise<T | null> {
        await this.initialize();

        try {
            if (this.isRedisAvailable()) {
                const data = await this.redis!.get(key);
                return data ? (JSON.parse(data) as T) : null;
            }

            return this.getFromMemory<T>(key);
        } catch (error) {
            StructuredLogger.error('Error getting cache value', error as Error, { key });
            return this.getFromMemory<T>(key);
        }
    }

    async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
        await this.initialize();
        const ttl = ttlSeconds || this.config.defaultTtl;

        try {
            if (this.isRedisAvailable()) {
                const stringValue = JSON.stringify(value);
                await this.redis!.setEx(key, ttl, stringValue);
            }
            
            // Always store in memory as fallback
            this.setInMemory(key, value, ttl);
        } catch (error) {
            StructuredLogger.error('Error setting cache value', error as Error, { key });
            // Fallback to memory only
            this.setInMemory(key, value, ttl);
        }
    }

    async delete(key: string): Promise<void> {
        await this.initialize();

        try {
            if (this.isRedisAvailable()) {
                await this.redis!.del(key);
            }
            this.memoryCache.delete(key);
        } catch (error) {
            StructuredLogger.error('Error deleting cache value', error as Error, { key });
            this.memoryCache.delete(key);
        }
    }

    async invalidatePattern(pattern: string): Promise<number> {
        await this.initialize();
        let removed = 0;

        try {
            if (this.isRedisAvailable()) {
                // Use SCAN for better performance
                const keys: string[] = [];
                for await (const key of this.redis!.scanIterator({ MATCH: pattern })) {
                    keys.push(key);
                }
                
                if (keys.length > 0) {
                    await this.redis!.del(keys);
                    removed += keys.length;
                }
            }

            // Memory fallback
            const memoryPattern = pattern.replace(/\*/g, '');
            const toRemove: string[] = [];
            for (const key of this.memoryCache.keys()) {
                if (key.includes(memoryPattern)) {
                    toRemove.push(key);
                }
            }
            toRemove.forEach(key => this.memoryCache.delete(key));
            removed += toRemove.length;

            return removed;
        } catch (error) {
            StructuredLogger.error('Error invalidating cache pattern', error as Error, { pattern });
            return 0;
        }
    }

    async healthCheck(): Promise<{ redis: boolean; memory: boolean; details?: any }> {
        await this.initialize();

        try {
            let redisHealth = false;
            if (this.isRedisAvailable()) {
                const pong = await this.redis!.ping();
                redisHealth = pong === 'PONG';
            }

            return {
                redis: redisHealth,
                memory: true,
                details: {
                    memorySize: this.memoryCache.size,
                    maxMemorySize: this.config.memoryMaxSize,
                    redisConnected: this.isConnected
                }
            };
        } catch (error) {
            StructuredLogger.error('Cache health check failed', error as Error);
            return { redis: false, memory: true };
        }
    }

    async shutdown(): Promise<void> {
        try {
            if (this.redis) {
                await this.redis.disconnect();
            }
            this.memoryCache.clear();
        } catch (error) {
            StructuredLogger.error('Error shutting down cache', error as Error);
        }
    }
}

export const cacheService = CacheService.getInstance();