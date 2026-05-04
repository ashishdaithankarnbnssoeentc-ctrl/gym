/**
 * Application Constants
 * Centralized configuration - no magic numbers in code
 */

export const UI_CONFIG = {
  /** Navbar offset for smooth scrolling */
  NAVBAR_OFFSET: 80,

  /** Video validation timeout (ms) */
  VALIDATION_TIMEOUT: 3000,

  /** Cache TTL (5 minutes) */
  CACHE_TTL: 5 * 60 * 1000,

  /** Animation duration (ms) */
  ANIMATION_DURATION: 250,

  /** Skeleton count for loading states */
  SKELETON_COUNT: 6,
} as const;

export const API_CONFIG = {
  /** YouTube noembed API endpoint */
  NOEMBED_API: 'https://noembed.com/embed',

  /** YouTube thumbnail URL template */
  THUMBNAIL_URL: (videoId: string) => `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,

  /** YouTube watch URL template */
  WATCH_URL: (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`,

  /** YouTube embed URL template */
  EMBED_URL: (videoId: string, autoplay: boolean = false) =>
    `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&rel=0&modestbranding=1`,
} as const;

export const VIDEO_CONFIG = {
  /** Valid YouTube video ID regex */
  VIDEO_ID_REGEX: /^[a-zA-Z0-9_-]{11}$/,

  /** Valid video ID length */
  VIDEO_ID_LENGTH: 11,
} as const;
