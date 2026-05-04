/**
 * User Notification Routes
 * 
 * Allows users to view their own notifications
 * Internal notification system - no external messaging
 */

import express from 'express';
// TODO: Replace with actual auth middleware import
// import { requireAuth } from '../middleware/auth.middleware.js';
const requireAuth = (req: any, res: any, next: any) => next();
import { requireActiveMembership } from '../middleware/global.membership.middleware.js';
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '../services/internal.notification.service.js';
import { trackApiCall, trackError, trackPerformance } from '../sentry.js';

const router = express.Router();

/**
 * Get current user's notifications
 * 
 * GET /api/user/notifications
 * Query: ?unread=true (optional)
 */
router.get('/notifications', requireAuth, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();

  try {
    if (!req.user?.id) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const { unread } = req.query;
    const unreadOnly = unread === 'true';

    // Track API call
    trackApiCall('/api/user/notifications', 'GET', req.user.id);

    const notifications = await getUserNotifications(
      req.user.id,
      req.user.tenantId,
      unreadOnly
    );

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('user_get_notifications', duration);

    return res.json({
      notifications,
      count: notifications.length,
      unreadOnly
    });
  } catch (err: any) {
    console.error('[USER GET NOTIFICATIONS ERROR]', err.message);

    // Track error in Sentry
    trackError(err, {
      endpoint: '/api/user/notifications',
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
 * Mark notification as read
 * 
 * PATCH /api/user/notifications/:id/read
 */
router.patch('/notifications/:id/read', requireAuth, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Notification ID required'
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Track API call
    trackApiCall(`/api/user/notifications/${id}/read`, 'PATCH', req.user.id);

    const success = await markNotificationRead(
      id as string,
      req.user.id as string,
      req.user.tenantId as string
    );

    if (!success) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Notification not found'
      });
    }

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('user_mark_notification_read', duration);

    return res.json({
      message: 'Notification marked as read'
    });
  } catch (err: any) {
    console.error('[USER MARK NOTIFICATION READ ERROR]', err.message);

    // Track error in Sentry
    trackError(err, {
      endpoint: `/api/user/notifications/${req.params.id}/read`,
      method: 'PATCH',
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to mark notification as read',
      message: err.message
    });
  }
});

/**
 * Mark all notifications as read
 * 
 * PATCH /api/user/notifications/read-all
 */
router.patch('/notifications/read-all', requireAuth, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();

  try {
    if (!req.user?.id) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Track API call
    trackApiCall('/api/user/notifications/read-all', 'PATCH', req.user.id);

    const markedCount = await markAllNotificationsRead(
      req.user.id,
      req.user.tenantId
    );

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('user_mark_all_notifications_read', duration);

    return res.json({
      message: 'All notifications marked as read',
      markedCount
    });
  } catch (err: any) {
    console.error('[USER MARK ALL NOTIFICATIONS READ ERROR]', err.message);

    // Track error in Sentry
    trackError(err, {
      endpoint: '/api/user/notifications/read-all',
      method: 'PATCH',
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to mark all notifications as read',
      message: err.message
    });
  }
});

/**
 * Get notification count
 * 
 * GET /api/user/notifications/count
 */
router.get('/notifications/count', requireAuth, async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();

  try {
    if (!req.user?.id) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Track API call
    trackApiCall('/api/user/notifications/count', 'GET', req.user.id);

    const notifications = await getUserNotifications(
      req.user.id,
      req.user.tenantId,
      true // unread only
    );

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('user_get_notification_count', duration);

    return res.json({
      unreadCount: notifications.length,
      totalCount: notifications.length // same since we only get unread
    });
  } catch (err: any) {
    console.error('[USER GET NOTIFICATION COUNT ERROR]', err.message);

    // Track error in Sentry
    trackError(err, {
      endpoint: '/api/user/notifications/count',
      method: 'GET',
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to fetch notification count',
      message: err.message
    });
  }
});

export default router;
