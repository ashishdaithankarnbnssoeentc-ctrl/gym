/**
 * Performance Monitoring Middleware
 * 
 * Tracks API performance, memory usage, and system health
 * Provides actionable insights for production monitoring
 */

import { Request, Response, NextFunction } from 'express';
import { trackApiCall, trackPerformance, trackError } from '../sentry.js';

interface PerformanceMetrics {
  route: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: number;
  userId?: string;
  tenantId?: string;
  userAgent?: string;
  ip?: string;
}

interface MemoryMetrics {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private memoryMetrics: MemoryMetrics[] = [];
  private maxMetrics = 10000; // Keep last 10k metrics
  private memoryMonitorInterval: NodeJS.Timeout;
  private slowApiThreshold = 500; // 500ms threshold for slow APIs

  constructor() {
    // Monitor memory usage every 60 seconds
    this.memoryMonitorInterval = setInterval(() => {
      this.recordMemoryMetrics();
    }, 60000);
  }

  /**
   * Middleware to track API performance
   */
  trackRequest() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage();

      // Override res.end to capture response data
      const originalEnd = res.end.bind(res);
      const self = this;
      (res as any).end = function (...args: any[]) {
        const duration = Date.now() - startTime;
        const endMemory = process.memoryUsage();

        // Record performance metrics
        const metrics: PerformanceMetrics = {
          route: req.path,
          method: req.method,
          duration,
          statusCode: res.statusCode,
          timestamp: startTime,
          userId: (req.user as any)?.id,
          tenantId: (req.user as any)?.tenantId,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        };

        self.recordMetrics(metrics);

        // Log slow APIs
        if (duration > self.slowApiThreshold) {
          console.warn(`[PERFORMANCE] Slow API: ${req.method} ${req.path} - ${duration}ms`);

          // Track in Sentry for monitoring
          trackPerformance('slow_api', duration);
        }

        // Track API call in Sentry
        trackApiCall(req.path, req.method, (req.user as any)?.id);

        // Log memory change for this request
        const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
        if (Math.abs(memoryDelta) > 10 * 1024 * 1024) { // 10MB threshold
          console.warn(`[PERFORMANCE] High memory change: ${req.method} ${req.path} - ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);
        }

        // Call original end
        return originalEnd(...args);
      };

      next();
    };
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);

    // Keep array size manageable
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Record memory metrics
   */
  private recordMemoryMetrics(): void {
    const memoryUsage = process.memoryUsage();
    const metrics: MemoryMetrics = {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers,
      timestamp: Date.now()
    };

    this.memoryMetrics.push(metrics);

    // Keep array size manageable
    if (this.memoryMetrics.length > 1000) { // Keep last 1000 memory snapshots
      this.memoryMetrics = this.memoryMetrics.slice(-1000);
    }

    // Check for memory leaks
    if (memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB threshold
      console.warn(`[MEMORY] High heap usage: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);

      trackError(new Error('High memory usage detected'), {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        rss: memoryUsage.rss
      });
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(timeframeMinutes: number = 60): {
    totalRequests: number;
    avgResponseTime: number;
    slowRequests: number;
    errorRate: number;
    topSlowRoutes: Array<{ route: string; avgDuration: number; count: number }>;
    memoryStats: MemoryMetrics;
  } {
    const cutoff = Date.now() - (timeframeMinutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        avgResponseTime: 0,
        slowRequests: 0,
        errorRate: 0,
        topSlowRoutes: [],
        memoryStats: this.getCurrentMemoryStats()
      };
    }

    // Calculate basic stats
    const totalRequests = recentMetrics.length;
    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests;
    const slowRequests = recentMetrics.filter(m => m.duration > this.slowApiThreshold).length;
    const errorRequests = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errorRequests / totalRequests) * 100;

    // Find top slow routes
    const routeStats = new Map<string, { totalDuration: number; count: number }>();

    recentMetrics.forEach(metric => {
      const key = `${metric.method} ${metric.route}`;
      const existing = routeStats.get(key) || { totalDuration: 0, count: 0 };
      routeStats.set(key, {
        totalDuration: existing.totalDuration + metric.duration,
        count: existing.count + 1
      });
    });

    const topSlowRoutes = Array.from(routeStats.entries())
      .map(([route, stats]) => ({
        route,
        avgDuration: stats.totalDuration / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);

    return {
      totalRequests,
      avgResponseTime,
      slowRequests,
      errorRate,
      topSlowRoutes,
      memoryStats: this.getCurrentMemoryStats()
    };
  }

  /**
   * Get current memory statistics
   */
  getCurrentMemoryStats(): MemoryMetrics {
    const memoryUsage = process.memoryUsage();
    return {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers,
      timestamp: Date.now()
    };
  }

  /**
   * Get health check status
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    checks: {
      memory: 'healthy' | 'warning' | 'critical';
      responseTime: 'healthy' | 'warning' | 'critical';
      errorRate: 'healthy' | 'warning' | 'critical';
    };
    details: any;
  } {
    const stats = this.getPerformanceStats(5); // Last 5 minutes
    const memoryStats = this.getCurrentMemoryStats();

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    const checks = {
      memory: 'healthy' as 'healthy' | 'warning' | 'critical',
      responseTime: 'healthy' as 'healthy' | 'warning' | 'critical',
      errorRate: 'healthy' as 'healthy' | 'warning' | 'critical'
    };

    // Check memory usage
    const memoryUsageMB = memoryStats.heapUsed / 1024 / 1024;
    if (memoryUsageMB > 500) {
      checks.memory = 'critical';
      status = 'critical';
    } else if (memoryUsageMB > 300) {
      checks.memory = 'warning';
      status = status === 'healthy' ? 'warning' : status;
    }

    // Check response time
    if (stats.avgResponseTime > 1000) {
      checks.responseTime = 'critical';
      status = 'critical';
    } else if (stats.avgResponseTime > 500) {
      checks.responseTime = 'warning';
      status = status === 'healthy' ? 'warning' : status;
    }

    // Check error rate
    if (stats.errorRate > 10) {
      checks.errorRate = 'critical';
      status = 'critical';
    } else if (stats.errorRate > 5) {
      checks.errorRate = 'warning';
      status = status === 'healthy' ? 'warning' : status;
    }

    return {
      status,
      checks,
      details: {
        memoryUsage: `${memoryUsageMB.toFixed(2)}MB`,
        avgResponseTime: `${stats.avgResponseTime.toFixed(2)}ms`,
        errorRate: `${stats.errorRate.toFixed(2)}%`,
        totalRequests: stats.totalRequests,
        slowRequests: stats.slowRequests
      }
    };
  }

  /**
   * Clean up old metrics
   */
  cleanup(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // Keep last 24 hours

    const beforeMetrics = this.metrics.length;
    const beforeMemory = this.memoryMetrics.length;

    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.memoryMetrics = this.memoryMetrics.filter(m => m.timestamp > cutoff);

    const cleanedMetrics = beforeMetrics - this.metrics.length;
    const cleanedMemory = beforeMemory - this.memoryMetrics.length;

    if (cleanedMetrics > 0 || cleanedMemory > 0) {
      console.log(`[PERFORMANCE] Cleaned up ${cleanedMetrics} metrics and ${cleanedMemory} memory snapshots`);
    }
  }

  /**
   * Destroy monitor and cleanup
   */
  destroy(): void {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }
    this.metrics = [];
    this.memoryMetrics = [];
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export class for testing
export { PerformanceMonitor };
