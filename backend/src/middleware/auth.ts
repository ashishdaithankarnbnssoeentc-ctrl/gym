/**
 * Authentication Middleware
 * 
 * Verifies Firebase ID tokens and attaches user info to requests
 */

import { Request, Response, NextFunction } from 'express';
import { verifyFirebaseToken } from '../firebase.js';

/**
 * Extended Request interface with authenticated user data
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    tenantId: string;
    membership?: {
      plan: string;
      status: string;
      nextPaymentDate: string;
    };
    uid?: string;
    name?: string;
    picture?: string;
    role?: string;
    [key: string]: any;
  };
}

/**
 * Authentication middleware - verifies Firebase token
 * 
 * Usage:
 *   router.get('/protected', requireAuth, (req: AuthRequest, res) => {
 *     const userId = req.user.uid;
 *     // ...
 *   });
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. Expected: Bearer <token>'
      });
      return;
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token with Firebase Admin SDK
    const decoded = await verifyFirebaseToken(token);

    // Attach user info to request with proper structure
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

    // Continue to route handler
    next();
  } catch (err: any) {
    console.error('[AUTH MIDDLEWARE]', err.message);

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Optional authentication middleware - allows both authenticated and anonymous requests
 * Sets req.user if token is valid, but doesn't block if missing
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const decoded = await verifyFirebaseToken(token);
      req.user = decoded;
    }

    // Continue regardless of authentication status
    next();
  } catch (err) {
    // Ignore errors for optional auth - just continue without user
    next();
  }
};
