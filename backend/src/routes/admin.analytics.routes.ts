/**
 * Admin Analytics Routes
 * 
 * Provides decision-making power for administrators
 * Shows membership trends, expiring users, and retention metrics
 */

import express from 'express';
import { requireTenantAdmin } from '../middleware/admin.middleware.js';
import { supabase } from '../lib/supabase.js';
import { trackApiCall, trackError, trackPerformance } from '../sentry.js';

const router = express.Router();

/**
 * Get membership analytics
 * 
 * GET /api/admin/analytics/memberships
 * Query: ?period=30 (optional, default 30 days)
 */
router.get('/analytics/memberships', requireTenantAdmin, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();

  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Tenant ID required'
      });
    }

    const period = parseInt(req.query.period as string) || 30;
    const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();

    // Track API call
    trackApiCall('/api/admin/analytics/memberships', 'GET', req.user.id);

    // Get total memberships
    const { data: total } = await supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', req.user.tenantId);

    // Get active memberships
    const { data: active } = await supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', req.user.tenantId)
      .eq('status', 'active');

    // Get expiring memberships (next 30 days)
    const { data: expiring } = await supabase
      .from('membership_reminders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', req.user.tenantId)
      .lte('next_payment_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());

    // Get expired memberships (last 30 days)
    const { data: expired } = await supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', req.user.tenantId)
      .eq('status', 'expired')
      .gte('updated_at', startDate);

    // Get plan breakdown
    const { data: planBreakdown } = await supabase
      .from('memberships')
      .select('plan, status, count')
      .eq('tenant_id', req.user.tenantId)
      .gte('updated_at', startDate);

    // Calculate plan statistics
    const planStats = (planBreakdown || []).reduce((acc: any, m: any) => {
      if (!acc[m.plan]) acc[m.plan] = { active: 0, expired: 0, cancelled: 0 };
      acc[m.plan][m.status] = (acc[m.plan][m.status] || 0) + 1;
      return acc;
    }, {});

    // Calculate churn rate
    const totalExpired = expired?.length || 0;
    const totalActive = active?.length || 0;
    const totalMemberships = total?.length || 0;
    const churnRate = totalMemberships > 0 ? (totalExpired / totalMemberships) * 100 : 0;

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('admin_get_membership_analytics', duration);

    return res.json({
      analytics: {
        period,
        generated_at: new Date().toISOString(),
        summary: {
          totalMemberships: total?.length || 0,
          activeMemberships: active?.length || 0,
          expiringMemberships: expiring?.length || 0,
          expiredMemberships: totalExpired,
          churnRate: Math.round(churnRate * 100) / 100
        },
        planBreakdown: planStats,
        trends: {
          totalActive,
          totalExpiring: expiring?.length || 0,
          totalExpired,
          retentionRate: totalMemberships > 0 ? ((totalActive / totalMemberships) * 100) : 0
        }
      }
    });
  } catch (err: any) {
    console.error('[ADMIN GET MEMBERSHIP ANALYTICS ERROR]', err.message);

    // Track error in Sentry
    trackError(err, {
      endpoint: '/api/admin/analytics/memberships',
      method: 'GET',
      query: req.query,
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to fetch membership analytics',
      message: err.message
    });
  }
});

/**
 * Get revenue analytics (membership-based)
 * 
 * GET /api/admin/analytics/revenue
 * Query: ?period=30 (optional, default 30 days)
 */
router.get('/analytics/revenue', requireTenantAdmin, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();

  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Tenant ID required'
      });
    }

    const period = parseInt(req.query.period as string) || 30;
    const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();

    // Track API call
    trackApiCall('/api/admin/analytics/revenue', 'GET', req.user.id);

    // Get membership extensions (proxy for revenue)
    const { data: extensions } = await supabase
      .from('memberships')
      .select('plan, updated_at, next_payment_date')
      .eq('tenant_id', req.user.tenantId)
      .gte('updated_at', startDate)
      .eq('status', 'active');

    // Calculate plan pricing (example rates)
    const planRates = {
      basic: 10,    // $10/month
      premium: 29,  // $29/month
      pro: 49       // $49/month
    };

    // Calculate monthly recurring revenue (MRR)
    const { data: activeMemberships } = await supabase
      .from('memberships')
      .select('plan')
      .eq('tenant_id', req.user.tenantId)
      .eq('status', 'active');

    const mrr = (activeMemberships || []).reduce((total: number, m: any) => {
      return total + (planRates[m.plan as keyof typeof planRates] || 0);
    }, 0);

    // Calculate extensions in period
    const extensionsInPeriod = (extensions || []).filter((m: any) => {
      const updatedDate = new Date(m.updated_at);
      return updatedDate >= new Date(startDate);
    });

    const extensionRevenue = extensionsInPeriod.reduce((total: number, m: any) => {
      return total + (planRates[m.plan as keyof typeof planRates] || 0);
    }, 0);

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('admin_get_revenue_analytics', duration);

    return res.json({
      analytics: {
        period,
        generated_at: new Date().toISOString(),
        revenue: {
          mrr,
          extensionsInPeriod: extensionsInPeriod.length,
          extensionRevenue,
          totalRevenue: mrr + extensionRevenue
        },
        planBreakdown: {
          basic: (activeMemberships || []).filter(m => m.plan === 'basic').length,
          premium: (activeMemberships || []).filter(m => m.plan === 'premium').length,
          pro: (activeMemberships || []).filter(m => m.plan === 'pro').length
        },
        planRates
      }
    });
  } catch (err: any) {
    console.error('[ADMIN GET REVENUE ANALYTICS ERROR]', err.message);

    // Track error in Sentry
    trackError(err, {
      endpoint: '/api/admin/analytics/revenue',
      method: 'GET',
      query: req.query,
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to fetch revenue analytics',
      message: err.message
    });
  }
});

/**
 * Get user activity analytics
 * 
 * GET /api/admin/analytics/users
 * Query: ?period=30 (optional, default 30 days)
 */
router.get('/analytics/users', requireTenantAdmin, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();

  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Tenant ID required'
      });
    }

    const period = parseInt(req.query.period as string) || 30;
    const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();

    // Track API call
    trackApiCall('/api/admin/analytics/users', 'GET', req.user.id);

    // Get new users in period
    const { data: newUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', req.user.tenantId)
      .gte('created_at', startDate);

    // Get total users
    const { data: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', req.user.tenantId);

    // Get active users (with active memberships)
    const { data: activeUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', req.user.tenantId)
      .in('id', [
        `SELECT user_id FROM memberships
        WHERE tenant_id = '${req.user.tenantId}'
        AND status = 'active'`
      ]);

    // Get user growth rate
    const totalUserCount = totalUsers?.length || 0;
    const newUserCount = newUsers?.length || 0;
    const growthRate = totalUserCount > 0 ? (newUserCount / totalUserCount) * 100 : 0;

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('admin_get_user_analytics', duration);

    return res.json({
      analytics: {
        period,
        generated_at: new Date().toISOString(),
        users: {
          totalUsers: totalUserCount,
          newUsers: newUserCount,
          activeUsers: activeUsers?.length || 0,
          growthRate: Math.round(growthRate * 100) / 100,
          activationRate: totalUserCount > 0 ? ((activeUsers?.length || 0) / totalUserCount) * 100 : 0
        }
      }
    });
  } catch (err: any) {
    console.error('[ADMIN GET USER ANALYTICS ERROR]', err.message);

    // Track error in Sentry
    trackError(err, {
      endpoint: '/api/admin/analytics/users',
      method: 'GET',
      query: req.query,
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to fetch user analytics',
      message: err.message
    });
  }
});

/**
 * Get retention analytics
 * 
 * GET /api/admin/analytics/retention
 * Query: ?period=90 (optional, default 90 days)
 */
router.get('/analytics/retention', requireTenantAdmin, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();

  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Tenant ID required'
      });
    }

    const period = parseInt(req.query.period as string) || 90;
    const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();

    // Track API call
    trackApiCall('/api/admin/analytics/retention', 'GET', req.user.id);

    // Get membership changes in period
    const { data: membershipChanges } = await supabase
      .from('memberships')
      .select('plan, status, updated_at, created_at')
      .eq('tenant_id', req.user.tenantId)
      .gte('updated_at', startDate)
      .order('updated_at', { ascending: true });

    // Calculate retention metrics
    const changes = membershipChanges || [];
    const activations = changes.filter(m => m.status === 'active');
    const deactivations = changes.filter(m => m.status === 'expired' || m.status === 'cancelled');

    // Calculate cohort retention (simplified)
    const { data: cohortData } = await supabase
      .from('memberships')
      .select('created_at, status')
      .eq('tenant_id', req.user.tenantId)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    // Group by week
    const weeklyCohorts = (cohortData || []).reduce((acc: any, m: any) => {
      const week = new Date(m.created_at).toISOString().split('T')[0].slice(0, 7);
      if (!acc[week]) acc[week] = { created: 0, active: 0, retained: 0 };
      acc[week].created++;
      if (m.status === 'active') acc[week].active++;
      if (m.status === 'active' && m.updated_at > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) {
        acc[week].retained++;
      }
      return acc;
    }, {});

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('admin_get_retention_analytics', duration);

    return res.json({
      analytics: {
        period,
        generated_at: new Date().toISOString(),
        retention: {
          activations: activations.length,
          deactivations: deactivations.length,
          netChange: activations.length - deactivations.length,
          weeklyCohorts
        }
      }
    });
  } catch (err: any) {
    console.error('[ADMIN GET RETENTION ANALYTICS ERROR]', err.message);

    // Track error in Sentry
    trackError(err, {
      endpoint: '/api/admin/analytics/retention',
      method: 'GET',
      query: req.query,
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to fetch retention analytics',
      message: err.message
    });
  }
});

/**
 * Get dashboard summary
 * 
 * GET /api/admin/analytics/dashboard
 */
router.get('/analytics/dashboard', requireTenantAdmin, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();

  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Tenant ID required'
      });
    }

    // Track API call
    trackApiCall('/api/admin/analytics/dashboard', 'GET', req.user.id);

    // Get quick stats
    const { data: totalMemberships } = await supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', req.user.tenantId);

    const { data: activeMemberships } = await supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', req.user.tenantId)
      .eq('status', 'active');

    const { data: expiringSoon } = await supabase
      .from('membership_reminders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', req.user.tenantId)
      .lte('next_payment_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

    const { data: expired } = await supabase
      .from('membership_expired')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', req.user.tenantId);

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('admin_get_dashboard_analytics', duration);

    return res.json({
      analytics: {
        generated_at: new Date().toISOString(),
        dashboard: {
          totalMemberships: totalMemberships?.length || 0,
          activeMemberships: activeMemberships?.length || 0,
          expiringSoon: expiringSoon?.length || 0,
          expired: expired?.length || 0,
          healthScore: calculateHealthScore(activeMemberships?.length || 0, expired?.length || 0)
        }
      }
    });
  } catch (err: any) {
    console.error('[ADMIN GET DASHBOARD ANALYTICS ERROR]', err.message);

    // Track error in Sentry
    trackError(err, {
      endpoint: '/api/admin/analytics/dashboard',
      method: 'GET',
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to fetch dashboard analytics',
      message: err.message
    });
  }
});

/**
 * Calculate health score (0-100)
 */
function calculateHealthScore(active: number, expired: number): number {
  if (active === 0) return 0;

  const total = active + expired;
  const activeRate = (active / total) * 100;

  if (activeRate >= 90) return 100;
  if (activeRate >= 80) return 80;
  if (activeRate >= 70) return 60;
  if (activeRate >= 50) return 40;
  return 20;
}

export default router;
