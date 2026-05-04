/**
 * useValidatedVideos - Runtime video validation hook
 *
 * Performs async thumbnail probing on app load to catch:
 * - Videos deleted since last build
 * - Videos made private by creators
 * - Any other newly-broken videos
 *
 * This is the FINAL defense layer - ensures UI only shows working videos
 */

import { useEffect, useState } from 'react';
import { CleanVideo, RawVideoData } from '../types/video';
import { sanitizeVideosAsync } from '../utils/videoSanitizer';

interface ValidationState {
  videos: CleanVideo[];
  isValidating: boolean;
  error: string | null;
}

/**
 * Validate videos at runtime with thumbnail probing
 * Returns validated videos and loading state
 */
export function useValidatedVideos(initialVideos: CleanVideo[]): ValidationState {
  const [state, setState] = useState<ValidationState>({
    videos: initialVideos, // Start with initial data
    isValidating: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function validate() {
      try {
        console.log('[RUNTIME VALIDATION] Starting thumbnail probe for all videos...');

        // Convert CleanVideo back to RawVideoData for re-validation
        const rawVideos: RawVideoData[] = initialVideos.map(video => ({
          id: video.id,
          videoId: video.videoId,
          title: video.title,
          creator: video.creator,
          channelUrl: video.channelUrl,
          duration: video.durationDisplay,
          level: video.level,
          category: video.category,
          tags: video.tags,
          description: video.description,
          isFree: video.isFree,
        }));

        // Re-validate with thumbnail probing
        const validated = await sanitizeVideosAsync(rawVideos);

        if (cancelled) return;

        console.log('[RUNTIME VALIDATION] Complete');
        console.log(`[RUNTIME VALIDATION] Before: ${initialVideos.length}, After: ${validated.length}`);

        if (validated.length < initialVideos.length) {
          const removed = initialVideos.length - validated.length;
          console.warn(`[RUNTIME VALIDATION] ${removed} video(s) failed thumbnail probe and were removed`);
        }

        setState({
          videos: validated,
          isValidating: false,
          error: null,
        });
      } catch (error) {
        if (cancelled) return;

        console.error('[RUNTIME VALIDATION] Error:', error);
        setState({
          videos: initialVideos, // Fallback to initial data
          isValidating: false,
          error: 'Validation failed, using initial data',
        });
      }
    }

    validate();

    return () => {
      cancelled = true;
    };
  }, []); // Only run once on mount

  return state;
}
