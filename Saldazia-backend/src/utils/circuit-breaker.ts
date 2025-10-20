/**
 * Circuit Breaker Pattern Implementation
 * Protects the system from cascading failures when external services (like OpenAI) fail
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number; // milliseconds
  monitoringPeriod: number; // milliseconds
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  consecutiveFailures: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  state: CircuitState;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private lastFailureTime: Date | null = null;
  private lastSuccessTime: Date | null = null;
  private nextAttempt: Date = new Date();
  
  // Metrics for monitoring
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;

  constructor(
    private config: CircuitBreakerConfig,
    private serviceName: string = 'Unknown'
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open and if we should attempt recovery
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt.getTime()) {
        throw new CircuitBreakerOpenError(
          `Circuit breaker is OPEN for ${this.serviceName}. Next attempt at ${this.nextAttempt.toISOString()}`
        );
      }
      // Move to half-open state for testing
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.lastSuccessTime = new Date();
    this.totalSuccesses++;
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      console.log(`✅ Circuit breaker for ${this.serviceName} recovered - State: CLOSED`);
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.totalFailures++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = new Date(Date.now() + this.config.recoveryTimeout);
      console.error(`🚨 Circuit breaker for ${this.serviceName} opened - State: OPEN until ${this.nextAttempt.toISOString()}`);
    }
  }

  public getMetrics(): CircuitBreakerMetrics {
    return {
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      consecutiveFailures: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      state: this.state
    };
  }

  public getState(): CircuitState {
    return this.state;
  }

  public isOpen(): boolean {
    return this.state === 'OPEN';
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = new Date();
    console.log(`🔄 Circuit breaker for ${this.serviceName} manually reset`);
  }

  // Health check method for monitoring
  public getHealthStatus(): {
    healthy: boolean;
    state: CircuitState;
    failureRate: number;
    uptime: number;
  } {
    const failureRate = this.totalRequests > 0 
      ? (this.totalFailures / this.totalRequests) * 100 
      : 0;
    
    const uptime = this.lastSuccessTime 
      ? Date.now() - this.lastSuccessTime.getTime()
      : 0;

    return {
      healthy: this.state !== 'OPEN',
      state: this.state,
      failureRate: Math.round(failureRate * 100) / 100,
      uptime
    };
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

// Factory for creating circuit breakers with different configs
export class CircuitBreakerFactory {
  private static breakers: Map<string, CircuitBreaker> = new Map();

  static getCircuitBreaker(
    serviceName: string, 
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      const defaultConfig: CircuitBreakerConfig = {
        failureThreshold: 5,           // 5 consecutive failures
        recoveryTimeout: 60000,        // 1 minute recovery
        monitoringPeriod: 10000        // 10 seconds monitoring
      };

      const finalConfig = { ...defaultConfig, ...config };
      this.breakers.set(serviceName, new CircuitBreaker(finalConfig, serviceName));
    }

    return this.breakers.get(serviceName)!;
  }

  static getAllBreakers(): Map<string, CircuitBreaker> {
    return this.breakers;
  }

  static resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset());
  }
}

// Pre-configured circuit breakers for common services
export const circuitBreakers = {
  openai: CircuitBreakerFactory.getCircuitBreaker('OpenAI', {
    failureThreshold: 3,     // More sensitive for AI service
    recoveryTimeout: 30000,  // 30 seconds recovery
    monitoringPeriod: 5000   // 5 seconds monitoring
  }),
  
  database: CircuitBreakerFactory.getCircuitBreaker('Database', {
    failureThreshold: 5,
    recoveryTimeout: 15000,  // 15 seconds recovery for DB
    monitoringPeriod: 3000
  }),
  
  redis: CircuitBreakerFactory.getCircuitBreaker('Redis', {
    failureThreshold: 3,
    recoveryTimeout: 10000,  // 10 seconds recovery for cache
    monitoringPeriod: 5000
  })
};