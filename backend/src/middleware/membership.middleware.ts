/**
 * Membership Middleware
 * 
 * Enforces SaaS access control based on membership status
 * No payment gateway - just tracks subscription lifecycle
 */

import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase.js';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        tenantId: string;
        membership?: {
          plan: string;
          status: string;
          nextPaymentDate: string;
        };
      };
    }
  }
}

/**
 * Membership verification middleware
 * Blocks access for expired/inactive memberships
 */
export const requireActiveMembership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip if no user (auth middleware should handle this)
    if (!req.user?.id) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Get user's membership status
    const { data: membership, error } = await supabase
      .from('memberships')
      .select('plan, status, next_payment_date')
      .eq('user_id', req.user.id)
      .eq('tenant_id', req.user.tenantId)
      .single();

    if (error) {
      console.error('[MEMBERSHIP ERROR]', error);
      return res.status(500).json({
        error: 'Membership check failed',
        message: 'Unable to verify membership status'
      });
    }

    // Attach membership to request for downstream use
    req.user.membership = {
      plan: membership.plan,
      status: membership.status,
      nextPaymentDate: membership.next_payment_date
    };

    // Check if membership is active
    if (membership.status !== 'active') {
      return res.status(403).json({
        error: 'Membership inactive',
        message: `Your membership is ${membership.status}. Please contact support.`,
        membership: {
          status: membership.status,
          plan: membership.plan
        }
      });
    }

    // Check if membership has expired (next_payment_date < today)
    const today = new Date();
    const nextPaymentDate = new Date(membership.next_payment_date);

    if (nextPaymentDate < today) {
      return res.status(403).json({
        error: 'Membership expired',
        message: 'Your membership has expired. Please renew to continue.',
        membership: {
          status: 'expired',
          plan: membership.plan,
          nextPaymentDate: membership.next_payment_date
        }
      });
    }

    // Membership is valid, proceed
    next();
  } catch (err: any) {
    console.error('[MEMBERSHIP MIDDLEWARE ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Membership verification failed'
    });
  }
};

/**
 * Plan-based access control middleware
 * Restricts access based on membership plan
 */
export const requirePlan = (requiredPlan: 'basic' | 'premium' | 'pro') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.membership) {
        return res.status(401).json({
          error: 'Membership required',
          message: 'Please log in to access this feature'
        });
      }

      const userPlan = req.user.membership.plan;

      // Plan hierarchy: basic < premium < pro
      const planHierarchy = {
        'basic': 1,
        'premium': 2,
        'pro': 3
      };

      const userLevel = planHierarchy[userPlan as keyof typeof planHierarchy];
      const requiredLevel = planHierarchy[requiredPlan];

      if (userLevel < requiredLevel) {
        return res.status(403).json({
          error: 'Plan upgrade required',
          message: `This feature requires ${requiredPlan} plan or higher`,
          currentPlan: userPlan,
          requiredPlan
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
};

/**
 * Optional membership check middleware
 * Attaches membership info but doesn't block access
 */
export const attachMembershipInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      return next();
    }

    const { data: membership, error } = await supabase
      .from('memberships')
      .select('plan, status, next_payment_date')
      .eq('user_id', req.user.id)
      .eq('tenant_id', req.user.tenantId)
      .single();

    if (!error && membership) {
      req.user.membership = {
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
};
