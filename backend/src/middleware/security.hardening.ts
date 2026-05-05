/**
 * Security Hardening Middleware
 * 
 * Implements comprehensive security measures to protect against common attacks
 * Rate limiting, input validation, security headers, and abuse detection
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

interface SecurityConfig {
  maxRequestSize: string;
  allowedOrigins: string[];
  rateLimitWindow: number;
  rateLimitMax: number;
  maxLoginAttempts: number;
  loginLockoutTime: number;
}

class SecurityMiddleware {
  private config: SecurityConfig = {
    maxRequestSize: '10mb',
    allowedOrigins: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5173'
    ],
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100, // 100 requests per window
    maxLoginAttempts: 5,
    loginLockoutTime: 15 * 60 * 1000 // 15 minutes
  };

  private loginAttempts = new Map<string, { count: number; lockUntil: number }>();

  /**
   * Input sanitization and validation
   */
  sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Basic XSS prevention
      return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }

    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        if (typeof value === 'string') {
          sanitized[key] = this.sanitizeInput(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }

    return input;
  }

  /**
   * Validate and sanitize query parameters
   */
  validateQuery(req: Request): { valid: boolean; sanitized: any; errors: string[] } {
    const errors: string[] = [];
    const sanitized: any = {};

    for (const [key, value] of Object.entries(req.query)) {
      // Check for SQL injection patterns
      if (typeof value === 'string') {
        const sqlPatterns = [
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
          /(--|;|\/\*|\*\/|@@|@|CHAR|CAST|CONVERT)\b/gi
        ];

        for (const pattern of sqlPatterns) {
          if (pattern.test(value)) {
            errors.push(`Potential SQL injection in parameter: ${key}`);
          }
        }

        // Check for XSS patterns
        const xssPatterns = [
          /<script[^>]*>.*?<\/script>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi,
          /<iframe[^>]*>/gi
        ];

        for (const pattern of xssPatterns) {
          if (pattern.test(value)) {
            errors.push(`Potential XSS in parameter: ${key}`);
          }
        }

        // Length validation
        if (value.length > 1000) {
          errors.push(`Parameter ${key} exceeds maximum length`);
        }
      }

      sanitized[key] = this.sanitizeInput(value);
    }

    return {
      valid: errors.length === 0,
      sanitized,
      errors
    };
  }

  /**
   * Check for IDOR (Insecure Direct Object Reference)
   */
  checkIDOR(req: Request, resourceId: string): { valid: boolean; error?: string } {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;

    if (!userId || !tenantId) {
      return { valid: false, error: 'Authentication required' };
    }

    // For content access, check if user has access to this resource
    // This would typically involve checking ownership or permissions
    // For now, we'll implement basic tenant isolation
    const resourceTenantId = req.query.tenant_id as string;

    if (resourceTenantId && resourceTenantId !== tenantId) {
      return { valid: false, error: 'Cross-tenant access denied' };
    }

    return { valid: true };
  }

  /**
   * Rate limiting for sensitive operations
   */
  createRateLimit(options: { windowMs?: number; max?: number; message?: string }) {
    return rateLimit({
      windowMs: options.windowMs || this.config.rateLimitWindow,
      max: options.max || this.config.rateLimitMax,
      message: {
        error: 'Too many requests',
        message: options.message || 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((options.windowMs || this.config.rateLimitWindow) / 1000) + ' seconds'
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req: Request) => req.ip || 'unknown',
      skip: (req: Request) => {
        // Skip rate limiting for health checks and static assets
        const path = req.path;
        return path === '/' || path.startsWith('/health') || path.startsWith('/static');
      }
    });
  }

  /**
   * Login attempt tracking
   */
  trackLoginAttempt(identifier: string): { blocked: boolean; remaining: number } {
    const now = Date.now();
    const attempts = this.loginAttempts.get(identifier) || { count: 0, lockUntil: 0 };

    // Check if user is locked out
    if (attempts.lockUntil > now) {
      const remainingTime = Math.ceil((attempts.lockUntil - now) / 1000);
      return {
        blocked: true,
        remaining: remainingTime
      };
    }

    // Increment attempt count
    attempts.count++;

    // Lock out if too many attempts
    if (attempts.count >= this.config.maxLoginAttempts) {
      attempts.lockUntil = now + this.config.loginLockoutTime;
      return {
        blocked: true,
        remaining: this.config.loginLockoutTime / 1000
      };
    }

    this.loginAttempts.set(identifier, attempts);
    return {
      blocked: false,
      remaining: this.config.maxLoginAttempts - attempts.count
    };
  }

  /**
   * Clear login attempts on successful login
   */
  clearLoginAttempts(identifier: string): void {
    this.loginAttempts.delete(identifier);
  }

  /**
   * Request size limiting
   */
  requestSizeLimit() {
    return (req: Request, res: Response, next: NextFunction) => {
      const contentLength = req.get('content-length');

      if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB
        return res.status(413).json({
          error: 'Request too large',
          message: 'Request size exceeds maximum allowed size of 10MB'
        });
      }

      next();
    };
  }

  /**
   * Security headers middleware
   */
  securityHeaders() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://*.supabase.co", "https://*.googleapis.com"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      frameguard: { action: 'deny' },
      xssFilter: true
    });
  }

  /**
   * Comprehensive security middleware
   */
  comprehensiveSecurity() {
    return [
      // Apply security headers
      this.securityHeaders(),

      // Request size limiting
      this.requestSizeLimit(),

      // Input validation and sanitization
      (req: Request, res: Response, next: NextFunction) => {
        const validation = this.validateQuery(req);

        if (!validation.valid) {
          console.warn(`[SECURITY] Input validation failed:`, validation.errors);
          return res.status(400).json({
            error: 'Invalid input',
            message: 'Request contains invalid or potentially malicious content',
            details: validation.errors
          });
        }

        // Attach sanitized query to request
        req.query = validation.sanitized;
        next();
      },

      // IDOR protection for sensitive routes
      (req: Request, res: Response, next: NextFunction) => {
        const resourceId = req.params.id || req.params.userId;

        if (resourceId) {
          const idorCheck = this.checkIDOR(req, resourceId as string);

          if (!idorCheck.valid) {
            console.warn(`[SECURITY] IDOR attempt blocked:`, {
              ip: req.ip,
              userId: req.user?.id,
              resourceId,
              error: idorCheck.error
            });

            return res.status(403).json({
              error: 'Access denied',
              message: 'You do not have permission to access this resource'
            });
          }
        }

        next();
      }
    ];
  }
}

// Export singleton instance
export const securityMiddleware = new SecurityMiddleware();

// Export individual middleware functions
export const {
  sanitizeInput,
  validateQuery,
  checkIDOR,
  createRateLimit,
  trackLoginAttempt,
  clearLoginAttempts,
  requestSizeLimit,
  securityHeaders,
  comprehensiveSecurity
} = securityMiddleware;

// Export class for testing
export { SecurityMiddleware };
