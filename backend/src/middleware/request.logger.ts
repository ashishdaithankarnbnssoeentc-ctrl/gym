/**
 * Request Logger Middleware
 * 
 * Logs critical request context for debugging and monitoring
 * Not for debugging now, but for when something weird happens later
 */

import { Request, Response, NextFunction } from 'express';

interface RequestLog {
  userId: string;
  tenantId: string;
  isAdmin: boolean;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  duration?: number;
  statusCode?: number;
}

class RequestLogger {
  private static logs: RequestLog[] = [];
  private static maxLogs = 1000; // Keep last 1000 requests

  static middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      // Extract critical context
      const userId = req.user?.id || 'anonymous';
      const tenantId = req.user?.tenantId || 'unknown';
      const isAdmin = req.user?.role === 'admin' || false;

      // Create log entry
      const logEntry: RequestLog = {
        userId,
        tenantId,
        isAdmin,
        method: req.method,
        path: req.path,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        timestamp: new Date().toISOString()
      };

      // Log to console for immediate visibility
      console.log('🔍 REQUEST CONTEXT:', {
        userId,
        tenantId,
        isAdmin,
        method: req.method,
        path: req.path,
        ip: req.ip
      });

      // Store log entry
      RequestLogger.logs.push(logEntry);

      // Clean up old logs
      if (RequestLogger.logs.length > RequestLogger.maxLogs) {
        RequestLogger.logs = RequestLogger.logs.slice(-RequestLogger.maxLogs);
      }

      // Add response completion logging
      res.on('finish', () => {
        logEntry.duration = Date.now() - startTime;
        logEntry.statusCode = res.statusCode;

        // Log completion
        console.log('✅ REQUEST COMPLETED:', {
          userId,
          tenantId,
          isAdmin,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: logEntry.duration
        });
      });

      next();
    };
  }

  /**
   * Get recent logs for debugging
   */
  static getRecentLogs(limit: number = 100): RequestLog[] {
    return RequestLogger.logs.slice(-limit);
  }

  /**
   * Get logs by user ID
   */
  static getLogsByUser(userId: string, limit: number = 50): RequestLog[] {
    return RequestLogger.logs
      .filter(log => log.userId === userId)
      .slice(-limit);
  }

  /**
   * Get logs by tenant ID
   */
  static getLogsByTenant(tenantId: string, limit: number = 50): RequestLog[] {
    return RequestLogger.logs
      .filter(log => log.tenantId === tenantId)
      .slice(-limit);
  }

  /**
   * Get admin activity logs
   */
  static getAdminLogs(limit: number = 100): RequestLog[] {
    return RequestLogger.logs
      .filter(log => log.isAdmin)
      .slice(-limit);
  }

  /**
   * Get failed requests (4xx, 5xx)
   */
  static getFailedRequests(limit: number = 50): RequestLog[] {
    return RequestLogger.logs
      .filter(log => log.statusCode && log.statusCode >= 400)
      .slice(-limit);
  }

  /**
   * Get slow requests (> 1000ms)
   */
  static getSlowRequests(limit: number = 50): RequestLog[] {
    return RequestLogger.logs
      .filter(log => log.duration && log.duration > 1000)
      .slice(-limit);
  }

  /**
   * Clear all logs
   */
  static clearLogs(): void {
    RequestLogger.logs = [];
  }

  /**
   * Export logs to JSON
   */
  static exportLogs(): string {
    return JSON.stringify(RequestLogger.logs, null, 2);
  }

  /**
   * Get log statistics
   */
  static getStats(): {
    total: number;
    uniqueUsers: number;
    uniqueTenants: number;
    adminRequests: number;
    failedRequests: number;
    averageDuration: number;
  } {
    const total = RequestLogger.logs.length;
    const uniqueUsers = new Set(RequestLogger.logs.map(log => log.userId)).size;
    const uniqueTenants = new Set(RequestLogger.logs.map(log => log.tenantId)).size;
    const adminRequests = RequestLogger.logs.filter(log => log.isAdmin).length;
    const failedRequests = RequestLogger.logs.filter(log => log.statusCode && log.statusCode >= 400).length;
    
    const durations = RequestLogger.logs
      .filter(log => log.duration !== undefined)
      .map(log => log.duration!);
    
    const averageDuration = durations.length > 0 
      ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length 
      : 0;

    return {
      total,
      uniqueUsers,
      uniqueTenants,
      adminRequests,
      failedRequests,
      averageDuration
    };
  }
}

export default RequestLogger;
