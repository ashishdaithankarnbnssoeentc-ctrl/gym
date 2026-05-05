/**
 * Admin Controller
 * 
 * Backend-controlled admin management with predictable role changes
 * Includes safety checks and audit logging
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import AdminManagementService from '../services/admin.management.service.js';
import { requireAuth, requireAdmin } from '../middleware/auth.secure.js';

// Validation schemas
const promoteAdminSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid()
});

const demoteAdminSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid()
});

const transferAdminSchema = z.object({
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid(),
  tenantId: z.string().uuid()
});

const emergencyRecoverySchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  recoveryKey: z.string().min(32)
});

export class AdminController {
  /**
   * Promote user to admin
   * Backend-controlled with validation
   */
  static async promoteToAdmin(req: Request, res: Response) {
    try {
      // Validate request
      const validatedData = promoteAdminSchema.parse(req.body);
      
      // Validate operator is admin
      const validation = await AdminManagementService.validateAdminOperation(
        req.user!.id,
        validatedData.tenantId,
        'promote',
        validatedData.userId
      );
      
      if (!validation.valid) {
        return res.status(403).json({
          success: false,
          message: validation.reason
        });
      }

      // Promote user
      const result = await AdminManagementService.promoteToAdmin(
        validatedData.userId,
        validatedData.tenantId,
        req.user!.id
      );

      return res.json({
        success: true,
        message: 'User promoted to admin successfully',
        data: result
      });

    } catch (error) {
      console.error('Admin promotion failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to promote user to admin'
      });
    }
  }

  /**
   * Demote admin to member
   * Includes last admin protection
   */
  static async demoteFromAdmin(req: Request, res: Response) {
    try {
      // Validate request
      const validatedData = demoteAdminSchema.parse(req.body);
      
      // Validate operator is admin
      const validation = await AdminManagementService.validateAdminOperation(
        req.user!.id,
        validatedData.tenantId,
        'demote',
        validatedData.userId
      );
      
      if (!validation.valid) {
        return res.status(403).json({
          success: false,
          message: validation.reason
        });
      }

      // Demote admin
      const result = await AdminManagementService.demoteFromAdmin(
        validatedData.userId,
        validatedData.tenantId,
        req.user!.id
      );

      return res.json({
        success: true,
        message: 'Admin demoted to member successfully',
        data: result
      });

    } catch (error) {
      console.error('Admin demotion failed:', error);
      
      if (error.message.includes('Cannot demote last admin')) {
        return res.status(403).json({
          success: false,
          message: 'Cannot demote the last admin in tenant'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to demote admin'
      });
    }
  }

  /**
   * Transfer admin role
   * Safe transfer between users
   */
  static async transferAdminRole(req: Request, res: Response) {
    try {
      // Validate request
      const validatedData = transferAdminSchema.parse(req.body);
      
      // Validate operator is admin
      const validation = await AdminManagementService.validateAdminOperation(
        req.user!.id,
        validatedData.tenantId,
        'transfer'
      );
      
      if (!validation.valid) {
        return res.status(403).json({
          success: false,
          message: validation.reason
        });
      }

      // Transfer admin role
      const result = await AdminManagementService.transferAdminRole(
        validatedData.fromUserId,
        validatedData.toUserId,
        validatedData.tenantId,
        req.user!.id
      );

      return res.json({
        success: true,
        message: 'Admin role transferred successfully',
        data: result
      });

    } catch (error) {
      console.error('Admin role transfer failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to transfer admin role'
      });
    }
  }

  /**
   * Get all admins in tenant
   */
  static async getTenantAdmins(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      
      const admins = await AdminManagementService.getTenantAdmins(tenantId);

      return res.json({
        success: true,
        data: admins
      });

    } catch (error) {
      console.error('Failed to get tenant admins:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get tenant admins'
      });
    }
  }

  /**
   * Get admin activity log
   */
  static async getAdminActivityLog(req: Request, res: Response) {
    try {
      const tenantId = req.user!.tenantId;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const activity = await AdminManagementService.getAdminActivityLog(tenantId, limit);

      return res.json({
        success: true,
        data: activity
      });

    } catch (error) {
      console.error('Failed to get admin activity:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get admin activity'
      });
    }
  }

  /**
   * Check if user is admin
   */
  static async checkAdminStatus(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const tenantId = req.user!.tenantId;
      
      const isAdmin = await AdminManagementService.isAdmin(userId, tenantId);

      return res.json({
        success: true,
        data: {
          isAdmin,
          userId,
          tenantId
        }
      });

    } catch (error) {
      console.error('Failed to check admin status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check admin status'
      });
    }
  }

  /**
   * Emergency admin recovery
   * For emergency situations only
   */
  static async emergencyAdminRecovery(req: Request, res: Response) {
    try {
      // Validate request
      const validatedData = emergencyRecoverySchema.parse(req.body);
      
      // Perform emergency recovery
      const result = await AdminManagementService.emergencyAdminRecovery(
        validatedData.userId,
        validatedData.tenantId,
        validatedData.recoveryKey
      );

      return res.json({
        success: true,
        message: 'Emergency admin recovery completed',
        data: result
      });

    } catch (error) {
      console.error('Emergency admin recovery failed:', error);
      
      if (error.message.includes('Invalid recovery key')) {
        return res.status(401).json({
          success: false,
          message: 'Invalid recovery key'
        });
      }

      if (error.message.includes('Admins already exist')) {
        return res.status(400).json({
          success: false,
          message: 'Admins already exist, recovery not needed'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Emergency admin recovery failed'
      });
    }
  }
}

export default AdminController;
