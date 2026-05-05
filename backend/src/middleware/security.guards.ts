/**
 * Runtime Security Guards
 * 
 * Prevents security drift by enforcing critical invariants at runtime
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Guard against unauthorized service role usage
 */
export function guardServiceRoleUsage(req: Request, res: Response, next: NextFunction) {
  // Only allow service role in specific contexts
  const allowedPaths = [
    '/api/migrations',
    '/api/admin/maintenance',
    '/api/jobs'
  ];

  const isAllowedPath = allowedPaths.some(path => req.path.startsWith(path));
  const isServiceRole = req.headers['x-service-role'] === 'true';

  if (isServiceRole && !isAllowedPath && !process.env.ALLOW_SERVICE_ROLE) {
    return res.status(403).json({
      error: 'Service role usage not allowed in this context',
      path: req.path,
      timestamp: new Date().toISOString()
    });
  }

  next();
}

/**
 * Guard against missing tenant context before DB operations
 */
export function guardTenantContext(req: Request, res: Response, next: NextFunction) {
  // Skip for auth endpoints
  if (req.path.startsWith('/api/auth/')) {
    return next();
  }

  // Check if user has tenant context
  if (!req.user?.tenantId) {
    console.error('🚨 Missing tenant context:', {
      userId: req.user?.id,
      path: req.path,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    return res.status(500).json({
      error: 'Internal server error: Missing tenant context',
      requestId: req.headers['x-request-id']
    });
  }

  // Log tenant context for debugging
  console.log('🔒 Tenant context verified:', {
    userId: req.user?.id,
    tenantId: req.user?.tenantId,
    path: req.path,
    method: req.method
  });

  next();
}

/**
 * Guard against privileged operations without proper authorization
 */
export function guardPrivilegedOperations(req: Request, res: Response, next: NextFunction) {
  const privilegedPaths = [
    '/api/admin',
    '/api/users',
    '/api/memberships/bulk',
    '/api/content/bulk'
  ];

  const isPrivilegedPath = privilegedPaths.some(path => req.path.startsWith(path));

  if (isPrivilegedPath) {
    // Require admin role for privileged operations
    if ((req.user as any)?.role !== 'admin') {
      console.error('🚨 Unauthorized privileged access attempt:', {
        userId: req.user?.id,
        role: req.user?.role,
        path: req.path,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      return res.status(403).json({
        error: 'Admin access required for this operation',
        operation: req.method + ' ' + req.path
      });
    }

    // Log privileged operations
    console.log('🔐 Privileged operation authorized:', {
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  next();
}

/**
 * Guard against bulk operations without proper validation
 */
export function guardBulkOperations(req: Request, res: Response, next: NextFunction) {
  const isBulkPath = req.path.includes('/bulk');

  if (isBulkPath) {
    // Require explicit bulk operation header
    const bulkHeader = req.headers['x-bulk-operation'];

    if (!bulkHeader || bulkHeader !== 'true') {
      return res.status(400).json({
        error: 'Bulk operations require explicit X-Bulk-Operation header',
        path: req.path
      });
    }

    // Validate bulk operation size
    const body = req.body;
    const maxBulkSize = parseInt(process.env.MAX_BULK_SIZE || '100');

    if (Array.isArray(body) && body.length > maxBulkSize) {
      return res.status(400).json({
        error: `Bulk operation exceeds maximum size of ${maxBulkSize}`,
        requested: body.length,
        maximum: maxBulkSize
      });
    }

    console.log('📦 Bulk operation validated:', {
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      operation: req.path,
      size: Array.isArray(body) ? body.length : 1,
      timestamp: new Date().toISOString()
    });
  }

  next();
}

/**
 * Combined security guard middleware
 */
export function applySecurityGuards(req: Request, res: Response, next: NextFunction) {
  // Apply guards in sequence
  return guardServiceRoleUsage(req, res, () => {
    return guardTenantContext(req, res, () => {
      return guardPrivilegedOperations(req, res, () => {
        return guardBulkOperations(req, res, next);
      });
    });
  });
}
