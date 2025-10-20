import { createClient, RedisClientType } from 'redis';import { createClient, RedisClientType } from 'redis';

import { configService } from './config.service';import { configService } from './config.service';

import { StructuredLogger } from '../utils/structured-logger';const { StructuredLogger } = require('../utils/structured-logger');



interface CircuitBreakerConfig {export class EnterpriseCache {

  maxFailures: number;  private redis: RedisClientType | null = null;

  timeout: number;  private memoryCache = new Map<string, { value: any; expiry: number }>();

}  private circuitBreaker = {

    failures: 0,

interface CircuitBreakerState {    maxFailures: configService.getCircuitBreakerConfig().maxFailures,

  failures: number;    timeout: configService.getCircuitBreakerConfig().timeout,

  maxFailures: number;    nextAttempt: 0,

  timeout: number;  };

  nextAttempt: number;  private lastLogTime = 0;

}  private readonly LOG_THROTTLE_MS = 10000; // Log throttling: max 1 log per 10 seconds



export class EnterpriseCache {  constructor() {

  private redis: RedisClientType | null = null;    // Only initialize Redis if explicitly enabled and configured

  private memoryCache = new Map<string, { value: any; expiry: number }>();    const redisUrl = process.env.REDIS_URL;

  private circuitBreaker: CircuitBreakerState;    const redisEnabled = process.env.REDIS_ENABLED !== 'false';

  private lastLogTime = 0;    

  private readonly LOG_THROTTLE_MS = 10000; // Log throttling: max 1 log per 10 seconds    if (redisUrl && redisEnabled) {

  private isConnected = false;      void this.initializeRedis();

    } else {

  constructor() {      StructuredLogger.info('EnterpriseCache: Redis disabled, using memory cache only');

    const breakerConfig = configService.getCircuitBreakerConfig();    }

    this.circuitBreaker = {  }

      failures: 0,

      maxFailures: breakerConfig.maxFailures,  private async initializeRedis(): Promise<void> {

      timeout: breakerConfig.timeout,    // Check if Redis URL is actually configured

      nextAttempt: 0,    const redisUrl = process.env.REDIS_URL;

    };    const redisEnabled = process.env.REDIS_ENABLED !== 'false';



    // Only initialize Redis if explicitly enabled and configured    if (!redisEnabled || !redisUrl) {

    const redisUrl = process.env.REDIS_URL;      StructuredLogger.info('Redis not configured - running without cache');

    const redisEnabled = process.env.REDIS_ENABLED !== 'false';      return;

        }

    if (redisUrl && redisEnabled) {

      void this.initializeRedis();    // Only attempt Redis connection if properly configured

    } else {    const redisConfig = configService.getRedisConfig();

      StructuredLogger.info('EnterpriseCache: Redis disabled, using memory cache only');

    }    try {

  }      this.redis = new Redis({

        host: redisConfig.host,

  private async initializeRedis(): Promise<void> {        port: redisConfig.port,

    const redisUrl = process.env.REDIS_URL;        password: redisConfig.password,

    const redisEnabled = process.env.REDIS_ENABLED !== 'false';        db: redisConfig.db,

        maxRetriesPerRequest: redisConfig.maxRetries,

    if (!redisEnabled || !redisUrl) {        lazyConnect: true,

      StructuredLogger.info('Redis not configured - running without cache');        connectTimeout: 10000,

      return;        commandTimeout: 5000,

    }        enableOfflineQueue: false,

      });

    try {

      this.redis = createClient({      this.redis.on('error', (err) => {

        url: redisUrl,        StructuredLogger.error('Redis connection error', err);

        socket: {        this.handleRedisFailure();

          connectTimeout: 10000,      });

          commandTimeout: 5000,

          reconnectStrategy: (retries) => {      this.redis.on('connect', () => {

            if (retries >= 3) return false;        StructuredLogger.info('Redis connected successfully');

            return Math.min(retries * 1000, 5000);        this.resetCircuitBreaker();

          }      });

        }

      });      await this.redis.connect();

    } catch (err) {

      this.redis.on('error', (err) => {      StructuredLogger.warn('Redis initialization failed, falling back to memory cache', { error: err });

        StructuredLogger.error('Redis connection error', err);      this.handleRedisFailure();

        this.handleRedisFailure();    }

      });  }



      this.redis.on('connect', () => {  async get<T>(key: string): Promise<T | null> {

        StructuredLogger.info('Redis connected successfully');    await this.tryResetCircuitBreaker();

        this.resetCircuitBreaker();

        this.isConnected = true;    if (this.isCircuitBreakerOpen()) return this.getFromMemory<T>(key);

      });

    try {

      this.redis.on('disconnect', () => {      if (this.redis) {

        StructuredLogger.warn('Redis disconnected');        const value = await this.redis.get(key);

        this.isConnected = false;        if (value !== null) {

      });          this.resetCircuitBreaker();

          return JSON.parse(value) as T;

      await this.redis.connect();        }

    } catch (err) {      }

      StructuredLogger.warn('Redis initialization failed, falling back to memory cache', { error: err });    } catch (err) {

      this.handleRedisFailure();      StructuredLogger.error('Redis GET error', err, { key });

    }      this.handleRedisFailure();

  }    }



  async get<T>(key: string): Promise<T | null> {    return this.getFromMemory<T>(key);

    await this.tryResetCircuitBreaker();  }



    if (this.isCircuitBreakerOpen()) return this.getFromMemory<T>(key);  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {

    const serialized = JSON.stringify(value);

    try {    // Always write to memory fallback

      if (this.redis && this.isConnected) {    this.setInMemory(key, value, ttlSeconds);

        const value = await this.redis.get(key);

        if (value !== null) {    if (this.isCircuitBreakerOpen() || !this.redis) return false;

          this.resetCircuitBreaker();

          return JSON.parse(value) as T;    try {

        }      if (ttlSeconds) {

      }        await this.redis.setex(key, ttlSeconds, serialized);

    } catch (err) {      } else {

      StructuredLogger.error('Redis GET error', err, { key });        await this.redis.set(key, serialized);

      this.handleRedisFailure();      }

    }      this.resetCircuitBreaker();

      return true;

    return this.getFromMemory<T>(key);    } catch (err) {

  }      StructuredLogger.error('Redis SET error', err, { key });

      this.handleRedisFailure();

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {      return false;

    const serialized = JSON.stringify(value);    }

    // Always write to memory fallback  }

    this.setInMemory(key, value, ttlSeconds);

  async delete(key: string): Promise<boolean> {

    if (this.isCircuitBreakerOpen() || !this.redis || !this.isConnected) return false;    this.memoryCache.delete(key);



    try {    if (this.isCircuitBreakerOpen() || !this.redis) return false;

      if (ttlSeconds) {

        await this.redis.setEx(key, ttlSeconds, serialized);    try {

      } else {      await this.redis.del(key);

        await this.redis.set(key, serialized);      this.resetCircuitBreaker();

      }      return true;

      this.resetCircuitBreaker();    } catch (err) {

      return true;      StructuredLogger.error('Redis DEL error', err, { key });

    } catch (err) {      this.handleRedisFailure();

      StructuredLogger.error('Redis SET error', err, { key });      return false;

      this.handleRedisFailure();    }

      return false;  }

    }

  }  async invalidatePattern(pattern: string): Promise<number> {

    let count = 0;

  async delete(key: string): Promise<boolean> {    for (const key of Array.from(this.memoryCache.keys())) {

    this.memoryCache.delete(key);      if (this.matchesPattern(key, pattern)) {

        this.memoryCache.delete(key);

    if (this.isCircuitBreakerOpen() || !this.redis || !this.isConnected) return false;        count++;

      }

    try {    }

      await this.redis.del(key);

      this.resetCircuitBreaker();    if (this.isCircuitBreakerOpen() || !this.redis) return count;

      return true;

    } catch (err) {    try {

      StructuredLogger.error('Redis DEL error', err, { key });      const keys = await this.redis.keys(pattern);

      this.handleRedisFailure();      if (keys.length > 0) {

      return false;        await this.redis.del(...keys);

    }        count += keys.length;

  }      }

      this.resetCircuitBreaker();

  async invalidatePattern(pattern: string): Promise<number> {    } catch (err) {

    let count = 0;      StructuredLogger.error('Redis pattern invalidation error', err, { pattern });

    for (const key of Array.from(this.memoryCache.keys())) {      this.handleRedisFailure();

      if (this.matchesPattern(key, pattern)) {    }

        this.memoryCache.delete(key);

        count++;    return count;

      }  }

    }

  async incrementCounter(key: string, increment = 1, ttlSeconds?: number): Promise<number> {

    if (this.isCircuitBreakerOpen() || !this.redis || !this.isConnected) return count;    const lua = `

      local current = redis.call('GET', KEYS[1])

    try {      local newValue = (current and tonumber(current) or 0) + tonumber(ARGV[1])

      const keys: string[] = [];      redis.call('SET', KEYS[1], newValue)

      for await (const key of this.redis.scanIterator({ MATCH: pattern })) {      if ARGV[2] ~= '' then

        keys.push(key);        redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))

      }      end

            return newValue

      if (keys.length > 0) {    `;

        await this.redis.del(keys);

        count += keys.length;    if (!this.isCircuitBreakerOpen() && this.redis) {

      }      try {

      this.resetCircuitBreaker();        const result = await this.redis.eval(lua, 1, key, increment.toString(), (ttlSeconds || '').toString()) as number;

    } catch (err) {        this.resetCircuitBreaker();

      StructuredLogger.error('Redis pattern invalidation error', err, { pattern });        return result;

      this.handleRedisFailure();      } catch (err) {

    }        StructuredLogger.error('Redis increment error', err, { key });

        this.handleRedisFailure();

    return count;      }

  }    }



  async incrementCounter(key: string, increment = 1, ttlSeconds?: number): Promise<number> {    // memory fallback

    if (!this.isCircuitBreakerOpen() && this.redis && this.isConnected) {    const current = (this.getFromMemory<number>(key) as number) || 0;

      try {    const newValue = current + increment;

        const current = await this.redis.get(key);    this.setInMemory(key, newValue, ttlSeconds);

        const newValue = (current ? parseInt(current, 10) : 0) + increment;    return newValue;

          }

        if (ttlSeconds) {

          await this.redis.setEx(key, ttlSeconds, newValue.toString());  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds = 3600): Promise<T> {

        } else {    const cached = await this.get<T>(key);

          await this.redis.set(key, newValue.toString());    if (cached !== null) return cached;

        }

            const lockKey = `lock:${key}`;

        this.resetCircuitBreaker();    const lockValue = Math.random().toString(36).slice(2);

        return newValue;    const lockTtl = 30;

      } catch (err) {

        StructuredLogger.error('Redis increment error', err, { key });    if (await this.acquireLock(lockKey, lockValue, lockTtl)) {

        this.handleRedisFailure();      try {

      }        const cachedAfter = await this.get<T>(key);

    }        if (cachedAfter !== null) return cachedAfter;



    // memory fallback        const value = await factory();

    const current = (this.getFromMemory<number>(key) as number) || 0;        await this.set(key, value, ttlSeconds);

    const newValue = current + increment;        return value;

    this.setInMemory(key, newValue, ttlSeconds);      } finally {

    return newValue;        await this.releaseLock(lockKey, lockValue);

  }      }

    }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds = 3600): Promise<T> {

    const cached = await this.get<T>(key);    await new Promise((r) => setTimeout(r, 100));

    if (cached !== null) return cached;    const retry = await this.get<T>(key);

    return retry !== null ? retry : factory();

    const lockKey = `lock:${key}`;  }

    const lockValue = Math.random().toString(36).slice(2);

    const lockTtl = 30;  private async acquireLock(key: string, value: string, ttlSeconds: number): Promise<boolean> {

    if (!this.redis || this.isCircuitBreakerOpen()) return true;

    if (await this.acquireLock(lockKey, lockValue, lockTtl)) {    try {

      try {      const res = await this.redis.set(key, value, 'EX', ttlSeconds, 'NX');

        const cachedAfter = await this.get<T>(key);      return res === 'OK';

        if (cachedAfter !== null) return cachedAfter;    } catch (err) {

      StructuredLogger.error('Lock acquisition error', err, { key });

        const value = await factory();      return false;

        await this.set(key, value, ttlSeconds);    }

        return value;  }

      } finally {

        await this.releaseLock(lockKey, lockValue);  private async releaseLock(key: string, value: string): Promise<boolean> {

      }    if (!this.redis || this.isCircuitBreakerOpen()) return true;

    }    const lua = `

      if redis.call('GET', KEYS[1]) == ARGV[1] then

    await new Promise((r) => setTimeout(r, 100));        return redis.call('DEL', KEYS[1])

    const retry = await this.get<T>(key);      else

    return retry !== null ? retry : factory();        return 0

  }      end

    `;

  private async acquireLock(key: string, value: string, ttlSeconds: number): Promise<boolean> {    try {

    if (!this.redis || this.isCircuitBreakerOpen() || !this.isConnected) return true;      const res = await this.redis.eval(lua, 1, key, value) as number;

          return res === 1;

    try {    } catch (err) {

      const result = await this.redis.set(key, value, {      StructuredLogger.error('Lock release error', err, { key });

        EX: ttlSeconds,      return false;

        NX: true    }

      });  }

      return result === 'OK';

    } catch (err) {  private getFromMemory<T>(key: string): T | null {

      StructuredLogger.error('Lock acquisition error', err, { key });    const item = this.memoryCache.get(key);

      return false;    if (!item) return null;

    }    if (Date.now() > item.expiry) {

  }      this.memoryCache.delete(key);

      return null;

  private async releaseLock(key: string, value: string): Promise<boolean> {    }

    if (!this.redis || this.isCircuitBreakerOpen() || !this.isConnected) return true;    return item.value as T;

      }

    try {

      // Simple approach: just delete the key if it exists  private setInMemory(key: string, value: any, ttlSeconds?: number): void {

      const current = await this.redis.get(key);    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : Date.now() + 3600 * 1000;

      if (current === value) {    this.memoryCache.set(key, { value, expiry });

        await this.redis.del(key);    if (this.memoryCache.size > 20000) this.cleanupMemoryCache();

        return true;  }

      }

      return false;  private cleanupMemoryCache(): void {

    } catch (err) {    const now = Date.now();

      StructuredLogger.error('Lock release error', err, { key });    let cleaned = 0;

      return false;    for (const [k, v] of this.memoryCache.entries()) {

    }      if (now > v.expiry) {

  }        this.memoryCache.delete(k);

        cleaned++;

  private getFromMemory<T>(key: string): T | null {      }

    const item = this.memoryCache.get(key);      if (cleaned > 1000) break;

    if (!item) return null;    }

    if (Date.now() > item.expiry) {  }

      this.memoryCache.delete(key);

      return null;  private matchesPattern(key: string, pattern: string): boolean {

    }    const regex = new RegExp(pattern.replace(/\*/g, '.*'));

    return item.value as T;    return regex.test(key);

  }  }



  private setInMemory(key: string, value: any, ttlSeconds?: number): void {  private isCircuitBreakerOpen(): boolean {

    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : Date.now() + 3600 * 1000;    return this.circuitBreaker.failures >= this.circuitBreaker.maxFailures && Date.now() < this.circuitBreaker.nextAttempt;

    this.memoryCache.set(key, { value, expiry });  }

    if (this.memoryCache.size > 20000) this.cleanupMemoryCache();

  }  private handleRedisFailure(): void {

    this.circuitBreaker.failures++;

  private cleanupMemoryCache(): void {    this.circuitBreaker.nextAttempt = Date.now() + this.circuitBreaker.timeout;

    const now = Date.now();    

    let cleaned = 0;    // Log throttling to prevent spam

    for (const [k, v] of this.memoryCache.entries()) {    const now = Date.now();

      if (now > v.expiry) {    if (now - this.lastLogTime > this.LOG_THROTTLE_MS) {

        this.memoryCache.delete(k);      StructuredLogger.warn('Redis failure detected', { failures: this.circuitBreaker.failures, maxFailures: this.circuitBreaker.maxFailures });

        cleaned++;      if (this.circuitBreaker.failures >= this.circuitBreaker.maxFailures) {

      }        StructuredLogger.error('Circuit breaker OPENED. Redis operations suspended', { timeout: this.circuitBreaker.timeout });

      if (cleaned > 1000) break;      }

    }      this.lastLogTime = now;

  }    }

  }

  private matchesPattern(key: string, pattern: string): boolean {

    const regex = new RegExp(pattern.replace(/\*/g, '.*'));  private async tryResetCircuitBreaker(): Promise<void> {

    return regex.test(key);    // Only try to reset if Redis is properly configured

  }    const redisUrl = process.env.REDIS_URL;

    const redisEnabled = process.env.REDIS_ENABLED !== 'false';

  private isCircuitBreakerOpen(): boolean {    

    return this.circuitBreaker.failures >= this.circuitBreaker.maxFailures && Date.now() < this.circuitBreaker.nextAttempt;    if (!redisUrl || !redisEnabled) return;

  }    

    if (this.isCircuitBreakerOpen() && Date.now() >= this.circuitBreaker.nextAttempt) {

  private handleRedisFailure(): void {      try {

    this.circuitBreaker.failures++;        if (this.redis) {

    this.circuitBreaker.nextAttempt = Date.now() + this.circuitBreaker.timeout;          await this.redis.ping();

    this.isConnected = false;          this.resetCircuitBreaker();

              StructuredLogger.info('Redis connection restored, circuit breaker reset');

    // Log throttling to prevent spam        }

    const now = Date.now();      } catch (err) {

    if (now - this.lastLogTime > this.LOG_THROTTLE_MS) {        this.circuitBreaker.nextAttempt = Date.now() + this.circuitBreaker.timeout;

      StructuredLogger.warn('Redis failure detected', { failures: this.circuitBreaker.failures, maxFailures: this.circuitBreaker.maxFailures });        StructuredLogger.warn('Redis still failing, circuit breaker remains open');

      if (this.circuitBreaker.failures >= this.circuitBreaker.maxFailures) {      }

        StructuredLogger.error('Circuit breaker OPENED. Redis operations suspended', { timeout: this.circuitBreaker.timeout });    }

      }  }

      this.lastLogTime = now;

    }  private resetCircuitBreaker(): void {

  }    this.circuitBreaker.failures = 0;

    this.circuitBreaker.nextAttempt = 0;

  private async tryResetCircuitBreaker(): Promise<void> {    StructuredLogger.info('Circuit breaker reset - Redis connection restored');

    // Only try to reset if Redis is properly configured    // Don't auto-reconnect unless Redis is properly configured

    const redisUrl = process.env.REDIS_URL;    const redisUrl = process.env.REDIS_URL;

    const redisEnabled = process.env.REDIS_ENABLED !== 'false';    const redisEnabled = process.env.REDIS_ENABLED !== 'false';

        if (!this.redis && redisUrl && redisEnabled) {

    if (!redisUrl || !redisEnabled) return;      void this.initializeRedis();

        }

    if (this.isCircuitBreakerOpen() && Date.now() >= this.circuitBreaker.nextAttempt) {  }

      try {

        if (this.redis) {  async healthCheck(): Promise<{ redis: boolean; memory: boolean; circuitBreaker: { open: boolean; failures: number } }> {

          await this.redis.ping();    const redisHealth = !this.isCircuitBreakerOpen() && this.redis !== null;

          this.resetCircuitBreaker();    if (redisHealth && this.redis) {

          StructuredLogger.info('Redis connection restored, circuit breaker reset');      try {

        }        await this.redis.ping();

      } catch (err) {      } catch (err) {

        this.circuitBreaker.nextAttempt = Date.now() + this.circuitBreaker.timeout;        return { redis: false, memory: true, circuitBreaker: { open: this.isCircuitBreakerOpen(), failures: this.circuitBreaker.failures } };

        StructuredLogger.warn('Redis still failing, circuit breaker remains open');      }

      }    }

    }    return { redis: redisHealth, memory: this.memoryCache.size < 20000, circuitBreaker: { open: this.isCircuitBreakerOpen(), failures: this.circuitBreaker.failures } };

  }  }



  private resetCircuitBreaker(): void {  async shutdown(): Promise<void> {

    this.circuitBreaker.failures = 0;    if (this.redis) await this.redis.disconnect();

    this.circuitBreaker.nextAttempt = 0;    this.memoryCache.clear();

    this.isConnected = true;  }

  }}


  async healthCheck(): Promise<{ redis: boolean; memory: boolean; circuitBreaker: { open: boolean; failures: number } }> {
    const redisHealth = !this.isCircuitBreakerOpen() && this.redis !== null && this.isConnected;
    if (redisHealth && this.redis) {
      try {
        await this.redis.ping();
      } catch (err) {
        return { redis: false, memory: true, circuitBreaker: { open: this.isCircuitBreakerOpen(), failures: this.circuitBreaker.failures } };
      }
    }
    return { redis: redisHealth, memory: this.memoryCache.size < 20000, circuitBreaker: { open: this.isCircuitBreakerOpen(), failures: this.circuitBreaker.failures } };
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