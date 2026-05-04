/**
 * Role-Based Authorization Middleware
 *
 * Extends Firebase auth to include role checking
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { supabase } from '../lib/supabase.js';

/**
 * Get user with role from database
 */
async function getUserWithRole(firebaseUid: string): Promise<{ id: string; role: string } | null> {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, role')
    .eq('firebase_uid', firebaseUid)
    .single();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Middleware to require specific role(s)
 */
export function requireRole(allowedRoles: string | string[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // User must be authenticated (handled by requireAuth middleware)
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          reason: 'unauthorized',
          action: 'Authentication required',
        });
        return;
      }

      // Get user with role from database
      const userWithRole = await getUserWithRole((req.user as any).uid || '');

      if (!userWithRole) {
        res.status(403).json({
          status: 'error',
          reason: 'user_not_found',
          action: 'User not found in database',
        });
        return;
      }

      // Check if user has required role
      if (!roles.includes(userWithRole.role)) {
        res.status(403).json({
          status: 'error',
          reason: 'insufficient_permissions',
          action: `This action requires one of the following roles: ${roles.join(', ')}`,
          userRole: userWithRole.role,
        });
        return;
      }

      // Attach user data to request for controllers to use
      (req as any).userRole = userWithRole.role;
      (req as any).userId = userWithRole.id;

      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({
        status: 'error',
        reason: 'role_check_failed',
        action: 'Failed to verify user role',
      });
    }
  };
}

/**
 * Middleware to require trainer role
 */
export const requireTrainer = requireRole(['trainer', 'admin']);

/**
 * Middleware to require admin role
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware to require member role (any authenticated user)
 */
export const requireMember = requireRole(['member', 'trainer', 'admin']);

/**
 * Check if user has active membership
 */
export async function requireActiveMembership(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({
        status: 'error',
        reason: 'unauthorized',
        action: 'User ID not found',
      });
      return;
    }

    // Get user's membership
    const { data: membership, error } = await supabase
      .from('memberships')
      .select('status, end_date')
      .eq('user_id', userId)
      .single();

    if (error || !membership) {
      res.status(403).json({
        status: 'error',
        reason: 'no_membership',
        action: 'Active membership required',
      });
      return;
    }

    // Check if membership is active
    if (membership.status !== 'active') {
      res.status(403).json({
        status: 'error',
        reason: 'membership_expired',
        action: 'Your membership has expired. Please renew to continue.',
        endDate: membership.end_date,
      });
      return;
    }

    // Check if membership end date has passed
    const endDate = new Date(membership.end_date);
    const today = new Date();

    if (endDate < today) {
      // Update status to expired
      await supabase
        .from('memberships')
        .update({ status: 'expired' })
        .eq('user_id', userId);

      res.status(403).json({
        status: 'error',
        reason: 'membership_expired',
        action: 'Your membership has expired. Please renew to continue.',
        endDate: membership.end_date,
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Membership check error:', error);
    res.status(500).json({
      status: 'error',
      reason: 'membership_check_failed',
      action: 'Failed to verify membership status',
    });
  }
}
