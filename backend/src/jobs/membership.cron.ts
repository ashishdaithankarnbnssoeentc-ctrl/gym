/**
 * Membership Cron Jobs
 * 
 * Handles automated membership lifecycle management
 * No payment processing - just tracking and reminders
 */

import {
  getMembershipReminders,
  getExpiredMemberships,
  markMembershipsAsExpired
} from '../services/membership.service.js';

/**
 * Send payment reminders to users
 * Run this daily
 */
export async function sendPaymentReminders(): Promise<void> {
  try {
    console.log('[CRON] Starting payment reminder job...');

    const reminders = await getMembershipReminders();

    if (reminders.length === 0) {
      console.log('[CRON] No payment reminders needed');
      return;
    }

    console.log(`[CRON] Processing ${reminders.length} payment reminders`);

    for (const reminder of reminders) {
      try {
        // Send reminder based on priority
        const message = createReminderMessage(reminder);

        // Here you would integrate with your notification system
        // Examples: SendGrid, WhatsApp, Twilio, etc.
        await sendNotification(reminder.email, message, reminder.reminderPriority as 'urgent' | 'soon' | 'upcoming' | 'expired');

        console.log(`[CRON] Sent ${reminder.reminderPriority} reminder to ${reminder.email}`);
      } catch (err) {
        console.error(`[CRON] Failed to send reminder to ${reminder.email}:`, err);
      }
    }

    console.log('[CRON] Payment reminder job completed');
  } catch (err) {
    console.error('[CRON] Payment reminder job failed:', err);
  }
}

/**
 * Mark expired memberships
 * Run this daily
 */
export async function processExpiredMemberships(): Promise<void> {
  try {
    console.log('[CRON] Starting expired membership processing...');

    const expiredCount = await markMembershipsAsExpired();

    console.log(`[CRON] Marked ${expiredCount} memberships as expired`);

    // Optionally notify expired users
    if (expiredCount > 0) {
      const expiredMemberships = await getExpiredMemberships();

      for (const membership of expiredMemberships) {
        try {
          const message = createExpiredMessage(membership);
          await sendNotification(membership.userId, message, 'expired');

          console.log(`[CRON] Notified expired user: ${membership.userId}`);
        } catch (err) {
          console.error(`[CRON] Failed to notify expired user ${membership.userId}:`, err);
        }
      }
    }

    console.log('[CRON] Expired membership processing completed');
  } catch (err) {
    console.error('[CRON] Expired membership processing failed:', err);
  }
}

/**
 * Create reminder message based on priority
 */
function createReminderMessage(reminder: any): string {
  const { displayName, plan, nextPaymentDate, daysUntilDue, reminderPriority } = reminder;

  switch (reminderPriority) {
    case 'urgent':
      return `Hi ${displayName}, your ${plan} membership expires TOMORROW (${nextPaymentDate}). Please renew to continue access.`;

    case 'soon':
      return `Hi ${displayName}, your ${plan} membership expires in ${daysUntilDue} days (${nextPaymentDate}). Renew soon to avoid interruption.`;

    case 'upcoming':
      return `Hi ${displayName}, your ${plan} membership will renew on ${nextPaymentDate}. Payment will be processed automatically.`;

    default:
      return `Hi ${displayName}, your ${plan} membership next payment is due on ${nextPaymentDate}.`;
  }
}

/**
 * Create expired membership message
 */
function createExpiredMessage(membership: any): string {
  const { plan, daysExpired } = membership;

  return `Your ${plan} membership expired ${daysExpired} days ago. Please renew to restore access to your account.`;
}

/**
 * Send notification (placeholder - integrate with your notification system)
 */
async function sendNotification(
  recipient: string,
  message: string,
  type: 'urgent' | 'soon' | 'upcoming' | 'expired'
): Promise<void> {
  // TODO: Integrate with your notification system
  // Examples:
  // - Email: SendGrid, Nodemailer
  // - SMS: Twilio
  // - WhatsApp: Twilio WhatsApp
  // - Push: Firebase Cloud Messaging

  console.log(`[NOTIFICATION] ${type.toUpperCase()} to ${recipient}: ${message}`);

  // Example email integration (uncomment when ready):
  /*
  if (type === 'urgent' || type === 'expired') {
    await sendEmail({
      to: recipient,
      subject: `Urgent: Membership ${type}`,
      text: message
    });
  }
  */
}

/**
 * Main cron job runner
 * Call this from your cron scheduler
 */
export async function runMembershipCronJobs(): Promise<void> {
  try {
    console.log('[CRON] Starting membership cron jobs...');

    // Process expired memberships first
    await processExpiredMemberships();

    // Send payment reminders
    await sendPaymentReminders();

    console.log('[CRON] All membership cron jobs completed successfully');
  } catch (err) {
    console.error('[CRON] Membership cron jobs failed:', err);
  }
}

/**
 * Setup cron schedule (example using node-cron)
 * Install: npm install node-cron
 */
export function setupMembershipCron(): void {
  // Uncomment this when you want to enable automatic cron jobs
  /*
  import cron from 'node-cron';
  
  // Run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    await runMembershipCronJobs();
  });
  
  console.log('[CRON] Membership cron jobs scheduled to run daily at 9:00 AM');
  */
}

// Export for manual testing
export { sendPaymentReminders as testReminders };
export { processExpiredMemberships as testExpired };
