/**
 * Enhanced Authentication Middleware
 * 
 * Enforces RLS + middleware sync with proper JWT binding
 * Prevents service role usage in API endpoints
 * Adds comprehensive security context
 */

import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase.js';

// Extend Request type
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
      securityContext?: {
        ip: string;
        userAgent: string;
        requestId: string;
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
 * Enhanced authentication with RLS sync
 * Binds JWT claims to database session for perfect alignment
 */
export async function requireAuthSecure(req: Request, res: Response, next: NextFunction) {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    // 1. Extract token (httpOnly cookie only in production)
    const token = req.cookies?.authToken;
    
    if (!token) {
      await logSecurityEvent(req, 'auth_missing_token', requestId, false);
      return res.status(401).json({ 
        error: 'Authentication required',
        requestId 
      });
    }

    // 2. Verify JWT token
    const decoded = await verifyToken(token);
    
    if (!decoded || !decoded.uid) {
      await logSecurityEvent(req, 'auth_invalid_token', requestId, false);
      return res.status(401).json({ 
        error: 'Invalid authentication token',
        requestId 
      });
    }

    // 3. Load fresh user data from database (source of truth)
    const { data: user, error } = await supabase
      .from('users')
      .select('id, tenant_id, role, email, status, is_admin')
      .eq('firebase_uid', decoded.uid)
      .single();

    if (error || !user) {
      await logSecurityEvent(req, 'auth_user_not_found', requestId, false);
      return res.status(401).json({ 
        error: 'User not found',
        requestId 
      });
    }

    // 4. Validate user status
    if (user.status !== 'active') {
      await logSecurityEvent(req, 'auth_inactive_user', requestId, false);
      return res.status(401).json({ 
        error: 'Account not active',
        requestId 
      });
    }

    // 5. CRITICAL: Bind JWT claims to database session for RLS sync
    await supabase.rpc('set_config', {
      key: 'request.jwt.claim.sub',
      value: user.id
    });

    await supabase.rpc('set_config', {
      key: 'request.jwt.claim.email',
      value: user.email
    });

    await supabase.rpc('set_config', {
      key: 'request.jwt.claim.tenant_id',
      value: user.tenant_id
    });

    await supabase.rpc('set_config', {
      key: 'request.jwt.claim.role',
      value: user.role || 'user'
    });

    // 6. Set tenant context for RLS policies
    await supabase.rpc('set_tenant_context', { 
      tenant_id: user.tenant_id 
    });

    // 7. Attach trusted user data to request
    req.user = {
      id: user.id,
      tenantId: user.tenant_id,
      role: user.role || 'user',
      email: user.email,
      status: user.status
    };

    // 8. Attach security context
    req.securityContext = {
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      requestId
    };

    // 9. Log successful authentication
    const duration = Date.now() - startTime;
    await logSecurityEvent(req, 'auth_success', requestId, true, {
      duration,
      userId: user.id,
      tenantId: user.tenant_id
    });

    next();
  } catch (error) {
    const duration = Date.now() - startTime;
    await logSecurityEvent(req, 'auth_error', requestId, false, {
      duration,
      error: error.message
    });
    
    return res.status(401).json({ 
      error: 'Authentication failed',
      requestId 
    });
  }
}

/**
 * Service role protection middleware
 * Ensures no service role is used in API endpoints
 */
export function preventServiceRole(req: Request, res: Response, next: NextFunction) {
  // Check if service role key is being used (would be in headers or env)
  const serviceRoleKey = req.headers['x-service-role'] || 
                        req.headers['authorization']?.includes('service_role');
  
  if (serviceRoleKey) {
    await logSecurityEvent(req, 'service_role_attempt', generateRequestId(), false);
    return res.status(403).json({
      error: 'Service role not allowed in API endpoints',
      requestId: generateRequestId()
    });
  }

  next();
}

/**
 * Enhanced admin middleware with additional checks
 */
export async function requireAdminSecure(req: Request, res: Response, next: NextFunction) {
  await requireAuthSecure(req, res, () => {
    if (!req.user || req.user.role !== 'admin') {
      await logSecurityEvent(req, 'admin_access_denied', req.securityContext?.requestId, false);
      return res.status(403).json({ 
        error: 'Admin access required',
        requestId: req.securityContext?.requestId 
      });
    }
    next();
  });
}

/**
 * Tenant isolation enforcement
 */
export async function requireTenantIsolationSecure(req: Request, res: Response, next: NextFunction) {
  await requireAuthSecure(req, res, () => {
    if (!req.user?.tenantId) {
      await logSecurityEvent(req, 'tenant_context_missing', req.securityContext?.requestId, false);
      return res.status(403).json({ 
        error: 'Tenant context required',
        requestId: req.securityContext?.requestId 
      });
    }
    next();
  });
}

/**
 * Payment verification middleware with replay protection
 */
export async function requirePaymentVerificationSecure(req: Request, res: Response, next: NextFunction) {
  await requireAuthSecure(req, res, () => {
    const { payment_verified, verification_id } = req.body;
    
    if (!payment_verified || !verification_id) {
      return res.status(403).json({ 
        error: 'Payment verification required',
        requestId: req.securityContext?.requestId 
      });
    }

    // Check if verification is still valid and not consumed
    checkPaymentVerification(verification_id, req.user!.id, req.user!.tenantId)
      .then(isValid => {
        if (!isValid) {
          return res.status(403).json({ 
            error: 'Invalid or expired payment verification',
            requestId: req.securityContext?.requestId 
          });
        }
        next();
      })
      .catch(() => {
        return res.status(500).json({ 
          error: 'Payment verification check failed',
          requestId: req.securityContext?.requestId 
        });
      });
  });
}

/**
 * Auto-blocking middleware for anomaly detection
 */
export async function anomalyBlocking(req: Request, res: Response, next: NextFunction) {
  await requireAuthSecure(req, res, async () => {
    const userId = req.user!.id;
    const tenantId = req.user!.tenantId;
    const ip = req.securityContext!.ip;
    
    try {
      // Check for active blocks
      const isBlocked = await checkUserBlock(userId, tenantId, ip);
      
      if (isBlocked) {
        await logSecurityEvent(req, 'user_blocked', req.securityContext!.requestId, false);
        return res.status(429).json({ 
          error: 'Access temporarily blocked due to suspicious activity',
          requestId: req.securityContext!.requestId,
          retryAfter: 300 // 5 minutes
        });
      }

      // Run anomaly detection
      const anomalies = await detectAnomalies(userId, tenantId, {
        ip,
        userAgent: req.securityContext!.userAgent,
        endpoint: req.path,
        method: req.method
      });

      // Auto-block on critical anomalies
      const criticalAnomalies = anomalies.filter(a => a.severity === 'critical' || a.severity === 'high');
      
      if (criticalAnomalies.length > 0) {
        await blockUserTemporarily(userId, tenantId, ip, criticalAnomalies);
        await logSecurityEvent(req, 'auto_block_triggered', req.securityContext!.requestId, false, {
          anomalies: criticalAnomalies
        });
        
        return res.status(429).json({ 
          error: 'Access temporarily blocked due to suspicious activity',
          requestId: req.securityContext!.requestId,
          retryAfter: 300
        });
      }

      next();
    } catch (error) {
      console.error('Anomaly detection failed:', error);
      // Fail open - allow request but log the error
      await logSecurityEvent(req, 'anomaly_detection_failed', req.securityContext!.requestId, false, {
        error: error.message
      });
      next();
    }
  });
}

/**
 * Helper functions
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getClientIP(req: Request): string {
  return req.ip || 
         req.connection.remoteAddress || 
         req.headers['x-forwarded-for'] as string || 
         req.headers['x-real-ip'] as string || 
         'unknown';
}

async function verifyToken(token: string): Promise<DecodedToken | null> {
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

async function checkPaymentVerification(verificationId: string, userId: string, tenantId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('payment_verifications')
      .select('id, status, used, created_at')
      .eq('id', verificationId)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('status', 'verified')
      .eq('used', false)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 24 hour expiry
      .single();

    return !error && data !== null;
  } catch (error) {
    console.error('Payment verification check failed:', error);
    return false;
  }
}

async function checkUserBlock(userId: string, tenantId: string, ip: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('id, expires_at')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .or(`ip.eq.${ip},user_id.eq.${userId}`)
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    return !error && data && data.length > 0;
  } catch (error) {
    console.error('User block check failed:', error);
    return false;
  }
}

async function detectAnomalies(userId: string, tenantId: string, context: any): Promise<any[]> {
  // This would integrate with your anomaly detection service
  // For now, return empty array
  return [];
}

async function blockUserTemporarily(userId: string, tenantId: string, ip: string, anomalies: any[]): Promise<void> {
  try {
    await supabase
      .from('user_blocks')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        ip: ip,
        reason: 'auto_block',
        details: anomalies,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to block user:', error);
  }
}

async function logSecurityEvent(req: Request, event: string, requestId: string, success: boolean, details?: any): Promise<void> {
  try {
    await supabase
      .from('security_events')
      .insert({
        request_id: requestId,
        user_id: req.user?.id || null,
        tenant_id: req.user?.tenantId || null,
        event,
        success,
        ip: getClientIP(req),
        user_agent: req.headers['user-agent'] || 'unknown',
        path: req.path,
        method: req.method,
        details: details || {},
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

export {
  requireAuthSecure as requireAuth,
  requireAdminSecure as requireAdmin,
  requireTenantIsolationSecure as requireTenantIsolation,
  requirePaymentVerificationSecure as requirePaymentVerification,
  preventServiceRole,
  anomalyBlocking
};
