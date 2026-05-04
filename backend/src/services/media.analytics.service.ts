/**
 * Media Analytics Service
 * 
 * Tracks failure patterns, metrics, and visibility
 * Turns failure caching from a patch into a learning system
 */

interface MediaFailureEvent {
  videoId: string;
  tenantId?: string;
  type: 'thumbnail' | 'video';
  url: string;
  errorType: '404' | 'timeout' | 'network' | 'other';
  timestamp: number;
  userAgent?: string;
  source: 'validation' | 'request' | 'cron';
}

interface MediaSuccessEvent {
  videoId: string;
  tenantId?: string;
  type: 'thumbnail' | 'video';
  url: string;
  responseTime: number;
  timestamp: number;
  source: 'validation' | 'request' | 'cron';
}

interface FailureMetrics {
  totalFailures: number;
  failuresByType: Record<string, number>;
  failuresByVideoId: Record<string, number>;
  failuresByTenant: Record<string, number>;
  topFailingVideos: Array<{ videoId: string; count: number; lastFailure: number }>;
  failureRate: number;
  avgTimeBetweenFailures: number;
}

interface SuccessMetrics {
  totalSuccesses: number;
  avgResponseTime: number;
  successesByVideoId: Record<string, number>;
  successRate: number;
  cacheHitRate: number;
}

class MediaAnalyticsService {
  private failureEvents: MediaFailureEvent[] = [];
  private successEvents: MediaSuccessEvent[] = [];
  private maxEvents = 10000; // Keep last 10k events for analysis
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup old events every hour
    this.cleanupInterval = setInterval(() => this.cleanup(), 3600000);
  }

  /**
   * Record a media failure event
   */
  recordFailure(
    videoId: string,
    type: 'thumbnail' | 'video',
    url: string,
    error: any,
    source: 'validation' | 'request' | 'cron' = 'request',
    tenantId?: string,
    userAgent?: string
  ): void {
    const errorType = this.categorizeError(error);
    
    const event: MediaFailureEvent = {
      videoId,
      tenantId,
      type,
      url,
      errorType,
      timestamp: Date.now(),
      userAgent,
      source
    };

    this.failureEvents.push(event);
    
    // Keep array size manageable
    if (this.failureEvents.length > this.maxEvents) {
      this.failureEvents = this.failureEvents.slice(-this.maxEvents);
    }

    console.log(`[MEDIA ANALYTICS] Recorded ${type} failure for video ${videoId} (${errorType})`);
  }

  /**
   * Record a media success event
   */
  recordSuccess(
    videoId: string,
    type: 'thumbnail' | 'video',
    url: string,
    responseTime: number,
    source: 'validation' | 'request' | 'cron' = 'request',
    tenantId?: string
  ): void {
    const event: MediaSuccessEvent = {
      videoId,
      tenantId,
      type,
      url,
      responseTime,
      timestamp: Date.now(),
      source
    };

    this.successEvents.push(event);
    
    // Keep array size manageable
    if (this.successEvents.length > this.maxEvents) {
      this.successEvents = this.successEvents.slice(-this.maxEvents);
    }

    console.log(`[MEDIA ANALYTICS] Recorded ${type} success for video ${videoId} (${responseTime}ms)`);
  }

  /**
   * Categorize error type for analytics
   */
  private categorizeError(error: any): '404' | 'timeout' | 'network' | 'other' {
    if (error?.response?.status === 404) return '404';
    if (error?.code === 'ETIMEDOUT' || error?.message?.includes('timeout')) return 'timeout';
    if (error?.code === 'ECONNRESET' || error?.code === 'ECONNREFUSED') return 'network';
    return 'other';
  }

  /**
   * Get comprehensive failure metrics
   */
  getFailureMetrics(timeframeHours: number = 24): FailureMetrics {
    const cutoff = Date.now() - (timeframeHours * 3600000);
    const recentFailures = this.failureEvents.filter(f => f.timestamp > cutoff);

    // Group failures by various dimensions
    const failuresByType: Record<string, number> = {};
    const failuresByVideoId: Record<string, number> = {};
    const failuresByTenant: Record<string, number> = {};

    recentFailures.forEach(failure => {
      failuresByType[failure.errorType] = (failuresByType[failure.errorType] || 0) + 1;
      failuresByVideoId[failure.videoId] = (failuresByVideoId[failure.videoId] || 0) + 1;
      if (failure.tenantId) {
        failuresByTenant[failure.tenantId] = (failuresByTenant[failure.tenantId] || 0) + 1;
      }
    });

    // Find top failing videos
    const topFailingVideos = Object.entries(failuresByVideoId)
      .map(([videoId, count]) => ({
        videoId,
        count,
        lastFailure: Math.max(...recentFailures.filter(f => f.videoId === videoId).map(f => f.timestamp))
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate failure rate
    const totalRequests = recentFailures.length + this.successEvents.filter(s => s.timestamp > cutoff).length;
    const failureRate = totalRequests > 0 ? (recentFailures.length / totalRequests) * 100 : 0;

    // Calculate average time between failures
    const avgTimeBetweenFailures = recentFailures.length > 1 
      ? (recentFailures[recentFailures.length - 1].timestamp - recentFailures[0].timestamp) / (recentFailures.length - 1)
      : 0;

    return {
      totalFailures: recentFailures.length,
      failuresByType,
      failuresByVideoId,
      failuresByTenant,
      topFailingVideos,
      failureRate,
      avgTimeBetweenFailures
    };
  }

  /**
   * Get success metrics
   */
  getSuccessMetrics(timeframeHours: number = 24): SuccessMetrics {
    const cutoff = Date.now() - (timeframeHours * 3600000);
    const recentSuccesses = this.successEvents.filter(s => s.timestamp > cutoff);
    const recentFailures = this.failureEvents.filter(f => f.timestamp > cutoff);

    // Calculate average response time
    const avgResponseTime = recentSuccesses.length > 0
      ? recentSuccesses.reduce((sum, s) => sum + s.responseTime, 0) / recentSuccesses.length
      : 0;

    // Group successes by video
    const successesByVideoId: Record<string, number> = {};
    recentSuccesses.forEach(success => {
      successesByVideoId[success.videoId] = (successesByVideoId[success.videoId] || 0) + 1;
    });

    // Calculate success rate
    const totalRequests = recentSuccesses.length + recentFailures.length;
    const successRate = totalRequests > 0 ? (recentSuccesses.length / totalRequests) * 100 : 0;

    // Estimate cache hit rate (this would need actual cache metrics in production)
    const cacheHitRate = this.estimateCacheHitRate(recentSuccesses, recentFailures);

    return {
      totalSuccesses: recentSuccesses.length,
      avgResponseTime,
      successesByVideoId,
      successRate,
      cacheHitRate
    };
  }

  /**
   * Estimate cache hit rate based on request patterns
   */
  private estimateCacheHitRate(successes: MediaSuccessEvent[], failures: MediaFailureEvent[]): number {
    // This is a simplified estimation - in production you'd track actual cache hits/misses
    const totalRequests = successes.length + failures.length;
    const uniqueVideos = new Set([...successes.map(s => s.videoId), ...failures.map(f => f.videoId)]).size;
    
    // If we have more requests than unique videos, some are likely cache hits
    return totalRequests > uniqueVideos ? ((totalRequests - uniqueVideos) / totalRequests) * 100 : 0;
  }

  /**
   * Get problematic sources (domains/CDNs)
   */
  getProblematicSources(timeframeHours: number = 24): Array<{ source: string; failureCount: number; failureRate: number }> {
    const cutoff = Date.now() - (timeframeHours * 3600000);
    const recentFailures = this.failureEvents.filter(f => f.timestamp > cutoff);
    const recentSuccesses = this.successEvents.filter(s => s.timestamp > cutoff);

    // Extract domains from URLs
    const sourceStats: Record<string, { failures: number; successes: number }> = {};

    recentFailures.forEach(failure => {
      const domain = this.extractDomain(failure.url);
      if (!sourceStats[domain]) sourceStats[domain] = { failures: 0, successes: 0 };
      sourceStats[domain].failures++;
    });

    recentSuccesses.forEach(success => {
      const domain = this.extractDomain(success.url);
      if (!sourceStats[domain]) sourceStats[domain] = { failures: 0, successes: 0 };
      sourceStats[domain].successes++;
    });

    return Object.entries(sourceStats)
      .map(([source, stats]) => ({
        source,
        failureCount: stats.failures,
        failureRate: (stats.failures + stats.successes) > 0 ? (stats.failures / (stats.failures + stats.successes)) * 100 : 0
      }))
      .filter(s => s.failureRate > 10) // Only show sources with >10% failure rate
      .sort((a, b) => b.failureRate - a.failureRate);
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get tenant-specific analytics
   */
  getTenantAnalytics(tenantId: string, timeframeHours: number = 24): { failures: number; successes: number; topFailingVideos: string[] } {
    const cutoff = Date.now() - (timeframeHours * 3600000);
    const tenantFailures = this.failureEvents.filter(f => f.tenantId === tenantId && f.timestamp > cutoff);
    const tenantSuccesses = this.successEvents.filter(s => s.tenantId === tenantId && s.timestamp > cutoff);

    // Get top failing videos for this tenant
    const failuresByVideo: Record<string, number> = {};
    tenantFailures.forEach(failure => {
      failuresByVideo[failure.videoId] = (failuresByVideo[failure.videoId] || 0) + 1;
    });

    const topFailingVideos = Object.entries(failuresByVideo)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([videoId]) => videoId);

    return {
      failures: tenantFailures.length,
      successes: tenantSuccesses.length,
      topFailingVideos
    };
  }

  /**
   * Clean up old events
   */
  private cleanup(): void {
    const cutoff = Date.now() - (24 * 3600000); // Keep only last 24 hours
    
    const beforeFailures = this.failureEvents.length;
    const beforeSuccesses = this.successEvents.length;

    this.failureEvents = this.failureEvents.filter(e => e.timestamp > cutoff);
    this.successEvents = this.successEvents.filter(e => e.timestamp > cutoff);

    const cleanedFailures = beforeFailures - this.failureEvents.length;
    const cleanedSuccesses = beforeSuccesses - this.successEvents.length;

    if (cleanedFailures > 0 || cleanedSuccesses > 0) {
      console.log(`[MEDIA ANALYTICS] Cleaned up ${cleanedFailures} failures and ${cleanedSuccesses} successes`);
    }
  }

  /**
   * Get comprehensive analytics report
   */
  getAnalyticsReport(timeframeHours: number = 24) {
    return {
      timeframe: `${timeframeHours}h`,
      generated: new Date().toISOString(),
      failures: this.getFailureMetrics(timeframeHours),
      successes: this.getSuccessMetrics(timeframeHours),
      problematicSources: this.getProblematicSources(timeframeHours),
      summary: {
        totalEvents: this.failureEvents.length + this.successEvents.length,
        healthScore: this.calculateHealthScore(timeframeHours)
      }
    };
  }

  /**
   * Calculate overall media health score (0-100)
   */
  private calculateHealthScore(timeframeHours: number): number {
    const failures = this.getFailureMetrics(timeframeHours);
    const successes = this.getSuccessMetrics(timeframeHours);
    
    // Base score from success rate
    let score = successes.successRate;
    
    // Penalize high failure rates
    score -= failures.failureRate * 0.5;
    
    // Penalize problematic sources
    const problematicSourcePenalty = Math.min(20, this.getProblematicSources(timeframeHours).length * 5);
    score -= problematicSourcePenalty;
    
    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Destroy service and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.failureEvents = [];
    this.successEvents = [];
  }
}

// Export singleton instance
export const mediaAnalyticsService = new MediaAnalyticsService();

// Export class for testing
export { MediaAnalyticsService };
