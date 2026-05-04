/**
 * Internal Cron Jobs
 * 
 * Clean reminder system without external messaging
 * Stores notifications internally for admin/user access
 */

import cron from 'node-cron';
import { supabase } from '../lib/supabase.js';
import { 
  createMembershipReminder,
  createMembershipExpiredNotification,
  createMembershipExtendedNotification,
  createWelcomeNotification
} from '../services/internal.notification.service.js';
import { trackApiCall, trackError, trackPerformance } from '../sentry.js';

/**
 * Setup internal membership cron jobs
 * No external messaging - just internal tracking
 */
export function setupMembershipCron(): void {
  console.log('[INTERNAL CRON] Setting up internal reminder system...');

  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    await runInternalMembershipCronJobs();
  });

  // Also run at midnight for expiry processing
  cron.schedule('0 0 * * *', async () => {
    await processExpiredMemberships();
  });

  console.log('[INTERNAL CRON] Internal reminder system scheduled:');
  console.log('  - Daily at 9:00 AM: Internal reminders + processing');
  console.log('  - Daily at midnight: Expiry processing');
}

/**
 * Main internal cron job runner
 * Creates internal notifications instead of sending external messages
 */
export async function runInternalMembershipCronJobs(): Promise<void> {
  const startTime = Date.now();
  
  try {
    console.log('[INTERNAL CRON] Starting internal membership jobs...');
    
    // Process expired memberships first
    await processExpiredMemberships();
    
    // Create internal reminders
    await createInternalReminders();
    
    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('internal_membership_cron_daily', duration);
    
    console.log(`[INTERNAL CRON] Daily internal jobs completed in ${duration}ms`);
  } catch (err: any) {
    console.error('[INTERNAL CRON] Membership cron jobs failed:', err);
    trackError(err, {
      context: 'internal_membership_cron_jobs',
      duration: Date.now() - startTime
    });
  }
}

/**
 * Create internal reminders instead of sending external messages
 * Stores notifications in database for admin/user access
 */
export async function createInternalReminders(): Promise<void> {
  try {
    console.log('[INTERNAL CRON] Creating internal reminders...');
    
    // Get users needing reminders
    const { data: reminders, error } = await supabase
      .from('membership_reminders')
      .select('*')
      .order('next_payment_date', { ascending: true });

    if (error) throw error;

    if (!reminders || reminders.length === 0) {
      console.log('[INTERNAL CRON] No reminders needed');
      return;
    }

    console.log(`[INTERNAL CRON] Processing ${reminders.length} internal reminders`);

    let createdCount = 0;
    let errorCount = 0;

    for (const reminder of reminders) {
      try {
        // Calculate days until due
        const today = new Date();
        const nextPaymentDate = new Date(reminder.next_payment_date);
        const daysUntilDue = Math.ceil((nextPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Create internal notification instead of sending message
        await createMembershipReminder(
          reminder.user_id,
          reminder.tenant_id,
          reminder.email,
          reminder.plan,
          reminder.next_payment_date,
          daysUntilDue
        );
        
        createdCount++;
        console.log(`[INTERNAL CRON] Created ${reminder.reminder_priority} reminder for ${reminder.email} (expires in ${daysUntilDue} days)`);
      } catch (err) {
        errorCount++;
        console.error(`[INTERNAL CRON] Failed to create reminder for ${reminder.email}:`, err);
      }
    }

    console.log(`[INTERNAL CRON] Internal reminders complete: ${createdCount} created, ${errorCount} errors`);
    
    // Track metrics
    trackApiCall('internal_cron_reminders', 'BATCH', 'system');
  } catch (err: any) {
    console.error('[INTERNAL CRON] Internal reminder processing failed:', err);
    trackError(err, { context: 'internal_reminders' });
  }
}

/**
 * Process expired memberships and create internal notifications
 */
export async function processExpiredMemberships(): Promise<void> {
  try {
    console.log('[INTERNAL CRON] Processing expired memberships...');
    
    // Get expired memberships
    const { data: expired, error } = await supabase
      .from('membership_expired')
      .select('*');

    if (error) throw error;

    if (!expired || expired.length === 0) {
      console.log('[INTERNAL CRON] No expired memberships to process');
      return;
    }

    console.log(`[INTERNAL CRON] Processing ${expired.length} expired memberships`);

    let processedCount = 0;
    let errorCount = 0;

    for (const membership of expired) {
      try {
        // Calculate days expired
        const today = new Date();
        const nextPaymentDate = new Date(membership.next_payment_date);
        const daysExpired = Math.ceil((today.getTime() - nextPaymentDate.getTime()) / (1000 * 60 * 60 * 24));

        // Mark as expired in database
        const { error: updateError } = await supabase
          .from('memberships')
          .update({ 
            status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', membership.id);

        if (updateError) throw updateError;

        // Create internal notification instead of sending external message
        await createMembershipExpiredNotification(
          membership.user_id,
          membership.tenant_id,
          membership.plan,
          daysExpired
        );

        processedCount++;
        console.log(`[INTERNAL CRON] Processed expired membership for ${membership.email} (expired ${daysExpired} days ago)`);
      } catch (err) {
        errorCount++;
        console.error(`[INTERNAL CRON] Failed to process expired membership ${membership.id}:`, err);
      }
    }

    console.log(`[INTERNAL CRON] Expired membership processing complete: ${processedCount} processed, ${errorCount} errors`);
    
    // Track metrics
    trackApiCall('internal_cron_expired', 'BATCH', 'system');
  } catch (err: any) {
    console.error('[INTERNAL CRON] Expired membership processing failed:', err);
    trackError(err, { context: 'internal_expired_memberships' });
  }
}

/**
 * Create internal welcome notification
 * Call this when a new membership is created
 */
export async function sendWelcomeNotification(membership: any): Promise<void> {
  try {
    // Get user details
    const { data: user, error } = await supabase
      .from('users')
      .select('email, display_name')
      .eq('id', membership.user_id)
      .single();

    if (error) throw error;

    await createWelcomeNotification(
      membership.user_id,
      membership.tenant_id,
      membership.plan
    );
    
    console.log(`[INTERNAL CRON] Welcome notification created for ${user.email}`);
  } catch (err: any) {
    console.error('[INTERNAL CRON] Failed to create welcome notification:', err);
    trackError(err, { context: 'internal_welcome_notification', membershipId: membership.id });
  }
}

/**
 * Create internal extension notification
 * Call this when a membership is extended
 */
export async function sendExtensionNotification(membership: any, days: number): Promise<void> {
  try {
    // Get user details
    const { data: user, error } = await supabase
      .from('users')
      .select('email, display_name')
      .eq('id', membership.user_id)
      .single();

    if (error) throw error;

    await createMembershipExtendedNotification(
      membership.user_id,
      membership.tenant_id,
      membership.plan,
      membership.next_payment_date
    );
    
    console.log(`[INTERNAL CRON] Extension notification created for ${user.email}`);
  } catch (err: any) {
    console.error('[INTERNAL CRON] Failed to create extension notification:', err);
    trackError(err, { context: 'internal_extension_notification', membershipId: membership.id });
  }
}

/**
 * Manual cron job trigger for testing
 */
export async function triggerManualInternalCron(jobType: 'reminders' | 'expired' | 'all'): Promise<void> {
  console.log(`[INTERNAL CRON] Manual trigger: ${jobType}`);
  
  switch (jobType) {
    case 'reminders':
      await createInternalReminders();
      break;
    case 'expired':
      await processExpiredMemberships();
      break;
    case 'all':
      await runInternalMembershipCronJobs();
      break;
  }
}

// Export for testing
export { createInternalReminders as testInternalReminders };
export { processExpiredMemberships as testInternalExpired };
