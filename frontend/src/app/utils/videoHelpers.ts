/**
 * Video Helper Utilities
 *
 * Extracted from InstantVideoPlayer to avoid "god file" pattern
 * Single source of truth for video ID extraction
 */

import { VIDEO_CONFIG } from '../config/constants';

/**
 * Extract YouTube video ID from various input formats
 * Returns null if input is invalid
 *
 * Supports:
 * - Direct video ID (11 chars)
 * - youtube.com/watch?v=XXXXXXXXXXX
 * - youtu.be/XXXXXXXXXXX
 * - youtube.com/embed/XXXXXXXXXXX
 */
export function extractVideoId(input: string): string | null {
  if (!input) return null;

  // Already an ID (11 characters, alphanumeric + dash/underscore)
  if (VIDEO_CONFIG.VIDEO_ID_REGEX.test(input)) {
    return input;
  }

  try {
    const url = new URL(input);

    // youtube.com/watch?v=
    if (url.searchParams.get("v")) {
      return url.searchParams.get("v");
    }

    // youtu.be/
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.slice(1);
    }

    // /embed/
    if (url.pathname.includes("/embed/")) {
      return url.pathname.split("/embed/")[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Validate video ID format (11 characters, alphanumeric + dash/underscore)
 */
export function isValidVideoIdFormat(videoId: string): boolean {
  return VIDEO_CONFIG.VIDEO_ID_REGEX.test(videoId);
}

/**
 * Get YouTube watch URL from video ID
 */
export function getWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Get YouTube embed URL from video ID
 */
export function getEmbedUrl(videoId: string, autoplay: boolean = false): string {
  return `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&rel=0&modestbranding=1`;
}

/**
 * Get YouTube thumbnail URL from video ID
 */
export function getThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
