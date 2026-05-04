/**
 * Retention Analytics Routes
 * 
 * Predicts which users are about to churn
 * Provides risk-based insights for proactive actions
 */

import express from 'express';
import { requireTenantAdmin } from '../middleware/admin.middleware.js';
import { supabase } from '../lib/supabase.js';
import { trackApiCall, trackError, trackPerformance } from '../sentry.js';

const router = express.Router();

/**
 * Get retention analytics with risk levels
 * 
 * GET /api/admin/analytics/retention
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

    const period = parseInt(req.query.period as string) || 30;

    // Track API call
    trackApiCall('/api/admin/analytics/retention', 'GET', req.user.id);

    // Get retention analytics
    const { data: retentionData, error } = await supabase
      .rpc('get_retention_analytics', {
        p_tenant_id: req.user.tenantId,
        p_period_days: period
      });

    if (error) throw error;

    // Get churn prediction
    const { data: churnPrediction, error: predictionError } = await supabase
      .from('churn_prediction')
      .select('*')
      .eq('tenant_id', req.user.tenantId)
      .single();

    if (predictionError) throw predictionError;

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('get_retention_analytics', duration);

    return res.json({
      analytics: {
        period,
        generated_at: new Date().toISOString(),
        risk_summary: {
          healthy: retentionData?.healthy_count || 0,
          warning: retentionData?.warning_count || 0,
          atRisk: retentionData?.at_risk_count || 0,
          highRisk: retentionData?.high_risk_count || 0,
          expired: retentionData?.expired_count || 0,
          inactive: retentionData?.inactive_count || 0,
          total: retentionData?.total_count || 0
        },
        metrics: {
          churnRate: retentionData?.churn_rate || 0,
          riskRate: retentionData?.risk_rate || 0,
          predictedChurn30d: churnPrediction?.predicted_churn_30d || 0,
          churnRiskPercentage: churnPrediction?.churn_risk_percentage || 0
        },
        insights: {
          immediateAction: retentionData?.high_risk_count || 0,
          proactiveAction: retentionData?.at_risk_count || 0,
          monitoringRequired: retentionData?.warning_count || 0,
          healthyUsers: retentionData?.healthy_count || 0
        }
      }
    });
  } catch (err: any) {
    console.error('[RETENTION ANALYTICS ERROR]', err.message);
    
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
 * Get user risk details by risk level
 * 
 * GET /api/admin/analytics/risk-users
 * Query: ?riskLevel=high_risk (optional)
 */
router.get('/analytics/risk-users', requireTenantAdmin, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();
  
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Tenant ID required'
      });
    }

    const { riskLevel } = req.query;

    // Track API call
    trackApiCall('/api/admin/analytics/risk-users', 'GET', req.user.id);

    // Get user risk details
    const { data: riskUsers, error } = await supabase
      .rpc('get_user_risk_details', {
        p_tenant_id: req.user.tenantId,
        p_risk_level: riskLevel as string
      });

    if (error) throw error;

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('get_risk_users', duration);

    return res.json({
      riskUsers: riskUsers || [],
      count: riskUsers?.length || 0,
      riskLevel: riskLevel || 'all',
      generated_at: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[RISK USERS ERROR]', err.message);
    
    // Track error in Sentry
    trackError(err, {
      endpoint: '/api/admin/analytics/risk-users',
      method: 'GET',
      query: req.query,
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to fetch risk users',
      message: err.message
    });
  }
});

/**
 * Get churn prediction dashboard
 * 
 * GET /api/admin/analytics/churn-prediction
 */
router.get('/analytics/churn-prediction', requireTenantAdmin, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();
  
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Tenant ID required'
      });
    }

    // Track API call
    trackApiCall('/api/admin/analytics/churn-prediction', 'GET', req.user.id);

    // Get churn prediction data
    const { data: churnData, error } = await supabase
      .from('churn_prediction')
      .select('*')
      .eq('tenant_id', req.user.tenantId)
      .single();

    if (error) throw error;

    // Get high-risk users for immediate action
    const { data: highRiskUsers, error: highRiskError } = await supabase
      .from('membership_risk_users')
      .select('user_id, email, display_name, plan, days_until_expiry, next_payment_date')
      .eq('tenant_id', req.user.tenantId)
      .eq('risk_level', 'high_risk')
      .order('next_payment_date', { ascending: true })
      .limit(10);

    if (highRiskError) throw highRiskError;

    // Get at-risk users for proactive action
    const { data: atRiskUsers, error: atRiskError } = await supabase
      .from('membership_risk_users')
      .select('user_id, email, display_name, plan, days_until_expiry, next_payment_date')
      .eq('tenant_id', req.user.tenantId)
      .eq('risk_level', 'at_risk')
      .order('next_payment_date', { ascending: true })
      .limit(20);

    if (atRiskError) throw atRiskError;

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('get_churn_prediction', duration);

    return res.json({
      prediction: {
        generated_at: new Date().toISOString(),
        summary: {
          totalUsers: churnData?.total_count || 0,
          healthyUsers: churnData?.healthy_count || 0,
          warningUsers: churnData?.warning_count || 0,
          atRiskUsers: churnData?.at_risk_count || 0,
          highRiskUsers: churnData?.high_risk_count || 0,
          expiredUsers: churnData?.expired_count || 0,
          inactiveUsers: churnData?.inactive_count || 0
        },
        metrics: {
          churnRiskPercentage: churnData?.churn_risk_percentage || 0,
          predictedChurn30d: churnData?.predicted_churn_30d || 0,
          retentionRate: churnData?.healthy_count ? 
            ((churnData?.healthy_count / churnData?.total_count) * 100) : 0
        },
        immediateAction: {
          count: highRiskUsers?.length || 0,
          users: highRiskUsers || []
        },
        proactiveAction: {
          count: atRiskUsers?.length || 0,
          users: atRiskUsers || []
        }
      }
    });
  } catch (err: any) {
    console.error('[CHURN PREDICTION ERROR]', err.message);
    
    // Track error in Sentry
    trackError(err, {
      endpoint: '/api/admin/analytics/churn-prediction',
      method: 'GET',
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to fetch churn prediction',
      message: err.message
    });
  }
});

/**
 * Get retention trends over time
 * 
 * GET /api/admin/analytics/retention-trends
 * Query: ?period=90 (optional, default 90 days)
 */
router.get('/analytics/retention-trends', requireTenantAdmin, async (req: express.Request, res: express.Response) => {
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
    trackApiCall('/api/admin/analytics/retention-trends', 'GET', req.user.id);

    // Get retention analytics with cohorts
    const { data: cohortData, error } = await supabase
      .rpc('get_retention_analytics', {
        p_tenant_id: req.user.tenantId,
        p_period_days: period
      });

    if (error) throw error;

    // Get weekly risk trends
    const { data: weeklyTrends, error: trendsError } = await supabase
      .from('membership_risk_users')
      .select(`
        risk_level,
        created_at,
        next_payment_date
      `)
      .eq('tenant_id', req.user.tenantId)
      .gte('created_at', startDate)
      .order('created_at', { ascending: true });

    if (trendsError) throw trendsError;

    // Calculate weekly trends
    const weeklyData = (weeklyTrends || []).reduce((acc: any, user: any) => {
      const week = new Date(user.created_at).toISOString().split('T')[0].slice(0, 7);
      
      if (!acc[week]) {
        acc[week] = {
          week,
          healthy: 0,
          warning: 0,
          atRisk: 0,
          highRisk: 0,
          expired: 0,
          inactive: 0,
          total: 0
        };
      }
      
      acc[week][user.risk_level]++;
      acc[week].total++;
      
      return acc;
    }, {});

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('get_retention_trends', duration);

    return res.json({
      trends: {
        period,
        generated_at: new Date().toISOString(),
        current: cohortData,
        weeklyData: Object.values(weeklyData),
        insights: {
          riskTrend: weeklyData.length > 1 ? 'improving' : 'stable',
          actionRequired: (cohortData?.high_risk_count || 0) > 5,
          retentionHealth: (cohortData?.healthy_count || 0) / (cohortData?.total_count || 1) > 0.7
        }
      }
    });
  } catch (err: any) {
    console.error('[RETENTION TRENDS ERROR]', err.message);
    
    // Track error in Sentry
    trackError(err, {
      endpoint: '/api/admin/analytics/retention-trends',
      method: 'GET',
      query: req.query,
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to fetch retention trends',
      message: err.message
    });
  }
});

export default router;
