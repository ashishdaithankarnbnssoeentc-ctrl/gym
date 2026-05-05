/**
 * Authentication Cookies Middleware
 * 
 * Implements secure httpOnly cookie-based authentication
 * Prevents XSS token theft and CSRF attacks
 */

import { Request, Response, NextFunction } from 'express';
import { sign, verify } from 'jsonwebtoken';
import { verifyFirebaseToken } from '../firebase.js';

interface AuthCookieConfig {
  secret: string;
  expiresIn: string;
  cookieOptions: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
    path: string;
  };
}

class SecureAuthCookies {
  private config: AuthCookieConfig;
  private jwtSecret: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    
    this.config = {
      secret: this.jwtSecret,
      expiresIn: '15m', // Shorter for security
      cookieOptions: {
        httpOnly: true, // Prevent XSS access
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict', // Prevent CSRF
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: '/'
      }
    };
  }

  /**
   * Create secure JWT token
   */
  private createToken(payload: any): string {
    return sign(payload, this.config.secret, { expiresIn: this.config.expiresIn });
  }

  /**
   * Set secure authentication cookie
   */
  private setAuthCookie(res: Response, token: string): void {
    res.cookie('authToken', token, {
      ...this.config.cookieOptions,
      // Additional security flags
      domain: process.env.NODE_ENV === 'production' ? '.your-domain.com' : undefined
    });
  }

  /**
   * Clear authentication cookie
   */
  private clearAuthCookie(res: Response): void {
    res.clearCookie('authToken', {
      ...this.config.cookieOptions,
      path: '/'
    });
  }

  /**
   * Middleware to authenticate with Firebase and set secure cookie
   */
  authenticateAndSetCookie() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          // Check for existing cookie first
          const existingToken = req.cookies?.authToken;
          
          if (existingToken) {
            // Verify existing token
            const decoded = await verifyFirebaseToken(existingToken);
            
            if (decoded) {
              req.user = {
                id: decoded.uid,
                email: decoded.email || '',
                tenantId: decoded.tenantId || 'default',
                uid: decoded.uid,
                name: decoded.name,
                picture: decoded.picture,
                role: decoded.role || 'user',
                ...decoded
              };
              
              return next();
            }
          }
          
          return res.status(401).json({
            error: 'Authentication required',
            message: 'Please provide valid authentication'
          });
        }

        const firebaseToken = authHeader.replace('Bearer ', '');
        
        // Verify with Firebase Admin SDK
        const decoded = await verifyFirebaseToken(firebaseToken);

        if (!decoded) {
          return res.status(401).json({
            error: 'Invalid token',
            message: 'Firebase token verification failed'
          });
        }

        // Additional security checks
        if (!decoded.uid) {
          throw new Error('Invalid Firebase token: missing UID');
        }

        // Check issuer and audience for production
        if (process.env.NODE_ENV === 'production') {
          const expectedIssuer = `https://securetoken.google.com/${process.env.FIREBASE_PROJECT_ID}`;
          if (decoded.iss !== expectedIssuer) {
            throw new Error('Invalid token issuer');
          }
        }

        // Attach user info to request
        req.user = {
          id: decoded.uid,
          email: decoded.email || '',
          tenantId: decoded.tenantId || 'default',
          uid: decoded.uid,
          name: decoded.name,
          picture: decoded.picture,
          role: decoded.role || 'user',
          ...decoded
        };

        // Create secure JWT for server-side use
        const serverToken = this.createToken({
          uid: decoded.uid,
          email: decoded.email,
          tenantId: decoded.tenantId
        });

        // Set secure httpOnly cookie
        this.setAuthCookie(res, serverToken);

        // Clear any existing localStorage tokens (frontend should handle this)
        res.locals.clearLocalStorage = true;

        next();
      } catch (err: any) {
        console.error('[AUTH COOKIES]', err.message);
        
        // Clear any existing auth on error
        this.clearAuthCookie(res);
        
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid authentication credentials'
        });
      }
    };
  }

  /**
   * Middleware to verify cookie-based authentication
   */
  verifyCookieAuth() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const token = req.cookies?.authToken;

        if (!token) {
          return res.status(401).json({
            error: 'Authentication required',
            message: 'No authentication token found'
          });
        }

        // Verify JWT token
        const decoded = verify(token, this.config.secret);

        if (!decoded) {
          this.clearAuthCookie(res);
          
          return res.status(401).json({
            error: 'Invalid token',
            message: 'Authentication token has expired or is invalid'
          });
        }

        // Attach user info to request
        req.user = {
          id: decoded.uid,
          email: decoded.email,
          tenantId: decoded.tenantId,
          uid: decoded.uid,
          name: decoded.name,
          picture: decoded.picture,
          role: decoded.role
        };

        next();
      } catch (err: any) {
        console.error('[AUTH COOKIES]', err.message);
        
        this.clearAuthCookie(res);
        
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid authentication token'
        });
      }
    };
  }

  /**
   * Middleware to clear auth cookie on logout
   */
  logout() {
    return (req: Request, res: Response, next: NextFunction) => {
      this.clearAuthCookie(res);
      
      // Clear any frontend localStorage indicator
      res.locals.clearLocalStorage = true;
      
      return res.status(200).json({
        message: 'Logged out successfully'
      });
    };
  }

  /**
   * Get current user from cookie
   */
  getCurrentUser(req: Request): any {
    const token = req.cookies?.authToken;
    
    if (!token) {
      return null;
    }

    try {
      return verify(token, this.config.secret);
    } catch (err) {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(req: Request): boolean {
    return !!this.getCurrentUser(req);
  }
}

// Export singleton instance
export const secureAuthCookies = new SecureAuthCookies();

// Export middleware functions
export const {
  authenticateAndSetCookie,
  verifyCookieAuth,
  logout,
  getCurrentUser,
  isAuthenticated
} = secureAuthCookies;
