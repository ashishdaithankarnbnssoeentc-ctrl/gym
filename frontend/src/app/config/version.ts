/**
 * Data Versioning
 *
 * Track data schema versions for easier debugging
 * Makes tracking changes and rollbacks clearer
 */

/**
 * Current data version
 * Increment when video data structure changes
 */
export const DATA_VERSION = 'v1.0.0';

/**
 * Application version
 * Synced with package.json
 */
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

/**
 * API version compatibility
 */
export const API_VERSION = {
  /** YouTube noembed API version */
  NOEMBED: 'v1',

  /** Firebase Auth version */
  FIREBASE_AUTH: 'v9',

  /** Supabase version */
  SUPABASE: 'v2',
} as const;

/**
 * Feature versions (when major features were added)
 */
export const FEATURE_VERSIONS = {
  /** Basic video player */
  VIDEO_PLAYER: 'v1.0.0',

  /** Video validation */
  VIDEO_VALIDATION: 'v1.0.0',

  /** Error boundaries */
  ERROR_BOUNDARIES: 'v1.0.0',

  /** Sentry monitoring */
  MONITORING: 'v1.0.0',

  /** Playwright tests */
  E2E_TESTS: 'v1.0.0',

  /** Service worker */
  SERVICE_WORKER: 'v1.0.1',

  /** Rate limiting */
  RATE_LIMITING: 'v1.0.1',

  /** Feature flags */
  FEATURE_FLAGS: 'v1.0.1',

  /** Gradual rollout */
  GRADUAL_ROLLOUT: 'v1.0.2',

  /** Auto rollback */
  AUTO_ROLLBACK: 'v1.0.2',

  /** Alerting system */
  ALERTING: 'v1.0.2',
} as const;

/**
 * Data schema changelog
 */
export const DATA_CHANGELOG = {
  'v1.0.0': 'Initial video data structure with sanitization',
  'v1.0.1': 'Added embeddable flag and validation cache',
  'v1.0.2': 'Enhanced with rollout and analytics metadata',
} as const;

/**
 * Get version info for debugging
 */
export function getVersionInfo() {
  return {
    app: APP_VERSION,
    data: DATA_VERSION,
    api: API_VERSION,
    features: FEATURE_VERSIONS,
    buildTime: import.meta.env.VITE_BUILD_TIME || 'unknown',
    environment: import.meta.env.PROD ? 'production' : 'development',
  };
}

/**
 * Log version info to console
 */
export function logVersionInfo(): void {
  const info = getVersionInfo();

  console.log('%c🏆 Elite Fitness Production System', 'color: #f97316; font-size: 16px; font-weight: bold;');
  console.log('%cVersion Information:', 'color: #f97316; font-weight: bold;');
  console.table({
    'App Version': info.app,
    'Data Version': info.data,
    'Environment': info.environment,
    'Build Time': info.buildTime,
  });

  console.log('%cAPI Versions:', 'color: #f97316; font-weight: bold;');
  console.table(info.api);

  console.log('%cFeature Versions:', 'color: #f97316; font-weight: bold;');
  console.table(info.features);
}
