import Redis from 'ioredis';

// Simple in-memory cache fallback
class MemoryCache {
  private cache = new Map<string, { data: any; expiry: number }>();

  async get(key: string): Promise<any> {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  async set(key: string, data: any, ttl: number = 300): Promise<void> {
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttl * 1000)
    });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async flush(): Promise<void> {
    this.cache.clear();
  }
}

// Redis cache implementation
class RedisCache {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Connected to Redis');
    });
  }

  async get(key: string): Promise<any> {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, data: any, ttl: number = 300): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async flush(): Promise<void> {
    try {
      await this.redis.flushdb();
    } catch (error) {
      console.error('Cache flush error:', error);
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.disconnect();
  }
}

// Cache factory - returns Redis if available, falls back to memory
export function createCache(): MemoryCache | RedisCache {
  if (process.env.REDIS_HOST && process.env.NODE_ENV === 'production') {
    return new RedisCache();
  }

  console.log('Using in-memory cache (Redis not configured)');
  return new MemoryCache();
}

// Cache helper functions
export class CacheManager {
  private cache: MemoryCache | RedisCache;

  constructor() {
    this.cache = createCache();
  }

  // Cache keys with prefixes
  static keys = {
    user: (uid: string) => `user:${uid}`,
    content: (id: string) => `content:${id}`,
    contentList: (filters: string) => `content:list:${filters}`,
    favorites: (uid: string) => `favorites:${uid}`,
    proposals: (uid: string) => `proposals:${uid}`,
    search: (query: string) => `search:${query}`,
  };

  async get(key: string): Promise<any> {
    return this.cache.get(key);
  }

  async set(key: string, data: any, ttl: number = 300): Promise<void> {
    return this.cache.set(key, data, ttl);
  }

  async delete(key: string): Promise<void> {
    return this.cache.del(key);
  }

  async invalidateUserCache(uid: string): Promise<void> {
    await this.delete(CacheManager.keys.user(uid));
    await this.delete(CacheManager.keys.favorites(uid));
    await this.delete(CacheManager.keys.proposals(uid));
  }

  async invalidateContentCache(): Promise<void> {
    // In production, you might want to use Redis patterns
    // For now, we'll flush all content-related caches
    await this.cache.flush();
  }

  async disconnect(): Promise<void> {
    if (this.cache instanceof RedisCache) {
      await this.cache.disconnect();
    }
  }
}

// Singleton instance
export const cache = new CacheManager();
