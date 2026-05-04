/**
 * Alerting System
 *
 * Get notified when critical issues occur
 * Don't check logs manually - system tells you
 */

import * as Sentry from '@sentry/react';
import { logger } from '../utils/logger';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Alert types
 */
export type AlertType =
  | 'error_spike'
  | 'auth_failure_spike'
  | 'validation_failure_spike'
  | 'performance_degradation'
  | 'feature_rollback'
  | 'rate_limit_exceeded'
  | 'service_worker_failure';

/**
 * Alert configuration
 */
interface AlertConfig {
  type: AlertType;
  severity: AlertSeverity;
  threshold: number;
  timeWindow: number; // milliseconds
  message: string;
}

/**
 * Alert configurations
 */
const ALERT_CONFIGS: Record<AlertType, AlertConfig> = {
  error_spike: {
    type: 'error_spike',
    severity: 'critical',
    threshold: 10,
    timeWindow: 60000, // 1 minute
    message: 'Error rate spike detected',
  },
  auth_failure_spike: {
    type: 'auth_failure_spike',
    severity: 'warning',
    threshold: 5,
    timeWindow: 60000,
    message: 'Authentication failures increased',
  },
  validation_failure_spike: {
    type: 'validation_failure_spike',
    severity: 'warning',
    threshold: 10,
    timeWindow: 300000, // 5 minutes
    message: 'Video validation failures increased',
  },
  performance_degradation: {
    type: 'performance_degradation',
    severity: 'warning',
    threshold: 3,
    timeWindow: 300000,
    message: 'Performance degradation detected',
  },
  feature_rollback: {
    type: 'feature_rollback',
    severity: 'critical',
    threshold: 1,
    timeWindow: 60000,
    message: 'Feature auto-rollback triggered',
  },
  rate_limit_exceeded: {
    type: 'rate_limit_exceeded',
    severity: 'warning',
    threshold: 3,
    timeWindow: 60000,
    message: 'Rate limiting triggered multiple times',
  },
  service_worker_failure: {
    type: 'service_worker_failure',
    severity: 'error',
    threshold: 1,
    timeWindow: 60000,
    message: 'Service worker registration failed',
  },
};

/**
 * Alert tracker
 */
class AlertTracker {
  private alerts = new Map<AlertType, number[]>();

  /**
   * Record alert occurrence
   */
  record(type: AlertType): void {
    const now = Date.now();
    const config = ALERT_CONFIGS[type];
    const typeAlerts = this.alerts.get(type) || [];

    // Add new alert timestamp
    typeAlerts.push(now);

    // Remove old alerts outside window
    const validAlerts = typeAlerts.filter(
      (timestamp) => now - timestamp < config.timeWindow
    );

    this.alerts.set(type, validAlerts);

    // Check if threshold exceeded
    if (validAlerts.length >= config.threshold) {
      this.triggerAlert(type, validAlerts.length);
    }
  }

  /**
   * Trigger alert notification
   */
  private triggerAlert(type: AlertType, count: number): void {
    const config = ALERT_CONFIGS[type];

    // Log to console (always visible)
    const emoji = config.severity === 'critical' ? '🚨' : '⚠️';
    console.error(
      `${emoji} ALERT [${config.severity.toUpperCase()}]: ${config.message} (${count} occurrences)`
    );

    // Log structured
    logger.error('ALERTING', config.message, {
      type,
      severity: config.severity,
      count,
      threshold: config.threshold,
      timeWindow: config.timeWindow,
    });

    // Send to Sentry
    Sentry.captureException(new Error(`Alert: ${config.message}`), {
      tags: {
        alertType: type,
        severity: config.severity,
      },
      level: config.severity === 'critical' ? 'error' : 'warning',
      extra: {
        count,
        threshold: config.threshold,
        timeWindow: config.timeWindow,
      },
    });

    // Browser notification (if permission granted)
    this.sendBrowserNotification(config, count);

    // Store in localStorage for dashboard
    this.storeAlert(type, config, count);
  }

  /**
   * Send browser notification
   */
  private sendBrowserNotification(config: AlertConfig, count: number): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`${config.severity.toUpperCase()}: Elite Fitness`, {
          body: `${config.message} (${count} occurrences)`,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        });
      } catch (e) {
        // Ignore notification errors
      }
    }
  }

  /**
   * Store alert for dashboard
   */
  private storeAlert(type: AlertType, config: AlertConfig, count: number): void {
    try {
      const alerts = JSON.parse(localStorage.getItem('alerts_history') || '[]');

      alerts.push({
        type,
        severity: config.severity,
        message: config.message,
        count,
        timestamp: new Date().toISOString(),
      });

      // Keep only last 100 alerts
      if (alerts.length > 100) {
        alerts.shift();
      }

      localStorage.setItem('alerts_history', JSON.stringify(alerts));
    } catch (e) {
      // Ignore storage errors
    }
  }

  /**
   * Get alert history
   */
  getHistory(): any[] {
    try {
      return JSON.parse(localStorage.getItem('alerts_history') || '[]');
    } catch (e) {
      return [];
    }
  }

  /**
   * Clear alert history
   */
  clearHistory(): void {
    localStorage.removeItem('alerts_history');
  }
}

/**
 * Global alert tracker
 */
export const alertTracker = new AlertTracker();

/**
 * Send alert
 */
export function sendAlert(type: AlertType): void {
  alertTracker.record(type);
}

/**
 * Request notification permission
 */
export function requestNotificationPermission(): void {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        logger.info('ALERTING', 'Notification permission granted');
      }
    });
  }
}

/**
 * Get alert history
 */
export function getAlertHistory(): any[] {
  return alertTracker.getHistory();
}

/**
 * Clear alert history
 */
export function clearAlertHistory(): void {
  alertTracker.clearHistory();
}
