import { Request, Response, NextFunction } from 'express';
import { cache, CacheManager } from '../cache.js';

// Cache middleware for GET requests
export function cacheMiddleware(ttl: number = 300) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create cache key from URL and query params
    const cacheKey = `api:${req.originalUrl}`;

    try {
      // Try to get from cache
      const cachedData = await cache.get(cacheKey);

      if (cachedData) {
        console.log(`[${new Date().toISOString()}] CACHE HIT: ${cacheKey}`);
        return res.json(cachedData);
      }

      // Cache miss - continue and cache response
      console.log(`[${new Date().toISOString()}] CACHE MISS: ${cacheKey}`);

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function (data: any) {
        // Only cache successful responses
        if (res.statusCode === 200) {
          cache.set(cacheKey, data, ttl).catch(console.error);
        }
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

// Invalidate cache middleware for POST/PUT/DELETE
export function invalidateCache(patterns: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;

    res.json = function (data: any) {
      // Only invalidate on successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        patterns.forEach(async (pattern) => {
          try {
            if (pattern.includes(':uid')) {
              // User-specific cache invalidation
              const uid = (req.user as any)?.uid || req.body?.uid;
              if (uid) {
                await cache.invalidateUserCache(uid);
              }
            } else if (pattern === 'content') {
              // Content cache invalidation
              await cache.invalidateContentCache();
            }
          } catch (error) {
            console.error('Cache invalidation error:', error);
          }
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
}

// Cache invalidation helpers
export const cachePatterns = {
  user: ['user:uid'],
  content: ['content'],
  favorites: ['user:uid'],
  proposals: ['user:uid'],
  search: ['content'],
};
