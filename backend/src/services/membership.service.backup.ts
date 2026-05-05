/**
 * Membership Service
 * 
 * Handles membership lifecycle management
 * No payment processing - just tracking and reminders
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

/**
 * Get user's current membership
 */
export async function getUserMembership(userId: string, tenantId: string): Promise<Membership | null> {
  try {
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
 * Create or update membership
 */
export async function upsertMembership(
  userId: string,
  tenantId: string,
  plan: 'basic' | 'premium' | 'pro',
  startDate?: string
): Promise<Membership | null> {
  try {
    const membershipData = {
      user_id: userId,
      tenant_id: tenantId,
      plan,
      start_date: startDate || new Date().toISOString().split('T')[0],
      next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active' as const,
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
 * Get users needing payment reminders
 */
export async function getMembershipReminders(): Promise<MembershipReminder[]> {
  try {
    const { data, error } = await supabase
      .from('membership_reminders')
      .select('*')
      .order('next_payment_date', { ascending: true });

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
 * Get expired memberships
 */
export async function getExpiredMemberships(): Promise<Membership[]> {
  try {
    const { data, error } = await supabase
      .from('membership_expired')
      .select('*');

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
 * Mark memberships as expired
 */
export async function markMembershipsAsExpired(): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('memberships')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .lt('next_payment_date', today)
      .eq('status', 'active');

    if (error) throw error;

    return (data as any)?.length || 0;
  } catch (err) {
    console.error('[MARK EXPIRED MEMBERSHIPS ERROR]', err);
    return 0;
  }
}

/**
 * Extend membership (manual payment received)
 */
export async function extendMembership(
  membershipId: string,
  days: number = 30
): Promise<Membership | null> {
  try {
    // Get current membership
    const { data: current, error: fetchError } = await supabase
      .from('memberships')
      .select('next_payment_date')
      .eq('id', membershipId)
      .single();

    if (fetchError) throw fetchError;

    // Calculate new payment date
    const currentNextDate = new Date(current.next_payment_date);
    const newNextDate = new Date(currentNextDate.getTime() + days * 24 * 60 * 60 * 1000);

    // Update membership
    const { data, error } = await supabase
      .from('memberships')
      .update({
        next_payment_date: newNextDate.toISOString().split('T')[0],
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', membershipId)
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
 * Cancel membership
 */
export async function cancelMembership(membershipId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('memberships')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', membershipId);

    return !error;
  } catch (err) {
    console.error('[CANCEL MEMBERSHIP ERROR]', err);
    return false;
  }
}

/**
 * Pause membership
 */
export async function pauseMembership(membershipId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('memberships')
      .update({
        status: 'paused',
        updated_at: new Date().toISOString()
      })
      .eq('id', membershipId);

    return !error;
  } catch (err) {
    console.error('[PAUSE MEMBERSHIP ERROR]', err);
    return false;
  }
}
