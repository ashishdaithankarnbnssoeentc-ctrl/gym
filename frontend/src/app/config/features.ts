/**
 * Feature Flags - Elite-Level Safety
 *
 * Instantly disable broken features in production without redeploying
 * This is what top-tier production systems always have
 */

export const FEATURES = {
  /** Video player system (can disable if embedding breaks) */
  VIDEO_PLAYER: true,

  /** Sentry monitoring (can disable if quota exceeded) */
  MONITORING: true,

  /** Authentication system (can disable for maintenance) */
  AUTH_ENABLED: true,

  /** Motivational stories modal (can disable if content needs review) */
  STORIES_MODAL: true,

  /** YouTube video validation (can disable if noembed API fails) */
  VIDEO_VALIDATION: true,

  /** Supabase integration (can disable for maintenance) */
  SUPABASE_ENABLED: true,
} as const;

/**
 * Check if a feature is enabled
 * Usage: if (isFeatureEnabled('VIDEO_PLAYER')) { ... }
 */
export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature] === true;
}

/**
 * Environment-based overrides
 * Can be controlled via environment variables
 */
export function getFeatureFlags(): typeof FEATURES {
  const env = import.meta.env;

  return {
    VIDEO_PLAYER: env.VITE_FEATURE_VIDEO_PLAYER !== 'false',
    MONITORING: env.VITE_FEATURE_MONITORING !== 'false',
    AUTH_ENABLED: env.VITE_FEATURE_AUTH !== 'false',
    STORIES_MODAL: env.VITE_FEATURE_STORIES !== 'false',
    VIDEO_VALIDATION: env.VITE_FEATURE_VIDEO_VALIDATION !== 'false',
    SUPABASE_ENABLED: env.VITE_FEATURE_SUPABASE !== 'false',
  };
}
