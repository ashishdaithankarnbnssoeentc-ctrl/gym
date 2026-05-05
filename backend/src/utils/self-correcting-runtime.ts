/**
 * Self-Correcting Runtime System
 * 
 * This module provides runtime resilience patterns that allow the system
 * to adapt, recover, and continue operating when things go wrong.
 */

interface RetryOptions {
  retries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoff?: number;
}

interface CircuitBreakerOptions {
  failureThreshold?: number;
  recoveryTimeout?: number;
  monitoringPeriod?: number;
}

interface ThrottleOptions {
  maxRequests?: number;
  windowMs?: number;
  skipSuccessfulRequests?: boolean;
}

interface HealthCheck {
  name: string;
  check: () => Promise<boolean>;
  interval?: number;
}

// Automatic retry with exponential backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    initialDelay = 200,
    maxDelay = 5000,
    backoff = 2
  } = options;

  let delay = initialDelay;
  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === retries) {
        console.error(`Retry failed after ${retries} attempts:`, error);
        throw lastError;
      }

      console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      delay = Math.min(delay * backoff, maxDelay);
    }
  }

  throw lastError!;
}

// Circuit breaker pattern to prevent cascading failures
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      recoveryTimeout: options.recoveryTimeout || 10000,
      monitoringPeriod: options.monitoringPeriod || 60000
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.options.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        console.log('Circuit breaker transitioning to HALF_OPEN');
      } else {
        throw new Error('Service temporarily unavailable (circuit breaker OPEN)');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      console.log('Circuit breaker transitioning to CLOSED');
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
      console.error(`Circuit breaker OPEN (failure threshold: ${this.options.failureThreshold})`);
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Dynamic throttling under load
export class RateLimiter {
  private requests: number[] = [];
  private options: Required<ThrottleOptions>;

  constructor(options: ThrottleOptions = {}) {
    this.options = {
      maxRequests: options.maxRequests || 100,
      windowMs: options.windowMs || 60000,
      skipSuccessfulRequests: options.skipSuccessfulRequests || false
    };
  }

  checkLimit(): boolean {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    
    // Clean old requests
    this.requests = this.requests.filter(time => time > windowStart);
    
    return this.requests.length < this.options.maxRequests;
  }

  requestSlot(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.checkLimit()) {
        this.requests.push(Date.now());
        resolve();
        return;
      }

      // Wait for a slot to become available
      const checkInterval = setInterval(() => {
        if (this.checkLimit()) {
          clearInterval(checkInterval);
          this.requests.push(Date.now());
          resolve();
        }
      }, 100);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Rate limit timeout'));
      }, 30000);
    });
  }

  getStatus() {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    const recentRequests = this.requests.filter(time => time > windowStart);
    
    return {
      currentRequests: recentRequests.length,
      maxRequests: this.options.maxRequests,
      windowMs: this.options.windowMs,
      utilization: (recentRequests.length / this.options.maxRequests) * 100
    };
  }
}

// Graceful degradation utilities
export class GracefulDegradation {
  private static instance: GracefulDegradation;
  private degradedServices = new Set<string>();

  static getInstance(): GracefulDegradation {
    if (!this.instance) {
      this.instance = new GracefulDegradation();
    }
    return this.instance;
  }

  markDegraded(service: string, reason: string) {
    this.degradedServices.add(service);
    console.warn(`Service ${service} marked as degraded: ${reason}`);
  }

  markRecovered(service: string) {
    this.degradedServices.delete(service);
    console.log(`Service ${service} marked as recovered`);
  }

  isDegraded(service: string): boolean {
    return this.degradedServices.has(service);
  }

  getDegradedServices(): string[] {
    return Array.from(this.degradedServices);
  }

  // Returns degraded response instead of error
  createDegradedResponse(data: any = null, message: string = 'Service temporarily degraded') {
    return {
      status: 'degraded',
      data: data || [],
      message,
      timestamp: new Date().toISOString()
    };
  }
}

// Background recovery system
export class BackgroundRecovery {
  private healthChecks: HealthCheck[] = [];
  private intervals: NodeJS.Timeout[] = [];

  addHealthCheck(check: HealthCheck) {
    this.healthChecks.push(check);
  }

  start() {
    console.log('Starting background recovery system...');
    
    this.healthChecks.forEach(check => {
      const interval = setInterval(async () => {
        try {
          const isHealthy = await check.check();
          if (!isHealthy) {
            console.warn(`Health check failed: ${check.name}`);
            await this.handleFailure(check.name);
          } else {
            GracefulDegradation.getInstance().markRecovered(check.name);
          }
        } catch (error) {
          console.error(`Health check error for ${check.name}:`, error);
          await this.handleFailure(check.name);
        }
      }, check.interval || 30000);
      
      this.intervals.push(interval);
    });
  }

  stop() {
    console.log('Stopping background recovery system...');
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
  }

  private async handleFailure(serviceName: string) {
    GracefulDegradation.getInstance().markDegraded(serviceName, 'Health check failed');
    
    // Attempt recovery logic here
    try {
      console.log(`Attempting recovery for ${serviceName}...`);
      // Service-specific recovery logic would go here
    } catch (error) {
      console.error(`Recovery failed for ${serviceName}:`, error);
    }
  }
}

// Auto restart guard
export class AutoRestartGuard {
  private memoryThreshold = 500 * 1024 * 1024; // 500MB
  private errorThreshold = 10;
  private errorCount = 0;
  private lastErrorReset = Date.now();
  private monitoringInterval?: NodeJS.Timeout;

  start() {
    console.log('Starting auto restart guard...');
    
    this.monitoringInterval = setInterval(() => {
      this.checkMemory();
      this.checkErrorRate();
    }, 10000);
  }

  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  private checkMemory() {
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed;

    if (heapUsed > this.memoryThreshold) {
      console.error(`Memory threshold exceeded: ${Math.round(heapUsed / 1024 / 1024)}MB > ${Math.round(this.memoryThreshold / 1024 / 1024)}MB`);
      console.error('Restarting due to memory growth...');
      process.exit(1);
    }
  }

  private checkErrorRate() {
    const now = Date.now();
    const timeSinceReset = now - this.lastErrorReset;

    // Reset error count every minute
    if (timeSinceReset > 60000) {
      this.errorCount = 0;
      this.lastErrorReset = now;
    }

    if (this.errorCount > this.errorThreshold) {
      console.error(`Error threshold exceeded: ${this.errorCount} errors > ${this.errorThreshold}`);
      console.error('Restarting due to error rate...');
      process.exit(1);
    }
  }

  recordError() {
    this.errorCount++;
  }
}

// Global error handler integration
export function setupGlobalErrorHandling() {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    AutoRestartGuard.prototype.recordError?.call({ errorCount: 0 } as any);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    AutoRestartGuard.prototype.recordError?.call({ errorCount: 0 } as any);
  });
}

// Export singleton instances
export const circuitBreaker = new CircuitBreaker();
export const rateLimiter = new RateLimiter();
export const gracefulDegradation = GracefulDegradation.getInstance();
export const backgroundRecovery = new BackgroundRecovery();
export const autoRestartGuard = new AutoRestartGuard();
