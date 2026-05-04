/**
 * Video Sanitizer - Production-Safe Data Layer
 *
 * This is the ENTRY POINT for all video data.
 * Filters out invalid/broken videos BEFORE they reach the UI.
 *
 * Flow: Raw Data → SANITIZER → Clean API → UI → Player
 */

import { CleanVideo, RawVideoData } from '../types/video';
import { extractVideoId } from './videoHelpers';

/**
 * Known broken video IDs (invalid, deleted, or private)
 * These are immediately rejected without API calls
 *
 * NOTE: All previously broken videos have been replaced with working alternatives
 */
const BROKEN_VIDEO_IDS = new Set<string>([
  // Empty - all broken videos have been replaced
]);

/**
 * Dead video cache - prevents repeated validation of known-bad IDs
 */
const deadCache = new Set<string>();

/**
 * Known blocked video IDs (embedding disabled)
 * These are valid videos but cannot be embedded
 */
const BLOCKED_VIDEO_IDS = new Set([
  '2pLT-olgUJs', // Chloe Ting - embedding disabled
  'DHD1-2P94DI', // Chloe Ting - embedding disabled
  'gkZMg5PZfc8', // Pamela Reif - embedding disabled
  'UBMk30rjy0o', // Pamela Reif - embedding disabled
]);

/**
 * Parse duration string to number (minutes)
 */
function parseDuration(duration: string | number | undefined): number {
  if (!duration) return 0;
  if (typeof duration === 'number') return duration;

  const match = duration.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Probe YouTube thumbnail to verify video exists
 * This catches deleted/private/invalid videos BEFORE they reach the UI
 */
async function isThumbnailValid(videoId: string): Promise<boolean> {
  const url = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });

    if (!res.ok) {
      console.log(`[THUMBNAIL PROBE FAIL] ${videoId}: HTTP ${res.status}`);
      return false;
    }

    console.log(`[THUMBNAIL PROBE OK] ${videoId}`);
    return true;
  } catch (error) {
    console.log(`[THUMBNAIL PROBE ERROR] ${videoId}:`, error);
    return false;
  }
}

/**
 * Sanitize a single video entry
 * Returns CleanVideo if valid, null if should be filtered out
 */
export async function sanitizeVideo(raw: RawVideoData): Promise<CleanVideo | null> {
  // Extract input URL
  const input = raw.videoId || raw.url || raw.videoUrl;

  if (!input) {
    console.log('[SANITIZER REJECT] No video URL/ID provided');
    return null;
  }

  // HARD BLOCK: Any .mp4 URLs
  if (typeof input === 'string' && input.includes('.mp4')) {
    console.log('[SANITIZER REJECT] .mp4 blocked:', input);
    return null;
  }

  // Extract and validate video ID
  const videoId = extractVideoId(input);

  if (!videoId) {
    console.log('[SANITIZER REJECT] Invalid videoId:', input);
    return null;
  }

  // HARD VALIDATION: Must be exactly 11 characters
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    console.log('[SANITIZER REJECT] Invalid videoId format:', videoId);
    return null;
  }

  // REJECT: Known broken videos
  if (BROKEN_VIDEO_IDS.has(videoId)) {
    console.log('[SANITIZER REJECT] Known broken video:', videoId, raw.title);
    return null;
  }

  // REJECT: Previously failed videos (cached)
  if (deadCache.has(videoId)) {
    console.log('[SANITIZER REJECT] Dead cache hit:', videoId);
    return null;
  }

  // 🚨 CRITICAL: Probe thumbnail to verify video exists
  const thumbnailOk = await isThumbnailValid(videoId);

  if (!thumbnailOk) {
    console.log('[SANITIZER REJECT] Dead video (thumbnail 404):', videoId, raw.title);
    deadCache.add(videoId); // Cache to prevent retries
    return null;
  }

  // Check if video is blocked (still allow, but mark as non-playable)
  const isBlocked = BLOCKED_VIDEO_IDS.has(videoId);
  if (isBlocked) {
    console.log('[SANITIZER WARNING] Video embedding blocked:', videoId, raw.title);
  }

  // Validate required fields
  if (!raw.title || !raw.creator) {
    console.log('[SANITIZER REJECT] Missing required fields:', videoId);
    return null;
  }

  // Parse duration
  const durationMinutes = parseDuration(raw.duration);

  // Build clean video object
  const cleanVideo: CleanVideo = {
    id: raw.id || videoId,
    source: 'youtube',
    videoId,
    title: raw.title,
    creator: raw.creator,
    channelUrl: raw.channelUrl || `https://www.youtube.com/@${raw.creator}`,
    duration: durationMinutes,
    durationDisplay: raw.duration?.toString() || `${durationMinutes} min`,
    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    level: (raw.level as any) || 'All Levels',
    category: (raw.category as any) || 'Cardio',
    tags: raw.tags || [],
    description: raw.description,
    isFree: raw.isFree ?? true,
    playable: !isBlocked, // Mark blocked videos as non-playable
    originalUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };

  console.log('[SANITIZER ACCEPT]', videoId, raw.title, `(playable: ${cleanVideo.playable})`);

  return cleanVideo;
}

/**
 * Sanitize an array of videos (ASYNC - with thumbnail probing)
 * Filters out all invalid entries
 * Use this for runtime validation with existence checks
 */
export async function sanitizeVideosAsync(rawVideos: RawVideoData[]): Promise<CleanVideo[]> {
  console.log(`[SANITIZER] Processing ${rawVideos.length} raw videos...`);
  console.log(`[SANITIZER] Running thumbnail probes (this may take a moment)...`);

  const results = await Promise.all(
    rawVideos.map(video => sanitizeVideo(video))
  );

  const cleaned = results.filter((video): video is CleanVideo => video !== null);

  const rejected = rawVideos.length - cleaned.length;

  console.log(`[SANITIZER] ✅ Accepted: ${cleaned.length}`);
  console.log(`[SANITIZER] ❌ Rejected: ${rejected}`);

  if (rejected > 0) {
    console.warn(`[SANITIZER WARNING] ${rejected} videos were filtered out (broken/invalid)`);
  }

  return cleaned;
}

/**
 * Sanitize videos (SYNC - format validation only)
 * Use this for build-time when async is not available
 * Does NOT probe thumbnails (use sanitizeVideosAsync for that)
 */
export function sanitizeVideosSync(rawVideos: RawVideoData[]): CleanVideo[] {
  console.log(`[SANITIZER SYNC] Processing ${rawVideos.length} raw videos (format check only)...`);

  const cleaned: CleanVideo[] = [];

  for (const raw of rawVideos) {
    const input = raw.videoId || raw.url || raw.videoUrl;

    if (!input) continue;

    // HARD BLOCK: Any .mp4 URLs
    if (typeof input === 'string' && input.includes('.mp4')) {
      console.log('[SANITIZER REJECT] .mp4 blocked:', input);
      continue;
    }

    const videoId = extractVideoId(input);

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      console.log('[SANITIZER REJECT] Invalid ID:', input);
      continue;
    }

    if (BROKEN_VIDEO_IDS.has(videoId) || deadCache.has(videoId)) {
      console.log('[SANITIZER REJECT] Known bad:', videoId);
      continue;
    }

    if (!raw.title || !raw.creator) {
      console.log('[SANITIZER REJECT] Missing fields:', videoId);
      continue;
    }

    const durationMinutes = parseDuration(raw.duration);
    const isBlocked = BLOCKED_VIDEO_IDS.has(videoId);

    cleaned.push({
      id: raw.id || videoId,
      source: 'youtube',
      videoId,
      title: raw.title,
      creator: raw.creator,
      channelUrl: raw.channelUrl || `https://www.youtube.com/@${raw.creator}`,
      duration: durationMinutes,
      durationDisplay: raw.duration?.toString() || `${durationMinutes} min`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      level: (raw.level as any) || 'All Levels',
      category: (raw.category as any) || 'Cardio',
      tags: raw.tags || [],
      description: raw.description,
      isFree: raw.isFree ?? true,
      playable: !isBlocked,
      originalUrl: `https://www.youtube.com/watch?v=${videoId}`,
    });
  }

  const rejected = rawVideos.length - cleaned.length;

  console.log(`[SANITIZER SYNC] ✅ Accepted: ${cleaned.length}`);
  console.log(`[SANITIZER SYNC] ❌ Rejected: ${rejected}`);

  if (rejected > 0) {
    console.warn(`[SANITIZER SYNC WARNING] ${rejected} videos filtered (use async for existence check)`);
  }

  return cleaned;
}

/**
 * Get sanitization statistics
 */
export function getSanitizationStats(rawVideos: RawVideoData[]) {
  const results = rawVideos.map(sanitizeVideo);
  const accepted = results.filter(Boolean);
  const rejected = rawVideos.length - accepted.length;

  return {
    total: rawVideos.length,
    accepted: accepted.length,
    rejected,
    brokenVideos: rawVideos
      .map((v, i) => ({ video: v, result: results[i] }))
      .filter(({ result }) => !result)
      .map(({ video }) => ({
        id: video.videoId || video.url || video.videoUrl,
        title: video.title,
      })),
  };
}
