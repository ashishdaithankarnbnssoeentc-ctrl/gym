/**
 * Auto Rollback System
 *
 * Automatically disables features if error rate exceeds threshold
 * No panic fixes - system protects itself
 */

import { logger } from '../utils/logger';
import * as Sentry from '@sentry/react';

/**
 * Error threshold configuration
 */
const ERROR_THRESHOLDS = {
  /** Max errors per minute before auto-rollback */
  ERRORS_PER_MINUTE: 10,

  /** Max error rate (percentage) before auto-rollback */
  ERROR_RATE_PERCENTAGE: 5,

  /** Time window for measuring errors (ms) */
  MEASUREMENT_WINDOW: 60000, // 1 minute
} as const;

/**
 * Error tracker for each feature
 */
class ErrorTracker {
  private errors = new Map<string, number[]>();

  /**
   * Record an error for a feature
   */
  recordError(feature: string): void {
    const now = Date.now();
    const featureErrors = this.errors.get(feature) || [];

    // Add new error timestamp
    featureErrors.push(now);

    // Remove old errors outside window
    const validErrors = featureErrors.filter(
      (timestamp) => now - timestamp < ERROR_THRESHOLDS.MEASUREMENT_WINDOW
    );

    this.errors.set(feature, validErrors);

    logger.debug('AUTO_ROLLBACK', `Error recorded for ${feature}`, {
      recentErrors: validErrors.length,
    });
  }

  /**
   * Get error count for a feature in current window
   */
  getErrorCount(feature: string): number {
    const now = Date.now();
    const featureErrors = this.errors.get(feature) || [];

    // Filter to current window
    const recentErrors = featureErrors.filter(
      (timestamp) => now - timestamp < ERROR_THRESHOLDS.MEASUREMENT_WINDOW
    );

    return recentErrors.length;
  }

  /**
   * Check if feature should be rolled back
   */
  shouldRollback(feature: string): boolean {
    const errorCount = this.getErrorCount(feature);
    return errorCount >= ERROR_THRESHOLDS.ERRORS_PER_MINUTE;
  }

  /**
   * Reset error count for a feature
   */
  reset(feature: string): void {
    this.errors.delete(feature);
    logger.info('AUTO_ROLLBACK', `Error count reset for ${feature}`);
  }

  /**
   * Get all feature error counts
   */
  getAllErrorCounts(): Record<string, number> {
    const counts: Record<string, number> = {};

    this.errors.forEach((_, feature) => {
      counts[feature] = this.getErrorCount(feature);
    });

    return counts;
  }
}

/**
 * Global error tracker
 */
export const errorTracker = new ErrorTracker();

/**
 * Disabled features (auto-rollback state)
 */
const disabledFeatures = new Set<string>();

/**
 * Check if feature is disabled by auto-rollback
 */
export function isFeatureDisabledByRollback(feature: string): boolean {
  return disabledFeatures.has(feature);
}

/**
 * Trigger auto-rollback for a feature
 */
export function triggerAutoRollback(
  feature: string,
  reason: string
): void {
  if (disabledFeatures.has(feature)) {
    logger.warn('AUTO_ROLLBACK', `${feature} already disabled`);
    return;
  }

  // Disable feature
  disabledFeatures.add(feature);

  // Log to console (always visible in production)
  console.error(`🚨 AUTO-ROLLBACK: ${feature} disabled - ${reason}`);

  // Log structured
  logger.error('AUTO_ROLLBACK', `Feature disabled: ${feature}`, { reason });

  // Send to Sentry
  Sentry.captureException(new Error(`Auto-rollback triggered: ${feature}`), {
    tags: {
      feature,
      rollback: 'auto',
    },
    level: 'warning',
    extra: { reason },
  });

  // Store in localStorage for persistence
  try {
    const disabled = JSON.parse(
      localStorage.getItem('auto_rollback_disabled') || '[]'
    );
    if (!disabled.includes(feature)) {
      disabled.push(feature);
      localStorage.setItem('auto_rollback_disabled', JSON.stringify(disabled));
    }
  } catch (e) {
    // Ignore storage errors
  }
}

/**
 * Re-enable a feature after rollback
 */
export function enableFeature(feature: string): void {
  disabledFeatures.delete(feature);
  errorTracker.reset(feature);

  logger.info('AUTO_ROLLBACK', `Feature re-enabled: ${feature}`);

  // Remove from localStorage
  try {
    const disabled = JSON.parse(
      localStorage.getItem('auto_rollback_disabled') || '[]'
    );
    const updated = disabled.filter((f: string) => f !== feature);
    localStorage.setItem('auto_rollback_disabled', JSON.stringify(updated));
  } catch (e) {
    // Ignore storage errors
  }
}

/**
 * Monitor feature and auto-rollback if threshold exceeded
 */
export function monitorFeature(feature: string, error: Error): void {
  // Record error
  errorTracker.recordError(feature);

  // Check if threshold exceeded
  if (errorTracker.shouldRollback(feature)) {
    triggerAutoRollback(
      feature,
      `Error threshold exceeded (${ERROR_THRESHOLDS.ERRORS_PER_MINUTE}/min)`
    );
  }
}

/**
 * Get rollback status for all features
 */
export function getRollbackStatus(): {
  disabledFeatures: string[];
  errorCounts: Record<string, number>;
  thresholds: typeof ERROR_THRESHOLDS;
} {
  return {
    disabledFeatures: Array.from(disabledFeatures),
    errorCounts: errorTracker.getAllErrorCounts(),
    thresholds: ERROR_THRESHOLDS,
  };
}

/**
 * Initialize auto-rollback system
 * Restores previously disabled features from localStorage
 */
export function initAutoRollback(): void {
  try {
    const disabled = JSON.parse(
      localStorage.getItem('auto_rollback_disabled') || '[]'
    );

    disabled.forEach((feature: string) => {
      disabledFeatures.add(feature);
      logger.warn('AUTO_ROLLBACK', `Restored disabled feature: ${feature}`);
    });
  } catch (e) {
    // Ignore storage errors
  }

  logger.info('AUTO_ROLLBACK', 'System initialized', {
    thresholds: ERROR_THRESHOLDS,
  });
}
