import crypto from 'crypto';
const { StructuredLogger } = require('../utils/structured-logger');

export interface CachedAnalysis {
  content: string;
  timestamp: Date;
  tokenCount: number;
  model: string;
  hitCount: number;
}

export class AnalysisCacheService {
  private static cache = new Map<string, CachedAnalysis>();
  private static readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 días
  private static readonly MAX_CACHE_SIZE = 1000; // Máximo 1000 entradas

  /**
   * Genera un hash único para el requirement que permita detectar similitudes
   */
  static generateRequirementHash(requirement: string): string {
    // Normalizar el texto para mejor matching
    const normalized = requirement
      .toLowerCase()
      .replace(/\s+/g, ' ')           // Múltiples espacios a uno
      .replace(/[^\w\s]/g, '')        // Quitar puntuación
      .trim();
    
    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  /**
   * Genera hash de similitud basado en palabras clave
   */
  static generateSimilarityHash(requirement: string): string {
    // Extraer palabras clave principales (más de 3 caracteres)
    const keywords = requirement
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word))
      .sort()
      .slice(0, 10) // Top 10 palabras clave
      .join('|');
    
    return crypto.createHash('md5').update(keywords).digest('hex');
  }

  /**
   * Busca una respuesta en caché para el requirement exacto
   */
  static async getCachedAnalysis(requirement: string): Promise<CachedAnalysis | null> {
    try {
      const hash = this.generateRequirementHash(requirement);
      const cached = this.cache.get(hash);
      
  if (cached && this.isValidCache(cached)) {
  // Incrementar contador de hits
  cached.hitCount++;
        
  StructuredLogger.info('Cache HIT para análisis', { hits: cached.hitCount });
        return cached;
      }
      
      // Si no encuentra exacto, buscar similar
      return this.findSimilarCachedAnalysis(requirement);
    } catch (error) {
      StructuredLogger.error('Error getting cached analysis', error as Error, { requirement });
      return null;
    }
  }

  /**
   * Busca análisis similares en caché
   */
  static findSimilarCachedAnalysis(requirement: string): CachedAnalysis | null {
    try {
      const similarityHash = this.generateSimilarityHash(requirement);
      
      // Buscar entradas con hash de similitud parecido
      for (const [key, cached] of this.cache.entries()) {
        if (!this.isValidCache(cached)) continue;
        
        // Comparar por palabras clave similares
        const cachedSimilarityHash = this.generateSimilarityHash(key);
        const similarity = this.calculateHashSimilarity(similarityHash, cachedSimilarityHash);
        
        if (similarity > 0.7) { // 70% de similitud
          StructuredLogger.info('Cache SIMILAR encontrado', { similarity: Math.round(similarity * 100) });
          cached.hitCount++;
          return cached;
        }
      }
      
      return null;
    } catch (error) {
      StructuredLogger.error('Error finding similar cached analysis', error as Error, { requirement });
      return null;
    }
  }

  /**
   * Guarda un análisis en caché
   */
  static async cacheAnalysis(
    requirement: string, 
    analysis: string, 
    tokenCount: number,
    model: string
  ): Promise<void> {
    try {
      const hash = this.generateRequirementHash(requirement);
      
      const cachedAnalysis: CachedAnalysis = {
        content: analysis,
        timestamp: new Date(),
        tokenCount,
        model,
        hitCount: 0
      };
      
      // Limpiar caché si está muy lleno
      if (this.cache.size >= this.MAX_CACHE_SIZE) {
        this.cleanOldEntries();
      }
      
      this.cache.set(hash, cachedAnalysis);
      
  StructuredLogger.info('Análisis cacheado', { totalEntries: this.cache.size });
    } catch (error) {
  StructuredLogger.error('Error caching analysis', error);
    }
  }

  /**
   * Guarda preguntas generadas en caché
   */
  static async cacheQuestions(
    analysis: string,
    questions: string[],
    tokenCount: number,
    model: string
  ): Promise<void> {
    try {
      const hash = this.generateRequirementHash(analysis);
      const questionsKey = `questions_${hash}`;
      
      const cachedQuestions: CachedAnalysis = {
        content: JSON.stringify(questions),
        timestamp: new Date(),
        tokenCount,
        model,
        hitCount: 0
      };
      
      this.cache.set(questionsKey, cachedQuestions);
      
  StructuredLogger.info('Preguntas cacheadas para análisis');
    } catch (error) {
  StructuredLogger.error('Error caching questions', error);
    }
  }

  /**
   * Obtiene preguntas cacheadas
   */
  static async getCachedQuestions(analysis: string): Promise<string[] | null> {
    try {
      const hash = this.generateRequirementHash(analysis);
      const questionsKey = `questions_${hash}`;
      const cached = this.cache.get(questionsKey);
      
      if (cached && this.isValidCache(cached)) {
  cached.hitCount++;
  StructuredLogger.info('Cache HIT para preguntas', { hits: cached.hitCount });
        return JSON.parse(cached.content);
      }
      
      return null;
    } catch (error) {
      StructuredLogger.error('Error getting cached questions', error as Error, { analysis });
      return null;
    }
  }

  /**
   * Verifica si una entrada de caché es válida
   */
  private static isValidCache(cached: CachedAnalysis): boolean {
    const now = new Date().getTime();
    const cacheTime = cached.timestamp.getTime();
    
    return (now - cacheTime) < this.CACHE_DURATION;
  }

  /**
   * Limpia entradas antiguas del caché
   */
  private static cleanOldEntries(): void {
    const now = new Date().getTime();
    let removedCount = 0;
    
    for (const [key, cached] of this.cache.entries()) {
      const cacheTime = cached.timestamp.getTime();
      
      // Remover entradas antiguas o con pocos hits
      if ((now - cacheTime) > this.CACHE_DURATION || cached.hitCount === 0) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
  StructuredLogger.info('Cache limpiado', { removedCount });
  }

  /**
   * Calcula similitud entre dos hashes
   */
  private static calculateHashSimilarity(hash1: string, hash2: string): number {
    let matches = 0;
    const length = Math.min(hash1.length, hash2.length);
    
    for (let i = 0; i < length; i++) {
      if (hash1[i] === hash2[i]) {
        matches++;
      }
    }
    
    return matches / length;
  }

  /**
   * Lista de stop words en español
   */
  private static stopWords = new Set([
    'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 
    'le', 'da', 'su', 'por', 'son', 'con', 'para', 'como', 'las', 'del', 'los',
    'una', 'por', 'pero', 'sus', 'ese', 'está', 'esta', 'todo', 'también',
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her',
    'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how'
  ]);

  private static isStopWord(word: string): boolean {
    return this.stopWords.has(word.toLowerCase());
  }

  /**
   * Estadísticas del caché
   */
  static getCacheStats(): {
    totalEntries: number;
    totalHits: number;
    averageHits: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  } {
    let totalHits = 0;
    let oldestEntry: Date | null = null;
    let newestEntry: Date | null = null;
    
    for (const cached of this.cache.values()) {
      totalHits += cached.hitCount;
      
      if (!oldestEntry || cached.timestamp < oldestEntry) {
        oldestEntry = cached.timestamp;
      }
      
      if (!newestEntry || cached.timestamp > newestEntry) {
        newestEntry = cached.timestamp;
      }
    }
    
    return {
      totalEntries: this.cache.size,
      totalHits,
      averageHits: this.cache.size > 0 ? totalHits / this.cache.size : 0,
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Limpiar todo el caché (para testing o maintenance)
   */
  static clearCache(): void {
    this.cache.clear();
  StructuredLogger.info('Cache completamente limpiado');
  }

  /**
   * Calcular tokens ahorrados por el cache
   */
  static calculateTokenSavings(): number {
    let totalTokensSaved = 0;
    
    for (const cached of this.cache.values()) {
      if (cached.hitCount > 0) {
        totalTokensSaved += cached.tokenCount * cached.hitCount;
      }
    }
    
    return totalTokensSaved;
  }
}
