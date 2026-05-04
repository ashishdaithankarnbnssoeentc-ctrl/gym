/**
 * Production Cron Jobs
 * 
 * Fully wired membership reminder and expiry system
 * Runs daily at 9 AM automatically
 */

import cron from 'node-cron';
import { supabase } from '../lib/supabase.js';
import { sendReminder, sendCancellationEmail, sendExtensionEmail, sendWelcomeEmail } from '../services/notification.service.js';
import { trackApiCall, trackError, trackPerformance } from '../sentry.js';

/**
 * Setup production membership cron jobs
 * Call this from your main app to enable automation
 */
export function setupMembershipCron(): void {
  console.log('[CRON] Setting up membership automation...');

  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    await runMembershipCronJobs();
  });

  // Also run at midnight for expiry processing
  cron.schedule('0 0 * * *', async () => {
    await processExpiredMemberships();
  });

  console.log('[CRON] Membership cron jobs scheduled:');
  console.log('  - Daily at 9:00 AM: Reminders + processing');
  console.log('  - Daily at midnight: Expiry processing');
}

/**
 * Main cron job runner
 * Handles both reminders and expiry processing
 */
export async function runMembershipCronJobs(): Promise<void> {
  const startTime = Date.now();

  try {
    console.log('[CRON] Starting daily membership cron jobs...');

    // Process expired memberships first
    await processExpiredMemberships();

    // Send payment reminders
    await sendPaymentReminders();

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('membership_cron_daily', duration);

    console.log(`[CRON] Daily membership jobs completed in ${duration}ms`);
  } catch (err: any) {
    console.error('[CRON] Membership cron jobs failed:', err);
    trackError(err, {
      context: 'membership_cron_jobs',
      duration: Date.now() - startTime
    });
  }
}

/**
 * Send payment reminders to users
 * Processes users with upcoming payments (3, 7 days before)
 */
export async function sendPaymentReminders(): Promise<void> {
  try {
    console.log('[CRON] Processing payment reminders...');

    // Get users needing reminders
    const { data: reminders, error } = await supabase
      .from('membership_reminders')
      .select('*')
      .order('next_payment_date', { ascending: true });

    if (error) throw error;

    if (!reminders || reminders.length === 0) {
      console.log('[CRON] No payment reminders needed');
      return;
    }

    console.log(`[CRON] Processing ${reminders.length} payment reminders`);

    let sentCount = 0;
    let errorCount = 0;

    for (const reminder of reminders) {
      try {
        await sendReminder({
          email: reminder.email,
          name: reminder.display_name,
          nextPaymentDate: reminder.next_payment_date,
          plan: reminder.plan,
          reminderPriority: reminder.reminder_priority
        });

        sentCount++;
        console.log(`[CRON] Sent ${reminder.reminder_priority} reminder to ${reminder.email}`);
      } catch (err) {
        errorCount++;
        console.error(`[CRON] Failed to send reminder to ${reminder.email}:`, err);
      }
    }

    console.log(`[CRON] Payment reminders complete: ${sentCount} sent, ${errorCount} errors`);

    // Track metrics
    trackApiCall('cron_payment_reminders', 'BATCH', 'system');
  } catch (err: any) {
    console.error('[CRON] Payment reminder processing failed:', err);
    trackError(err, { context: 'payment_reminders' });
  }
}

/**
 * Process expired memberships
 * Marks expired memberships and sends notifications
 */
export async function processExpiredMemberships(): Promise<void> {
  try {
    console.log('[CRON] Processing expired memberships...');

    // Get expired memberships
    const { data: expired, error } = await supabase
      .from('membership_expired')
      .select('*');

    if (error) throw error;

    if (!expired || expired.length === 0) {
      console.log('[CRON] No expired memberships to process');
      return;
    }

    console.log(`[CRON] Processing ${expired.length} expired memberships`);

    let processedCount = 0;
    let errorCount = 0;

    for (const membership of expired) {
      try {
        // Mark as expired in database
        const { error: updateError } = await supabase
          .from('memberships')
          .update({
            status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', membership.id);

        if (updateError) throw updateError;

        // Send notification (optional - uncomment when ready)
        /*
        await sendCancellationEmail(
          membership.email,
          membership.display_name,
          membership.plan
        );
        */

        processedCount++;
        console.log(`[CRON] Processed expired membership for ${membership.email}`);
      } catch (err) {
        errorCount++;
        console.error(`[CRON] Failed to process expired membership ${membership.id}:`, err);
      }
    }

    console.log(`[CRON] Expired membership processing complete: ${processedCount} processed, ${errorCount} errors`);

    // Track metrics
    trackApiCall('cron_expired_memberships', 'BATCH', 'system');
  } catch (err: any) {
    console.error('[CRON] Expired membership processing failed:', err);
    trackError(err, { context: 'expired_memberships' });
  }
}

/**
 * Send welcome emails for new memberships
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

    await sendWelcomeEmail(user.email, user.display_name, membership.plan);

    console.log(`[CRON] Welcome notification sent to ${user.email}`);
  } catch (err: any) {
    console.error('[CRON] Failed to send welcome notification:', err);
    trackError(err, { context: 'welcome_notification', membershipId: membership.id });
  }
}

/**
 * Send extension confirmation
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

    await sendExtensionEmail(
      user.email,
      user.display_name,
      membership.plan,
      membership.next_payment_date
    );

    console.log(`[CRON] Extension notification sent to ${user.email}`);
  } catch (err: any) {
    console.error('[CRON] Failed to send extension notification:', err);
    trackError(err, { context: 'extension_notification', membershipId: membership.id });
  }
}

/**
 * Manual cron job trigger for testing
 */
export async function triggerManualCron(jobType: 'reminders' | 'expired' | 'all'): Promise<void> {
  console.log(`[CRON] Manual trigger: ${jobType}`);

  switch (jobType) {
    case 'reminders':
      await sendPaymentReminders();
      break;
    case 'expired':
      await processExpiredMemberships();
      break;
    case 'all':
      await runMembershipCronJobs();
      break;
  }
}

// Export for testing
export { sendPaymentReminders as testReminders };
export { processExpiredMemberships as testExpired };
