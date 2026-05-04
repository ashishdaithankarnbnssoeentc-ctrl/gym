/**
 * Admin Routes
 * 
 * Management endpoints for tenant administration
 * No fancy UI - just clean control APIs
 */

import express from 'express';
import { requireAdmin, requireTenantAdmin } from '../middleware/admin.middleware.js';
import { supabase } from '../lib/supabase.js';
import { trackApiCall, trackError, trackPerformance } from '../sentry.js';

const router = express.Router();

// Apply admin role validation to all admin routes
router.use(requireAdmin);

/**
 * Get all users in tenant
 * 
 * GET /api/admin/users
 */
router.get('/users', requireTenantAdmin, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();

  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Tenant ID required'
      });
    }

    // Track API call
    trackApiCall('/api/admin/users', 'GET', req.user.id);

    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('tenant_id', req.user.tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('admin_get_users', duration);

    return res.json({
      users: users || [],
      count: users?.length || 0
    });
  } catch (err: any) {
    console.error('[ADMIN GET USERS ERROR]', err.message);

    // Track error in Sentry
    trackError(err, {
      endpoint: '/api/admin/users',
      method: 'GET',
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to fetch users',
      message: err.message
    });
  }
});

/**
 * Get all memberships in tenant
 * 
 * GET /api/admin/memberships
 */
router.get('/memberships', requireTenantAdmin, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();

  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Tenant ID required'
      });
    }

    // Track API call
    trackApiCall('/api/admin/memberships', 'GET', req.user.id);

    const { data: memberships, error } = await supabase
      .from('memberships')
      .select(`
        *,
        users (
          email,
          display_name
        )
      `)
      .eq('tenant_id', req.user.tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('admin_get_memberships', duration);

    return res.json({
      memberships: memberships || [],
      count: memberships?.length || 0
    });
  } catch (err: any) {
    console.error('[ADMIN GET MEMBERSHIPS ERROR]', err.message);

    // Track error in Sentry
    trackError(err, {
      endpoint: '/api/admin/memberships',
      method: 'GET',
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to fetch memberships',
      message: err.message
    });
  }
});

/**
 * Extend user membership
 * 
 * POST /api/admin/membership/:id/extend
 * Body: { days: number }
 */
router.post('/membership/:id/extend', requireTenantAdmin, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const { days = 30 } = req.body;

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

    // Track API call
    trackApiCall(`/api/admin/membership/${id}/extend`, 'POST', req.user.id);

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

    // Calculate new payment date
    const currentNextDate = new Date(membership.next_payment_date);
    const newNextDate = new Date(currentNextDate.getTime() + days * 24 * 60 * 60 * 1000);

    // Update membership
    const { data, error } = await supabase
      .from('memberships')
      .update({
        next_payment_date: newNextDate.toISOString().split('T')[0],
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('admin_extend_membership', duration);

    return res.json({
      message: `Membership extended by ${days} days`,
      membership: {
        id: data.id,
        plan: data.plan,
        status: data.status,
        nextPaymentDate: data.next_payment_date
      }
    });
  } catch (err: any) {
    console.error('[ADMIN EXTEND MEMBERSHIP ERROR]', err.message);

    // Track error in Sentry
    trackError(err, {
      endpoint: `/api/admin/membership/${req.params.id}/extend`,
      method: 'POST',
      body: req.body,
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to extend membership',
      message: err.message
    });
  }
});

/**
 * Cancel user membership
 * 
 * DELETE /api/admin/membership/:id
 */
router.delete('/membership/:id', requireTenantAdmin, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();

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

    // Track API call
    trackApiCall(`/api/admin/membership/${id}`, 'DELETE', req.user.id);

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

    // Cancel membership
    const { error } = await supabase
      .from('memberships')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('admin_cancel_membership', duration);

    return res.json({
      message: 'Membership cancelled successfully'
    });
  } catch (err: any) {
    console.error('[ADMIN CANCEL MEMBERSHIP ERROR]', err.message);

    // Track error in Sentry
    trackError(err, {
      endpoint: `/api/admin/membership/${req.params.id}`,
      method: 'DELETE',
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to cancel membership',
      message: err.message
    });
  }
});

/**
 * Get tenant statistics
 * 
 * GET /api/admin/stats
 */
router.get('/stats', requireTenantAdmin, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();

  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Tenant ID required'
      });
    }

    // Track API call
    trackApiCall('/api/admin/stats', 'GET', req.user.id);

    // Get user count
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', req.user.tenantId);

    // Get membership stats
    const { data: memberships, error: membershipsError } = await supabase
      .from('memberships')
      .select('plan, status')
      .eq('tenant_id', req.user.tenantId);

    // Get content stats
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select('id')
      .eq('tenant_id', req.user.tenantId);

    if (usersError || membershipsError || contentError) {
      throw new Error('Failed to fetch statistics');
    }

    // Calculate stats
    const membershipStats = (memberships || []).reduce((acc: any, m: any) => {
      if (!acc[m.plan]) acc[m.plan] = { active: 0, expired: 0, cancelled: 0 };
      acc[m.plan][m.status] = (acc[m.plan][m.status] || 0) + 1;
      return acc;
    }, {});

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('admin_get_stats', duration);

    return res.json({
      stats: {
        totalUsers: users?.length || 0,
        totalMemberships: memberships?.length || 0,
        totalContent: content?.length || 0,
        membershipBreakdown: membershipStats
      }
    });
  } catch (err: any) {
    console.error('[ADMIN GET STATS ERROR]', err.message);

    // Track error in Sentry
    trackError(err, {
      endpoint: '/api/admin/stats',
      method: 'GET',
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to fetch statistics',
      message: err.message
    });
  }
});

export default router;
