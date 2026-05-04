/**
 * Real User Metrics
 *
 * Track actual user experience, not just crashes
 * Understand what users face in production
 */

import * as Sentry from '@sentry/react';
import { logger } from '../utils/logger';

/**
 * Event types for tracking
 */
export type AnalyticsEvent =
  | 'video_play_success'
  | 'video_play_failed'
  | 'video_fallback_used'
  | 'video_validation_passed'
  | 'video_validation_failed'
  | 'auth_success'
  | 'auth_failed'
  | 'auth_rate_limited'
  | 'story_modal_opened'
  | 'story_modal_closed'
  | 'service_worker_registered'
  | 'service_worker_failed'
  | 'feature_flag_checked'
  | 'page_load_complete'
  | 'network_error'
  | 'cache_hit'
  | 'cache_miss';

/**
 * Event metadata
 */
interface EventMetadata {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Track real user event
 */
export function trackUserEvent(
  event: AnalyticsEvent,
  metadata?: EventMetadata
): void {
  const timestamp = new Date().toISOString();

  // Log in development
  if (import.meta.env.DEV) {
    logger.info('ANALYTICS', `Event: ${event}`, metadata);
  }

  // Send to Sentry as breadcrumb
  Sentry.addBreadcrumb({
    category: 'user-action',
    message: event,
    level: 'info',
    data: {
      ...metadata,
      timestamp,
    },
  });

  // Send to custom analytics (if configured)
  if (window.gtag) {
    window.gtag('event', event, metadata);
  }

  // Store in session for debugging
  try {
    const sessionEvents = JSON.parse(
      sessionStorage.getItem('analytics_events') || '[]'
    );
    sessionEvents.push({
      event,
      metadata,
      timestamp,
    });

    // Keep only last 50 events
    if (sessionEvents.length > 50) {
      sessionEvents.shift();
    }

    sessionStorage.setItem('analytics_events', JSON.stringify(sessionEvents));
  } catch (e) {
    // Ignore storage errors
  }
}

/**
 * Track video player events
 */
export const videoAnalytics = {
  playSuccess: (videoId: string) =>
    trackUserEvent('video_play_success', { videoId }),

  playFailed: (videoId: string, reason: string) =>
    trackUserEvent('video_play_failed', { videoId, reason }),

  fallbackUsed: (videoId: string, reason: string) =>
    trackUserEvent('video_fallback_used', { videoId, reason }),

  validationPassed: (videoId: string, source: string) =>
    trackUserEvent('video_validation_passed', { videoId, source }),

  validationFailed: (videoId: string, reason: string) =>
    trackUserEvent('video_validation_failed', { videoId, reason }),

  cacheHit: (videoId: string) =>
    trackUserEvent('cache_hit', { videoId }),

  cacheMiss: (videoId: string) =>
    trackUserEvent('cache_miss', { videoId }),
};

/**
 * Track authentication events
 */
export const authAnalytics = {
  success: (method: string) =>
    trackUserEvent('auth_success', { method }),

  failed: (reason: string, email?: string) =>
    trackUserEvent('auth_failed', { reason, email }),

  rateLimited: (retryAfter: number) =>
    trackUserEvent('auth_rate_limited', { retryAfter }),
};

/**
 * Track UI interactions
 */
export const uiAnalytics = {
  storyModalOpened: (source: string) =>
    trackUserEvent('story_modal_opened', { source }),

  storyModalClosed: (timeSpent: number) =>
    trackUserEvent('story_modal_closed', { timeSpent }),

  pageLoadComplete: (loadTime: number) =>
    trackUserEvent('page_load_complete', { loadTime }),
};

/**
 * Track system health
 */
export const systemAnalytics = {
  serviceWorkerRegistered: () =>
    trackUserEvent('service_worker_registered'),

  serviceWorkerFailed: (error: string) =>
    trackUserEvent('service_worker_failed', { error }),

  networkError: (endpoint: string) =>
    trackUserEvent('network_error', { endpoint }),

  featureFlagChecked: (flag: string, enabled: boolean) =>
    trackUserEvent('feature_flag_checked', { flag, enabled }),
};

/**
 * Get session analytics summary
 */
export function getSessionAnalytics(): {
  totalEvents: number;
  eventBreakdown: Record<string, number>;
  recentEvents: any[];
} {
  try {
    const events = JSON.parse(
      sessionStorage.getItem('analytics_events') || '[]'
    );

    const breakdown: Record<string, number> = {};
    events.forEach((e: any) => {
      breakdown[e.event] = (breakdown[e.event] || 0) + 1;
    });

    return {
      totalEvents: events.length,
      eventBreakdown: breakdown,
      recentEvents: events.slice(-10),
    };
  } catch (e) {
    return {
      totalEvents: 0,
      eventBreakdown: {},
      recentEvents: [],
    };
  }
}

// Make gtag available globally
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}
