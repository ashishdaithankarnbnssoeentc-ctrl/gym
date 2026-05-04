/**
 * Internal Notification Service
 * 
 * Stores reminders internally instead of sending external messages
 * Clean, simple, no third-party dependencies
 */

import { supabase } from '../lib/supabase.js';

export interface InternalNotification {
  id: string;
  userId: string;
  tenantId: string;
  message: string;
  notificationType: 'reminder' | 'expired' | 'cancelled' | 'extended' | 'welcome';
  priority: 'urgent' | 'soon' | 'upcoming' | 'normal';
  read: boolean;
  createdAt: string;
}

/**
 * Create internal notification
 * Stores reminder instead of sending external message
 */
export async function createNotification({
  userId,
  tenantId,
  message,
  notificationType = 'reminder',
  priority = 'normal'
}: {
  userId: string;
  tenantId: string;
  message: string;
  notificationType?: 'reminder' | 'expired' | 'cancelled' | 'extended' | 'welcome';
  priority?: 'urgent' | 'soon' | 'upcoming' | 'normal';
}): Promise<InternalNotification | null> {
  try {
    const { data, error } = await supabase
      .from('membership_notifications')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        message,
        notification_type: notificationType,
        priority
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`[INTERNAL NOTIFICATION] Created for user ${userId}: ${message}`);

    return {
      id: data.id,
      userId: data.user_id,
      tenantId: data.tenant_id,
      message: data.message,
      notificationType: data.notification_type,
      priority: data.priority,
      read: data.read,
      createdAt: data.created_at
    };
  } catch (err) {
    console.error('[INTERNAL NOTIFICATION ERROR]', err);
    return null;
  }
}

/**
 * Get user's notifications
 */
export async function getUserNotifications(
  userId: string,
  tenantId: string,
  unreadOnly: boolean = false
): Promise<InternalNotification[]> {
  try {
    let query = supabase
      .from('membership_notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(n => ({
      id: n.id,
      userId: n.user_id,
      tenantId: n.tenant_id,
      message: n.message,
      notificationType: n.notification_type,
      priority: n.priority,
      read: n.read,
      createdAt: n.created_at
    }));
  } catch (err) {
    console.error('[GET USER NOTIFICATIONS ERROR]', err);
    return [];
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(
  notificationId: string,
  userId: string,
  tenantId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('membership_notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);

    return !error;
  } catch (err) {
    console.error('[MARK NOTIFICATION READ ERROR]', err);
    return false;
  }
}

/**
 * Mark all notifications as read for user
 */
export async function markAllNotificationsRead(
  userId: string,
  tenantId: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('membership_notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('read', false);

    if (error) throw error;

    return (data as any)?.length || 0;
  } catch (err) {
    console.error('[MARK ALL NOTIFICATIONS READ ERROR]', err);
    return 0;
  }
}

/**
 * Get tenant notifications (for admin dashboard)
 */
export async function getTenantNotifications(
  tenantId: string,
  unreadOnly: boolean = false
): Promise<any[]> {
  try {
    let query = supabase
      .from('tenant_notifications')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (err) {
    console.error('[GET TENANT NOTIFICATIONS ERROR]', err);
    return [];
  }
}

/**
 * Create membership reminder notification
 */
export async function createMembershipReminder(
  userId: string,
  tenantId: string,
  email: string,
  plan: string,
  nextPaymentDate: string,
  daysUntilDue: number
): Promise<InternalNotification | null> {
  const priority = daysUntilDue <= 1 ? 'urgent' :
    daysUntilDue <= 3 ? 'soon' :
      daysUntilDue <= 7 ? 'upcoming' : 'normal';

  const message = `Your ${plan} membership expires in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'} (${nextPaymentDate}). Please renew to continue access.`;

  return createNotification({
    userId,
    tenantId,
    message,
    notificationType: 'reminder',
    priority
  });
}

/**
 * Create membership expired notification
 */
export async function createMembershipExpiredNotification(
  userId: string,
  tenantId: string,
  plan: string,
  daysExpired: number
): Promise<InternalNotification | null> {
  const message = `Your ${plan} membership expired ${daysExpired} day${daysExpired === 1 ? '' : 's'} ago. Please renew to restore access.`;

  return createNotification({
    userId,
    tenantId,
    message,
    notificationType: 'expired',
    priority: 'urgent'
  });
}

/**
 * Create membership extended notification
 */
export async function createMembershipExtendedNotification(
  userId: string,
  tenantId: string,
  plan: string,
  newExpiryDate: string
): Promise<InternalNotification | null> {
  const message = `Your ${plan} membership has been extended. New expiry date: ${newExpiryDate}.`;

  return createNotification({
    userId,
    tenantId,
    message,
    notificationType: 'extended',
    priority: 'normal'
  });
}

/**
 * Create welcome notification
 */
export async function createWelcomeNotification(
  userId: string,
  tenantId: string,
  plan: string
): Promise<InternalNotification | null> {
  const message = `Welcome! Your ${plan} membership is now active. Enjoy access to all features.`;

  return createNotification({
    userId,
    tenantId,
    message,
    notificationType: 'welcome',
    priority: 'normal'
  });
}
