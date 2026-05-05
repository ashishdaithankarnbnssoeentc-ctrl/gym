import { Request, Response, NextFunction } from 'express';
import { verifyFirebaseToken } from '../firebase.js';
import { logMissingTenantContext, logDatabaseTenantContextIssue } from '../lib/security.logger.js';

// Extend Request interface to include tenant info
declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
        role: 'admin' | 'user';
      };
    }
  }
}

// Tenant middleware - extracts tenant info from authenticated user
export function tenantMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip tenant check for health endpoint
      if (req.path === '/') {
        return next();
      }

      // Skip tenant check for public routes (if any)
      const publicRoutes = ['/api/content/public']; // Add public routes here
      if (publicRoutes.some(route => req.path.startsWith(route))) {
        return next();
      }

      // Ensure user is authenticated first
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      // Get tenant info from user
      const tenantId = req.user.tenantId;
      const role = (req.user as any).role || 'user';

      if (!tenantId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Tenant not found'
        });
      }

      // Set tenant context
      req.tenant = {
        id: tenantId,
        role: role as 'admin' | 'user'
      };

      // Add tenant context to logs
      console.log(`[${new Date().toISOString()}] TENANT: ${tenantId} USER: ${(req.user as any).uid} ROLE: ${role}`);

      next();
    } catch (error) {
      console.error('Tenant middleware error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to verify tenant'
      });
    }
  };
}

// Admin-only middleware
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.tenant || req.tenant.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required'
    });
  }
  next();
}

// Tenant-aware query builder helper
export class TenantQueryBuilder {
  public tenantId: string;
  public userId?: string;

  constructor(req: Request) {
    if (!req.tenant) {
      throw new Error('Tenant context not found');
    }
    this.tenantId = req.tenant.id;
    this.userId = req.user?.id;
  }

  // Add tenant filter to any query
  tenantFilter(tableAlias: string = ''): string {
    const prefix = tableAlias ? `${tableAlias}.` : '';
    return `${prefix}tenant_id = '${this.tenantId}'`;
  }

  // Add user filter for user-specific data
  userFilter(tableAlias: string = ''): string {
    const prefix = tableAlias ? `${tableAlias}.` : '';
    return `${prefix}user_id = ${this.userId}`;
  }

  // Combined tenant and user filter
  tenantUserFilter(tableAlias: string = ''): string {
    return `${this.tenantFilter(tableAlias)} AND ${this.userFilter(tableAlias)}`;
  }

  // Build complete WHERE clause
  whereClause(conditions: string[] = []): string {
    const tenantCondition = this.tenantFilter();
    const allConditions = [tenantCondition, ...conditions];
    return allConditions.filter(c => c).join(' AND ');
  }
}

// Helper to create tenant-aware controller
export function withTenantContext(handler: (req: Request, res: Response, queryBuilder: TenantQueryBuilder) => Promise<void>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const queryBuilder = new TenantQueryBuilder(req);
      await handler(req, res, queryBuilder);
    } catch (error) {
      next(error);
    }
  };
}

// Tenant validation middleware for cross-tenant operations
// Tenant context assertion - fail fast if no tenant context
export function assertTenantContext(req: Request): void {
  if (!req.tenant || !req.tenant.id) {
    logMissingTenantContext(req);
    throw new Error('Missing tenant context');
  }
}

// Stronger check for database client tenant context
export function assertDatabaseTenantSet(clientHasTenantSet: boolean, operation: string = 'database operation'): void {
  if (!clientHasTenantSet) {
    logDatabaseTenantContextIssue(operation);
    throw new Error('SET LOCAL app.tenant_id not applied');
  }
}

// Tenant validation middleware for cross-tenant operations
export function validateTenantAccess(req: Request, res: Response, next: NextFunction) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is trying to access data from another tenant
      const requestedTenantId = req.body?.tenant_id || req.params?.tenantId || req.query?.tenantId;

      if (requestedTenantId && requestedTenantId !== req.tenant?.id) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Cross-tenant access not allowed'
        });
      }

      next();
    } catch (error) {
      console.error('Tenant validation error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to validate tenant access'
      });
    }
  };
}
