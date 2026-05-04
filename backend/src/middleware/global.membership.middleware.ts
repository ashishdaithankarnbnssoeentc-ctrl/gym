/**
 * Global Membership Middleware
 * 
 * Enforces active membership requirement across all API endpoints
 * No active membership = no access
 */

import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase.js';
import { membershipCache } from '../services/membership.cache.service.js';

// Extend Request interface to include membership
declare global {
  namespace Express {
    interface Request {
      membership?: {
        id: string;
        plan: string;
        status: string;
        nextPaymentDate: string;
      };
    }
  }
}

/**
 * Global active membership requirement
 * Blocks all API access for inactive/expired memberships
 */
export async function requireActiveMembership(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip if no user (auth middleware should handle this)
    if (!req.user?.id) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Check cache first
    let membership = membershipCache.get(req.user.id, req.user.tenantId);

    if (!membership) {
      // Cache miss - fetch from database
      const { data: dbMembership, error } = await supabase
        .from('memberships')
        .select('id, plan, status, next_payment_date')
        .eq('user_id', req.user.id)
        .eq('tenant_id', req.user.tenantId)
        .eq('status', 'active')
        .single();

      if (error) {
        // Handle "not found" error specifically
        if (error.code === 'PGRST116') {
          return res.status(403).json({
            error: 'Membership required',
            message: 'No active membership found. Please subscribe to continue.',
            action: 'subscribe'
          });
        }
        throw error;
      }

      // Transform DB result to cache format
      membership = {
        id: dbMembership.id,
        userId: req.user.id,
        tenantId: req.user.tenantId,
        plan: dbMembership.plan,
        status: dbMembership.status,
        nextPaymentDate: dbMembership.next_payment_date,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Cache the result for 60 seconds
      membershipCache.set(req.user.id, req.user.tenantId, membership, 60000);
    }

    // Check if membership has expired (next_payment_date < today)
    const today = new Date();
    const nextPaymentDate = new Date(membership.nextPaymentDate);

    if (nextPaymentDate < today) {
      return res.status(403).json({
        error: 'Membership expired',
        message: 'Your membership has expired. Please renew to continue.',
        membership: {
          status: 'expired',
          plan: membership.plan,
          nextPaymentDate: membership.nextPaymentDate
        },
        action: 'renew'
      });
    }

    // Attach membership to request for downstream use
    req.membership = {
      id: membership.id,
      plan: membership.plan,
      status: membership.status,
      nextPaymentDate: membership.nextPaymentDate
    };

    // Membership is valid, proceed
    next();
  } catch (err: any) {
    console.error('[GLOBAL MEMBERSHIP MIDDLEWARE ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Membership verification failed'
    });
  }
}

/**
 * Plan-based access control
 * Restricts access based on membership plan level
 */
export function requirePlan(requiredPlan: 'basic' | 'premium' | 'pro') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.membership) {
        return res.status(403).json({
          error: 'Membership required',
          message: 'Active membership required to access this feature'
        });
      }

      const userPlan = req.membership.plan;

      // Plan hierarchy: basic < premium < pro
      const planHierarchy: { [key: string]: number } = {
        'basic': 1,
        'premium': 2,
        'pro': 3
      };

      const userLevel = planHierarchy[userPlan];
      const requiredLevel = planHierarchy[requiredPlan];

      if (userLevel < requiredLevel) {
        return res.status(403).json({
          error: 'Plan upgrade required',
          message: `This feature requires ${requiredPlan} plan or higher`,
          currentPlan: userPlan,
          requiredPlan,
          action: 'upgrade'
        });
      }

      next();
    } catch (err: any) {
      console.error('[PLAN MIDDLEWARE ERROR]', err);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Plan verification failed'
      });
    }
  };
}

/**
 * Optional membership check
 * Attaches membership info but doesn't block access
 * Useful for endpoints that work with or without membership
 */
export async function attachMembershipInfo(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      return next();
    }

    const { data: membership, error } = await supabase
      .from('memberships')
      .select('id, plan, status, next_payment_date')
      .eq('user_id', req.user.id)
      .eq('tenant_id', req.user.tenantId)
      .single();

    if (!error && membership) {
      req.membership = {
        id: membership.id,
        plan: membership.plan,
        status: membership.status,
        nextPaymentDate: membership.next_payment_date
      };
    }

    next();
  } catch (err: any) {
    // Don't block request, just log error
    console.error('[ATTACH MEMBERSHIP ERROR]', err);
    next();
  }
}

/**
 * Admin bypass middleware
 * Allows admins to bypass membership requirements
 */
export function requireMembershipOrAdmin(req: Request, res: Response, next: NextFunction) {
  // Check if user is admin
  if ((req.user as any)?.role === 'admin') {
    return next();
  }

  // Otherwise, require active membership
  return requireActiveMembership(req, res, next);
}
