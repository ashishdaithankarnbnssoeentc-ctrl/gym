/**
 * Enhanced Authentication Middleware
 * 
 * Optimizes authentication by attaching database user ID once
 * Prevents repeated database queries in controllers
 */

import { Request, Response, NextFunction } from 'express';
import { verifyFirebaseToken } from '../firebase.js';
import { supabase } from '../lib/supabase.js';

interface EnhancedAuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    tenantId: string;
    uid: string;
    name?: string;
    picture?: string;
    role?: string;
    dbId?: string; // Database user ID from Supabase
  };
}

/**
 * Get database user ID with caching
 */
async function getDatabaseUserId(firebaseUid: string, tenantId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', firebaseUid)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.id;
  } catch (err) {
    console.error('[GET DB USER ID ERROR]', err);
    return null;
  }
}

/**
 * Enhanced authentication middleware with database ID attachment
 */
export const enhancedAuth = async (req: EnhancedAuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // In production, only use cookies (disable Bearer tokens)
      if (process.env.NODE_ENV === 'production') {
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
              role: decoded.role || 'user'
            };
            
            // ❌ CRITICAL FIX: Attach database user ID once
            const dbId = await getDatabaseUserId(decoded.uid, decoded.tenantId || 'default');
            if (dbId) {
              req.user.dbId = dbId;
            }
            
            return next();
          }
        }
        
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please provide valid authentication'
        });
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
      role: decoded.role || 'user'
    };

    // ❌ CRITICAL FIX: Attach database user ID once
    const dbId = await getDatabaseUserId(decoded.uid, decoded.tenantId || 'default');
    if (dbId) {
      req.user.dbId = dbId;
    }

    next();
  } catch (err: any) {
    console.error('[ENHANCED AUTH ERROR]', err.message);
    
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid authentication credentials'
    });
  }
};

/**
 * Optional authentication middleware
 */
export const optionalEnhancedAuth = async (req: EnhancedAuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Check for cookie
      const existingToken = req.cookies?.authToken;
      
      if (existingToken) {
        const decoded = await verifyFirebaseToken(existingToken);
        
        if (decoded) {
          req.user = {
            id: decoded.uid,
            email: decoded.email || '',
            tenantId: decoded.tenantId || 'default',
            uid: decoded.uid,
            name: decoded.name,
            picture: decoded.picture,
            role: decoded.role || 'user'
          };
          
          // Attach database user ID
          const dbId = await getDatabaseUserId(decoded.uid, decoded.tenantId || 'default');
          if (dbId) {
            req.user.dbId = dbId;
          }
        }
      }
      
      return next();
    }

    const firebaseToken = authHeader.replace('Bearer ', '');
    const decoded = await verifyFirebaseToken(firebaseToken);

    if (decoded) {
      req.user = {
        id: decoded.uid,
        email: decoded.email || '',
        tenantId: decoded.tenantId || 'default',
        uid: decoded.uid,
        name: decoded.name,
        picture: decoded.picture,
        role: decoded.role || 'user'
      };
      
      // Attach database user ID
      const dbId = await getDatabaseUserId(decoded.uid, decoded.tenantId || 'default');
      if (dbId) {
        req.user.dbId = dbId;
      }
    }

    next();
  } catch (err: any) {
    console.error('[OPTIONAL ENHANCED AUTH ERROR]', err.message);
    next();
  }
};

export type { EnhancedAuthRequest };
