/**
 * Production Monitoring Setup
 *
 * Provides observability into production issues:
 * - Error tracking
 * - Performance monitoring
 * - User context
 */

import * as Sentry from "@sentry/react";

const isProd = import.meta.env.PROD;
const isDev = import.meta.env.DEV;

/**
 * Initialize Sentry monitoring
 * Only activates in production
 */
export function initMonitoring() {
  if (!isProd) {
    console.log('[MONITORING] Running in development - Sentry disabled');
    return;
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN || "",

    // Performance monitoring
    tracesSampleRate: isProd ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Session replay for debugging
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of error sessions

    // Environment
    environment: isProd ? 'production' : 'development',

    // Release tracking
    release: `elite-fitness@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,

    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Filter out known noise
    beforeSend(event, hint) {
      // Filter out Firebase SDK errors (handled separately)
      if (event.exception?.values?.[0]?.value?.includes('@firebase')) {
        return null;
      }

      // Filter out network errors (user's internet, not our bug)
      if (event.exception?.values?.[0]?.value?.includes('Failed to fetch')) {
        return null;
      }

      return event;
    },
  });

  console.log('[MONITORING] Sentry initialized');
}

/**
 * Track custom events
 */
export function trackEvent(category: string, action: string, label?: string) {
  if (isDev) {
    console.log('[ANALYTICS]', { category, action, label });
    return;
  }

  Sentry.addBreadcrumb({
    category,
    message: `${action} ${label || ''}`,
    level: 'info',
  });
}

/**
 * Track video errors specifically
 */
export function trackVideoError(videoId: string, error: string) {
  Sentry.captureException(new Error(`Video Error: ${error}`), {
    tags: {
      component: 'video-player',
      videoId,
    },
    level: 'warning',
  });
}

/**
 * Track auth errors specifically
 */
export function trackAuthError(errorCode: string, email?: string) {
  Sentry.captureException(new Error(`Auth Error: ${errorCode}`), {
    tags: {
      component: 'auth',
      errorCode,
    },
    user: email ? { email } : undefined,
    level: 'warning',
  });
}

/**
 * Set user context for better debugging
 */
export function setUserContext(userId: string, email: string) {
  Sentry.setUser({
    id: userId,
    email,
  });
}

/**
 * Clear user context on logout
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

// Export Sentry for error boundaries
export { Sentry };
