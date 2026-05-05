/**
 * Anomaly Detection Service
 * 
 * Detects and alerts on suspicious user behavior patterns
 * including rapid membership extensions, unusual login patterns,
 * and potential abuse scenarios.
 */

import { supabase } from '../lib/supabase.js';

export interface AnomalyEvent {
  userId: string;
  tenantId: string;
  type: 'rapid_extensions' | 'suspicious_login' | 'payment_anomaly' | 'usage_spike' | 'failed_attempts';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata: Record<string, any>;
  detectedAt: Date;
}

export interface AnomalyConfig {
  maxExtensionsPerHour: number;
  maxExtensionsPerDay: number;
  maxFailedLoginsPerHour: number;
  maxConcurrentSessions: number;
  unusualLoginLocationThreshold: number; // km
  paymentAmountThreshold: number; // percentage above normal
}

const DEFAULT_CONFIG: AnomalyConfig = {
  maxExtensionsPerHour: 3,
  maxExtensionsPerDay: 5,
  maxFailedLoginsPerHour: 10,
  maxConcurrentSessions: 3,
  unusualLoginLocationThreshold: 1000, // 1000km
  paymentAmountThreshold: 200 // 200% above normal
};

export class AnomalyDetectionService {
  private config: AnomalyConfig;

  constructor(config: Partial<AnomalyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check for rapid membership extensions
   */
  async detectRapidExtensions(userId: string, tenantId: string): Promise<AnomalyEvent | null> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      // Check extensions in the last hour
      const { data: hourlyExtensions, error: hourlyError } = await supabase
        .from('membership_audit')
        .select('created_at')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .eq('action', 'extend')
        .gte('created_at', oneHourAgo.toISOString())
        .lte('created_at', now.toISOString());

      if (hourlyError) throw hourlyError;

      // Check extensions in the last day
      const { data: dailyExtensions, error: dailyError } = await supabase
        .from('membership_audit')
        .select('created_at')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .eq('action', 'extend')
        .gte('created_at', oneDayAgo.toISOString())
        .lte('created_at', now.toISOString());

      if (dailyError) throw dailyError;

      const hourlyCount = hourlyExtensions?.length || 0;
      const dailyCount = dailyExtensions?.length || 0;

      // Detect anomalies
      if (hourlyCount >= this.config.maxExtensionsPerHour) {
        return {
          userId,
          tenantId,
          type: 'rapid_extensions',
          severity: hourlyCount >= this.config.maxExtensionsPerHour * 2 ? 'critical' : 'high',
          description: `User extended membership ${hourlyCount} times in the last hour`,
          metadata: { hourlyCount, dailyCount },
          detectedAt: now
        };
      }

      if (dailyCount >= this.config.maxExtensionsPerDay) {
        return {
          userId,
          tenantId,
          type: 'rapid_extensions',
          severity: dailyCount >= this.config.maxExtensionsPerDay * 2 ? 'high' : 'medium',
          description: `User extended membership ${dailyCount} times in the last day`,
          metadata: { hourlyCount, dailyCount },
          detectedAt: now
        };
      }

      return null;
    } catch (error) {
      console.error('Error detecting rapid extensions:', error);
      return null;
    }
  }

  /**
   * Check for suspicious login patterns
   */
  async detectSuspiciousLogins(userId: string, tenantId: string, currentIP: string, userAgent: string): Promise<AnomalyEvent | null> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    try {
      // Check failed login attempts
      const { data: failedLogins, error: failedError } = await supabase
        .from('auth_events')
        .select('ip_address, created_at')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .eq('event', 'auth_failure')
        .gte('created_at', oneHourAgo.toISOString())
        .lte('created_at', now.toISOString());

      if (failedError) throw failedError;

      // Check concurrent sessions from different IPs
      const { data: activeSessions, error: sessionsError } = await supabase
        .from('user_sessions')
        .select('ip_address, user_agent, created_at')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .eq('active', true);

      if (sessionsError) throw sessionsError;

      // Check for unusual login locations
      const { data: recentLogins, error: locationError } = await supabase
        .from('auth_events')
        .select('ip_address, created_at')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .eq('event', 'auth_success')
        .gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .order('created_at', { ascending: false })
        .limit(10);

      if (locationError) throw locationError;

      const failedCount = failedLogins?.length || 0;
      const concurrentIPs = new Set(activeSessions?.map(s => s.ip_address) || []).size;
      
      // Detect anomalies
      if (failedCount >= this.config.maxFailedLoginsPerHour) {
        return {
          userId,
          tenantId,
          type: 'failed_attempts',
          severity: failedCount >= this.config.maxFailedLoginsPerHour * 2 ? 'critical' : 'high',
          description: `${failedCount} failed login attempts in the last hour`,
          metadata: { failedCount, currentIP },
          detectedAt: now
        };
      }

      if (concurrentIPs >= this.config.maxConcurrentSessions) {
        return {
          userId,
          tenantId,
          type: 'suspicious_login',
          severity: 'medium',
          description: `Active sessions from ${concurrentIPs} different IP addresses`,
          metadata: { concurrentIPs, currentIP },
          detectedAt: now
        };
      }

      // Check for unusual login location (geolocation would need external service)
      if (recentLogins && recentLogins.length > 1) {
        const lastIP = recentLogins[1]?.ip_address;
        if (lastIP && lastIP !== currentIP) {
          // In a real implementation, you'd use a geolocation service
          // For now, just flag different IPs as potentially suspicious
          return {
            userId,
            tenantId,
            type: 'suspicious_login',
            severity: 'low',
            description: 'Login from different IP address than usual',
            metadata: { lastIP, currentIP },
            detectedAt: now
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error detecting suspicious logins:', error);
      return null;
    }
  }

  /**
   * Check for payment anomalies
   */
  async detectPaymentAnomalies(userId: string, tenantId: string, amount: number, plan: string): Promise<AnomalyEvent | null> {
    try {
      // Get normal pricing for this plan
      const { data: planPricing, error: pricingError } = await supabase
        .from('plan_pricing')
        .select('price')
        .eq('plan', plan)
        .single();

      if (pricingError) throw pricingError;

      const normalPrice = planPricing?.price || 0;
      
      if (normalPrice > 0) {
        const percentageIncrease = ((amount - normalPrice) / normalPrice) * 100;

        if (percentageIncrease >= this.config.paymentAmountThreshold) {
          return {
            userId,
            tenantId,
            type: 'payment_anomaly',
            severity: percentageIncrease >= this.config.paymentAmountThreshold * 2 ? 'high' : 'medium',
            description: `Payment amount ${percentageIncrease.toFixed(1)}% above normal pricing`,
            metadata: { amount, normalPrice, percentageIncrease, plan },
            detectedAt: new Date()
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error detecting payment anomalies:', error);
      return null;
    }
  }

  /**
   * Check for usage spikes
   */
  async detectUsageSpikes(userId: string, tenantId: string): Promise<AnomalyEvent | null> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      // Get recent API usage
      const { data: recentUsage, error: usageError } = await supabase
        .from('usage_logs')
        .select('endpoint, created_at')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .gte('created_at', oneHourAgo.toISOString())
        .lte('created_at', now.toISOString());

      if (usageError) throw usageError;

      // Get baseline usage (average over last week)
      const { data: baselineUsage, error: baselineError } = await supabase
        .from('usage_logs')
        .select('created_at')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .lt('created_at', oneDayAgo.toISOString());

      if (baselineError) throw baselineError;

      const currentHourUsage = recentUsage?.length || 0;
      const baselineHourlyAverage = (baselineUsage?.length || 0) / (7 * 24); // Average per hour over week

      if (baselineHourlyAverage > 0) {
        const usageMultiplier = currentHourUsage / baselineHourlyAverage;

        if (usageMultiplier >= 5) { // 5x normal usage
          return {
            userId,
            tenantId,
            type: 'usage_spike',
            severity: usageMultiplier >= 10 ? 'high' : 'medium',
            description: `API usage ${usageMultiplier.toFixed(1)}x above normal baseline`,
            metadata: { currentHourUsage, baselineHourlyAverage, usageMultiplier },
            detectedAt: now
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error detecting usage spikes:', error);
      return null;
    }
  }

  /**
   * Log anomaly for monitoring
   */
  async logAnomaly(anomaly: AnomalyEvent): Promise<void> {
    try {
      await supabase
        .from('anomaly_events')
        .insert({
          user_id: anomaly.userId,
          tenant_id: anomaly.tenantId,
          type: anomaly.type,
          severity: anomaly.severity,
          description: anomaly.description,
          metadata: anomaly.metadata,
          detected_at: anomaly.detectedAt.toISOString(),
          created_at: new Date().toISOString()
        });

      // Send alert for critical anomalies
      if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
        await this.sendAlert(anomaly);
      }
    } catch (error) {
      console.error('Error logging anomaly:', error);
    }
  }

  /**
   * Send alert for high-severity anomalies
   */
  private async sendAlert(anomaly: AnomalyEvent): Promise<void> {
    try {
      // In a real implementation, this would send to Slack, email, SMS, etc.
      console.warn('🚨 SECURITY ALERT:', {
        type: anomaly.type,
        severity: anomaly.severity,
        userId: anomaly.userId,
        tenantId: anomaly.tenantId,
        description: anomaly.description,
        detectedAt: anomaly.detectedAt
      });

      // Store alert for admin dashboard
      await supabase
        .from('security_alerts')
        .insert({
          user_id: anomaly.userId,
          tenant_id: anomaly.tenantId,
          anomaly_type: anomaly.type,
          severity: anomaly.severity,
          description: anomaly.description,
          metadata: anomaly.metadata,
          status: 'open',
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error sending alert:', error);
    }
  }

  /**
   * Run comprehensive anomaly detection for a user
   */
  async runAnomalyDetection(userId: string, tenantId: string, context?: {
    ip?: string;
    userAgent?: string;
    paymentAmount?: number;
    plan?: string;
  }): Promise<AnomalyEvent[]> {
    const anomalies: AnomalyEvent[] = [];

    // Check for rapid extensions
    const extensionAnomaly = await this.detectRapidExtensions(userId, tenantId);
    if (extensionAnomaly) anomalies.push(extensionAnomaly);

    // Check for suspicious logins
    if (context?.ip && context?.userAgent) {
      const loginAnomaly = await this.detectSuspiciousLogins(userId, tenantId, context.ip, context.userAgent);
      if (loginAnomaly) anomalies.push(loginAnomaly);
    }

    // Check for payment anomalies
    if (context?.paymentAmount && context?.plan) {
      const paymentAnomaly = await this.detectPaymentAnomalies(userId, tenantId, context.paymentAmount, context.plan);
      if (paymentAnomaly) anomalies.push(paymentAnomaly);
    }

    // Check for usage spikes
    const usageAnomaly = await this.detectUsageSpikes(userId, tenantId);
    if (usageAnomaly) anomalies.push(usageAnomaly);

    // Log all detected anomalies
    for (const anomaly of anomalies) {
      await this.logAnomaly(anomaly);
    }

    return anomalies;
  }
}

export const anomalyDetectionService = new AnomalyDetectionService();
