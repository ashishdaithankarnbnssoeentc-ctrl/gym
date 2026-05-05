/**
 * Automatic Membership Creation Service
 * 
 * Implements backend-controlled membership creation for new users
 * Option A: Backend-controlled approach (recommended)
 */

import { supabase } from '../lib/supabase.js';

export class AutomaticMembershipService {
  /**
   * Create membership for new user with tenant assignment
   * This should be called immediately after user registration
   */
  static async createMembershipForNewUser(userId: string, tenantId: string, isFirstUser: boolean = false): Promise<any> {
    try {
      // Check if membership already exists
      const { data: existingMembership } = await supabase
        .from('memberships')
        .select('id')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (existingMembership) {
        console.log(`Membership already exists for user ${userId} in tenant ${tenantId}`);
        return existingMembership;
      }

      // Create new membership with proper defaults
      const membershipData = {
        user_id: userId,
        tenant_id: tenantId,
        plan: 'basic',
        start_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        next_payment_date: new Date().toISOString().split('T')[0],
        status: 'active',
        role: isFirstUser ? 'admin' : 'member',
        payment_verified: true, // Auto-verified for basic plan
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: membership, error } = await supabase
        .from('memberships')
        .insert(membershipData)
        .select()
        .single();

      if (error) {
        console.error('Failed to create membership:', error);
        throw new Error(`Membership creation failed: ${error.message}`);
      }

      console.log(`Created membership for user ${userId} in tenant ${tenantId} with role ${membershipData.role}`);
      
      // Log the membership creation
      await this.logMembershipCreation(userId, tenantId, membershipData.role, isFirstUser);

      return membership;
    } catch (error) {
      console.error('Automatic membership creation failed:', error);
      throw error;
    }
  }

  /**
   * Check if user is the first user in tenant
   * Used to determine admin assignment
   */
  static async isFirstUserInTenant(tenantId: string): Promise<boolean> {
    try {
      const { data: existingUsers, error } = await supabase
        .from('users')
        .select('id')
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Failed to check existing users:', error);
        return false;
      }

      return !existingUsers || existingUsers.length === 0;
    } catch (error) {
      console.error('Error checking first user status:', error);
      return false;
    }
  }

  /**
   * Create user with automatic membership assignment
   * Combined operation for user registration
   */
  static async createUserWithMembership(userData: {
    email: string;
    firebase_uid: string;
    tenant_id: string;
    name?: string;
  }): Promise<any> {
    try {
      // Start transaction
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          email: userData.email,
          firebase_uid: userData.firebase_uid,
          tenant_id: userData.tenant_id,
          name: userData.name || userData.email.split('@')[0],
          status: 'active',
          is_admin: false, // Will be determined by membership
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (userError) {
        throw new Error(`User creation failed: ${userError.message}`);
      }

      // Check if this is the first user in tenant
      const isFirstUser = await this.isFirstUserInTenant(userData.tenant_id);

      // Create automatic membership
      await this.createMembershipForNewUser(
        user.id,
        userData.tenant_id,
        isFirstUser
      );

      return user;
    } catch (error) {
      console.error('User with membership creation failed:', error);
      throw error;
    }
  }

  /**
   * Bulk create memberships for existing users
   * Useful for migration scenarios
   */
  static async bulkCreateMemberships(tenantId: string): Promise<any[]> {
    try {
      // Get all users in tenant without memberships
      const { data: usersWithoutMembership, error } = await supabase
        .from('users')
        .select('id, email, tenant_id')
        .eq('tenant_id', tenantId)
        .is('memberships', 'null');

      if (error) {
        throw new Error(`Failed to fetch users: ${error.message}`);
      }

      if (!usersWithoutMembership || usersWithoutMembership.length === 0) {
        console.log(`All users in tenant ${tenantId} already have memberships`);
        return [];
      }

      // Check if any memberships exist to determine admin assignment
      const { data: existingMemberships } = await supabase
        .from('memberships')
        .select('id')
        .eq('tenant_id', tenantId)
        .limit(1);

      const hasExistingMemberships = existingMemberships && existingMemberships.length > 0;

      // Create memberships for all users
      const membershipsToCreate = usersWithoutMembership.map((user, index) => ({
        user_id: user.id,
        tenant_id: user.tenant_id,
        plan: 'basic',
        start_date: new Date().toISOString().split('T')[0],
        next_payment_date: new Date().toISOString().split('T')[0],
        status: 'active',
        role: (!hasExistingMemberships && index === 0) ? 'admin' : 'member',
        payment_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { data: createdMemberships, error: insertError } = await supabase
        .from('memberships')
        .insert(membershipsToCreate)
        .select();

      if (insertError) {
        throw new Error(`Bulk membership creation failed: ${insertError.message}`);
      }

      console.log(`Created ${createdMemberships.length} memberships for tenant ${tenantId}`);
      
      return createdMemberships;
    } catch (error) {
      console.error('Bulk membership creation failed:', error);
      throw error;
    }
  }

  /**
   * Validate membership consistency
   * Ensures all active users have memberships
   */
  static async validateMembershipConsistency(tenantId: string): Promise<{
    consistent: boolean;
    issues: string[];
  }> {
    try {
      const issues: string[] = [];

      // Check for users without memberships
      const { data: usersWithoutMembership, error: usersError } = await supabase
        .from('users')
        .select('id, email')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .is('memberships', 'null');

      if (usersError) {
        throw new Error(`Failed to check users: ${usersError.message}`);
      }

      if (usersWithoutMembership && usersWithoutMembership.length > 0) {
        issues.push(`${usersWithoutMembership.length} active users without memberships`);
      }

      // Check for memberships without users
      const { data: membershipsWithoutUsers, error: membershipsError } = await supabase
        .from('memberships')
        .select('id, user_id')
        .eq('tenant_id', tenantId)
        .is('users', 'null');

      if (membershipsError) {
        throw new Error(`Failed to check memberships: ${membershipsError.message}`);
      }

      if (membershipsWithoutUsers && membershipsWithoutUsers.length > 0) {
        issues.push(`${membershipsWithoutUsers.length} orphaned memberships`);
      }

      // Check for multiple admins in tenant
      const { data: adminCount, error: adminError } = await supabase
        .from('memberships')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('role', 'admin');

      if (adminError) {
        throw new Error(`Failed to check admins: ${adminError.message}`);
      }

      if (adminCount && adminCount.length > 1) {
        issues.push(`${adminCount.length} admins found (should be 1)`);
      }

      return {
        consistent: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('Membership consistency validation failed:', error);
      return {
        consistent: false,
        issues: [`Validation error: ${error.message}`]
      };
    }
  }

  /**
   * Fix membership consistency issues
   * Automatically resolves common problems
   */
  static async fixMembershipConsistency(tenantId: string): Promise<{
    fixed: boolean;
    actions: string[];
  }> {
    try {
      const actions: string[] = [];
      const validation = await this.validateMembershipConsistency(tenantId);

      if (!validation.consistent) {
        // Create missing memberships
        if (validation.issues.some(issue => issue.includes('users without memberships'))) {
          await this.bulkCreateMemberships(tenantId);
          actions.push('Created missing memberships');
        }

        // Remove orphaned memberships
        if (validation.issues.some(issue => issue.includes('orphaned memberships'))) {
          const { error } = await supabase
            .from('memberships')
            .delete()
            .eq('tenant_id', tenantId)
            .is('users', 'null');

          if (!error) {
            actions.push('Removed orphaned memberships');
          }
        }

        // Fix multiple admins
        if (validation.issues.some(issue => issue.includes('admins found'))) {
          const { data: admins } = await supabase
            .from('memberships')
            .select('id, user_id, created_at')
            .eq('tenant_id', tenantId)
            .eq('role', 'admin')
            .order('created_at', { ascending: true });

          if (admins && admins.length > 1) {
            // Keep the first admin, demote others
            const toDemote = admins.slice(1);
            for (const admin of toDemote) {
              await supabase
                .from('memberships')
                .update({ role: 'member', updated_at: new Date().toISOString() })
                .eq('id', admin.id);
            }
            actions.push(`Demoted ${toDemote.length} admins to members`);
          }
        }
      }

      return {
        fixed: actions.length > 0,
        actions
      };
    } catch (error) {
      console.error('Membership consistency fix failed:', error);
      return {
        fixed: false,
        actions: [`Fix failed: ${error.message}`]
      };
    }
  }

  /**
   * Log membership creation for audit purposes
   */
  private static async logMembershipCreation(
    userId: string,
    tenantId: string,
    role: string,
    isFirstUser: boolean
  ): Promise<void> {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          action: 'membership_created',
          details: {
            role,
            is_first_user: isFirstUser,
            created_by: 'automatic_service',
            timestamp: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log membership creation:', error);
    }
  }

  /**
   * Get membership statistics for tenant
   */
  static async getMembershipStats(tenantId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select('role, status, plan')
        .eq('tenant_id', tenantId);

      if (error) {
        throw new Error(`Failed to get stats: ${error.message}`);
      }

      const stats = {
        total: data?.length || 0,
        by_role: {},
        by_status: {},
        by_plan: {}
      };

      data?.forEach(membership => {
        stats.by_role[membership.role] = (stats.by_role[membership.role] || 0) + 1;
        stats.by_status[membership.status] = (stats.by_status[membership.status] || 0) + 1;
        stats.by_plan[membership.plan] = (stats.by_plan[membership.plan] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get membership stats:', error);
      throw error;
    }
  }
}

export default AutomaticMembershipService;
