/**
 * Comprehensive Security Middleware
 * 
 * Combines all security measures into one middleware
 * Includes Helmet, rate limiting, input validation, and attack detection
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { z } from 'zod';

class ComprehensiveSecurity {
  private suspiciousIPs = new Set<string>();
  private blockedIPs = new Set<string>();
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  /**
   * Initialize security monitoring
   */
  constructor() {
    // Clean up old entries every hour
    setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  /**
   * Main security middleware
   */
  middleware() {
    return [
      // 1. Security headers with Helmet
      helmet({
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
        }
      }),

      // 2. IP-based attack detection
      (req: Request, res: Response, next: NextFunction) => {
        const ip = this.getClientIP(req);

        // Track suspicious activity
        if (this.isSuspiciousActivity(req, ip)) {
          console.warn(`[SECURITY] Suspicious activity from ${ip}:`, {
            method: req.method,
            path: req.path,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
          });

          // Block if too many suspicious requests
          if (this.shouldBlockIP(ip)) {
            return res.status(429).json({
              error: 'Blocked',
              message: 'Too many suspicious requests'
            });
          }
        }

        next();
      },

      // 3. Request size limiting
      (req: Request, res: Response, next: NextFunction) => {
        const contentLength = req.get('content-length');

        if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
          console.warn(`[SECURITY] Large request from ${this.getClientIP(req)}: ${contentLength} bytes`);

          return res.status(413).json({
            error: 'Request too large',
            message: 'Request size exceeds maximum allowed size'
          });
        }

        next();
      },

      // 4. Input validation and sanitization (skip for health endpoint)
      (req: Request, res: Response, next: NextFunction) => {
        // Skip validation for health endpoints (precise matching only)
        if (
          req.path === '/' ||
          req.path.startsWith('/api/health')
        ) {
          return next();
        }

        // Validate and sanitize query parameters
        const queryValidation = this.validateQuery(req.query);
        if (!queryValidation.valid) {
          console.warn(`[SECURITY] Invalid query parameters from ${this.getClientIP(req)}:`, queryValidation.errors);

          return res.status(400).json({
            error: 'Invalid input',
            message: 'Request contains invalid parameters',
            details: queryValidation.errors
          });
        }
        req.query = queryValidation.sanitized;

        // Validate and sanitize request body
        const bodyValidation = this.validateBody(req.body);
        if (!bodyValidation.valid) {
          console.warn(`[SECURITY] Invalid body from ${this.getClientIP(req)}:`, bodyValidation.errors);

          return res.status(400).json({
            error: 'Invalid input',
            message: 'Request contains invalid body',
            details: bodyValidation.errors
          });
        }
        req.body = bodyValidation.sanitized;

        next();
      },
    ];
  }

  /**
   * Get client IP with fallbacks
   */
  private getClientIP(req: Request): string {
    return req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.headers['x-forwarded-for'] as string || '').split(',')[0].trim() ||
      'unknown';
  }

  /**
   * Detect suspicious activity patterns
   */
  private isSuspiciousActivity(req: Request, ip: string): boolean {
    const userAgent = req.get('User-Agent') || '';

    // Check for common attack tools
    const attackTools = [
      'sqlmap', 'nmap', 'nikto', 'burp', 'owasp', 'zap',
      'python-requests', 'curl', 'wget', 'sqlninja'
    ];

    const suspiciousPatterns = [
      /\.\./,           // Path traversal
      /union.*select/i,   // SQL injection
      /<script/i,        // XSS
      /javascript:/i,      // XSS
      /\b(dropdown|select|insert|update|delete)\b/i  // SQL keywords
    ];

    // Check user agent for attack tools
    const hasAttackTool = attackTools.some(tool => userAgent.toLowerCase().includes(tool));

    // Check request path for suspicious patterns
    const hasSuspiciousPath = suspiciousPatterns.some(pattern => pattern.test(req.path));

    // Check for rapid requests from same IP
    const rateData = this.rateLimitMap.get(ip) || { count: 0, resetTime: Date.now() };
    rateData.count++;
    this.rateLimitMap.set(ip, rateData);

    return hasAttackTool || hasSuspiciousPath || rateData.count > 100;
  }

  /**
   * Determine if IP should be blocked
   */
  private shouldBlockIP(ip: string): boolean {
    const rateData = this.rateLimitMap.get(ip);
    return rateData && rateData.count > 50;
  }

  /**
   * Validate query parameters
   */
  private validateQuery(query: any): { valid: boolean; sanitized: any; errors: string[] } {
    try {
      // Use Zod schema with coercion for proper validation
      const querySchema = z.object({
        limit: z.coerce.number().min(1).max(100).optional().default(10),
        offset: z.coerce.number().min(0).optional().default(0),
        category: z.string().optional(),
        search: z.string().optional(),
        tags: z.array(z.string()).optional().default([])
      });

      const parsed = querySchema.parse(query);
      return { valid: true, sanitized: parsed, errors: [] };
    } catch (error: any) {
      return {
        valid: false,
        sanitized: query || {},
        errors: [error.message || 'Invalid query parameters']
      };
    }
  }

  /**
   * Validate request body
   */
  private validateBody(body: any): { valid: boolean; sanitized: any; errors: string[] } {
    const errors: string[] = [];
    let sanitized: any = {};

    if (!body || typeof body !== 'object') {
      return { valid: true, sanitized: {}, errors: [] };
    }

    // Remove dangerous properties
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    sanitized = { ...body };

    for (const key of dangerousKeys) {
      delete sanitized[key];
    }

    // Basic sanitization for string values
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string') {
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim();
      }
    }

    return { valid: true, sanitized, errors: [] };
  }

  /**
   * Clean up old rate limit entries
   */
  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - (60 * 60 * 1000); // 1 hour ago

    for (const [ip, data] of this.rateLimitMap.entries()) {
      if (data.resetTime < cutoff) {
        this.rateLimitMap.delete(ip);
      }
    }
  }
}

// Export singleton instance
export const comprehensiveSecurity = new ComprehensiveSecurity();
