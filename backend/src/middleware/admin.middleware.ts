/**
 * Admin Middleware
 * 
 * Enforces admin-only access for management endpoints
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Require admin role middleware
 * Blocks access to non-admin users
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Check if user exists and has admin role
  if (!req.user || (req.user as any).role !== 'admin') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Admin access required'
    });
  }

  next();
}

/**
 * Require tenant admin middleware
 * Ensures user can only manage their own tenant
 */
export function requireTenantAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  // Check if user is admin or tenant admin
  const userRole = (req.user as any).role;
  const allowedRoles = ['admin', 'tenant_admin', 'owner'];

  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Admin access required'
    });
  }

  next();
}

/**
 * Self-service middleware (users can manage their own data)
 * Allows users to access their own resources, admins can access all
 */
export function requireSelfOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  const targetUserId = req.params.userId || req.params.id;
  const currentUserId = req.user.id;
  const userRole = (req.user as any).role;

  // Admins can access any user data
  if (userRole === 'admin') {
    return next();
  }

  // Users can only access their own data
  if (targetUserId && targetUserId !== currentUserId) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'You can only access your own data'
    });
  }

  next();
}
