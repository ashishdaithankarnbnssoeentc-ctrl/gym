/**
 * Security Logging Utility
 * 
 * Provides centralized security logging for violations and suspicious activities
 */

import { Request } from 'express';

export interface SecurityLogContext {
  path?: string;
  method?: string;
  userId?: string;
  tenantId?: string;
  ip?: string;
  userAgent?: string;
  timestamp?: string;
  additionalData?: Record<string, any>;
}

/**
 * Log security violations with structured context
 */
export function logSecurityViolation(
  message: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  context: SecurityLogContext = {}
): void {
  const logEntry = {
    message: `SECURITY: ${message}`,
    severity,
    timestamp: context.timestamp || new Date().toISOString(),
    context: {
      path: context.path,
      method: context.method,
      userId: context.userId,
      tenantId: context.tenantId,
      ip: context.ip,
      userAgent: context.userAgent,
      ...context.additionalData
    }
  };

  // Use appropriate log level based on severity
  switch (severity) {
    case 'critical':
      console.error(JSON.stringify(logEntry));
      break;
    case 'high':
      console.error(JSON.stringify(logEntry));
      break;
    case 'medium':
      console.warn(JSON.stringify(logEntry));
      break;
    case 'low':
    default:
      console.log(JSON.stringify(logEntry));
      break;
  }
}

/**
 * Log missing tenant context
 */
export function logMissingTenantContext(req: Request): void {
  logSecurityViolation('Missing tenant context in request', 'high', {
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
}

/**
 * Log blocked admin action
 */
export function logBlockedAdminAction(req: Request, attemptedAction: string): void {
  logSecurityViolation('Blocked unauthorized admin action', 'medium', {
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    tenantId: req.tenant?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    additionalData: { attemptedAction }
  });
}

/**
 * Log cross-tenant access attempt
 */
export function logCrossTenantAccess(req: Request, targetTenantId: string): void {
  logSecurityViolation('Cross-tenant access attempt', 'high', {
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    tenantId: req.tenant?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    additionalData: { targetTenantId }
  });
}

/**
 * Log database tenant context issue
 */
export function logDatabaseTenantContextIssue(operation: string): void {
  logSecurityViolation('Database tenant context not properly set', 'critical', {
    timestamp: new Date().toISOString(),
    additionalData: { operation }
  });
}

/**
 * Log suspicious query patterns
 */
export function logSuspiciousQuery(req: Request, queryDetails: Record<string, any>): void {
  logSecurityViolation('Suspicious query pattern detected', 'medium', {
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    tenantId: req.tenant?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    additionalData: queryDetails
  });
}

/**
 * Log mass assignment attempt
 */
export function logMassAssignmentAttempt(req: Request, blockedFields: string[]): void {
  logSecurityViolation('Mass assignment attempt blocked', 'medium', {
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    tenantId: req.tenant?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    additionalData: { blockedFields }
  });
}
