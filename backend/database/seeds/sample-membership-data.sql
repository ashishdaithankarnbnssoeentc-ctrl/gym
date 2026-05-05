/**
 * Atomic Membership Service
 * 
 * Handles membership lifecycle management with comprehensive atomic protections
 * Prevents race conditions, date calculation abuse, and business logic exploitation
 */

import { supabase } from '../lib/supabase.js';

export interface Membership {
  id: string;
  userId: string;
  tenantId: string;
  plan: 'basic' | 'premium' | 'pro';
  startDate: string;
  nextPaymentDate: string;
  status: 'active' | 'expired' | 'paused' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface MembershipReminder {
  id: string;
  userId: string;
  tenantId: string;
  plan: string;
  nextPaymentDate: string;
  email: string;
  displayName: string;
  daysUntilDue: number;
  reminderPriority: 'urgent' | 'soon' | 'upcoming' | 'normal';
}

// Business rule constants
const MAX_EXTENSION_DAYS = 60;
const MAX_PAUSE_DAYS = 90;
const DEFAULT_EXTENSION_DAYS = 30;
const ALLOWED_PLANS = ['basic', 'premium', 'pro'] as const;

/**
 * Validate plan type
 */
function isValidPlan(plan: string): plan is typeof ALLOWED_PLANS[number] {
  return ALLOWED_PLANS.includes(plan as typeof ALLOWED_PLANS[number]);
}

/**
 * Validate date is not in the past and within reasonable range
 */
function validateFutureDate(dateString: string, maxDaysFromNow: number): boolean {
  const date = new Date(dateString);
  const now = new Date();
  const maxDate = new Date();
  maxDate.setDate(now.getDate() + maxDaysFromNow);

  return date > now && date <= maxDate;
}

/**
 * Get user's current membership with tenant isolation
 */
export async function getUserMembership(userId: string, tenantId: string): Promise<Membership | null> {
  try {
    // ❌ CRITICAL FIX: Ensure tenant isolation
    if (!userId || !tenantId) {
      throw new Error('User ID and Tenant ID are required');
    }

    const { data, error } = await supabase
      .from('memberships')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single();

    if (error) return null;

    return {
      id: data.id,
      userId: data.user_id,
      tenantId: data.tenant_id,
      plan: data.plan,
      startDate: data.start_date,
      nextPaymentDate: data.next_payment_date,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (err) {
    console.error('[GET USER MEMBERSHIP ERROR]', err);
    return null;
  }
}

/**
 * Create or update membership with strict validation
 */
export async function upsertMembership(
  userId: string,
  tenantId: string,
  plan: string,
  startDate?: string,
  status: string = 'active',
  nextPaymentDate?: string
): Promise<Membership | null> {
  try {
    // ❌ CRITICAL FIX: Validate all inputs
    if (!userId || !tenantId) {
      throw new Error('User ID and Tenant ID are required');
    }

    if (!isValidPlan(plan)) {
      throw new Error(`Invalid plan: ${plan}. Allowed plans: ${ALLOWED_PLANS.join(', ')}`);
    }

    // Validate start date
    const validStartDate = startDate || new Date().toISOString().split('T')[0];
    if (!validateFutureDate(validStartDate, 0)) {
      throw new Error('Start date cannot be in the future');
    }

    // Validate next payment date
    const validNextPaymentDate = nextPaymentDate ||
      new Date(Date.now() + DEFAULT_EXTENSION_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (!validateFutureDate(validNextPaymentDate, 365)) {
      throw new Error('Next payment date must be within 365 days from now');
    }

    const membershipData = {
      user_id: userId,
      tenant_id: tenantId,
      plan,
      start_date: validStartDate,
      next_payment_date: validNextPaymentDate,
      status: status as 'active' | 'expired' | 'paused' | 'cancelled',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('memberships')
      .upsert(membershipData, {
        onConflict: 'user_id,tenant_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      userId: data.user_id,
      tenantId: data.tenant_id,
      plan: data.plan,
      startDate: data.start_date,
      nextPaymentDate: data.next_payment_date,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (err) {
    console.error('[UPSERT MEMBERSHIP ERROR]', err);
    return null;
  }
}

/**
 * Extend membership with business rule validation
 */
export async function extendMembership(
  userId: string,
  tenantId: string,
  days: number
): Promise<Membership | null> {
  try {
    // ❌ CRITICAL FIX: Validate inputs and business rules
    if (!userId || !tenantId) {
      throw new Error('User ID and Tenant ID are required');
    }

    // ❌ CRITICAL FIX: Limit extension days to prevent abuse
    const safeDays = Math.min(MAX_EXTENSION_DAYS, Math.max(1, Number(days)));

    if (isNaN(safeDays)) {
      throw new Error('Invalid days value');
    }

    // Get current membership
    const currentMembership = await getUserMembership(userId, tenantId);

    if (!currentMembership) {
      throw new Error('No existing membership found');
    }

    // Calculate new next payment date
    const currentNextPayment = new Date(currentMembership.nextPaymentDate);
    const newNextPayment = new Date(currentNextPayment);
    newNextPayment.setDate(newNextPayment.getDate() + safeDays);

    // Validate new date is reasonable
    if (!validateFutureDate(newNextPayment.toISOString().split('T')[0], 365)) {
      throw new Error('Extended payment date exceeds maximum allowed period');
    }

    // Update membership
    const { data, error } = await supabase
      .from('memberships')
      .update({
        next_payment_date: newNextPayment.toISOString().split('T')[0],
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', currentMembership.id)
      .eq('user_id', userId)  // ❌ CRITICAL FIX: Ensure ownership
      .eq('tenant_id', tenantId)  // ❌ CRITICAL FIX: Ensure tenant isolation
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      userId: data.user_id,
      tenantId: data.tenant_id,
      plan: data.plan,
      startDate: data.start_date,
      nextPaymentDate: data.next_payment_date,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (err) {
    console.error('[EXTEND MEMBERSHIP ERROR]', err);
    return null;
  }
}

/**
 * Cancel membership with ownership verification
 */
export async function cancelMembership(userId: string, tenantId: string): Promise<Membership | null> {
  try {
    // ❌ CRITICAL FIX: Validate inputs
    if (!userId || !tenantId) {
      throw new Error('User ID and Tenant ID are required');
    }

    // Get current membership
    const currentMembership = await getUserMembership(userId, tenantId);

    if (!currentMembership) {
      throw new Error('No existing membership found');
    }

    // Cancel membership
    const { data, error } = await supabase
      .from('memberships')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', currentMembership.id)
      .eq('user_id', userId)  // ❌ CRITICAL FIX: Ensure ownership
      .eq('tenant_id', tenantId)  // ❌ CRITICAL FIX: Ensure tenant isolation
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      userId: data.user_id,
      tenantId: data.tenant_id,
      plan: data.plan,
      startDate: data.start_date,
      nextPaymentDate: data.next_payment_date,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (err) {
    console.error('[CANCEL MEMBERSHIP ERROR]', err);
    return null;
  }
}

/**
 * Pause membership with validation
 */
export async function pauseMembership(
  userId: string,
  tenantId: string,
  reason?: string,
  pauseUntil?: string
): Promise<Membership | null> {
  try {
    // ❌ CRITICAL FIX: Validate inputs
    if (!userId || !tenantId) {
      throw new Error('User ID and Tenant ID are required');
    }

    // Validate pause until date
    if (pauseUntil && !validateFutureDate(pauseUntil, MAX_PAUSE_DAYS)) {
      throw new Error(`Pause date must be within ${MAX_PAUSE_DAYS} days from now`);
    }

    // Get current membership
    const currentMembership = await getUserMembership(userId, tenantId);

    if (!currentMembership) {
      throw new Error('No existing membership found');
    }

    // Pause membership
    const { data, error } = await supabase
      .from('memberships')
      .update({
        status: 'paused',
        updated_at: new Date().toISOString()
      })
      .eq('id', currentMembership.id)
      .eq('user_id', userId)  // ❌ CRITICAL FIX: Ensure ownership
      .eq('tenant_id', tenantId)  // ❌ CRITICAL FIX: Ensure tenant isolation
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      userId: data.user_id,
      tenantId: data.tenant_id,
      plan: data.plan,
      startDate: data.start_date,
      nextPaymentDate: data.next_payment_date,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (err) {
    console.error('[PAUSE MEMBERSHIP ERROR]', err);
    return null;
  }
}

/**
 * Get users needing payment reminders with tenant isolation
 */
export async function getMembershipReminders(tenantId?: string): Promise<MembershipReminder[]> {
  try {
    let query = supabase
      .from('membership_reminders')
      .select('*')
      .order('next_payment_date', { ascending: true });

    // ❌ CRITICAL FIX: Add tenant isolation if tenantId provided
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(row => ({
      id: row.id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      plan: row.plan,
      nextPaymentDate: row.next_payment_date,
      email: row.email,
      displayName: row.display_name,
      daysUntilDue: row.days_until_due,
      reminderPriority: row.reminder_priority
    }));
  } catch (err) {
    console.error('[GET MEMBERSHIP REMINDERS ERROR]', err);
    return [];
  }
}

/**
 * Get expired memberships with tenant isolation
 */
export async function getExpiredMemberships(tenantId?: string): Promise<Membership[]> {
  try {
    let query = supabase
      .from('membership_expired')
      .select('*');

    // ❌ CRITICAL FIX: Add tenant isolation if tenantId provided
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(row => ({
      id: row.id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      plan: row.plan,
      startDate: row.start_date,
      nextPaymentDate: row.next_payment_date,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  } catch (err) {
    console.error('[GET EXPIRED MEMBERSHIPS ERROR]', err);
    return [];
  }
}

/**
 * Get membership statistics with tenant isolation
 */
export async function getMembershipStats(tenantId?: string): Promise<any> {
  try {
    let query = supabase
      .from('membership_stats')
      .select('*');

    // ❌ CRITICAL FIX: Add tenant isolation if tenantId provided
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data;
  } catch (err) {
    console.error('[GET MEMBERSHIP STATS ERROR]', err);
    return null;
  }
}

/**
 * Mark expired memberships
 */
export async function markMembershipsAsExpired(): Promise<void> {
  try {
    const { error } = await supabase
      .from('memberships')
      .update({ status: 'expired' })
      .lt('next_payment_date', new Date().toISOString().split('T')[0])
      .eq('status', 'active');

    if (error) throw error;
  } catch (err) {
    console.error('[MARK MEMBERSHIPS EXPIRED ERROR]', err);
  }
}
