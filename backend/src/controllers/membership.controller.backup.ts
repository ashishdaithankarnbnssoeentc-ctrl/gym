/**
 * Membership Controller
 * 
 * Handles membership management endpoints
 * No payment processing - just tracking and status
 */

import { Request, Response } from 'express';
import {
  getUserMembership,
  upsertMembership,
  extendMembership,
  cancelMembership,
  pauseMembership
} from '../services/membership.service.js';
import { trackApiCall, trackError, trackPerformance } from '../sentry.js';

/**
 * Get current user's membership
 * 
 * GET /api/membership
 */
export const getCurrentMembership = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    if (!req.user?.id) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Track API call
    trackApiCall('/api/membership', 'GET', req.user.id);

    const membership = await getUserMembership(req.user.id, req.user.tenantId);

    if (!membership) {
      return res.json({
        membership: null,
        message: 'No active membership found'
      });
    }

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('get_membership', duration);

    return res.json({
      membership: {
        id: membership.id,
        plan: membership.plan,
        status: membership.status,
        startDate: membership.startDate,
        nextPaymentDate: membership.nextPaymentDate,
        daysUntilPayment: Math.ceil((new Date(membership.nextPaymentDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      }
    });
  } catch (err: any) {
    console.error('[GET MEMBERSHIP ERROR]', err.message);

    // Track error in Sentry
    trackError(err, {
      endpoint: '/api/membership',
      method: 'GET',
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to fetch membership',
      message: err.message
    });
  }
};

/**
 * Create or update membership
 * 
 * POST /api/membership
 * Body: { plan: 'basic' | 'premium' | 'pro', startDate?: string }
 */
export const createOrUpdateMembership = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    if (!req.user?.id) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const { plan, startDate } = req.body;

    if (!plan || !['basic', 'premium', 'pro'].includes(plan)) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Valid plan is required: basic, premium, or pro'
      });
    }

    // Track API call
    trackApiCall('/api/membership', 'POST', req.user.id);

    const membership = await upsertMembership(
      req.user.id,
      req.user.tenantId,
      plan,
      startDate
    );

    if (!membership) {
      return res.status(500).json({
        error: 'Failed to create membership',
        message: 'Unable to process membership request'
      });
    }

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('create_membership', duration);

    return res.json({
      message: 'Membership created/updated successfully',
      membership: {
        id: membership.id,
        plan: membership.plan,
        status: membership.status,
        startDate: membership.startDate,
        nextPaymentDate: membership.nextPaymentDate
      }
    });
  } catch (err: any) {
    console.error('[CREATE MEMBERSHIP ERROR]', err.message);

    // Track error in Sentry
    trackError(err, {
      endpoint: '/api/membership',
      method: 'POST',
      body: req.body,
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to create membership',
      message: err.message
    });
  }
};

/**
 * Extend membership (manual payment received)
 * 
 * POST /api/membership/:id/extend
 * Body: { days?: number }
 */
export const extendUserMembership = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    if (!req.user?.id) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const { id } = req.params;
    const { days = 30 } = req.body;

    if (!id) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Membership ID is required'
      });
    }

    // Track API call
    trackApiCall(`/api/membership/${id}/extend`, 'POST', req.user.id);

    const membership = await extendMembership(id as string, days);

    if (!membership) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Membership not found'
      });
    }

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('extend_membership', duration);

    return res.json({
      message: `Membership extended by ${days} days`,
      membership: {
        id: membership.id,
        plan: membership.plan,
        status: membership.status,
        nextPaymentDate: membership.nextPaymentDate
      }
    });
  } catch (err: any) {
    console.error('[EXTEND MEMBERSHIP ERROR]', err.message);

    // Track error in Sentry
    trackError(err, {
      endpoint: `/api/membership/${req.params.id}/extend`,
      method: 'POST',
      body: req.body,
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to extend membership',
      message: err.message
    });
  }
};

/**
 * Cancel membership
 * 
 * DELETE /api/membership/:id
 */
export const cancelUserMembership = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    if (!req.user?.id) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Membership ID is required'
      });
    }

    // Track API call
    trackApiCall(`/api/membership/${id}`, 'DELETE', req.user.id);

    const success = await cancelMembership(id as string);

    if (!success) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Membership not found'
      });
    }

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('cancel_membership', duration);

    return res.json({
      message: 'Membership cancelled successfully'
    });
  } catch (err: any) {
    console.error('[CANCEL MEMBERSHIP ERROR]', err.message);

    // Track error in Sentry
    trackError(err, {
      endpoint: `/api/membership/${req.params.id}`,
      method: 'DELETE',
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to cancel membership',
      message: err.message
    });
  }
};

/**
 * Pause membership
 * 
 * PATCH /api/membership/:id/pause
 */
export const pauseUserMembership = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    if (!req.user?.id) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Membership ID is required'
      });
    }

    // Track API call
    trackApiCall(`/api/membership/${id}/pause`, 'PATCH', req.user.id);

    const success = await pauseMembership(id as string);

    if (!success) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Membership not found'
      });
    }

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('pause_membership', duration);

    return res.json({
      message: 'Membership paused successfully'
    });
  } catch (err: any) {
    console.error('[PAUSE MEMBERSHIP ERROR]', err.message);

    // Track error in Sentry
    trackError(err, {
      endpoint: `/api/membership/${req.params.id}/pause`,
      method: 'PATCH',
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to pause membership',
      message: err.message
    });
  }
};
