/**
 * Client-Side Rate Limiting
 *
 * Prevents spam and reduces backend pressure
 * Security + stability enhancement
 */

interface RateLimitConfig {
  /** Minimum time between attempts (ms) */
  windowMs: number;
  /** Maximum attempts per window */
  maxAttempts: number;
}

class RateLimiter {
  private attempts = new Map<string, number[]>();

  /**
   * Check if action is allowed
   * @param key - Unique identifier (e.g., 'login', 'video-validation')
   * @param config - Rate limit configuration
   * @returns true if allowed, false if rate limited
   */
  canAttempt(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];

    // Remove expired attempts
    const validAttempts = attempts.filter(
      (timestamp) => now - timestamp < config.windowMs
    );

    // Check if limit exceeded
    if (validAttempts.length >= config.maxAttempts) {
      return false;
    }

    // Record new attempt
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);

    return true;
  }

  /**
   * Get time until next attempt is allowed (ms)
   */
  getTimeUntilReset(key: string, config: RateLimitConfig): number {
    const attempts = this.attempts.get(key) || [];
    if (attempts.length === 0) return 0;

    const oldestAttempt = Math.min(...attempts);
    const resetTime = oldestAttempt + config.windowMs;
    const timeUntilReset = Math.max(0, resetTime - Date.now());

    return timeUntilReset;
  }

  /**
   * Clear rate limit for a key
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter();

// Preset configurations
export const RATE_LIMITS = {
  /** Login attempts: 5 per 60 seconds */
  LOGIN: { windowMs: 60000, maxAttempts: 5 },

  /** Video validation: 10 per 10 seconds */
  VIDEO_VALIDATION: { windowMs: 10000, maxAttempts: 10 },

  /** Contact form: 3 per 60 seconds */
  CONTACT_FORM: { windowMs: 60000, maxAttempts: 3 },

  /** Password reset: 2 per 60 seconds */
  PASSWORD_RESET: { windowMs: 60000, maxAttempts: 2 },
} as const;

/**
 * Helper function for login rate limiting
 */
export function canAttemptLogin(): {
  allowed: boolean;
  retryAfter?: number;
} {
  const allowed = rateLimiter.canAttempt('login', RATE_LIMITS.LOGIN);

  if (!allowed) {
    const retryAfter = rateLimiter.getTimeUntilReset('login', RATE_LIMITS.LOGIN);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

/**
 * Helper function for video validation rate limiting
 */
export function canAttemptVideoValidation(): boolean {
  return rateLimiter.canAttempt('video-validation', RATE_LIMITS.VIDEO_VALIDATION);
}
