/**
 * Structured Logging Service
 * 
 * Comprehensive security and operational logging
 * Provides forensic capabilities for security investigations
 */

import { supabase } from '../lib/supabase.js';

export interface LogContext {
  userId?: string;
  tenantId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  duration?: number;
  error?: string;
  [key: string]: any;
}

export interface SecurityLogEntry {
  userId?: string;
  tenantId?: string;
  requestId: string;
  event: string;
  success: boolean;
  ip: string;
  userAgent: string;
  endpoint?: string;
  method?: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface OperationalLogEntry {
  userId?: string;
  tenantId?: string;
  requestId: string;
  service: string;
  operation: string;
  success: boolean;
  duration: number;
  details: Record<string, any>;
  timestamp: string;
}

export class StructuredLoggingService {
  private static instance: StructuredLoggingService;
  private logQueue: Array<SecurityLogEntry | OperationalLogEntry> = [];
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds

  private constructor() {
    // Start periodic flush
    setInterval(() => this.flushLogs(), this.flushInterval);
  }

  static getInstance(): StructuredLoggingService {
    if (!StructuredLoggingService.instance) {
      StructuredLoggingService.instance = new StructuredLoggingService();
    }
    return StructuredLoggingService.instance;
  }

  /**
   * Log security events with full context
   */
  async logSecurityEvent(
    event: string,
    success: boolean,
    context: LogContext,
    details?: Record<string, any>
  ): Promise<void> {
    const logEntry: SecurityLogEntry = {
      userId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId || this.generateRequestId(),
      event,
      success,
      ip: context.ip || 'unknown',
      userAgent: context.userAgent || 'unknown',
      endpoint: context.endpoint,
      method: context.method,
      details: {
        ...details,
        duration: context.duration,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    // Add to queue for batch processing
    this.logQueue.push(logEntry);

    // Flush immediately for critical security events
    if (this.isCriticalSecurityEvent(event)) {
      await this.flushLogs();
    }

    // Also log to console for immediate visibility
    this.logToConsole('SECURITY', event, success, logEntry);
  }

  /**
   * Log operational events
   */
  async logOperationalEvent(
    service: string,
    operation: string,
    success: boolean,
    context: LogContext,
    details?: Record<string, any>
  ): Promise<void> {
    const logEntry: OperationalLogEntry = {
      userId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId || this.generateRequestId(),
      service,
      operation,
      success,
      duration: context.duration || 0,
      details: {
        ...details,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    this.logQueue.push(logEntry);
    this.logToConsole('OPERATIONAL', `${service}.${operation}`, success, logEntry);
  }

  /**
   * Log authentication events with enhanced context
   */
  async logAuthEvent(
    event: string,
    success: boolean,
    context: LogContext,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent(`auth_${event}`, success, context, {
      ...details,
      authFlow: true,
      sensitive: true
    });
  }

  /**
   * Log payment events with financial context
   */
  async logPaymentEvent(
    event: string,
    success: boolean,
    context: LogContext,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent(`payment_${event}`, success, context, {
      ...details,
      financial: true,
      sensitive: true
    });
  }

  /**
   * Log membership events with business context
   */
  async logMembershipEvent(
    event: string,
    success: boolean,
    context: LogContext,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent(`membership_${event}`, success, context, {
      ...details,
      business: true
    });
  }

  /**
   * Log API calls with performance metrics
   */
  async logApiCall(
    endpoint: string,
    method: string,
    statusCode: number,
    context: LogContext,
    details?: Record<string, any>
  ): Promise<void> {
    const success = statusCode < 400;
    await this.logOperationalEvent('api', `${method} ${endpoint}`, success, context, {
      ...details,
      statusCode,
      endpoint,
      method
    });
  }

  /**
   * Log database operations
   */
  async logDatabaseOperation(
    operation: string,
    table: string,
    success: boolean,
    context: LogContext,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logOperationalEvent('database', `${operation}_${table}`, success, context, {
      ...details,
      table,
      operation
    });
  }

  /**
   * Log rate limiting events
   */
  async logRateLimitEvent(
    endpoint: string,
    limitType: string,
    context: LogContext,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent('rate_limit_exceeded', false, context, {
      ...details,
      endpoint,
      limitType,
      protection: true
    });
  }

  /**
   * Log anomaly detection events
   */
  async logAnomalyEvent(
    anomalyType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context: LogContext,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent(`anomaly_${anomalyType}`, false, context, {
      ...details,
      anomalyType,
      severity,
      detection: true
    });
  }

  /**
   * Get security summary for monitoring
   */
  async getSecuritySummary(tenantId?: string, timeWindowHours: number = 24): Promise<any> {
    try {
      const timeWindow = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000).toISOString();
      
      let query = supabase
        .from('security_events')
        .select('*')
        .gte('created_at', timeWindow);

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const summary = {
        totalEvents: data?.length || 0,
        failedEvents: data?.filter(e => !e.success).length || 0,
        authFailures: data?.filter(e => e.event === 'auth_failure').length || 0,
        blockedUsers: data?.filter(e => e.event === 'user_blocked').length || 0,
        anomalies: data?.filter(e => e.event.startsWith('anomaly_')).length || 0,
        rateLimits: data?.filter(e => e.event === 'rate_limit_exceeded').length || 0,
        lastActivity: data?.length > 0 ? data[data.length - 1].created_at : null,
        criticalEvents: data?.filter(e => 
          e.event.includes('critical') || 
          e.event.includes('admin') ||
          e.event.includes('payment')
        ).length || 0
      };

      return summary;
    } catch (error) {
      console.error('Failed to get security summary:', error);
      return null;
    }
  }

  /**
   * Get user activity timeline
   */
  async getUserActivityTimeline(
    userId: string,
    tenantId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get user activity timeline:', error);
      return [];
    }
  }

  /**
   * Search logs for investigations
   */
  async searchLogs(filters: {
    userId?: string;
    tenantId?: string;
    event?: string;
    success?: boolean;
    startTime?: string;
    endTime?: string;
    ip?: string;
  }): Promise<any[]> {
    try {
      let query = supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.userId) query = query.eq('user_id', filters.userId);
      if (filters.tenantId) query = query.eq('tenant_id', filters.tenantId);
      if (filters.event) query = query.eq('event', filters.event);
      if (filters.success !== undefined) query = query.eq('success', filters.success);
      if (filters.ip) query = query.eq('ip', filters.ip);
      if (filters.startTime) query = query.gte('created_at', filters.startTime);
      if (filters.endTime) query = query.lte('created_at', filters.endTime);

      const { data, error } = await query.limit(1000);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to search logs:', error);
      return [];
    }
  }

  /**
   * Flush queued logs to database
   */
  private async flushLogs(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const batch = this.logQueue.splice(0, this.batchSize);
    
    try {
      // Separate security and operational logs
      const securityLogs = batch.filter(log => 'event' in log) as SecurityLogEntry[];
      const operationalLogs = batch.filter(log => 'service' in log) as OperationalLogEntry[];

      // Insert security logs
      if (securityLogs.length > 0) {
        const { error } = await supabase
          .from('security_events')
          .insert(securityLogs.map(log => ({
            user_id: log.userId,
            tenant_id: log.tenantId,
            request_id: log.requestId,
            event: log.event,
            success: log.success,
            ip: log.ip,
            user_agent: log.userAgent,
            endpoint: log.endpoint,
            method: log.method,
            details: log.details,
            created_at: log.timestamp
          })));

        if (error) {
          console.error('Failed to insert security logs:', error);
          // Re-queue failed logs
          this.logQueue.unshift(...securityLogs);
        }
      }

      // Insert operational logs (would go to operational_logs table)
      if (operationalLogs.length > 0) {
        // For now, also store in security_events with different event prefix
        const { error } = await supabase
          .from('security_events')
          .insert(operationalLogs.map(log => ({
            user_id: log.userId,
            tenant_id: log.tenantId,
            request_id: log.requestId,
            event: `ops_${log.service}_${log.operation}`,
            success: log.success,
            ip: 'system',
            user_agent: 'system',
            details: log.details,
            created_at: log.timestamp
          })));

        if (error) {
          console.error('Failed to insert operational logs:', error);
          // Re-queue failed logs
          this.logQueue.unshift(...operationalLogs);
        }
      }
    } catch (error) {
      console.error('Failed to flush logs:', error);
      // Re-queue all failed logs
      this.logQueue.unshift(...batch);
    }
  }

  /**
   * Check if event is critical and should be flushed immediately
   */
  private isCriticalSecurityEvent(event: string): boolean {
    const criticalEvents = [
      'auth_failure',
      'user_blocked',
      'payment_failure',
      'membership_suspicious',
      'admin_access_denied',
      'rate_limit_exceeded',
      'anomaly_critical'
    ];

    return criticalEvents.some(critical => event.includes(critical));
  }

  /**
   * Log to console with structured format
   */
  private logToConsole(
    type: 'SECURITY' | 'OPERATIONAL',
    event: string,
    success: boolean,
    logEntry: SecurityLogEntry | OperationalLogEntry
  ): void {
    const status = success ? '✅' : '❌';
    const message = `${status} [${type}] ${event}`;
    
    console.log(message, {
      requestId: logEntry.requestId,
      userId: logEntry.userId,
      tenantId: logEntry.tenantId,
      ip: logEntry.ip,
      timestamp: logEntry.timestamp,
      details: logEntry.details
    });
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup old logs (call periodically)
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
      
      const { error } = await supabase
        .from('security_events')
        .delete()
        .lt('created_at', cutoffDate);

      if (error) throw error;

      console.log(`Cleaned up security events older than ${retentionDays} days`);
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }
}

// Export singleton instance
export const structuredLogger = StructuredLoggingService.getInstance();

// Export convenience functions
export const logSecurityEvent = (event: string, success: boolean, context: LogContext, details?: Record<string, any>) =>
  structuredLogger.logSecurityEvent(event, success, context, details);

export const logAuthEvent = (event: string, success: boolean, context: LogContext, details?: Record<string, any>) =>
  structuredLogger.logAuthEvent(event, success, context, details);

export const logPaymentEvent = (event: string, success: boolean, context: LogContext, details?: Record<string, any>) =>
  structuredLogger.logPaymentEvent(event, success, context, details);

export const logMembershipEvent = (event: string, success: boolean, context: LogContext, details?: Record<string, any>) =>
  structuredLogger.logMembershipEvent(event, success, context, details);

export const logApiCall = (endpoint: string, method: string, statusCode: number, context: LogContext, details?: Record<string, any>) =>
  structuredLogger.logApiCall(endpoint, method, statusCode, context, details);

export const logRateLimitEvent = (endpoint: string, limitType: string, context: LogContext, details?: Record<string, any>) =>
  structuredLogger.logRateLimitEvent(endpoint, limitType, context, details);

export const logAnomalyEvent = (anomalyType: string, severity: 'low' | 'medium' | 'high' | 'critical', context: LogContext, details?: Record<string, any>) =>
  structuredLogger.logAnomalyEvent(anomalyType, severity, context, details);
