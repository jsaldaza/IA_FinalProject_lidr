// 🚀 CONFIGURACIÓN REDIS MODERNA Y ESCALABLE// 🚀 CONFIGURACIÓN REDIS OPTIMIZADA PARA SUPABASE + UPSTASH

// ==========================================================// ==========================================================

import { createClient, RedisClientType } from 'redis';import { createClient, RedisClientType } from 'redis';

import { StructuredLogger } from '../utils/structured-logger';import { StructuredLogger } from '../utils/structured-logger';



class RedisService {// Configuración optimizada para Redis Cloud/Upstash

  private static instance: RedisClientType | null = null;const redisConfig = {

  private static isEnabled = process.env.REDIS_ENABLED !== 'false';  host: process.env.REDIS_HOST,

  private static isConnected = false;  port: parseInt(process.env.REDIS_PORT || '6379'),

  password: process.env.REDIS_PASSWORD,

  public static getInstance(): RedisClientType | null {  

    if (!RedisService.isEnabled) {  // Configuraciones específicas para Upstash

      StructuredLogger.info('Redis está deshabilitado en configuración');  tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,

      return null;  

    }  // Pool de conexiones optimizado

  maxRetriesPerRequest: 3,

    if (!RedisService.instance) {  retryDelayOnFailover: 100,

      try {  maxLoadingTimeout: 5000,

        // Usar URL completa si está disponible (Upstash/Cloud)  connectTimeout: 10000,

        if (process.env.REDIS_URL) {  commandTimeout: 5000,

          RedisService.instance = createClient({  

            url: process.env.REDIS_URL,  // Configuración de reconexión

            socket: {  lazyConnect: true,

              connectTimeout: 10000,  keepAlive: 30000,

              commandTimeout: 5000,  

              reconnectStrategy: (retries) => {  // Configuraciones específicas para cloud

                if (retries >= 3) return false;  family: 4, // IPv4

                return Math.min(retries * 1000, 5000);  enableAutoPipelining: true,

              }  maxCommandsInQueue: 100,

            }};

          });

        } else {class RedisService {

          // Configuración manual para Redis local  private static instance: RedisClientType | null = null;

          RedisService.instance = createClient({  private static isEnabled = process.env.REDIS_ENABLED === 'true';

            socket: {

              host: process.env.REDIS_HOST || 'localhost',  public static getInstance(): Redis | null {

              port: parseInt(process.env.REDIS_PORT || '6379'),    if (!RedisService.isEnabled) {

              connectTimeout: 10000,      StructuredLogger.info('Redis está deshabilitado en configuración');

              commandTimeout: 5000,      return null;

            },    }

            password: process.env.REDIS_PASSWORD,

          });    if (!RedisService.instance) {

        }      try {

        // Usar URL completa si está disponible (Upstash)

        RedisService.setupEventHandlers();        if (process.env.REDIS_URL) {

                  RedisService.instance = new Redis(process.env.REDIS_URL, {

        // Conectar de forma asíncrona            maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,

        RedisService.instance.connect().catch((error) => {            connectTimeout: redisConfig.connectTimeout,

          StructuredLogger.error('Error conectando a Redis:', error);            commandTimeout: redisConfig.commandTimeout,

          RedisService.instance = null;            lazyConnect: true,

        });            enableAutoPipelining: true,

                  });

        StructuredLogger.info('Cliente Redis inicializado correctamente');        } else {

                  // Configuración manual para Redis local

      } catch (error) {          RedisService.instance = new Redis(redisConfig);

        StructuredLogger.error('Error inicializando Redis:', error as Error);        }

        RedisService.instance = null;

      }        RedisService.setupEventHandlers();

    }        

        StructuredLogger.info('Cliente Redis inicializado correctamente');

    return RedisService.instance;        

  }      } catch (error) {

        StructuredLogger.error('Error inicializando Redis:', error as Error);

  private static setupEventHandlers() {        RedisService.instance = null;

    if (!RedisService.instance) return;      }

    }

    RedisService.instance.on('connect', () => {

      StructuredLogger.info('Redis conectado exitosamente');    return RedisService.instance;

      RedisService.isConnected = true;  }

    });

  private static setupEventHandlers() {

    RedisService.instance.on('ready', () => {    if (!RedisService.instance) return;

      StructuredLogger.info('Redis listo para recibir comandos');

    });    RedisService.instance.on('connect', () => {

      StructuredLogger.info('Redis conectado exitosamente');

    RedisService.instance.on('error', (error) => {    });

      StructuredLogger.error('Error de conexión Redis:', error);

      RedisService.isConnected = false;    RedisService.instance.on('ready', () => {

    });      StructuredLogger.info('Redis listo para recibir comandos');

    });

    RedisService.instance.on('disconnect', () => {

      StructuredLogger.warn('Conexión Redis cerrada');    RedisService.instance.on('error', (error) => {

      RedisService.isConnected = false;      StructuredLogger.error('Error de conexión Redis:', error);

    });    });



    RedisService.instance.on('reconnecting', () => {    RedisService.instance.on('close', () => {

      StructuredLogger.info('Reconectando a Redis...');      StructuredLogger.warn('Conexión Redis cerrada');

    });    });



    RedisService.instance.on('end', () => {    RedisService.instance.on('reconnecting', (ms: number) => {

      StructuredLogger.warn('Conexión Redis terminada');      StructuredLogger.info(`Reconectando a Redis en ${ms}ms`);

      RedisService.isConnected = false;    });

    });

  }    RedisService.instance.on('end', () => {

      StructuredLogger.warn('Conexión Redis terminada');

  // Health check específico para Redis    });

  public static async healthCheck(): Promise<boolean> {  }

    const redis = RedisService.getInstance();

    if (!redis || !RedisService.isConnected) return false;  // Health check específico para Redis

  public static async healthCheck(): Promise<boolean> {

    try {    const redis = RedisService.getInstance();

      const result = await redis.ping();    if (!redis) return false;

      return result === 'PONG';

    } catch (error) {    try {

      StructuredLogger.error('Redis health check failed:', error as Error);      const result = await redis.ping();

      return false;      return result === 'PONG';

    }    } catch (error) {

  }      StructuredLogger.error('Redis health check failed:', error as Error);

      return false;

  // Obtener estadísticas de Redis    }

  public static async getStats() {  }

    const redis = RedisService.getInstance();

    if (!redis || !RedisService.isConnected) return null;  // Obtener estadísticas de Redis

  public static async getStats() {

    try {    const redis = RedisService.getInstance();

      const info = await redis.info();    if (!redis) return null;

      const keyCount = await redis.dbSize();

          try {

      return {      const info = await redis.info('memory');

        connected: true,      const keyCount = await redis.dbsize();

        keyCount,      

        info: info,      return {

        isConnected: RedisService.isConnected,        connected: true,

      };        keyCount,

    } catch (error) {        memory: info,

      StructuredLogger.error('Error obteniendo stats de Redis:', error as Error);        uptime: await redis.lastsave(),

      return null;      };

    }    } catch (error) {

  }      StructuredLogger.error('Error obteniendo stats de Redis:', error as Error);

      return null;

  // Cerrar conexión gracefully    }

  public static async disconnect() {  }

    if (RedisService.instance) {

      try {  // Cerrar conexión gracefully

        await RedisService.instance.disconnect();  public static async disconnect() {

        RedisService.isConnected = false;    if (RedisService.instance) {

        RedisService.instance = null;      await RedisService.instance.quit();

      } catch (error) {      RedisService.instance = null;

        StructuredLogger.error('Error desconectando Redis:', error as Error);    }

      }  }

    }}

  }

// Cache service optimizado para el proyecto

  public static isRedisConnected(): boolean {export class CacheService {

    return RedisService.isConnected;  private redis: Redis | null;

  }  

}  constructor() {

    this.redis = RedisService.getInstance();

// Cache service optimizado para el proyecto  }

export class CacheService {

  private redis: RedisClientType | null;  // TTL optimizados para diferentes tipos de datos

    private static TTL = {

  constructor() {    USER_DATA: 60 * 15,        // 15 minutos

    this.redis = RedisService.getInstance();    DASHBOARD_STATS: 60 * 5,   // 5 minutos  

  }    ANALYSIS_DATA: 60 * 10,    // 10 minutos

    AI_RESPONSES: 60 * 60,     // 1 hora

  // TTL optimizados para diferentes tipos de datos    CHAT_HISTORY: 60 * 30,     // 30 minutos

  private static TTL = {    PROJECT_DATA: 60 * 20,     // 20 minutos

    USER_DATA: 60 * 15,        // 15 minutos  };

    DASHBOARD_STATS: 60 * 5,   // 5 minutos  

    ANALYSIS_DATA: 60 * 10,    // 10 minutos  async get<T>(key: string): Promise<T | null> {

    AI_RESPONSES: 60 * 60,     // 1 hora    if (!this.redis) return null;

    CHAT_HISTORY: 60 * 30,     // 30 minutos

    PROJECT_DATA: 60 * 20,     // 20 minutos    try {

  };      const data = await this.redis.get(key);

      return data ? JSON.parse(data) : null;

  async get<T>(key: string): Promise<T | null> {    } catch (error) {

    if (!this.redis || !RedisService.isRedisConnected()) return null;      StructuredLogger.error(`Error getting cache key ${key}:`, error as Error);

      return null;

    try {    }

      const data = await this.redis.get(key);  }

      return data ? JSON.parse(data) : null;

    } catch (error) {  async set(key: string, value: any, type: keyof typeof CacheService.TTL = 'ANALYSIS_DATA'): Promise<boolean> {

      StructuredLogger.error(`Error getting cache key ${key}:`, error as Error);    if (!this.redis) return false;

      return null;

    }    try {

  }      const ttl = CacheService.TTL[type];

      await this.redis.setex(key, ttl, JSON.stringify(value));

  async set(key: string, value: any, type: keyof typeof CacheService.TTL = 'ANALYSIS_DATA'): Promise<boolean> {      return true;

    if (!this.redis || !RedisService.isRedisConnected()) return false;    } catch (error) {

      StructuredLogger.error(`Error setting cache key ${key}:`, error as Error);

    try {      return false;

      const ttl = CacheService.TTL[type];    }

      await this.redis.setEx(key, ttl, JSON.stringify(value));  }

      return true;

    } catch (error) {  async del(key: string): Promise<boolean> {

      StructuredLogger.error(`Error setting cache key ${key}:`, error as Error);    if (!this.redis) return false;

      return false;

    }    try {

  }      await this.redis.del(key);

      return true;

  async del(key: string): Promise<boolean> {    } catch (error) {

    if (!this.redis || !RedisService.isRedisConnected()) return false;      StructuredLogger.error(`Error deleting cache key ${key}:`, error as Error);

      return false;

    try {    }

      await this.redis.del(key);  }

      return true;

    } catch (error) {  async clearPattern(pattern: string): Promise<number> {

      StructuredLogger.error(`Error deleting cache key ${key}:`, error as Error);    if (!this.redis) return 0;

      return false;

    }    try {

  }      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {

  async clearPattern(pattern: string): Promise<number> {        return await this.redis.del(...keys);

    if (!this.redis || !RedisService.isRedisConnected()) return 0;      }

      return 0;

    try {    } catch (error) {

      const keys: string[] = [];      StructuredLogger.error(`Error clearing cache pattern ${pattern}:`, error as Error);

      for await (const key of this.redis.scanIterator({ MATCH: pattern })) {      return 0;

        keys.push(key);    }

      }  }

      

      if (keys.length > 0) {  // Métodos específicos para el dominio

        return await this.redis.del(keys);  async getUserCache(userId: string) {

      }    return this.get(`user:${userId}`);

      return 0;  }

    } catch (error) {

      StructuredLogger.error(`Error clearing cache pattern ${pattern}:`, error as Error);  async setUserCache(userId: string, userData: any) {

      return 0;    return this.set(`user:${userId}`, userData, 'USER_DATA');

    }  }

  }

  async getDashboardStats(userId: string) {

  // Métodos específicos para el dominio    return this.get(`dashboard:${userId}`);

  async getUserCache(userId: string) {  }

    return this.get(`user:${userId}`);

  }  async setDashboardStats(userId: string, stats: any) {

    return this.set(`dashboard:${userId}`, stats, 'DASHBOARD_STATS');

  async setUserCache(userId: string, userData: any) {  }

    return this.set(`user:${userId}`, userData, 'USER_DATA');

  }  async getAnalysisCache(analysisId: string) {

    return this.get(`analysis:${analysisId}`);

  async getDashboardStats(userId: string) {  }

    return this.get(`dashboard:${userId}`);

  }  async setAnalysisCache(analysisId: string, analysis: any) {

    return this.set(`analysis:${analysisId}`, analysis, 'ANALYSIS_DATA');

  async setDashboardStats(userId: string, stats: any) {  }

    return this.set(`dashboard:${userId}`, stats, 'DASHBOARD_STATS');

  }  async invalidateUserCache(userId: string) {

    return this.clearPattern(`user:${userId}*`);

  async getAnalysisCache(analysisId: string) {  }

    return this.get(`analysis:${analysisId}`);}

  }

// Instancia singleton del cache

  async setAnalysisCache(analysisId: string, analysis: any) {export const cacheService = new CacheService();

    return this.set(`analysis:${analysisId}`, analysis, 'ANALYSIS_DATA');

  }// Funciones utilitarias

export const redisHealthCheck = RedisService.healthCheck;

  async invalidateUserCache(userId: string) {export const redisStats = RedisService.getStats;

    return this.clearPattern(`user:${userId}*`);export const redisDisconnect = RedisService.disconnect;

  }

}export default RedisService;

// Instancia singleton del cache
export const cacheService = new CacheService();

// Funciones utilitarias
export const redisHealthCheck = RedisService.healthCheck;
export const redisStats = RedisService.getStats;
export const redisDisconnect = RedisService.disconnect;

export default RedisService;