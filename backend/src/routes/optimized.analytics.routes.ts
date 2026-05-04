/**
 * Optimized Analytics Routes
 * 
 * Uses SQL aggregation for better performance
 * Single query instead of multiple database hits
 */

import express from 'express';
import { requireTenantAdmin } from '../middleware/admin.middleware.js';
import { supabase } from '../lib/supabase.js';
import { trackApiCall, trackError, trackPerformance } from '../sentry.js';

const router = express.Router();

/**
 * Get optimized membership analytics
 * 
 * GET /api/admin/analytics/memberships
 * Uses single SQL aggregation query
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

    // Single optimized SQL query for all membership stats
    const { data: membershipStats, error } = await supabase
      .rpc('get_membership_analytics', {
        p_tenant_id: req.user.tenantId,
        p_start_date: startDate,
        p_period_days: period
      });

    if (error) {
      console.error('[OPTIMIZED ANALYTICS ERROR]', error);
      // Fallback to individual queries if RPC fails
      return await getMembershipAnalyticsFallback(req, res, startTime, period, startDate);
    }

    // Get plan breakdown with single query
    const { data: planBreakdown, error: planError } = await supabase
      .from('memberships')
      .select('plan, status, count')
      .eq('tenant_id', req.user?.tenantId || '')
      .gte('updated_at', startDate);

    if (planError) throw planError;

    // Calculate plan statistics
    const planStats = (planBreakdown || []).reduce((acc: any, m: any) => {
      if (!acc[m.plan]) acc[m.plan] = { active: 0, expired: 0, cancelled: 0 };
      acc[m.plan][m.status] = (acc[m.plan][m.status] || 0) + 1;
      return acc;
    }, {});

    // Calculate churn rate
    const totalMemberships = membershipStats?.total_memberships || 0;
    const expiredMemberships = membershipStats?.expired_memberships || 0;
    const churnRate = totalMemberships > 0 ? (expiredMemberships / totalMemberships) * 100 : 0;

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('optimized_get_membership_analytics', duration);

    return res.json({
      analytics: {
        period,
        generated_at: new Date().toISOString(),
        summary: {
          totalMemberships: membershipStats?.total_memberships || 0,
          activeMemberships: membershipStats?.active_memberships || 0,
          expiringMemberships: membershipStats?.expiring_memberships || 0,
          expiredMemberships: expiredMemberships,
          churnRate: Math.round(churnRate * 100) / 100
        },
        planBreakdown: planStats,
        trends: {
          totalActive: membershipStats?.active_memberships || 0,
          totalExpiring: membershipStats?.expiring_memberships || 0,
          totalExpired: expiredMemberships,
          retentionRate: totalMemberships > 0 ? ((membershipStats?.active_memberships || 0) / totalMemberships) * 100 : 0
        }
      }
    });
  } catch (err: any) {
    console.error('[OPTIMIZED ANALYTICS ERROR]', err.message);

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
 * Fallback method for analytics if RPC fails
 */
async function getMembershipAnalyticsFallback(
  req: express.Request,
  res: express.Response,
  startTime: number,
  period: number,
  startDate: string
) {
  try {
    // Get all stats in parallel
    const [totalResult, activeResult, expiringResult, expiredResult] = await Promise.all([
      supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', req.user?.tenantId || ''),

      supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', req.user?.tenantId || '')
        .eq('status', 'active'),

      supabase
        .from('membership_reminders')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', req.user?.tenantId || '')
        .lte('next_payment_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),

      supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', req.user?.tenantId || '')
        .eq('status', 'expired')
        .gte('updated_at', startDate)
    ]);

    const totalMemberships = totalResult?.data?.length || 0;
    const activeMemberships = activeResult?.data?.length || 0;
    const expiringMemberships = expiringResult?.data?.length || 0;
    const expiredMemberships = expiredResult?.data?.length || 0;
    const churnRate = totalMemberships > 0 ? (expiredMemberships / totalMemberships) * 100 : 0;

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('fallback_get_membership_analytics', duration);

    return res.json({
      analytics: {
        period,
        generated_at: new Date().toISOString(),
        summary: {
          totalMemberships,
          activeMemberships,
          expiringMemberships,
          expiredMemberships,
          churnRate: Math.round(churnRate * 100) / 100
        },
        trends: {
          totalActive: activeMemberships,
          totalExpiring: expiringMemberships,
          totalExpired: expiredMemberships,
          retentionRate: totalMemberships > 0 ? (activeMemberships / totalMemberships) * 100 : 0
        }
      }
    });
  } catch (err: any) {
    console.error('[FALLBACK ANALYTICS ERROR]', err.message);
    return res.status(500).json({
      error: 'Failed to fetch membership analytics',
      message: err.message
    });
  }
}

/**
 * Get optimized revenue analytics
 * 
 * GET /api/admin/analytics/revenue
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

    // Track API call
    trackApiCall('/api/admin/analytics/revenue', 'GET', req.user.id);

    // Single query for revenue analytics
    const { data: revenueData, error } = await supabase
      .from('memberships')
      .select('plan, status, next_payment_date, updated_at')
      .eq('tenant_id', req.user?.tenantId || '')
      .eq('status', 'active');

    if (error) throw error;

    // Calculate plan pricing
    const planRates = {
      basic: 10,    // $10/month
      premium: 29,  // $29/month
      pro: 49       // $49/month
    };

    // Calculate MRR
    const mrr = (revenueData || []).reduce((total: number, m: any) => {
      return total + (planRates[m.plan as keyof typeof planRates] || 0);
    }, 0);

    // Calculate plan breakdown
    const planBreakdown = (revenueData || []).reduce((acc: any, m: any) => {
      if (!acc[m.plan]) acc[m.plan] = { count: 0, revenue: 0 };
      acc[m.plan].count++;
      acc[m.plan].revenue += planRates[m.plan as keyof typeof planRates] || 0;
      return acc;
    }, {});

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('optimized_get_revenue_analytics', duration);

    return res.json({
      analytics: {
        generated_at: new Date().toISOString(),
        revenue: {
          mrr,
          totalRevenue: mrr,
          planBreakdown
        },
        planRates
      }
    });
  } catch (err: any) {
    console.error('[OPTIMIZED REVENUE ANALYTICS ERROR]', err.message);

    // Track error in Sentry
    trackError(err, {
      endpoint: '/api/admin/analytics/revenue',
      method: 'GET',
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to fetch revenue analytics',
      message: err.message
    });
  }
});

/**
 * Get optimized user analytics
 * 
 * GET /api/admin/analytics/users
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

    // Single query for user analytics
    const { data: userStats, error } = await supabase
      .rpc('get_user_analytics', {
        p_tenant_id: req.user.tenantId,
        p_start_date: startDate,
        p_period_days: period
      });

    if (error) {
      console.error('[OPTIMIZED USER ANALYTICS ERROR]', error);
      // Fallback to individual queries
      return await getUserAnalyticsFallback(req, res, startTime, period, startDate);
    }

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('optimized_get_user_analytics', duration);

    return res.json({
      analytics: {
        period,
        generated_at: new Date().toISOString(),
        users: {
          totalUsers: userStats?.total_users || 0,
          newUsers: userStats?.new_users || 0,
          activeUsers: userStats?.active_users || 0,
          growthRate: userStats?.growth_rate || 0,
          activationRate: userStats?.activation_rate || 0
        }
      }
    });
  } catch (err: any) {
    console.error('[OPTIMIZED USER ANALYTICS ERROR]', err.message);

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
 * Fallback method for user analytics
 */
async function getUserAnalyticsFallback(
  req: express.Request,
  res: express.Response,
  startTime: number,
  period: number,
  startDate: string
) {
  try {
    // Get user stats in parallel
    const [totalUsersResult, newUsersResult, activeUsersResult] = await Promise.all([
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', req.user?.tenantId || ''),

      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', req.user?.tenantId || '')
        .gte('created_at', startDate),

      supabase
        .from('memberships')
        .select('user_id', { count: 'exact', head: true })
        .eq('tenant_id', req.user?.tenantId || '')
        .eq('status', 'active')
    ]);

    const totalUsers = totalUsersResult?.data?.length || 0;
    const newUsers = newUsersResult?.data?.length || 0;
    const activeUsers = activeUsersResult?.data?.length || 0;
    const growthRate = totalUsers > 0 ? (newUsers / totalUsers) * 100 : 0;
    const activationRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('fallback_get_user_analytics', duration);

    return res.json({
      analytics: {
        period,
        generated_at: new Date().toISOString(),
        users: {
          totalUsers,
          newUsers,
          activeUsers,
          growthRate: Math.round(growthRate * 100) / 100,
          activationRate: Math.round(activationRate * 100) / 100
        }
      }
    });
  } catch (err: any) {
    console.error('[FALLBACK USER ANALYTICS ERROR]', err.message);
    return res.status(500).json({
      error: 'Failed to fetch user analytics',
      message: err.message
    });
  }
}

export default router;
