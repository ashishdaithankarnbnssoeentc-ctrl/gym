/**
 * Admin Notification Routes
 * 
 * Internal notification management for admin dashboard
 * Shows reminders and membership notifications
 */

import express from 'express';
import { requireTenantAdmin } from '../middleware/admin.middleware.js';
import { supabase } from '../lib/supabase.js';
import { getTenantNotifications } from '../services/internal.notification.service.js';
import { trackApiCall, trackError, trackPerformance } from '../sentry.js';

const router = express.Router();

/**
 * Get all tenant notifications
 * 
 * GET /api/admin/notifications
 * Query: ?unread=true (optional)
 */
router.get('/notifications', requireTenantAdmin, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();
  
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Tenant ID required'
      });
    }

    const { unread } = req.query;
    const unreadOnly = unread === 'true';

    // Track API call
    trackApiCall('/api/admin/notifications', 'GET', req.user.id);

    const notifications = await getTenantNotifications(req.user.tenantId, unreadOnly);

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('admin_get_notifications', duration);

    return res.json({
      notifications,
      count: notifications.length,
      unreadOnly
    });
  } catch (err: any) {
    console.error('[ADMIN GET NOTIFICATIONS ERROR]', err.message);
    
    // Track error in Sentry
    trackError(err, {
      endpoint: '/api/admin/notifications',
      method: 'GET',
      query: req.query,
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to fetch notifications',
      message: err.message
    });
  }
});

/**
 * Get notification statistics
 * 
 * GET /api/admin/notifications/stats
 */
router.get('/notifications/stats', requireTenantAdmin, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();
  
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Tenant ID required'
      });
    }

    // Track API call
    trackApiCall('/api/admin/notifications/stats', 'GET', req.user.id);

    // Get notification statistics
    const { data: stats, error } = await supabase
      .from('membership_notifications')
      .select('notification_type, priority, read')
      .eq('tenant_id', req.user.tenantId);

    if (error) throw error;

    // Calculate statistics
    const notificationStats = (stats || []).reduce((acc: any, n: any) => {
      const type = n.notification_type;
      const priority = n.priority;
      const isRead = n.read;
      
      if (!acc[type]) acc[type] = { total: 0, read: 0, unread: 0 };
      if (!acc[type][priority]) acc[type][priority] = 0;
      
      acc[type].total++;
      acc[type][priority]++;
      
      if (isRead) {
        acc[type].read++;
      } else {
        acc[type].unread++;
      }
      
      return acc;
    }, {});

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('admin_get_notification_stats', duration);

    return res.json({
      stats: notificationStats,
      totalNotifications: stats?.length || 0,
      summary: {
        reminder: notificationStats.reminder || { total: 0, read: 0, unread: 0 },
        expired: notificationStats.expired || { total: 0, read: 0, unread: 0 },
        cancelled: notificationStats.cancelled || { total: 0, read: 0, unread: 0 },
        extended: notificationStats.extended || { total: 0, read: 0, unread: 0 },
        welcome: notificationStats.welcome || { total: 0, read: 0, unread: 0 }
      }
    });
  } catch (err: any) {
    console.error('[ADMIN GET NOTIFICATION STATS ERROR]', err.message);
    
    // Track error in Sentry
    trackError(err, {
      endpoint: '/api/admin/notifications/stats',
      method: 'GET',
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to fetch notification statistics',
      message: err.message
    });
  }
});

/**
 * Get users with upcoming expirations
 * 
 * GET /api/admin/expiring-users
 * Query: ?days=7 (optional, default 7)
 */
router.get('/expiring-users', requireTenantAdmin, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();
  
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Tenant ID required'
      });
    }

    const days = parseInt(req.query.days as string) || 7;

    // Track API call
    trackApiCall('/api/admin/expiring-users', 'GET', req.user.id);

    // Get users with upcoming expirations
    const { data: expiringUsers, error } = await supabase
      .from('membership_reminders')
      .select('*')
      .eq('tenant_id', req.user.tenantId)
      .lte('next_payment_date', new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString())
      .order('next_payment_date', { ascending: true });

    if (error) throw error;

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('admin_get_expiring_users', duration);

    return res.json({
      expiringUsers: expiringUsers || [],
      count: expiringUsers?.length || 0,
      days
    });
  } catch (err: any) {
    console.error('[ADMIN GET EXPIRING USERS ERROR]', err.message);
    
    // Track error in Sentry
    trackError(err, {
      endpoint: '/api/admin/expiring-users',
      method: 'GET',
      query: req.query,
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to fetch expiring users',
      message: err.message
    });
  }
});

/**
 * Get expired users
 * 
 * GET /api/admin/expired-users
 */
router.get('/expired-users', requireTenantAdmin, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();
  
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Tenant ID required'
      });
    }

    // Track API call
    trackApiCall('/api/admin/expired-users', 'GET', req.user.id);

    // Get expired users
    const { data: expiredUsers, error } = await supabase
      .from('membership_expired')
      .select('*')
      .eq('tenant_id', req.user.tenantId)
      .order('next_payment_date', { ascending: false });

    if (error) throw error;

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('admin_get_expired_users', duration);

    return res.json({
      expiredUsers: expiredUsers || [],
      count: expiredUsers?.length || 0
    });
  } catch (err: any) {
    console.error('[ADMIN GET EXPIRED USERS ERROR]', err.message);
    
    // Track error in Sentry
    trackError(err, {
      endpoint: '/api/admin/expired-users',
      method: 'GET',
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to fetch expired users',
      message: err.message
    });
  }
});

/**
 * Mark notifications as read
 * 
 * PATCH /api/admin/notifications/:id/read
 */
router.patch('/notifications/:id/read', requireTenantAdmin, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();
  
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Notification ID required'
      });
    }

    if (!req.user?.tenantId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Tenant ID required'
      });
    }

    // Track API call
    trackApiCall(`/api/admin/notifications/${id}/read`, 'PATCH', req.user.id);

    // Mark notification as read
    const { error } = await supabase
      .from('membership_notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', req.user.tenantId);

    if (error) throw error;

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('admin_mark_notification_read', duration);

    return res.json({
      message: 'Notification marked as read'
    });
  } catch (err: any) {
    console.error('[ADMIN MARK NOTIFICATION READ ERROR]', err.message);
    
    // Track error in Sentry
    trackError(err, {
      endpoint: `/api/admin/notifications/${req.params.id}/read`,
      method: 'PATCH',
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to mark notification as read',
      message: err.message
    });
  }
});

export default router;
