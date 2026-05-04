/**
 * Admin Actions Routes
 * 
 * Quick actions for instant admin control
 * Turns data into immediate action
 */

import express from 'express';
import { requireTenantAdmin } from '../middleware/admin.middleware.js';
import { supabase } from '../lib/supabase.js';
import { trackApiCall, trackError, trackPerformance } from '../sentry.js';
import { CachedMembershipService } from '../services/membership.cache.service.js';

const router = express.Router();

/**
 * Execute quick action on membership
 * 
 * POST /api/admin/membership/:id/action
 * Body: { action: string, metadata?: any }
 */
router.post('/membership/:id/action', requireTenantAdmin, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const { action, metadata } = req.body;

    if (!id) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Membership ID required'
      });
    }

    if (!action) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Action required'
      });
    }

    if (!req.user?.tenantId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Tenant ID required'
      });
    }

    // Track API call
    trackApiCall(`/api/admin/membership/${id}/action`, 'POST', req.user.id);

    // Verify membership belongs to tenant
    const { data: membership, error: fetchError } = await supabase
      .from('memberships')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', req.user.tenantId)
      .single();

    if (fetchError || !membership) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Membership not found'
      });
    }

    let result;
    let auditAction;

    // Execute action
    switch (action) {
      case 'extend_30':
        result = await extendMembership(id as string, 30);
        auditAction = 'membership_extended_30_days';
        break;

      case 'extend_90':
        result = await extendMembership(id as string, 90);
        auditAction = 'membership_extended_90_days';
        break;

      case 'mark_paid':
        result = await markAsPaid(id as string);
        auditAction = 'membership_marked_paid';
        break;

      case 'pause':
        result = await pauseMembership(id as string);
        auditAction = 'membership_paused';
        break;

      case 'reactivate':
        result = await reactivateMembership(id as string);
        auditAction = 'membership_reactivated';
        break;

      case 'cancel':
        result = await cancelMembership(id as string);
        auditAction = 'membership_cancelled';
        break;

      default:
        return res.status(400).json({
          error: 'Bad request',
          message: `Unknown action: ${action}`
        });
    }

    if (!result.success) {
      return res.status(500).json({
        error: 'Action failed',
        message: result.error || 'Failed to execute action'
      });
    }

    // Log audit action
    await logAuditAction(req.user.id, req.user.tenantId, auditAction, {
      membershipId: id,
      action,
      metadata,
      previousState: membership,
      newState: result.data
    });

    // Invalidate cache for user
    CachedMembershipService.invalidateUser(membership.user_id);

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('admin_membership_action', duration);

    return res.json({
      message: `Action ${action} executed successfully`,
      action,
      result: result.data,
      membershipId: id
    });
  } catch (err: any) {
    console.error('[ADMIN ACTION ERROR]', err.message);

    // Track error in Sentry
    trackError(err, {
      endpoint: `/api/admin/membership/${req.params.id}/action`,
      method: 'POST',
      body: req.body,
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to execute action',
      message: err.message
    });
  }
});

/**
 * Bulk actions on multiple memberships
 * 
 * POST /api/admin/memberships/bulk-action
 * Body: { membershipIds: string[], action: string, metadata?: any }
 */
router.post('/memberships/bulk-action', requireTenantAdmin, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();

  try {
    const { membershipIds, action, metadata } = req.body;

    if (!membershipIds || !Array.isArray(membershipIds)) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Membership IDs array required'
      });
    }

    if (!action) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Action required'
      });
    }

    if (!req.user?.tenantId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Tenant ID required'
      });
    }

    // Track API call
    trackApiCall('/api/admin/memberships/bulk-action', 'POST', req.user.id);

    // Verify all memberships belong to tenant
    const { data: memberships, error: fetchError } = await supabase
      .from('memberships')
      .select('*')
      .eq('tenant_id', req.user.tenantId)
      .in('id', membershipIds);

    if (fetchError) {
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to verify memberships'
      });
    }

    if (!memberships || memberships.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'No valid memberships found'
      });
    }

    // Execute bulk action
    const results = [];
    const errors = [];

    for (const membership of memberships) {
      try {
        let result;
        let auditAction;

        switch (action) {
          case 'extend_30':
            result = await extendMembership(membership.id, 30);
            auditAction = 'bulk_membership_extended_30_days';
            break;

          case 'mark_paid':
            result = await markAsPaid(membership.id);
            auditAction = 'bulk_membership_marked_paid';
            break;

          case 'pause':
            result = await pauseMembership(membership.id);
            auditAction = 'bulk_membership_paused';
            break;

          default:
            errors.push({
              membershipId: membership.id,
              error: `Unknown action: ${action}`
            });
            continue;
        }

        if (result.success) {
          results.push({
            membershipId: membership.id,
            success: true,
            data: result.data
          });

          // Log audit action
          await logAuditAction(req.user.id, req.user.tenantId, auditAction, {
            membershipId: membership.id,
            action,
            metadata,
            previousState: membership,
            newState: result.data
          });

          // Invalidate cache
          CachedMembershipService.invalidateUser(membership.user_id);
        } else {
          errors.push({
            membershipId: membership.id,
            error: result.error
          });
        }
      } catch (err: any) {
        errors.push({
          membershipId: membership.id,
          error: err.message
        });
      }
    }

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('admin_bulk_action', duration);

    return res.json({
      message: `Bulk action ${action} completed`,
      action,
      results: {
        successful: results.length,
        failed: errors.length,
        total: membershipIds.length
      },
      success: results,
      errors
    });
  } catch (err: any) {
    console.error('[ADMIN BULK ACTION ERROR]', err.message);

    // Track error in Sentry
    trackError(err, {
      endpoint: '/api/admin/memberships/bulk-action',
      method: 'POST',
      body: req.body,
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to execute bulk action',
      message: err.message
    });
  }
});

/**
 * Get available actions for membership
 * 
 * GET /api/admin/membership/:id/available-actions
 */
router.get('/membership/:id/available-actions', requireTenantAdmin, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Membership ID required'
      });
    }

    if (!req.user?.tenantId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Tenant ID required'
      });
    }

    // Get membership details
    const { data: membership, error } = await supabase
      .from('memberships')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', req.user.tenantId)
      .single();

    if (error || !membership) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Membership not found'
      });
    }

    // Calculate available actions based on status
    const availableActions = [];

    switch (membership.status) {
      case 'active':
        availableActions.push(
          { action: 'extend_30', label: 'Extend 30 days', type: 'extension' },
          { action: 'extend_90', label: 'Extend 90 days', type: 'extension' },
          { action: 'pause', label: 'Pause', type: 'pause' },
          { action: 'cancel', label: 'Cancel', type: 'cancellation' }
        );
        break;

      case 'expired':
        availableActions.push(
          { action: 'reactivate', label: 'Reactivate', type: 'reactivation' },
          { action: 'extend_30', label: 'Extend 30 days', type: 'extension' },
          { action: 'cancel', label: 'Cancel', type: 'cancellation' }
        );
        break;

      case 'paused':
        availableActions.push(
          { action: 'reactivate', label: 'Reactivate', type: 'reactivation' },
          { action: 'cancel', label: 'Cancel', type: 'cancellation' }
        );
        break;

      case 'cancelled':
        availableActions.push(
          { action: 'reactivate', label: 'Reactivate', type: 'reactivation' }
        );
        break;
    }

    return res.json({
      membershipId: id,
      currentStatus: membership.status,
      availableActions
    });
  } catch (err: any) {
    console.error('[AVAILABLE ACTIONS ERROR]', err.message);

    return res.status(500).json({
      error: 'Failed to get available actions',
      message: err.message
    });
  }
});

// Action helper functions
async function extendMembership(membershipId: string, days: number) {
  try {
    const { data, error } = await supabase
      .from('memberships')
      .update({
        status: 'active',
        next_payment_date: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', membershipId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function markAsPaid(membershipId: string) {
  try {
    const { data, error } = await supabase
      .from('memberships')
      .update({
        status: 'active',
        next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', membershipId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function pauseMembership(membershipId: string) {
  try {
    const { data, error } = await supabase
      .from('memberships')
      .update({
        status: 'paused',
        updated_at: new Date().toISOString()
      })
      .eq('id', membershipId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function reactivateMembership(membershipId: string) {
  try {
    const { data, error } = await supabase
      .from('memberships')
      .update({
        status: 'active',
        next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', membershipId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function cancelMembership(membershipId: string) {
  try {
    const { data, error } = await supabase
      .from('memberships')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', membershipId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function logAuditAction(userId: string, tenantId: string, action: string, metadata: any) {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        action,
        metadata,
        created_at: new Date().toISOString()
      });
  } catch (err) {
    console.error('[AUDIT LOG ERROR]', err);
    // Don't fail the action if audit logging fails
  }
}

export default router;
