import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  baseLimit: number;
  windowMs: number;
  burstMultiplier: number;
  userMultiplier: number;
  endpointMultipliers: Record<string, number>;
}

interface ClientMetrics {
  count: number;
  resetTime: number;
  responseTimeSum: number;
  responseTimeCount: number;
  errorCount: number;
  lastRequest: number;
}

class AdaptiveRateLimiter {
  private clients = new Map<string, ClientMetrics>();
  private globalMetrics = {
    totalRequests: 0,
    totalErrors: 0,
    avgResponseTime: 0,
    peakHourRequests: 0
  };

  private readonly config: RateLimitConfig = {
    baseLimit: 100, // 100 requests per minute
    windowMs: 60000, // 1 minute window
    burstMultiplier: 1.5, // Allow 50% burst
    userMultiplier: 2, // Authenticated users get 2x limit
    endpointMultipliers: {
      '/api/auth': 0.5, // Auth endpoints stricter
      '/api/admin': 0.3, // Admin endpoints very strict
      '/api/content': 1.0, // Content endpoints normal
      '/api/favorites': 1.5, // Favorites more lenient
      '/api/proposals': 0.8, // Proposals slightly strict
      '/api/membership': 0.5, // Membership strict
      '/api/notifications': 1.2 // Notifications lenient
    }
  };

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const now = Date.now();
      const clientId = this.getClientId(req);
      const endpoint = req.path;

      // Get or create client metrics
      let metrics = this.clients.get(clientId);
      if (!metrics) {
        metrics = {
          count: 0,
          resetTime: now + this.config.windowMs,
          responseTimeSum: 0,
          responseTimeCount: 0,
          errorCount: 0,
          lastRequest: now
        };
        this.clients.set(clientId, metrics);
      }

      // Reset window if expired
      if (now > metrics.resetTime) {
        metrics.count = 0;
        metrics.errorCount = 0;
        metrics.resetTime = now + this.config.windowMs;
      }

      // Calculate dynamic limit
      const dynamicLimit = this.calculateDynamicLimit(req, metrics);
      
      // Check rate limit
      metrics.count++;
      metrics.lastRequest = now;

      if (metrics.count > dynamicLimit) {
        this.handleRateLimit(req, res, metrics, dynamicLimit);
        return;
      }

      // Track request for adaptive behavior
      this.trackRequest(req, metrics);

      // Continue to next middleware
      next();
    };
  }

  private getClientId(req: Request): string {
    // Use user ID if authenticated, otherwise IP
    const userId = (req as any).user?.id;
    const tenantId = (req as any).user?.tenantId;
    
    if (userId && tenantId) {
      return `user:${userId}:tenant:${tenantId}`;
    }
    
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `ip:${ip}`;
  }

  private calculateDynamicLimit(req: Request, metrics: ClientMetrics): number {
    let limit = this.config.baseLimit;

    // Apply endpoint-specific multiplier
    const endpointMultiplier = this.getEndpointMultiplier(req.path);
    limit *= endpointMultiplier;

    // Apply user authentication multiplier
    if ((req as any).user?.id) {
      limit *= this.config.userMultiplier;
    }

    // Apply adaptive adjustments based on system performance
    const performanceMultiplier = this.getPerformanceMultiplier();
    limit *= performanceMultiplier;

    // Apply burst allowance for good clients
    const burstMultiplier = this.getBurstMultiplier(metrics);
    limit *= burstMultiplier;

    return Math.max(1, Math.round(limit));
  }

  private getEndpointMultiplier(path: string): number {
    // Find most specific endpoint match
    for (const [endpoint, multiplier] of Object.entries(this.config.endpointMultipliers)) {
      if (path.startsWith(endpoint)) {
        return multiplier;
      }
    }
    return 1.0;
  }

  private getPerformanceMultiplier(): number {
    // Adjust based on global system performance
    const { avgResponseTime, totalErrors, totalRequests } = this.globalMetrics;
    
    // If response times are high, tighten limits
    if (avgResponseTime > 500) return 0.7;
    if (avgResponseTime > 300) return 0.85;
    
    // If error rate is high, tighten limits
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
    if (errorRate > 0.1) return 0.6; // 10% error rate
    if (errorRate > 0.05) return 0.8; // 5% error rate
    
    return 1.0; // Normal operation
  }

  private getBurstMultiplier(metrics: ClientMetrics): number {
    // Allow burst for clients with good behavior
    const errorRate = metrics.count > 0 ? metrics.errorCount / metrics.count : 0;
    const avgResponseTime = metrics.responseTimeCount > 0 
      ? metrics.responseTimeSum / metrics.responseTimeCount 
      : 0;

    // Good clients get burst allowance
    if (errorRate < 0.02 && avgResponseTime < 200) {
      return this.config.burstMultiplier;
    }
    
    // Clients with high errors or slow responses get reduced limits
    if (errorRate > 0.1) return 0.5;
    if (avgResponseTime > 1000) return 0.7;
    
    return 1.0;
  }

  private trackRequest(req: Request, metrics: ClientMetrics) {
    // This would be updated by response tracking middleware
    // For now, just track basic request
    this.globalMetrics.totalRequests++;
  }

  private handleRateLimit(req: Request, res: Response, metrics: ClientMetrics, limit: number) {
    const retryAfter = Math.ceil((metrics.resetTime - Date.now()) / 1000);
    
    // Log rate limit event
    console.warn(`[RATE_LIMIT] Client ${this.getClientId(req)} exceeded limit: ${limit} (actual: ${metrics.count})`);
    
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests',
      retryAfter,
      limit,
      windowMs: this.config.windowMs
    });
  }

  // Update metrics (called by response tracking middleware)
  updateResponseMetrics(clientId: string, responseTime: number, statusCode: number) {
    const metrics = this.clients.get(clientId);
    if (!metrics) return;

    metrics.responseTimeSum += responseTime;
    metrics.responseTimeCount++;

    if (statusCode >= 400) {
      metrics.errorCount++;
      this.globalMetrics.totalErrors++;
    }

    // Update global metrics
    this.updateGlobalMetrics(responseTime, statusCode);
  }

  private updateGlobalMetrics(responseTime: number, statusCode: number) {
    const totalRequests = this.globalMetrics.totalRequests;
    
    // Update average response time
    this.globalMetrics.avgResponseTime = 
      (this.globalMetrics.avgResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
  }

  getMetrics() {
    const activeClients = Array.from(this.clients.entries()).map(([id, metrics]) => ({
      clientId: id,
      requests: metrics.count,
      errors: metrics.errorCount,
      avgResponseTime: metrics.responseTimeCount > 0 
        ? Math.round(metrics.responseTimeSum / metrics.responseTimeCount)
        : 0,
      lastRequest: new Date(metrics.lastRequest).toISOString()
    }));

    return {
      config: this.config,
      globalMetrics: this.globalMetrics,
      activeClients: activeClients.slice(0, 50), // Top 50 clients
      totalClients: this.clients.size
    };
  }

  // Cleanup old entries
  cleanup() {
    const now = Date.now();
    const cutoff = now - (this.config.windowMs * 2); // 2 windows ago

    for (const [clientId, metrics] of this.clients.entries()) {
      if (metrics.lastRequest < cutoff) {
        this.clients.delete(clientId);
      }
    }
  }
}

export const adaptiveRateLimiter = new AdaptiveRateLimiter();

// Cleanup every 5 minutes
setInterval(() => adaptiveRateLimiter.cleanup(), 5 * 60 * 1000);
