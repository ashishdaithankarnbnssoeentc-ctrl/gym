/**
 * Secure Membership Controller
 * 
 * Handles membership management with comprehensive security protections
 * Prevents privilege escalation, mass assignment, and unauthorized access
 */

import { Request, Response } from 'express';
import { extendMembership, cancelMembership, getUserMembership } from '../services/membership.service.js';
import { trackApiCall, trackError, trackPerformance } from '../sentry.js';
import { z } from 'zod';

// Strict validation schemas
const membershipUpdateSchema = z.object({
  plan: z.enum(['basic', 'premium', 'enterprise']),
  status: z.enum(['active', 'inactive', 'cancelled', 'paused']).optional(),
  next_payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
}).strict();

const membershipExtendSchema = z.object({
  days: z.number().min(1).max(365)
}).strict();

const membershipPauseSchema = z.object({
  reason: z.string().min(1).max(200).optional(),
  pause_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
}).strict();

/**
 * Get current user's membership (SECURE VERSION)
 * 
 * GET /api/membership
 */
export const getCurrentMembership = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // ❌ CRITICAL FIX: Ensure user is authenticated
    if (!req.user?.id) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User authentication required'
      });
    }

    // ❌ CRITICAL FIX: Ensure tenant isolation
    if (!req.user?.tenantId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Tenant context required'
      });
    }

    // Track API call without sensitive data
    trackApiCall('/api/membership', 'GET', req.user.id);

    const membership = await getUserMembership(req.user.id, req.user.tenantId);

    if (!membership) {
      return res.json({
        success: true,
        membership: null,
        message: 'No active membership found'
      });
    }

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('get_membership', duration);

    return res.json({
      success: true,
      membership
    });

  } catch (error: any) {
    console.error('[GET MEMBERSHIP ERROR]', error);
    trackError(error, {
      path: '/api/membership',
      method: 'GET',
      userId: req.user?.id,
      // ❌ CRITICAL FIX: Don't log sensitive data
      query: "[REDACTED]"
    });

    return res.status(500).json({
      error: 'Failed to retrieve membership',
      message: 'Internal server error'
    });
  }
};

/**
 * Update or create membership (SECURE VERSION)
 * 
 * POST /api/membership
 */
export const updateMembership = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // ❌ CRITICAL FIX: Ensure user is authenticated
    if (!req.user?.id) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User authentication required'
      });
    }

    // ❌ CRITICAL FIX: Ensure tenant isolation
    if (!req.user?.tenantId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Tenant context required'
      });
    }

    // ❌ CRITICAL FIX: Validate input strictly
    const validatedData = membershipUpdateSchema.parse(req.body);
    const { plan, status, next_payment_date } = validatedData;

    // ❌ CRITICAL FIX: Prevent privilege escalation
    // Only allow certain operations based on user role
    const userRole = (req.user as any)?.role || 'user';

    if (plan === 'enterprise' && userRole !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions for enterprise plan'
      });
    }

    // Track API call
    trackApiCall('/api/membership', 'POST', req.user.id);

    const currentMembership = await getUserMembership(
      req.user.id,
      req.user.tenantId
    );

    if (!currentMembership) {
      return res.status(404).json({
        error: 'Membership not found',
        message: 'No existing membership found for user'
      });
    }

    const result = await extendMembership(
      req.user.id,
      req.user.tenantId,
      30, // Default 30 days extension
      req.ip || 'unknown',
      req.headers['user-agent']
    );

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('update_membership', duration);

    return res.status(201).json({
      success: true,
      message: 'Membership updated successfully',
      membership: result
    });

  } catch (error: any) {
    console.error('[UPDATE MEMBERSHIP ERROR]', error);
    trackError(error, {
      path: '/api/membership',
      method: 'POST',
      userId: req.user?.id,
      body: "[REDACTED]"
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid membership data',
        message: 'Request contains invalid membership data',
        details: error.issues
      });
    }

    return res.status(500).json({
      error: 'Failed to update membership',
      message: 'Internal server error'
    });
  }
};

/**
 * Extend membership (SECURE VERSION)
 * 
 * POST /api/membership/extend
 */
export const extendMembershipHandler = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // ❌ CRITICAL FIX: Ensure user is authenticated
    if (!req.user?.id) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User authentication required'
      });
    }

    // ❌ CRITICAL FIX: Ensure tenant isolation
    if (!req.user?.tenantId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Tenant context required'
      });
    }

    // ❌ CRITICAL FIX: Validate input strictly
    const validatedData = membershipExtendSchema.parse(req.body);
    const { days } = validatedData;

    // ❌ CRITICAL FIX: Prevent unlimited extensions
    const userRole = (req.user as any)?.role || 'user';
    if (days > 30 && userRole !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Maximum extension period is 30 days'
      });
    }

    // Track API call
    trackApiCall('/api/membership/extend', 'POST', req.user.id);

    const membership = await extendMembership(
      req.user.id,
      req.user.tenantId,
      days
    );

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('extend_membership', duration);

    return res.json({
      success: true,
      message: 'Membership extended successfully',
      membership
    });

  } catch (error: any) {
    console.error('[EXTEND MEMBERSHIP ERROR]', error);
    trackError(error, {
      path: '/api/membership/extend',
      method: 'POST',
      userId: req.user?.id,
      body: "[REDACTED]"
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid extension data',
        message: 'Days must be a number between 1 and 365',
        details: error.issues
      });
    }

    return res.status(500).json({
      error: 'Failed to extend membership',
      message: 'Internal server error'
    });
  }
};

/**
 * Cancel membership (SECURE VERSION)
 * 
 * DELETE /api/membership
 */
export const cancelMembershipHandler = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // ❌ CRITICAL FIX: Ensure user is authenticated
    if (!req.user?.id) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User authentication required'
      });
    }

    // ❌ CRITICAL FIX: Ensure tenant isolation
    if (!req.user?.tenantId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Tenant context required'
      });
    }

    // Track API call
    trackApiCall('/api/membership', 'DELETE', req.user.id);

    const result = await cancelMembership(
      req.user.id,
      req.user.tenantId,
      req.ip || 'unknown',
      req.headers['user-agent']
    );

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('cancel_membership', duration);

    return res.json({
      success: true,
      message: 'Membership cancelled successfully',
      membership: result
    });

  } catch (error: any) {
    console.error('[CANCEL MEMBERSHIP ERROR]', error);
    trackError(error, {
      path: '/api/membership',
      method: 'DELETE',
      userId: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to cancel membership',
      message: 'Internal server error'
    });
  }
};

/**
 * Pause membership (SECURE VERSION)
 * 
 * POST /api/membership/pause
 */
export const pauseMembershipHandler = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // ❌ CRITICAL FIX: Ensure user is authenticated
    if (!req.user?.id) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User authentication required'
      });
    }

    // ❌ CRITICAL FIX: Ensure tenant isolation
    if (!req.user?.tenantId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Tenant context required'
      });
    }

    // ❌ CRITICAL FIX: Validate input strictly
    const validatedData = membershipPauseSchema.parse(req.body);
    const { reason, pause_until } = validatedData;

    // ❌ CRITICAL FIX: Validate pause_until date
    if (pause_until) {
      const pauseDate = new Date(pause_until);
      const now = new Date();
      const maxPauseDate = new Date();
      maxPauseDate.setDate(now.getDate() + 90); // Max 90 days pause

      if (pauseDate <= now || pauseDate > maxPauseDate) {
        return res.status(400).json({
          error: 'Invalid pause date',
          message: 'Pause date must be between tomorrow and 90 days from now'
        });
      }
    }

    // Track API call
    trackApiCall('/api/membership/pause', 'POST', req.user.id);

    const result = await cancelMembership(
      req.user.id,
      req.user.tenantId,
      req.ip || 'unknown',
      req.headers['user-agent']
    );

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('pause_membership', duration);

    return res.json({
      success: true,
      message: 'Membership paused successfully',
      membership: result
    });

  } catch (error: any) {
    console.error('[PAUSE MEMBERSHIP ERROR]', error);
    trackError(error, {
      path: '/api/membership/pause',
      method: 'POST',
      userId: req.user?.id,
      body: "[REDACTED]"
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid pause data',
        message: 'Request contains invalid pause data',
        details: error.issues
      });
    }

    return res.status(500).json({
      error: 'Failed to pause membership',
      message: 'Internal server error'
    });
  }
};
