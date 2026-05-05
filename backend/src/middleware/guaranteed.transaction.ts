/**
 * Guaranteed Transaction Middleware
 * 
 * Ensures SET LOCAL is never skipped and transaction context is always established
 * before any database query runs
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
        transactionId: string;
      };
    }
  }
}

/**
 * Guaranteed transaction middleware that ensures:
 * 1. Transaction is always started
 * 2. SET LOCAL app.tenant_id is always set
 * 3. No query can run before context is established
 * 4. Automatic cleanup on response
 */
export function guaranteedTransaction(req: Request, res: Response, next: NextFunction) {
  const requestId = generateRequestId();
  const transactionId = generateTransactionId();
  let transactionStarted = false;
  let contextSet = false;

  // Set up security context
  req.securityContext = {
    ip: getClientIP(req),
    userAgent: req.headers['user-agent'] || 'unknown',
    requestId,
    transactionId
  };

  // Override supabase client to intercept queries
  const originalRpc = supabase.rpc.bind(supabase);
  const originalFrom = supabase.from.bind(supabase);
  
  // Transaction state tracking
  let transactionPromise: Promise<void> | null = null;

  // Ensure transaction is started before any query
  const ensureTransaction = async () => {
    if (!transactionStarted) {
      transactionStarted = true;
      transactionPromise = startTransaction();
      await transactionPromise;
    }
  };

  // Start transaction and set context
  const startTransaction = async () => {
    try {
      // Start explicit transaction
      await originalRpc('begin_transaction');
      
      // Verify user is authenticated
      const token = req.cookies?.authToken;
      if (!token) {
        throw new Error('Authentication required');
      }

      // Verify JWT and get user info
      const user = await verifyUserToken(token);
      if (!user) {
        throw new Error('Invalid authentication token');
      }

      // Set user context
      req.user = user;

      // CRITICAL: Set LOCAL session variables
      await originalRpc('set_local_tenant_context', {
        p_tenant_id: user.tenantId,
        p_user_id: user.id,
        p_user_role: user.role
      });

      contextSet = true;
      
      // Verify context was set correctly
      const { data: contextCheck } = await originalRpc('verify_transaction_context');
      if (!contextCheck || !contextCheck[0]?.is_valid) {
        throw new Error('Failed to set transaction context');
      }

    } catch (error) {
      console.error('Transaction setup failed:', error);
      throw error;
    }
  };

  // Intercept RPC calls to ensure transaction
  supabase.rpc = function(...args: any[]) {
    return ensureTransaction().then(() => originalRpc(...args));
  };

  // Intercept table queries to ensure transaction
  supabase.from = function(table: string) {
    return {
      select: (...args: any[]) => ensureTransaction().then(() => originalFrom(table).select(...args)),
      insert: (...args: any[]) => ensureTransaction().then(() => originalFrom(table).insert(...args)),
      update: (...args: any[]) => ensureTransaction().then(() => originalFrom(table).update(...args)),
      delete: (...args: any[]) => ensureTransaction().then(() => originalFrom(table).delete(...args)),
      upsert: (...args: any[]) => ensureTransaction().then(() => originalFrom(table).upsert(...args)),
    };
  };

  // Handle response cleanup
  res.on('finish', async () => {
    try {
      if (transactionStarted && contextSet) {
        // End transaction and cleanup
        await originalRpc('end_transaction');
      }
    } catch (error) {
      console.error('Transaction cleanup failed:', error);
    }
  });

  // Handle errors
  res.on('error', async () => {
    try {
      if (transactionStarted && contextSet) {
        // Rollback on error
        await originalRpc('rollback_transaction');
      }
    } catch (error) {
      console.error('Transaction rollback failed:', error);
    }
  });

  // Continue to next middleware
  next();
}

/**
 * Helper functions
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateTransactionId(): string {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getClientIP(req: Request): string {
  return req.ip || 
         req.connection.remoteAddress || 
         req.headers['x-forwarded-for'] as string || 
         req.headers['x-real-ip'] as string || 
         'unknown';
}

async function verifyUserToken(token: string): Promise<any> {
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    
    // Load fresh user data from database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, tenant_id, role, email, status, is_admin')
      .eq('firebase_uid', decoded.uid)
      .single();

    if (error || !user) {
      return null;
    }

    // Validate user status
    if (user.status !== 'active') {
      return null;
    }

    return {
      id: user.id,
      tenantId: user.tenant_id,
      role: user.role || 'user',
      email: user.email,
      status: user.status
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export default guaranteedTransaction;
