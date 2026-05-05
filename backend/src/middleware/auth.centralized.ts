/**
 * Centralized Authentication Middleware
 * 
 * This is the single source of truth for authentication.
 * It verifies tokens, loads user from DB, and attaches trusted fields.
 * Never trusts client-provided user data - always rehydrates from database.
 */

import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase.js';

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        tenantId: string;
        role: string;
        email: string;
        status: string;
      };
    }
  }
}

interface DecodedToken {
  uid: string;
  email: string;
  tenantId?: string;
  role?: string;
}

/**
 * Centralized authentication middleware
 * Verifies JWT token and loads fresh user data from database
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Extract token from httpOnly cookie (production) or header (dev)
    const token = req.cookies?.authToken || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // 2. Verify JWT token (using Firebase Admin SDK)
    const decoded = await verifyToken(token);
    
    if (!decoded || !decoded.uid) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    // 3. Load fresh user data from database (source of truth)
    const { data: user, error } = await supabase
      .from('users')
      .select('id, tenant_id, role, email, status, is_admin')
      .eq('firebase_uid', decoded.uid)
      .single();

    if (error || !user) {
      console.warn('Auth: User not found in database', { uid: decoded.uid, error: error?.message });
      return res.status(401).json({ error: 'User not found' });
    }

    // 4. Validate user status
    if (user.status !== 'active') {
      console.warn('Auth: Inactive user attempted access', { userId: user.id, status: user.status });
      return res.status(401).json({ error: 'Account not active' });
    }

    // 5. Set tenant context for RLS policies
    await supabase.rpc('set_tenant_context', { tenant_id: user.tenant_id });

    // 6. Attach only trusted fields to request
    req.user = {
      id: user.id,
      tenantId: user.tenant_id,
      role: user.role || 'user',
      email: user.email,
      status: user.status
    };

    // 7. Log authentication event (for security monitoring)
    await logAuthEvent(req, user.id, 'auth_success');

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    await logAuthEvent(req, 'unknown', 'auth_failure');
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Admin-only middleware
 * Requires authentication + admin role
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // First ensure user is authenticated
  await requireAuth(req, res, () => {
    // Check if user has admin role
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

/**
 * Optional authentication middleware
 * Attaches user if authenticated, but doesn't block if not
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.authToken || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      next();
      return;
    }

    const decoded = await verifyToken(token);
    
    if (!decoded || !decoded.uid) {
      next();
      return;
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, tenant_id, role, email, status')
      .eq('firebase_uid', decoded.uid)
      .single();

    if (!error && user && user.status === 'active') {
      await supabase.rpc('set_tenant_context', { tenant_id: user.tenant_id });
      
      req.user = {
        id: user.id,
        tenantId: user.tenant_id,
        role: user.role || 'user',
        email: user.email,
        status: user.status
      };
    }
  } catch (error) {
    // Silent fail for optional auth
    console.warn('Optional auth failed:', error);
  }
  
  next();
}

/**
 * Verify JWT token using Firebase Admin SDK
 */
async function verifyToken(token: string): Promise<DecodedToken | null> {
  try {
    // In production, use Firebase Admin SDK
    // For now, basic JWT verification (replace with proper implementation)
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Log authentication events for security monitoring
 */
async function logAuthEvent(req: Request, userId: string, event: string) {
  try {
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];
    
    await supabase
      .from('auth_events')
      .insert({
        user_id: userId,
        event,
        ip_address: clientIP,
        user_agent: userAgent,
        path: req.path,
        method: req.method,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log auth event:', error);
  }
}

/**
 * Rate limiting middleware for authentication endpoints
 */
export const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
};

/**
 * Validate user ownership of resource
 */
export function requireOwnership(resourceUserIdField = 'user_id') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // This will be checked at the service/controller level
    // The middleware just ensures user is authenticated
    next();
  };
}

/**
 * Tenant isolation middleware
 * Ensures all queries are scoped to the correct tenant
 */
export async function requireTenantIsolation(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if (!req.user?.tenantId) {
      return res.status(403).json({ error: 'Tenant context required' });
    }
    next();
  });
}

/**
 * Payment verification middleware
 * Ensures payment verification flag is set for plan changes
 */
export async function requirePaymentVerification(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    const { payment_verified } = req.body;
    
    if (!payment_verified) {
      return res.status(403).json({ error: 'Payment verification required for plan changes' });
    }
    
    next();
  });
}
