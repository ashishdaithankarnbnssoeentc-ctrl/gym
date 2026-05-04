/**
 * Media Failure Cache Service
 * 
 * Prevents repeated 404s and network noise by caching failed media requests
 * Eliminates unnecessary network load and debugging noise
 */

interface FailedMediaRequest {
  videoId: string;
  thumbnailUrl: string;
  videoUrl: string;
  timestamp: number;
  retryAfter: number;
}

interface SuccessfulMediaRequest {
  videoId: string;
  thumbnailUrl: string;
  videoUrl: string;
  validatedAt: number;
  expiresAt: number;
}

interface CacheEntry<T> {
  data: T;
  ttl: number;
}

class MediaFailureCache {
  private failureCache = new Map<string, CacheEntry<FailedMediaRequest>>();
  private successCache = new Map<string, CacheEntry<SuccessfulMediaRequest>>();
  private defaultFailureTTL = 300000; // 5 minutes for failed requests
  private defaultSuccessTTL = 1800000; // 30 minutes for successful requests
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 2 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 120000);
  }

  /**
   * Generate cache key for media request (multi-tenant safe)
   */
  private getKey(videoId: string, type: 'thumbnail' | 'video', tenantId?: string): string {
    // Include tenantId in cache key for multi-tenant isolation
    return tenantId ? `${type}:${tenantId}:${videoId}` : `${type}:global:${videoId}`;
  }

  /**
   * Mark media as failed
   */
  setFailed(videoId: string, thumbnailUrl: string, videoUrl: string, retryAfter?: number, tenantId?: string): void {
    const thumbnailKey = this.getKey(videoId, 'thumbnail', tenantId);
    const videoKey = this.getKey(videoId, 'video', tenantId);

    const now = Date.now();
    const ttl = retryAfter || this.defaultFailureTTL;

    // Cache both thumbnail and video failures
    this.failureCache.set(thumbnailKey, {
      data: {
        videoId,
        thumbnailUrl,
        videoUrl,
        timestamp: now,
        retryAfter: now + ttl
      },
      ttl
    });

    this.failureCache.set(videoKey, {
      data: {
        videoId,
        thumbnailUrl,
        videoUrl,
        timestamp: now,
        retryAfter: now + ttl
      },
      ttl
    });

    const tenantInfo = tenantId ? ` (tenant: ${tenantId})` : '';
    console.log(`[MEDIA FAILURE] Cached failure for video ${videoId}${tenantInfo}, retry after ${new Date(now + ttl).toISOString()}`);
  }

  /**
   * Mark media as successfully validated
   */
  setSuccess(videoId: string, thumbnailUrl: string, videoUrl: string, ttl?: number, tenantId?: string): void {
    const thumbnailKey = this.getKey(videoId, 'thumbnail', tenantId);
    const videoKey = this.getKey(videoId, 'video', tenantId);

    const now = Date.now();
    const cacheTTL = ttl || this.defaultSuccessTTL;

    // Cache both thumbnail and video successes
    this.successCache.set(thumbnailKey, {
      data: {
        videoId,
        thumbnailUrl,
        videoUrl,
        validatedAt: now,
        expiresAt: now + cacheTTL
      },
      ttl: cacheTTL
    });

    this.successCache.set(videoKey, {
      data: {
        videoId,
        thumbnailUrl,
        videoUrl,
        validatedAt: now,
        expiresAt: now + cacheTTL
      },
      ttl: cacheTTL
    });

    const tenantInfo = tenantId ? ` (tenant: ${tenantId})` : '';
    console.log(`[MEDIA SUCCESS] Cached success for video ${videoId}${tenantInfo}, expires ${new Date(now + cacheTTL).toISOString()}`);
  }

  /**
   * Check if media request should be skipped
   */
  shouldSkip(videoId: string, type: 'thumbnail' | 'video', tenantId?: string): boolean {
    const key = this.getKey(videoId, type, tenantId);
    const entry = this.failureCache.get(key);

    if (!entry) {
      return false;
    }

    const now = Date.now();

    // Check if TTL has expired
    if (now > entry.data.retryAfter) {
      this.failureCache.delete(key);
      const tenantInfo = tenantId ? ` (tenant: ${tenantId})` : '';
      console.log(`[MEDIA FAILURE] TTL expired for video ${videoId}${tenantInfo}, allowing retry`);
      return false;
    }

    const tenantInfo = tenantId ? ` (tenant: ${tenantId})` : '';
    console.log(`[MEDIA FAILURE] Skipping ${type} for video ${videoId}${tenantInfo}, retry after ${new Date(entry.data.retryAfter).toISOString()}`);
    return true;
  }

  /**
   * Check if media is successfully cached (skip validation)
   */
  isSuccessCached(videoId: string, type: 'thumbnail' | 'video', tenantId?: string): boolean {
    const key = this.getKey(videoId, type, tenantId);
    const entry = this.successCache.get(key);

    if (!entry) {
      return false;
    }

    const now = Date.now();

    // Check if TTL has expired
    if (now > entry.data.expiresAt) {
      this.successCache.delete(key);
      const tenantInfo = tenantId ? ` (tenant: ${tenantId})` : '';
      console.log(`[MEDIA SUCCESS] TTL expired for video ${videoId}${tenantInfo}, requiring revalidation`);
      return false;
    }

    return true;
  }

  /**
   * Get failure info for debugging
   */
  getFailureInfo(videoId: string, type: 'thumbnail' | 'video', tenantId?: string): FailedMediaRequest | null {
    const key = this.getKey(videoId, type, tenantId);
    const entry = this.failureCache.get(key);

    if (!entry || Date.now() > entry.data.retryAfter) {
      return null;
    }

    return entry.data;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    // Clean failure cache
    for (const [key, entry] of this.failureCache.entries()) {
      if (now > entry.data.retryAfter) {
        this.failureCache.delete(key);
        cleaned++;
      }
    }

    // Clean success cache
    for (const [key, entry] of this.successCache.entries()) {
      if (now > entry.data.expiresAt) {
        this.successCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[MEDIA FAILURE] Cleaned up ${cleaned} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { total: number; failures: number; successes: number; thumbnails: number; videos: number } {
    const stats = { total: 0, failures: 0, successes: 0, thumbnails: 0, videos: 0 };

    // Count failure cache
    for (const key of this.failureCache.keys()) {
      stats.total++;
      stats.failures++;
      if (key.startsWith('thumbnail:')) stats.thumbnails++;
      if (key.startsWith('video:')) stats.videos++;
    }

    // Count success cache
    for (const key of this.successCache.keys()) {
      stats.total++;
      stats.successes++;
      if (key.startsWith('thumbnail:')) stats.thumbnails++;
      if (key.startsWith('video:')) stats.videos++;
    }

    return stats;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.failureCache.clear();
    this.successCache.clear();
    console.log('[MEDIA FAILURE] All caches cleared');
  }

  /**
   * Destroy cache and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.failureCache.clear();
    this.successCache.clear();
  }
}

// Export singleton instance
export const mediaFailureCache = new MediaFailureCache();

// Export class for testing
export { MediaFailureCache };
