/**
 * Media Validation Middleware
 * 
 * Prevents 404 spam by checking failure cache before media requests
 * Eliminates unnecessary network calls and reduces noise
 */

import { Request, Response, NextFunction } from 'express';
import { mediaFailureCache } from '../services/media.failure.cache.service.js';

/**
 * Middleware to validate media requests and skip known failures
 */
export function validateMediaRequest(req: Request, res: Response, next: NextFunction) {
  const videoId = Array.isArray(req.params.videoId) ? req.params.videoId[0] : req.params.videoId;
  const requestType = req.path.includes('thumbnail') ? 'thumbnail' : 'video';

  // Check if this media request should be skipped due to previous failures
  if (videoId && mediaFailureCache.shouldSkip(videoId, requestType)) {
    const failureInfo = mediaFailureCache.getFailureInfo(videoId, requestType);

    console.log(`[MEDIA VALIDATION] Skipping ${requestType} request for video ${videoId} - previously failed`);

    // Return fallback response instead of 404
    import('../services/media.fallback.service.js').then(({ mediaFallbackService }) => {
      if (requestType === 'thumbnail') {
        mediaFallbackService.sendFallbackThumbnail(res, videoId, failureInfo?.thumbnailUrl);
      } else {
        mediaFallbackService.sendFallbackVideo(res, videoId, failureInfo?.videoUrl);
      }
    }).catch(err => {
      console.error('[MEDIA FALLBACK ERROR]', err);
      res.status(500).json({ error: 'Fallback service unavailable' });
    });
    return;
  }

  // Allow request to proceed
  next();
}

/**
 * Helper function to record media failures
 */
export function recordMediaFailure(
  videoId: string,
  thumbnailUrl: string,
  videoUrl: string,
  error: any,
  retryAfter?: number
): void {
  // Determine retry delay based on error type
  let calculatedRetryAfter = retryAfter;

  if (!calculatedRetryAfter) {
    if (error?.response?.status === 404) {
      calculatedRetryAfter = 300000; // 5 minutes for 404s
    } else if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT') {
      calculatedRetryAfter = 60000; // 1 minute for network errors
    } else {
      calculatedRetryAfter = 120000; // 2 minutes default
    }
  }

  mediaFailureCache.setFailed(videoId, thumbnailUrl, videoUrl, calculatedRetryAfter);
}

/**
 * Get media failure statistics
 */
export function getMediaFailureStats() {
  return mediaFailureCache.getStats();
}

/**
 * Clear media failure cache (for testing/admin)
 */
export function clearMediaFailureCache() {
  mediaFailureCache.clear();
}
