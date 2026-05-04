/**
 * Membership Cache Service
 * 
 * Improves performance by caching membership data
 * Reduces database hits for frequent requests
 */

interface CachedMembership {
  id: string;
  userId: string;
  tenantId: string;
  plan: string;
  status: string;
  nextPaymentDate: string;
  createdAt: string;
  updatedAt: string;
}

interface CacheEntry {
  data: CachedMembership;
  timestamp: number;
  ttl: number;
}

class MembershipCache {
  private cache = new Map<string, CacheEntry>();
  private defaultTTL = 60000; // 1 minute
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired cache entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000);
  }

  /**
   * Get cached membership data
   */
  get(userId: string, tenantId: string): CachedMembership | null {
    const key = `${userId}:${tenantId}`;
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached membership data
   */
  set(userId: string, tenantId: string, data: CachedMembership, ttl?: number): void {
    const key = `${userId}:${tenantId}`;
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };

    this.cache.set(key, entry);
  }

  /**
   * Invalidate cache entry
   */
  invalidate(userId: string, tenantId: string): void {
    const key = `${userId}:${tenantId}`;
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries for a user
   */
  invalidateUser(userId: string): void {
    for (const [key] of this.cache.entries()) {
      if (key.startsWith(`${userId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate all cache entries for a tenant
   */
  invalidateTenant(tenantId: string): void {
    for (const [key] of this.cache.entries()) {
      if (key.endsWith(`:${tenantId}`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired cache entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hitRate: number;
    memoryUsage: number;
  } {
    return {
      size: this.cache.size,
      hitRate: 0, // TODO: Implement hit rate tracking
      memoryUsage: 0 // TODO: Implement memory usage tracking
    };
  }

  /**
   * Destroy cache and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Export singleton instance
export const membershipCache = new MembershipCache();

// Export class for testing
export { MembershipCache };

/**
 * Cached membership service
 * Wraps database calls with caching layer
 */
export class CachedMembershipService {
  /**
   * Get membership with caching
   */
  static async getMembership(userId: string, tenantId: string): Promise<CachedMembership | null> {
    // Try cache first
    const cached = membershipCache.get(userId, tenantId);
    if (cached) {
      console.log(`[CACHE HIT] Membership for ${userId}:${tenantId}`);
      return cached;
    }

    // Cache miss - fetch from database
    console.log(`[CACHE MISS] Membership for ${userId}:${tenantId}`);

    try {
      const { supabase } = await import('../lib/supabase.js');
      const { data, error } = await supabase
        .from('memberships')
        .select('id, user_id, tenant_id, plan, status, next_payment_date, created_at, updated_at')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        console.error('[CACHED MEMBERSHIP ERROR]', error);
        return null;
      }

      if (!data) {
        return null;
      }

      const membership: CachedMembership = {
        id: data.id,
        userId: data.user_id,
        tenantId: data.tenant_id,
        plan: data.plan,
        status: data.status,
        nextPaymentDate: data.next_payment_date,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      // Cache the result
      membershipCache.set(userId, tenantId, membership);

      return membership;
    } catch (err) {
      console.error('[CACHED MEMBERSHIP ERROR]', err);
      return null;
    }
  }

  /**
   * Update membership and invalidate cache
   */
  static async updateMembership(
    userId: string,
    tenantId: string,
    updates: Partial<CachedMembership>
  ): Promise<boolean> {
    try {
      const { supabase } = await import('../lib/supabase.js');

      // Update in database
      const { error } = await supabase
        .from('memberships')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('[UPDATE MEMBERSHIP ERROR]', error);
        return false;
      }

      // Invalidate cache
      membershipCache.invalidate(userId, tenantId);

      return true;
    } catch (err) {
      console.error('[UPDATE MEMBERSHIP ERROR]', err);
      return false;
    }
  }

  /**
   * Create membership and cache result
   */
  static async createMembership(membershipData: {
    userId: string;
    tenantId: string;
    plan: string;
    startDate?: string;
    nextPaymentDate?: string;
    status?: string;
  }): Promise<CachedMembership | null> {
    try {
      const { supabase } = await import('../lib/supabase.js');

      const { data, error } = await supabase
        .from('memberships')
        .insert({
          user_id: membershipData.userId,
          tenant_id: membershipData.tenantId,
          plan: membershipData.plan,
          start_date: membershipData.startDate || new Date().toISOString().split('T')[0],
          next_payment_date: membershipData.nextPaymentDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: membershipData.status || 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('[CREATE MEMBERSHIP ERROR]', error);
        return null;
      }

      const membership: CachedMembership = {
        id: data.id,
        userId: data.user_id,
        tenantId: data.tenant_id,
        plan: data.plan,
        status: data.status,
        nextPaymentDate: data.next_payment_date,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      // Cache the result
      membershipCache.set(membershipData.userId, membershipData.tenantId, membership);

      return membership;
    } catch (err) {
      console.error('[CREATE MEMBERSHIP ERROR]', err);
      return null;
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    return membershipCache.getStats();
  }

  /**
   * Clear cache for maintenance
   */
  static clearCache(): void {
    membershipCache.clear();
    console.log('[CACHE] Membership cache cleared');
  }

  /**
   * Invalidate user cache (for admin actions)
   */
  static invalidateUser(userId: string): void {
    membershipCache.invalidateUser(userId);
    console.log(`[CACHE] Cache invalidated for user ${userId}`);
  }

  /**
   * Invalidate tenant cache (for bulk operations)
   */
  static invalidateTenant(tenantId: string): void {
    membershipCache.invalidateTenant(tenantId);
    console.log(`[CACHE] Cache invalidated for tenant ${tenantId}`);
  }
}

export default CachedMembershipService;
