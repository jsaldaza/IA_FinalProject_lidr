// Enterprise cache stub// Simple EnterpriseCache service stubimport { createClient, RedisClientType } from 'redis';import { createClient, RedisClientType } from 'redis';import { createClient, RedisClientType } from 'redis';

export class EnterpriseCache {

  async get<T>(key: string): Promise<T | null> {export class EnterpriseCache {

    return null;

  }  async get<T>(key: string): Promise<T | null> {import { StructuredLogger } from '../utils/structured-logger';



  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {    return null;

    return false;

  }  }import { configService } from './config.service';import { configService } from './config.service';



  async delete(key: string): Promise<boolean> {

    return false;

  }  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {export class EnterpriseCache {



  async healthCheck(): Promise<{ redis: boolean; memory: boolean }> {    return false;

    return { redis: false, memory: true };

  }  }  private redis: RedisClientType | null = null;import { StructuredLogger } from '../utils/structured-logger';import { StructuredLogger } from '../utils/structured-logger';



  async shutdown(): Promise<void> {

    // No-op

  }  async delete(key: string): Promise<boolean> {  private memoryCache = new Map<string, { value: any; expiry: number }>();

}
    return false;

  }  private isRedisEnabled = false;



  async healthCheck(): Promise<{ redis: boolean; memory: boolean }> {

    return { redis: false, memory: true };

  }  constructor() {interface CircuitBreakerConfig {interface CircuitBreakerConfig {



  async shutdown(): Promise<void> {    const redisUrl = process.env.REDIS_URL;

    // No-op

  }    const redisEnabled = process.env.REDIS_ENABLED !== 'false';  maxFailures: number;  maxFailures: number;

}
    

    if (redisUrl && redisEnabled) {  timeout: number;  timeout: number;

      this.initializeRedis();

    } else {}}

      StructuredLogger.info('EnterpriseCache: Redis disabled, using memory cache only');

    }

  }

interface CircuitBreakerState {interface CircuitBreakerState {

  private async initializeRedis(): Promise<void> {

    try {  failures: number;  failures: number;

      this.redis = createClient({

        url: process.env.REDIS_URL,  maxFailures: number;  maxFailures: number;

        socket: {

          connectTimeout: 10000,  timeout: number;  timeout: number;

          commandTimeout: 5000,

        }  nextAttempt: number;  nextAttempt: number;

      });

}}

      this.redis.on('error', (err) => {

        StructuredLogger.error('Redis connection error', err);

        this.isRedisEnabled = false;

      });export class EnterpriseCache {



      this.redis.on('connect', () => {  private redis: RedisClientType | null = null;

        StructuredLogger.info('Redis connected successfully');

        this.isRedisEnabled = true;  private memoryCache = new Map<string, { value: any; expiry: number }>();export class EnterpriseCache {  constructor() {

      });

  private circuitBreaker: CircuitBreakerState;

      await this.redis.connect();

    } catch (err) {  private lastLogTime = 0;  private redis: RedisClientType | null = null;    // Only initialize Redis if explicitly enabled and configured

      StructuredLogger.warn('Redis initialization failed, using memory cache', { error: err });

      this.isRedisEnabled = false;  private readonly LOG_THROTTLE_MS = 10000; // Log throttling: max 1 log per 10 seconds

    }

  }  private memoryCache = new Map<string, { value: any; expiry: number }>();    const redisUrl = process.env.REDIS_URL;



  async get<T>(key: string): Promise<T | null> {  constructor() {

    if (this.redis && this.isRedisEnabled) {

      try {    const breakerConfig = configService.getCircuitBreakerConfig();  private circuitBreaker: CircuitBreakerState;    const redisEnabled = process.env.REDIS_ENABLED !== 'false';

        const value = await this.redis.get(key);

        if (value !== null) {    this.circuitBreaker = {

          return JSON.parse(value) as T;

        }      failures: 0,  private lastLogTime = 0;    

      } catch (err) {

        StructuredLogger.error('Redis GET error', err, { key });      maxFailures: breakerConfig.maxFailures,

      }

    }      timeout: breakerConfig.timeout,  private readonly LOG_THROTTLE_MS = 10000; // Log throttling: max 1 log per 10 seconds    if (redisUrl && redisEnabled) {



    return this.getFromMemory<T>(key);      nextAttempt: 0,

  }

    };  private isConnected = false;      void this.initializeRedis();

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {

    const serialized = JSON.stringify(value);

    this.setInMemory(key, value, ttlSeconds);

    // Only initialize Redis if explicitly enabled and configured    } else {

    if (this.redis && this.isRedisEnabled) {

      try {    const redisUrl = process.env.REDIS_URL;

        if (ttlSeconds) {

          await this.redis.setEx(key, ttlSeconds, serialized);    const redisEnabled = process.env.REDIS_ENABLED !== 'false';  constructor() {      StructuredLogger.info('EnterpriseCache: Redis disabled, using memory cache only');

        } else {

          await this.redis.set(key, serialized);    

        }

        return true;    if (redisUrl && redisEnabled) {    const breakerConfig = configService.getCircuitBreakerConfig();    }

      } catch (err) {

        StructuredLogger.error('Redis SET error', err, { key });      void this.initializeRedis();

      }

    }    } else {    this.circuitBreaker = {  }



    return false;      StructuredLogger.info('EnterpriseCache: Redis disabled, using memory cache only');

  }

    }      failures: 0,

  async delete(key: string): Promise<boolean> {

    this.memoryCache.delete(key);  }



    if (this.redis && this.isRedisEnabled) {      maxFailures: breakerConfig.maxFailures,  private async initializeRedis(): Promise<void> {

      try {

        await this.redis.del(key);  private async initializeRedis(): Promise<void> {

        return true;

      } catch (err) {    const redisUrl = process.env.REDIS_URL;      timeout: breakerConfig.timeout,    // Check if Redis URL is actually configured

        StructuredLogger.error('Redis DEL error', err, { key });

      }    const redisEnabled = process.env.REDIS_ENABLED !== 'false';

    }

      nextAttempt: 0,    const redisUrl = process.env.REDIS_URL;

    return false;

  }    if (!redisEnabled || !redisUrl) {



  private getFromMemory<T>(key: string): T | null {      StructuredLogger.info('Redis not configured - running without cache');    };    const redisEnabled = process.env.REDIS_ENABLED !== 'false';

    const item = this.memoryCache.get(key);

    if (!item) return null;      return;

    if (Date.now() > item.expiry) {

      this.memoryCache.delete(key);    }

      return null;

    }

    return item.value as T;

  }    try {    // Only initialize Redis if explicitly enabled and configured    if (!redisEnabled || !redisUrl) {



  private setInMemory(key: string, value: any, ttlSeconds?: number): void {      this.redis = createClient({

    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : Date.now() + 3600 * 1000;

    this.memoryCache.set(key, { value, expiry });        url: redisUrl,    const redisUrl = process.env.REDIS_URL;      StructuredLogger.info('Redis not configured - running without cache');

    

    if (this.memoryCache.size > 10000) {        socket: {

      this.cleanupMemoryCache();

    }          connectTimeout: 10000,    const redisEnabled = process.env.REDIS_ENABLED !== 'false';      return;

  }

          commandTimeout: 5000,

  private cleanupMemoryCache(): void {

    const now = Date.now();          reconnectStrategy: (retries) => {        }

    let cleaned = 0;

    for (const [k, v] of this.memoryCache.entries()) {            if (retries >= 3) return false;

      if (now > v.expiry) {

        this.memoryCache.delete(k);            return Math.min(retries * 1000, 5000);    if (redisUrl && redisEnabled) {

        cleaned++;

      }          }

      if (cleaned > 1000) break;

    }        }      void this.initializeRedis();    // Only attempt Redis connection if properly configured

  }

      });

  async healthCheck(): Promise<{ redis: boolean; memory: boolean }> {

    let redisHealth = false;    } else {    const redisConfig = configService.getRedisConfig();

    if (this.redis && this.isRedisEnabled) {

      try {      this.redis.on('error', (err) => {

        await this.redis.ping();

        redisHealth = true;        StructuredLogger.error('Redis connection error', err);      StructuredLogger.info('EnterpriseCache: Redis disabled, using memory cache only');

      } catch (err) {

        redisHealth = false;        this.handleRedisFailure();

      }

    }      });    }    try {

    return { 

      redis: redisHealth, 

      memory: this.memoryCache.size < 10000 

    };      this.redis.on('connect', () => {  }      this.redis = new Redis({

  }

        StructuredLogger.info('Redis connected successfully');

  async shutdown(): Promise<void> {

    if (this.redis) {        this.resetCircuitBreaker();        host: redisConfig.host,

      try {

        await this.redis.disconnect();      });

      } catch (err) {

        StructuredLogger.error('Error disconnecting Redis', err);  private async initializeRedis(): Promise<void> {        port: redisConfig.port,

      }

    }      await this.redis.connect();

    this.memoryCache.clear();

  }    } catch (err) {    const redisUrl = process.env.REDIS_URL;        password: redisConfig.password,

}
      StructuredLogger.warn('Redis initialization failed, falling back to memory cache', { error: err });

      this.handleRedisFailure();    const redisEnabled = process.env.REDIS_ENABLED !== 'false';        db: redisConfig.db,

    }

  }        maxRetriesPerRequest: redisConfig.maxRetries,



  async get<T>(key: string): Promise<T | null> {    if (!redisEnabled || !redisUrl) {        lazyConnect: true,

    await this.tryResetCircuitBreaker();

      StructuredLogger.info('Redis not configured - running without cache');        connectTimeout: 10000,

    if (this.isCircuitBreakerOpen()) return this.getFromMemory<T>(key);

      return;        commandTimeout: 5000,

    try {

      if (this.redis) {    }        enableOfflineQueue: false,

        const value = await this.redis.get(key);

        if (value !== null) {      });

          this.resetCircuitBreaker();

          return JSON.parse(value) as T;    try {

        }

      }      this.redis = createClient({      this.redis.on('error', (err) => {

    } catch (err) {

      StructuredLogger.error('Redis GET error', err, { key });        url: redisUrl,        StructuredLogger.error('Redis connection error', err);

      this.handleRedisFailure();

    }        socket: {        this.handleRedisFailure();



    return this.getFromMemory<T>(key);          connectTimeout: 10000,      });

  }

          commandTimeout: 5000,

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {

    const serialized = JSON.stringify(value);          reconnectStrategy: (retries) => {      this.redis.on('connect', () => {

    // Always write to memory fallback

    this.setInMemory(key, value, ttlSeconds);            if (retries >= 3) return false;        StructuredLogger.info('Redis connected successfully');



    if (this.isCircuitBreakerOpen() || !this.redis) return false;            return Math.min(retries * 1000, 5000);        this.resetCircuitBreaker();



    try {          }      });

      if (ttlSeconds) {

        await this.redis.setEx(key, ttlSeconds, serialized);        }

      } else {

        await this.redis.set(key, serialized);      });      await this.redis.connect();

      }

      this.resetCircuitBreaker();    } catch (err) {

      return true;

    } catch (err) {      this.redis.on('error', (err) => {      StructuredLogger.warn('Redis initialization failed, falling back to memory cache', { error: err });

      StructuredLogger.error('Redis SET error', err, { key });

      this.handleRedisFailure();        StructuredLogger.error('Redis connection error', err);      this.handleRedisFailure();

      return false;

    }        this.handleRedisFailure();    }

  }

      });  }

  async delete(key: string): Promise<boolean> {

    this.memoryCache.delete(key);



    if (this.isCircuitBreakerOpen() || !this.redis) return false;      this.redis.on('connect', () => {  async get<T>(key: string): Promise<T | null> {



    try {        StructuredLogger.info('Redis connected successfully');    await this.tryResetCircuitBreaker();

      await this.redis.del(key);

      this.resetCircuitBreaker();        this.resetCircuitBreaker();

      return true;

    } catch (err) {        this.isConnected = true;    if (this.isCircuitBreakerOpen()) return this.getFromMemory<T>(key);

      StructuredLogger.error('Redis DEL error', err, { key });

      this.handleRedisFailure();      });

      return false;

    }    try {

  }

      this.redis.on('disconnect', () => {      if (this.redis) {

  async invalidatePattern(pattern: string): Promise<number> {

    let count = 0;        StructuredLogger.warn('Redis disconnected');        const value = await this.redis.get(key);

    for (const key of Array.from(this.memoryCache.keys())) {

      if (this.matchesPattern(key, pattern)) {        this.isConnected = false;        if (value !== null) {

        this.memoryCache.delete(key);

        count++;      });          this.resetCircuitBreaker();

      }

    }          return JSON.parse(value) as T;



    if (this.isCircuitBreakerOpen() || !this.redis) return count;      await this.redis.connect();        }



    try {    } catch (err) {      }

      const keys: string[] = [];

      for await (const key of this.redis.scanIterator({ MATCH: pattern })) {      StructuredLogger.warn('Redis initialization failed, falling back to memory cache', { error: err });    } catch (err) {

        keys.push(key);

      }      this.handleRedisFailure();      StructuredLogger.error('Redis GET error', err, { key });

      

      if (keys.length > 0) {    }      this.handleRedisFailure();

        await this.redis.del(keys);

        count += keys.length;  }    }

      }

      this.resetCircuitBreaker();

    } catch (err) {

      StructuredLogger.error('Redis pattern invalidation error', err, { pattern });  async get<T>(key: string): Promise<T | null> {    return this.getFromMemory<T>(key);

      this.handleRedisFailure();

    }    await this.tryResetCircuitBreaker();  }



    return count;

  }

    if (this.isCircuitBreakerOpen()) return this.getFromMemory<T>(key);  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {

  async incrementCounter(key: string, increment = 1, ttlSeconds?: number): Promise<number> {

    if (!this.isCircuitBreakerOpen() && this.redis) {    const serialized = JSON.stringify(value);

      try {

        const current = await this.redis.get(key);    try {    // Always write to memory fallback

        const newValue = (current ? parseInt(current, 10) : 0) + increment;

              if (this.redis && this.isConnected) {    this.setInMemory(key, value, ttlSeconds);

        if (ttlSeconds) {

          await this.redis.setEx(key, ttlSeconds, newValue.toString());        const value = await this.redis.get(key);

        } else {

          await this.redis.set(key, newValue.toString());        if (value !== null) {    if (this.isCircuitBreakerOpen() || !this.redis) return false;

        }

                  this.resetCircuitBreaker();

        this.resetCircuitBreaker();

        return newValue;          return JSON.parse(value) as T;    try {

      } catch (err) {

        StructuredLogger.error('Redis increment error', err, { key });        }      if (ttlSeconds) {

        this.handleRedisFailure();

      }      }        await this.redis.setex(key, ttlSeconds, serialized);

    }

    } catch (err) {      } else {

    // memory fallback

    const current = (this.getFromMemory<number>(key) as number) || 0;      StructuredLogger.error('Redis GET error', err, { key });        await this.redis.set(key, serialized);

    const newValue = current + increment;

    this.setInMemory(key, newValue, ttlSeconds);      this.handleRedisFailure();      }

    return newValue;

  }    }      this.resetCircuitBreaker();



  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds = 3600): Promise<T> {      return true;

    const cached = await this.get<T>(key);

    if (cached !== null) return cached;    return this.getFromMemory<T>(key);    } catch (err) {



    const lockKey = `lock:${key}`;  }      StructuredLogger.error('Redis SET error', err, { key });

    const lockValue = Math.random().toString(36).slice(2);

    const lockTtl = 30;      this.handleRedisFailure();



    if (await this.acquireLock(lockKey, lockValue, lockTtl)) {  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {      return false;

      try {

        const cachedAfter = await this.get<T>(key);    const serialized = JSON.stringify(value);    }

        if (cachedAfter !== null) return cachedAfter;

    // Always write to memory fallback  }

        const value = await factory();

        await this.set(key, value, ttlSeconds);    this.setInMemory(key, value, ttlSeconds);

        return value;

      } finally {  async delete(key: string): Promise<boolean> {

        await this.releaseLock(lockKey, lockValue);

      }    if (this.isCircuitBreakerOpen() || !this.redis || !this.isConnected) return false;    this.memoryCache.delete(key);

    }



    await new Promise((r) => setTimeout(r, 100));

    const retry = await this.get<T>(key);    try {    if (this.isCircuitBreakerOpen() || !this.redis) return false;

    return retry !== null ? retry : factory();

  }      if (ttlSeconds) {



  private async acquireLock(key: string, value: string, ttlSeconds: number): Promise<boolean> {        await this.redis.setEx(key, ttlSeconds, serialized);    try {

    if (!this.redis || this.isCircuitBreakerOpen()) return true;

      } else {      await this.redis.del(key);

    try {

      const result = await this.redis.set(key, value, {        await this.redis.set(key, serialized);      this.resetCircuitBreaker();

        EX: ttlSeconds,

        NX: true      }      return true;

      });

      return result === 'OK';      this.resetCircuitBreaker();    } catch (err) {

    } catch (err) {

      StructuredLogger.error('Lock acquisition error', err, { key });      return true;      StructuredLogger.error('Redis DEL error', err, { key });

      return false;

    }    } catch (err) {      this.handleRedisFailure();

  }

      StructuredLogger.error('Redis SET error', err, { key });      return false;

  private async releaseLock(key: string, value: string): Promise<boolean> {

    if (!this.redis || this.isCircuitBreakerOpen()) return true;      this.handleRedisFailure();    }



    try {      return false;  }

      // Simple approach: just delete the key if it exists

      const current = await this.redis.get(key);    }

      if (current === value) {

        await this.redis.del(key);  }  async invalidatePattern(pattern: string): Promise<number> {

        return true;

      }    let count = 0;

      return false;

    } catch (err) {  async delete(key: string): Promise<boolean> {    for (const key of Array.from(this.memoryCache.keys())) {

      StructuredLogger.error('Lock release error', err, { key });

      return false;    this.memoryCache.delete(key);      if (this.matchesPattern(key, pattern)) {

    }

  }        this.memoryCache.delete(key);



  private getFromMemory<T>(key: string): T | null {    if (this.isCircuitBreakerOpen() || !this.redis || !this.isConnected) return false;        count++;

    const item = this.memoryCache.get(key);

    if (!item) return null;      }

    if (Date.now() > item.expiry) {

      this.memoryCache.delete(key);    try {    }

      return null;

    }      await this.redis.del(key);

    return item.value as T;

  }      this.resetCircuitBreaker();    if (this.isCircuitBreakerOpen() || !this.redis) return count;



  private setInMemory(key: string, value: any, ttlSeconds?: number): void {      return true;

    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : Date.now() + 3600 * 1000;

    this.memoryCache.set(key, { value, expiry });    } catch (err) {    try {

    if (this.memoryCache.size > 20000) this.cleanupMemoryCache();

  }      StructuredLogger.error('Redis DEL error', err, { key });      const keys = await this.redis.keys(pattern);



  private cleanupMemoryCache(): void {      this.handleRedisFailure();      if (keys.length > 0) {

    const now = Date.now();

    let cleaned = 0;      return false;        await this.redis.del(...keys);

    for (const [k, v] of this.memoryCache.entries()) {

      if (now > v.expiry) {    }        count += keys.length;

        this.memoryCache.delete(k);

        cleaned++;  }      }

      }

      if (cleaned > 1000) break;      this.resetCircuitBreaker();

    }

  }  async invalidatePattern(pattern: string): Promise<number> {    } catch (err) {



  private matchesPattern(key: string, pattern: string): boolean {    let count = 0;      StructuredLogger.error('Redis pattern invalidation error', err, { pattern });

    const regex = new RegExp(pattern.replace(/\*/g, '.*'));

    return regex.test(key);    for (const key of Array.from(this.memoryCache.keys())) {      this.handleRedisFailure();

  }

      if (this.matchesPattern(key, pattern)) {    }

  private isCircuitBreakerOpen(): boolean {

    return this.circuitBreaker.failures >= this.circuitBreaker.maxFailures && Date.now() < this.circuitBreaker.nextAttempt;        this.memoryCache.delete(key);

  }

        count++;    return count;

  private handleRedisFailure(): void {

    this.circuitBreaker.failures++;      }  }

    this.circuitBreaker.nextAttempt = Date.now() + this.circuitBreaker.timeout;

        }

    // Log throttling to prevent spam

    const now = Date.now();  async incrementCounter(key: string, increment = 1, ttlSeconds?: number): Promise<number> {

    if (now - this.lastLogTime > this.LOG_THROTTLE_MS) {

      StructuredLogger.warn('Redis failure detected', { failures: this.circuitBreaker.failures, maxFailures: this.circuitBreaker.maxFailures });    if (this.isCircuitBreakerOpen() || !this.redis || !this.isConnected) return count;    const lua = `

      if (this.circuitBreaker.failures >= this.circuitBreaker.maxFailures) {

        StructuredLogger.error('Circuit breaker OPENED. Redis operations suspended', { timeout: this.circuitBreaker.timeout });      local current = redis.call('GET', KEYS[1])

      }

      this.lastLogTime = now;    try {      local newValue = (current and tonumber(current) or 0) + tonumber(ARGV[1])

    }

  }      const keys: string[] = [];      redis.call('SET', KEYS[1], newValue)



  private async tryResetCircuitBreaker(): Promise<void> {      for await (const key of this.redis.scanIterator({ MATCH: pattern })) {      if ARGV[2] ~= '' then

    // Only try to reset if Redis is properly configured

    const redisUrl = process.env.REDIS_URL;        keys.push(key);        redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))

    const redisEnabled = process.env.REDIS_ENABLED !== 'false';

          }      end

    if (!redisUrl || !redisEnabled) return;

                return newValue

    if (this.isCircuitBreakerOpen() && Date.now() >= this.circuitBreaker.nextAttempt) {

      try {      if (keys.length > 0) {    `;

        if (this.redis) {

          await this.redis.ping();        await this.redis.del(keys);

          this.resetCircuitBreaker();

          StructuredLogger.info('Redis connection restored, circuit breaker reset');        count += keys.length;    if (!this.isCircuitBreakerOpen() && this.redis) {

        }

      } catch (err) {      }      try {

        this.circuitBreaker.nextAttempt = Date.now() + this.circuitBreaker.timeout;

        StructuredLogger.warn('Redis still failing, circuit breaker remains open');      this.resetCircuitBreaker();        const result = await this.redis.eval(lua, 1, key, increment.toString(), (ttlSeconds || '').toString()) as number;

      }

    }    } catch (err) {        this.resetCircuitBreaker();

  }

      StructuredLogger.error('Redis pattern invalidation error', err, { pattern });        return result;

  private resetCircuitBreaker(): void {

    this.circuitBreaker.failures = 0;      this.handleRedisFailure();      } catch (err) {

    this.circuitBreaker.nextAttempt = 0;

        }        StructuredLogger.error('Redis increment error', err, { key });

    // Don't auto-reconnect unless Redis is properly configured

    const redisUrl = process.env.REDIS_URL;        this.handleRedisFailure();

    const redisEnabled = process.env.REDIS_ENABLED !== 'false';

    if (!this.redis && redisUrl && redisEnabled) {    return count;      }

      void this.initializeRedis();

    }  }    }

  }



  async healthCheck(): Promise<{ redis: boolean; memory: boolean; circuitBreaker: { open: boolean; failures: number } }> {

    const redisHealth = !this.isCircuitBreakerOpen() && this.redis !== null;  async incrementCounter(key: string, increment = 1, ttlSeconds?: number): Promise<number> {    // memory fallback

    if (redisHealth && this.redis) {

      try {    if (!this.isCircuitBreakerOpen() && this.redis && this.isConnected) {    const current = (this.getFromMemory<number>(key) as number) || 0;

        await this.redis.ping();

      } catch (err) {      try {    const newValue = current + increment;

        return { redis: false, memory: true, circuitBreaker: { open: this.isCircuitBreakerOpen(), failures: this.circuitBreaker.failures } };

      }        const current = await this.redis.get(key);    this.setInMemory(key, newValue, ttlSeconds);

    }

    return { redis: redisHealth, memory: this.memoryCache.size < 20000, circuitBreaker: { open: this.isCircuitBreakerOpen(), failures: this.circuitBreaker.failures } };        const newValue = (current ? parseInt(current, 10) : 0) + increment;    return newValue;

  }

          }

  async shutdown(): Promise<void> {

    if (this.redis) {        if (ttlSeconds) {

      try {

        await this.redis.disconnect();          await this.redis.setEx(key, ttlSeconds, newValue.toString());  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds = 3600): Promise<T> {

      } catch (err) {

        StructuredLogger.error('Error disconnecting Redis', err);        } else {    const cached = await this.get<T>(key);

      }

    }          await this.redis.set(key, newValue.toString());    if (cached !== null) return cached;

    this.memoryCache.clear();

  }        }

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