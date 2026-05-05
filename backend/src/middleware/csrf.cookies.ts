/**
 * CSRF Protection Middleware
 * 
 * Implements CSRF token-based protection for state-changing operations
 * Works with httpOnly cookies to prevent XSS + CSRF attacks
 */

import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

interface CSRFConfig {
  cookieOptions: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
  };
  ignoreMethods: string[];
  tokenLength: number;
}

class CSRFProtection {
  private config: CSRFConfig = {
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
    tokenLength: 32
  };

  /**
   * Generate secure CSRF token
   */
  private generateToken(): string {
    return randomBytes(this.config.tokenLength).toString('hex');
  }

  /**
   * Validate CSRF token
   */
  private validateTokenInternal(req: Request, providedToken: string): boolean {
    const sessionToken = req.cookies?.csrfToken;
    return sessionToken && sessionToken === providedToken;
  }

  /**
   * Set CSRF token cookie
   */
  private setCSRFCookie(res: Response): string {
    const token = this.generateToken();

    res.cookie('csrfToken', token, {
      ...this.config.cookieOptions,
      path: '/'
    });

    return token;
  }

  /**
   * Middleware to set CSRF token
   */
  setToken() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip for safe methods
      if (this.config.ignoreMethods.includes(req.method)) {
        return next();
      }

      // Set CSRF token for forms/API calls
      const token = this.setCSRFCookie(res);

      // Make token available to templates
      res.locals.csrfToken = token;

      next();
    };
  }

  /**
   * Middleware to validate CSRF token
   */
  validateToken() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip for safe methods
      if (this.config.ignoreMethods.includes(req.method)) {
        return next();
      }

      // Get token from header only (security best practice)
      const tokenFromHeader = req.get('X-CSRF-Token');
      const providedToken = tokenFromHeader;

      if (!providedToken) {
        console.warn(`[CSRF] Missing CSRF token from ${req.ip} - ${req.method} ${req.path}`);
        return res.status(403).json({
          error: 'CSRF token required',
          message: 'CSRF protection: token required for this operation',
          blocked: true
        });
      }

      // Validate token against session
      if (!this.validateTokenInternal(req, providedToken)) {
        console.error(`[CSRF] Invalid CSRF token from ${req.ip} - ${req.method} ${req.path}`);
        return res.status(403).json({
          error: 'Invalid CSRF token',
          message: 'CSRF protection: invalid token provided',
          blocked: true
        });
      }

      // Clear token after successful validation
      res.clearCookie('csrfToken');

      next();
    };
  }

  /**
   * Combined CSRF protection middleware
   */
  middleware() {
    return [
      this.setToken(),
      this.validateToken()
    ];
  }

  /**
   * Get current CSRF token for templates
   */
  getToken(req: Request): string {
    return req.cookies?.csrfToken || '';
  }
}

export const csrfProtection = new CSRFProtection();
