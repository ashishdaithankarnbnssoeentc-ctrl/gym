/**
 * Admin Management Service
 * 
 * Backend-controlled role management with predictable behavior
 * Includes safety checks for admin operations
 */

import { supabase } from '../lib/supabase.js';

export class AdminManagementService {
  /**
   * Promote user to admin role
   * Backend-controlled with proper validation
   */
  static async promoteToAdmin(userId: string, tenantId: string, promotedBy: string): Promise<any> {
    try {
      // Validate user exists and is member of tenant
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, tenant_id, status')
        .eq('id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (userError || !user) {
        throw new Error('User not found or not in tenant');
      }

      if (user.status !== 'active') {
        throw new Error('Cannot promote inactive user');
      }

      // Check if user is already admin
      const { data: currentMembership, error: membershipError } = await supabase
        .from('memberships')
        .select('id, role, status')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (membershipError || !currentMembership) {
        throw new Error('User membership not found');
      }

      if (currentMembership.role === 'admin') {
        throw new Error('User is already admin');
      }

      // Promote to admin
      const { data: updatedMembership, error: updateError } = await supabase
        .from('memberships')
        .update({
          role: 'admin',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to promote user: ${updateError.message}`);
      }

      // Log the promotion
      await this.logRoleChange(userId, tenantId, 'member', 'admin', promotedBy, 'promotion');

      console.log(`User ${userId} promoted to admin in tenant ${tenantId} by ${promotedBy}`);
      
      return updatedMembership;
    } catch (error) {
      console.error('Admin promotion failed:', error);
      throw error;
    }
  }

  /**
   * Demote admin to member role
   * Includes safety check for last admin
   */
  static async demoteFromAdmin(userId: string, tenantId: string, demotedBy: string): Promise<any> {
    try {
      // Validate user exists and is admin
      const { data: currentMembership, error: membershipError } = await supabase
        .from('memberships')
        .select('id, role, status')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (membershipError || !currentMembership) {
        throw new Error('User membership not found');
      }

      if (currentMembership.role !== 'admin') {
        throw new Error('User is not admin');
      }

      // CRITICAL: Check if this is the last admin
      const { data: adminCount, error: countError } = await supabase
        .from('memberships')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('role', 'admin');

      if (countError) {
        throw new Error(`Failed to check admin count: ${countError.message}`);
      }

      if (!adminCount || adminCount.length <= 1) {
        throw new Error('Cannot demote the last admin in tenant');
      }

      // Demote to member
      const { data: updatedMembership, error: updateError } = await supabase
        .from('memberships')
        .update({
          role: 'member',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to demote user: ${updateError.message}`);
      }

      // Log the demotion
      await this.logRoleChange(userId, tenantId, 'admin', 'member', demotedBy, 'demotion');

      console.log(`User ${userId} demoted from admin in tenant ${tenantId} by ${demotedBy}`);
      
      return updatedMembership;
    } catch (error) {
      console.error('Admin demotion failed:', error);
      throw error;
    }
  }

  /**
   * Get all admins in tenant
   */
  static async getTenantAdmins(tenantId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select(`
          id,
          user_id,
          tenant_id,
          role,
          status,
          created_at,
          users (
            id,
            email,
            name
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('role', 'admin')
        .eq('status', 'active');

      if (error) {
        throw new Error(`Failed to get admins: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get tenant admins:', error);
      throw error;
    }
  }

  /**
   * Check if user is admin
   */
  static async isAdmin(userId: string, tenantId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select('role')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .eq('role', 'admin')
        .eq('status', 'active')
        .single();

      if (error) {
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Failed to check admin status:', error);
      return false;
    }
  }

  /**
   * Validate admin operations
   * Ensures proper authorization and business rules
   */
  static async validateAdminOperation(
    operatorId: string, 
    tenantId: string, 
    operation: string,
    targetUserId?: string
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      // Check if operator is admin
      const operatorIsAdmin = await this.isAdmin(operatorId, tenantId);
      if (!operatorIsAdmin) {
        return { valid: false, reason: 'Operator is not admin' };
      }

      // For demotion operations, check if target is self
      if (operation === 'demote' && targetUserId === operatorId) {
        return { valid: false, reason: 'Cannot demote yourself' };
      }

      // For demotion operations, check admin count
      if (operation === 'demote' && targetUserId) {
        const targetIsAdmin = await this.isAdmin(targetUserId, tenantId);
        if (!targetIsAdmin) {
          return { valid: false, reason: 'Target user is not admin' };
        }

        const admins = await this.getTenantAdmins(tenantId);
        if (admins.length <= 1) {
          return { valid: false, reason: 'Cannot demote the last admin' };
        }
      }

      // For promotion operations, check if target is already admin
      if (operation === 'promote' && targetUserId) {
        const targetIsAdmin = await this.isAdmin(targetUserId, tenantId);
        if (targetIsAdmin) {
          return { valid: false, reason: 'User is already admin' };
        }
      }

      return { valid: true };
    } catch (error) {
      console.error('Admin operation validation failed:', error);
      return { valid: false, reason: 'Validation error' };
    }
  }

  /**
   * Transfer admin role
   * Safely transfers admin role from one user to another
   */
  static async transferAdminRole(
    fromUserId: string, 
    toUserId: string, 
    tenantId: string, 
    transferredBy: string
  ): Promise<any> {
    try {
      // Validate both users exist
      const fromUser = await this.isAdmin(fromUserId, tenantId);
      const toUser = await this.isAdmin(toUserId, tenantId);

      if (!fromUser) {
        throw new Error('Source user is not admin');
      }

      if (toUser) {
        throw new Error('Target user is already admin');
      }

      // Promote new admin first
      await this.promoteToAdmin(toUserId, tenantId, transferredBy);

      // Then demote old admin
      await this.demoteFromAdmin(fromUserId, tenantId, transferredBy);

      // Log the transfer
      await this.logRoleChange(
        fromUserId, 
        tenantId, 
        'admin', 
        'member', 
        transferredBy, 
        'admin_transfer'
      );

      await this.logRoleChange(
        toUserId, 
        tenantId, 
        'member', 
        'admin', 
        transferredBy, 
        'admin_transfer'
      );

      console.log(`Admin role transferred from ${fromUserId} to ${toUserId} in tenant ${tenantId}`);
      
      return { success: true, from: fromUserId, to: toUserId };
    } catch (error) {
      console.error('Admin role transfer failed:', error);
      throw error;
    }
  }

  /**
   * Get admin activity log
   */
  static async getAdminActivityLog(tenantId: string, limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          user_id,
          action,
          details,
          created_at,
          users (
            email,
            name
          )
        `)
        .eq('tenant_id', tenantId)
        .or('action.eq.admin_promotion,action.eq.admin_demotion,action.eq.admin_transfer')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to get admin activity: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get admin activity:', error);
      throw error;
    }
  }

  /**
   * Log role changes for audit
   */
  private static async logRoleChange(
    userId: string,
    tenantId: string,
    fromRole: string,
    toRole: string,
    changedBy: string,
    action: string
  ): Promise<void> {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          action: `admin_${action}`,
          details: {
            from_role: fromRole,
            to_role: toRole,
            changed_by: changedBy,
            timestamp: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log role change:', error);
    }
  }

  /**
   * Emergency admin recovery
   * Creates new admin if no admins exist (emergency only)
   */
  static async emergencyAdminRecovery(tenantId: string, userId: string, recoveryKey: string): Promise<any> {
    try {
      // Verify recovery key (in production, use secure method)
      if (recoveryKey !== process.env.EMERGENCY_RECOVERY_KEY) {
        throw new Error('Invalid recovery key');
      }

      // Check if any admins exist
      const admins = await this.getTenantAdmins(tenantId);
      if (admins.length > 0) {
        throw new Error('Admins already exist, recovery not needed');
      }

      // Promote user to admin
      const { data: updatedMembership, error } = await supabase
        .from('memberships')
        .update({
          role: 'admin',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        throw new Error(`Emergency recovery failed: ${error.message}`);
      }

      // Log emergency recovery
      await this.logRoleChange(userId, tenantId, 'member', 'admin', 'emergency_recovery', 'emergency_recovery');

      console.log(`Emergency admin recovery: ${userId} promoted in tenant ${tenantId}`);
      
      return updatedMembership;
    } catch (error) {
      console.error('Emergency admin recovery failed:', error);
      throw error;
    }
  }
}

export default AdminManagementService;
