import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

// Initialize Sentry for error tracking
export function initSentry() {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN || "",
    integrations: [
      new BrowserTracing({
        // Performance monitoring
        tracingOrigins: ["localhost", "https://your-production-domain.com"],
      }),
    ],
    
    // Set tracesSampleRate for performance monitoring
    tracesSampleRate: 0.1, // Capture 10% of transactions for performance
    
    // Set beforeSend to filter out certain errors
    beforeSend(event) {
      // Filter out errors from development
      if (import.meta.env.DEV) {
        return null;
      }
      
      // Filter out network errors that are expected
      if (event.exception?.values?.[0]?.value?.includes("Network Error")) {
        return null;
      }
      
      return event;
    },
    
    // Environment
    environment: import.meta.env.MODE,
    
    // Release version
    release: import.meta.env.VITE_APP_VERSION || "1.0.0",
    
    // User context will be set dynamically
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

// Add breadcrumbs for user actions
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
  return Sentry.startTransaction({
    name,
    op: "custom",
  });
}
