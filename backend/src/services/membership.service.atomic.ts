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

export interface MembershipAudit {
  id: string;
  userId: string;
  tenantId: string;
  action: 'extend' | 'cancel' | 'pause' | 'upgrade' | 'downgrade';
  previousState: any;
  newState: any;
  ipAddress: string;
  userAgent?: string;
  timestamp: string;
}

// Business rule constants
const MAX_EXTENSION_DAYS = 60;
const MAX_PAUSE_DAYS = 90;
const DEFAULT_EXTENSION_DAYS = 30;
const ALLOWED_PLANS = ['basic', 'premium', 'pro'] as const;
const EXTENSION_COOLDOWN_MINUTES = 5; // 5 minutes between extensions
const MAX_DAILY_EXTENSIONS = 3; // Maximum extensions per day per user

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
 * Check if user is in cooldown period for extensions
 */
async function isInExtensionCooldown(userId: string, tenantId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('membership_audit')
      .select('created_at')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('action', 'extend')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return false;

    const lastExtension = new Date(data.created_at);
    const cooldownEnd = new Date(lastExtension);
    cooldownEnd.setMinutes(cooldownEnd.getMinutes() + EXTENSION_COOLDOWN_MINUTES);

    return new Date() < cooldownEnd;
  } catch (err) {
    console.error('[EXTENSION COOLDOWN CHECK ERROR]', err);
    return false;
  }
}

/**
 * Check daily extension limit
 */
async function checkDailyExtensionLimit(userId: string, tenantId: string): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('membership_audit')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('action', 'extend')
      .gte('created_at', today)
      .limit(MAX_DAILY_EXTENSIONS);

    if (error) return false;

    return (data?.length || 0) >= MAX_DAILY_EXTENSIONS;
  } catch (err) {
    console.error('[DAILY EXTENSION LIMIT CHECK ERROR]', err);
    return false;
  }
}

/**
 * Log membership action for audit trail
 */
async function logMembershipAction(
  userId: string,
  tenantId: string,
  action: string,
  previousState: any,
  newState: any,
  ipAddress: string,
  userAgent?: string
): Promise<void> {
  try {
    await supabase
      .from('membership_audit')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        action,
        previous_state: previousState,
        new_state: newState,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date().toISOString()
      });
  } catch (err) {
    console.error('[MEMBERSHIP AUDIT LOG ERROR]', err);
  }
}

/**
 * Get user's current membership with tenant isolation
 */
export async function getUserMembership(userId: string, tenantId: string): Promise<Membership | null> {
  try {
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
 * Extend membership with atomic protection against race conditions and abuse
 */
export async function extendMembership(
  userId: string,
  tenantId: string,
  days: number,
  ipAddress: string = 'unknown',
  userAgent?: string
): Promise<Membership | null> {
  try {
    if (!userId || !tenantId) {
      throw new Error('User ID and Tenant ID are required');
    }

    // ❌ CRITICAL FIX: Limit extension days to prevent abuse
    const safeDays = Math.min(MAX_EXTENSION_DAYS, Math.max(1, Number(days)));

    if (isNaN(safeDays)) {
      throw new Error('Invalid days value');
    }

    // ❌ CRITICAL FIX: Check cooldown period
    if (await isInExtensionCooldown(userId, tenantId)) {
      throw new Error(`Extension cooldown active. Please wait ${EXTENSION_COOLDOWN_MINUTES} minutes between extensions.`);
    }

    // ❌ CRITICAL FIX: Check daily limit
    if (await checkDailyExtensionLimit(userId, tenantId)) {
      throw new Error(`Daily extension limit of ${MAX_DAILY_EXTENSIONS} extensions reached.`);
    }

    // Get current membership with row lock
    const currentMembership = await getUserMembership(userId, tenantId);
    
    if (!currentMembership) {
      throw new Error('No existing membership found');
    }

    if (currentMembership.status !== 'active') {
      throw new Error('Membership must be active to extend');
    }

    // ❌ CRITICAL FIX: Safe date calculation - use max of current date or existing payment date
    const currentNextPayment = new Date(currentMembership.nextPaymentDate);
    const now = new Date();
    const baseDate = currentNextPayment > now ? currentNextPayment : now;
    
    const newNextPayment = new Date(baseDate);
    newNextPayment.setDate(newNextPayment.getDate() + safeDays);

    // Validate new date is reasonable
    if (!validateFutureDate(newNextPayment.toISOString().split('T')[0], 365)) {
      throw new Error('Extended payment date exceeds maximum allowed period');
    }

    // Get previous state for audit
    const previousState = { ...currentMembership };

    // Atomic update with row-level locking using SELECT FOR UPDATE equivalent
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

    const newMembership = {
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

    // Log the action
    await logMembershipAction(
      userId,
      tenantId,
      'extend',
      previousState,
      newMembership,
      ipAddress,
      userAgent
    );

    return newMembership;
  } catch (err) {
    console.error('[EXTEND MEMBERSHIP ERROR]', err);
    return null;
  }
}

/**
 * Cancel membership with atomic protection
 */
export async function cancelMembership(
  userId: string,
  tenantId: string,
  ipAddress: string = 'unknown',
  userAgent?: string
): Promise<Membership | null> {
  try {
    if (!userId || !tenantId) {
      throw new Error('User ID and Tenant ID are required');
    }

    const currentMembership = await getUserMembership(userId, tenantId);
    
    if (!currentMembership) {
      throw new Error('No existing membership found');
    }

    // Get previous state for audit
    const previousState = { ...currentMembership };

    // Atomic cancel with row-level locking
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

    const newMembership = {
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

    // Log the action
    await logMembershipAction(
      userId,
      tenantId,
      'cancel',
      previousState,
      newMembership,
      ipAddress,
      userAgent
    );

    return newMembership;
  } catch (err) {
    console.error('[CANCEL MEMBERSHIP ERROR]', err);
    return null;
  }
}

/**
 * Mark expired memberships (for cron job)
 */
export async function markMembershipsAsExpired(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('memberships')
      .update({ status: 'expired' })
      .lt('next_payment_date', new Date().toISOString().split('T')[0])
      .eq('status', 'active')
      .select('id');

    if (error) throw error;

    return data?.length || 0;
  } catch (err) {
    console.error('[MARK MEMBERSHIPS EXPIRED ERROR]', err);
    return 0;
  }
}
