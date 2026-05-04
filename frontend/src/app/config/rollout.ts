/**
 * Gradual Rollout System
 *
 * Enables percentage-based feature releases
 * Roll out to 10-20% users first, monitor, then scale
 */

import { FEATURES } from './features';

/**
 * Rollout percentages (0-100)
 * Set to 100 for full rollout, lower for gradual
 */
export const ROLLOUT_PERCENTAGES = {
  VIDEO_PLAYER: 100,
  STORIES_MODAL: 100,
  VIDEO_VALIDATION: 100,
  // New features start at lower percentages
  NEW_FEATURE_EXAMPLE: 20,
} as const;

/**
 * Hash function for consistent user bucketing
 */
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Check if feature is enabled for a specific user
 * Uses deterministic hashing for consistent experience
 *
 * @param feature - Feature flag key
 * @param userId - User identifier (email, uid, etc.)
 * @returns true if user is in rollout bucket
 */
export function isFeatureEnabledForUser(
  feature: keyof typeof ROLLOUT_PERCENTAGES,
  userId: string
): boolean {
  // Check global feature flag first
  const featureFlagKey = feature as keyof typeof FEATURES;
  if (FEATURES[featureFlagKey] === false) {
    return false;
  }

  // Get rollout percentage
  const percentage = ROLLOUT_PERCENTAGES[feature];

  // 100% means everyone
  if (percentage === 100) {
    return true;
  }

  // 0% means no one
  if (percentage === 0) {
    return false;
  }

  // Hash user ID to get consistent bucket
  const hash = hashUserId(userId);
  const bucket = hash % 100;

  // User is in rollout if their bucket is below percentage
  return bucket < percentage;
}

/**
 * Get rollout status for analytics
 */
export function getRolloutStatus(
  feature: keyof typeof ROLLOUT_PERCENTAGES,
  userId: string
): {
  feature: string;
  rolloutPercentage: number;
  userInRollout: boolean;
  userBucket: number;
} {
  const percentage = ROLLOUT_PERCENTAGES[feature];
  const hash = hashUserId(userId);
  const bucket = hash % 100;
  const inRollout = bucket < percentage;

  return {
    feature,
    rolloutPercentage: percentage,
    userInRollout: inRollout,
    userBucket: bucket,
  };
}
