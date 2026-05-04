/**
 * Scaling Readiness Middleware
 * 
 * Prepares the application for high-traffic scenarios
 * Implements rate limiting, memory monitoring, and burst protection
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { performanceMonitor } from './performance.monitoring.js';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string | any;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}

interface BurstProtectionConfig {
  enabled: boolean;
  threshold: number;
  cooldownMs: number;
}

class ScalingMiddleware {
  private burstProtectionMap: Map<string, number> = new Map();
  private burstConfig: BurstProtectionConfig = {
    enabled: true,
    threshold: 100, // 100 requests per minute
    cooldownMs: 60000 // 1 minute cooldown
  };

  /**
   * Create rate limiter for different endpoint categories
   */
  createRateLimiter(config: Partial<RateLimitConfig>) {
    const defaultConfig: RateLimitConfig = {
      windowMs: 60 * 1000, // 1 minute
      max: 60, // 60 requests per minute
      message: 'Rate limit exceeded. Please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
      ...config
    };

    return rateLimit(defaultConfig);
  }

  /**
   * Strict rate limiter for authentication endpoints
   */
  getAuthRateLimiter() {
    return this.createRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // 10 requests per 15 minutes
      message: {
        error: 'Too many authentication attempts',
        message: 'Account temporarily locked. Please try again later.',
        retryAfter: '15 minutes'
      }
    });
  }

  /**
   * Relaxed rate limiter for content endpoints
   */
  getContentRateLimiter() {
    return this.createRateLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 200, // 200 requests per minute
      message: {
        error: 'Rate limit exceeded',
        message: 'Too many content requests. Please try again later.',
        retryAfter: '60 seconds'
      }
    });
  }

  /**
   * Strict rate limiter for media endpoints (with caching)
   */
  getMediaRateLimiter() {
    return this.createRateLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 300, // 300 requests per minute (higher due to caching)
      message: {
        error: 'Media rate limit exceeded',
        message: 'Too many media requests. Please try again later.',
        retryAfter: '60 seconds'
      }
    });
  }

  /**
   * Very strict rate limiter for admin endpoints
   */
  getAdminRateLimiter() {
    return this.createRateLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 30, // 30 requests per minute
      message: {
        error: 'Admin rate limit exceeded',
        message: 'Too many admin requests. Please try again later.',
        retryAfter: '60 seconds'
      }
    });
  }

  /**
   * Burst protection middleware
   */
  burstProtectionMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.burstConfig.enabled) {
        return next();
      }

      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      const now = Date.now();
      const lastRequest = this.burstProtectionMap.get(clientIp) || 0;

      // Check if client is in cooldown
      if (now - lastRequest < this.burstConfig.cooldownMs) {
        const remainingCooldown = Math.ceil((this.burstConfig.cooldownMs - (now - lastRequest)) / 1000);

        console.warn(`[BURST PROTECTION] Blocked request from ${clientIp}. Cooldown: ${remainingCooldown}s`);

        return res.status(429).json({
          error: 'Burst protection activated',
          message: 'Too many requests in short time. Please wait.',
          retryAfter: `${remainingCooldown} seconds`,
          clientIp
        });
      }

      // Update last request time
      this.burstProtectionMap.set(clientIp, now);

      // Clean up old entries
      this.cleanupBurstProtection();

      next();
    };
  }

  /**
   * Memory pressure detection middleware
   */
  memoryPressureDetection() {
    return (req: Request, res: Response, next: NextFunction) => {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;

      // Memory pressure thresholds
      const warningThreshold = 300; // 300MB
      const criticalThreshold = 500; // 500MB

      if (heapUsedMB > criticalThreshold) {
        console.error(`[MEMORY PRESSURE] Critical: ${heapUsedMB.toFixed(2)}MB heap used`);

        // Reject non-critical requests under memory pressure
        if (!this.isCriticalRequest(req.path)) {
          return res.status(503).json({
            error: 'Service temporarily unavailable',
            message: 'System under high load. Please try again later.',
            retryAfter: '30 seconds'
          });
        }
      } else if (heapUsedMB > warningThreshold) {
        console.warn(`[MEMORY PRESSURE] Warning: ${heapUsedMB.toFixed(2)}MB heap used`);

        // Add memory pressure headers
        res.setHeader('X-Memory-Pressure', 'warning');
        res.setHeader('X-Memory-Usage', `${heapUsedMB.toFixed(2)}MB`);
      }

      // Add memory usage headers for monitoring
      res.setHeader('X-Memory-Heap-Used', `${heapUsedMB.toFixed(2)}MB`);
      res.setHeader('X-Memory-Heap-Total', `${heapTotalMB.toFixed(2)}MB`);

      next();
    };
  }

  /**
   * Adaptive rate limiting based on system load
   */
  adaptiveRateLimiting() {
    return (req: Request, res: Response, next: NextFunction) => {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;

      // Adjust rate limits based on memory pressure
      let rateMultiplier = 1.0;

      if (heapUsedMB > 400) {
        rateMultiplier = 0.5; // Halve rate limits under high memory
      } else if (heapUsedMB > 300) {
        rateMultiplier = 0.75; // Reduce rate limits under moderate memory
      }

      // Add rate limit info to headers
      res.setHeader('X-Rate-Limit-Multiplier', rateMultiplier.toString());

      if (rateMultiplier < 1.0) {
        console.warn(`[ADAPTIVE RATE LIMIT] Reduced to ${(rateMultiplier * 100).toFixed(0)}% due to memory pressure`);
      }

      next();
    };
  }

  /**
   * Request prioritization middleware
   */
  requestPrioritization() {
    return (req: Request, res: Response, next: NextFunction) => {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;

      // Under memory pressure, prioritize critical requests
      if (heapUsedMB > 400) {
        const priority = this.getRequestPriority(req.path);

        if (priority === 'low') {
          return res.status(503).json({
            error: 'Service temporarily unavailable',
            message: 'System prioritizing critical requests. Please try again later.',
            retryAfter: '30 seconds'
          });
        }

        // Add priority header for monitoring
        res.setHeader('X-Request-Priority', priority);
      }

      next();
    };
  }

  /**
   * Check if request is critical (should not be rejected under pressure)
   */
  private isCriticalRequest(path: string): boolean {
    const criticalPaths = [
      '/health',
      '/',
      '/api/auth/login',
      '/api/auth/logout',
      '/api/admin',
      '/api/media/analytics'
    ];

    return criticalPaths.some(criticalPath => path.startsWith(criticalPath));
  }

  /**
   * Get request priority level
   */
  private getRequestPriority(path: string): 'high' | 'medium' | 'low' {
    if (this.isCriticalRequest(path)) {
      return 'high';
    }

    const mediumPaths = [
      '/api/content',
      '/api/membership',
      '/api/favorites'
    ];

    if (mediumPaths.some(mediumPath => path.startsWith(mediumPath))) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Clean up old burst protection entries
   */
  private cleanupBurstProtection(): void {
    const now = Date.now();
    const cutoff = now - this.burstConfig.cooldownMs;

    for (const [ip, timestamp] of this.burstProtectionMap.entries()) {
      if (timestamp < cutoff) {
        this.burstProtectionMap.delete(ip);
      }
    }
  }

  /**
   * Get scaling metrics
   */
  getScalingMetrics() {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;

    return {
      memory: {
        heapUsed: heapUsedMB,
        heapTotal: heapTotalMB,
        usage: (heapUsedMB / heapTotalMB) * 100
      },
      burstProtection: {
        activeClients: this.burstProtectionMap.size,
        enabled: this.burstConfig.enabled,
        threshold: this.burstConfig.threshold,
        cooldownMs: this.burstConfig.cooldownMs
      },
      performance: performanceMonitor.getPerformanceStats(5) // Last 5 minutes
    };
  }

  /**
   * Configure burst protection
   */
  configureBurstProtection(config: Partial<BurstProtectionConfig>) {
    this.burstConfig = { ...this.burstConfig, ...config };
  }

  /**
   * Enable/disable burst protection
   */
  setBurstProtection(enabled: boolean) {
    this.burstConfig.enabled = enabled;
    if (!enabled) {
      this.burstProtectionMap.clear();
    }
  }
}

// Export singleton instance
export const scalingMiddleware = new ScalingMiddleware();

// Export individual middleware functions
export const {
  createRateLimiter,
  getAuthRateLimiter,
  getContentRateLimiter,
  getMediaRateLimiter,
  getAdminRateLimiter,
  burstProtectionMiddleware,
  memoryPressureDetection,
  adaptiveRateLimiting,
  requestPrioritization
} = scalingMiddleware;

// Export class for testing
export { ScalingMiddleware };
