/**
 * Cache Correctness Validation
 * 
 * Ensures cache invalidation and consistency
 * to prevent stale data issues.
 */

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  version: number;
  ttl: number;
  invalidated?: boolean;
}

export class CacheValidator {
  private cache = new Map<string, CacheEntry>();
  private version = 0;
  private invalidationCallbacks = new Map<string, () => void>();

  set<T>(key: string, data: T, ttl: number = 300000): void { // 5 minutes default TTL
    this.version++;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      version: this.version,
      ttl,
      invalidated: false
    });

    console.log(`Cache SET: ${key} (v${this.version})`);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      console.log(`Cache MISS: ${key}`);
      return null;
    }

    if (entry.invalidated) {
      console.log(`Cache INVALIDATED: ${key}`);
      this.cache.delete(key);
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      console.log(`Cache EXPIRED: ${key}`);
      this.cache.delete(key);
      return null;
    }

    console.log(`Cache HIT: ${key} (v${entry.version})`);
    return entry.data as T;
  }

  invalidate(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.invalidated = true;
      console.log(`Cache INVALIDATE: ${key} (v${entry.version})`);

      // Call invalidation callback if exists
      const callback = this.invalidationCallbacks.get(key);
      if (callback) {
        callback();
      }
    }
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const invalidatedKeys: string[] = [];

    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.invalidate(key);
        invalidatedKeys.push(key);
      }
    }

    console.log(`Cache INVALIDATED PATTERN: ${pattern} -> ${invalidatedKeys.join(', ')}`);
  }

  onInvalidate(key: string, callback: () => void): void {
    this.invalidationCallbacks.set(key, callback);
  }

  validateConsistency<T>(key: string, freshData: T): boolean {
    const cachedData = this.get<T>(key);
    
    if (!cachedData) {
      console.log(`Cache consistency check: ${key} - no cached data`);
      return true; // No cached data is consistent
    }

    // Simple deep comparison for objects
    const isConsistent = JSON.stringify(cachedData) === JSON.stringify(freshData);
    
    if (!isConsistent) {
      console.warn(`Cache inconsistency detected: ${key}`);
      this.invalidate(key);
      return false;
    }

    console.log(`Cache consistency check: ${key} - consistent`);
    return true;
  }

  getStats() {
    const totalEntries = this.cache.size;
    const expiredEntries = Array.from(this.cache.values())
      .filter(entry => Date.now() - entry.timestamp > entry.ttl).length;
    const invalidatedEntries = Array.from(this.cache.values())
      .filter(entry => entry.invalidated).length;

    return {
      totalEntries,
      expiredEntries,
      invalidatedEntries,
      validEntries: totalEntries - expiredEntries - invalidatedEntries,
      version: this.version
    };
  }

  clear(): void {
    this.cache.clear();
    this.version = 0;
    console.log('Cache CLEARED');
  }
}

// Singleton instance
export const cacheValidator = new CacheValidator();
