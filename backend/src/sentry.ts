import * as Sentry from "@sentry/node";
import { Integrations } from "@sentry/tracing";
import { Request, Response, NextFunction } from 'express';

// Initialize Sentry for backend error tracking
export function initSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || "",

    // Set tracesSampleRate for performance monitoring
    tracesSampleRate: 0.1, // Capture 10% of transactions

    // Environment
    environment: process.env.NODE_ENV || "development",

    // Release version
    release: process.env.RELEASE_VERSION || "1.0.0",

    // Before send to filter out certain errors
    beforeSend(event) {
      // Filter out errors in development
      if (process.env.NODE_ENV === "development") {
        return null;
      }

      // Filter out expected errors
      if (event.exception?.values?.[0]?.value?.includes("ECONNREFUSED")) {
        return null;
      }

      return event;
    },
  });
}

// Set user context for Sentry
export function setUserContext(user: any) {
  Sentry.setUser({
    id: user.uid,
    email: user.email,
    username: user.displayName || user.email,
  });
}

// Clear user context
export function clearUserContext() {
  Sentry.setUser(null);
}

// Capture custom exceptions
export function captureException(error: Error, context?: any) {
  if (context) {
    Sentry.setContext("custom_context", context);
  }
  Sentry.captureException(error);
}

// Capture custom messages
export function captureMessage(message: string, level: Sentry.SeverityLevel = "info") {
  Sentry.captureMessage(message, level);
}

// Add breadcrumbs for tracking
export function addBreadcrumb(category: string, message: string, level: Sentry.SeverityLevel = "info") {
  Sentry.addBreadcrumb({
    category,
    message,
    level,
    timestamp: Date.now() / 1000,
  });
}

// Performance monitoring
export function startTransaction(name: string) {
  return Sentry.startSpan({
    name,
    op: "custom",
  }, () => {
    // Placeholder callback for span
    return {};
  });
}

// Real event tracking for production monitoring
export function trackEvent(event: string, data?: any) {
  Sentry.addBreadcrumb({
    category: 'user_action',
    message: event,
    level: 'info',
    data: data || {},
  });
}

export function trackApiCall(endpoint: string, method: string, userId?: string) {
  Sentry.addBreadcrumb({
    category: 'api_call',
    message: `${method} ${endpoint}`,
    level: 'info',
    data: { endpoint, method, userId },
  });
}

export function trackError(error: Error, context?: any) {
  Sentry.captureException(error, {
    contexts: { custom: context || {} },
  });
}

export function trackPerformance(operation: string, duration: number) {
  Sentry.addBreadcrumb({
    category: 'performance',
    message: operation,
    level: 'info',
    data: { operation, duration },
  });
}

// Express middleware for request tracking with user context
export function requestTrackingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set user context for Sentry
    if (req.user) {
      Sentry.setUser({
        id: (req.user as any).id,
        email: (req.user as any).email,
        tenantId: (req.user as any).tenantId,
        role: (req.user as any).role,
      });
    }

    // Set request context
    Sentry.setContext('request', {
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });

    // Track API call
    trackApiCall(req.path, req.method, (req.user as any)?.id);

    // Log request for debugging
    console.log({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      userId: (req.user as any)?.id,
      tenantId: (req.user as any)?.tenantId,
    });

    next();
  };
}

// Express error handler with user context
export function errorHandlerMiddleware() {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    // Track error with context
    trackError(err, {
      path: req.path,
      method: req.method,
      userId: (req.user as any)?.id,
      tenantId: (req.user as any)?.tenantId,
      userAgent: req.get('User-Agent'),
    });

    // Log error for debugging
    console.error({
      timestamp: new Date().toISOString(),
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      userId: (req.user as any)?.id,
    });

    next(err);
  };
}
