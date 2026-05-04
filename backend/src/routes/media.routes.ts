/**
 * Media Routes
 * 
 * Handles media requests with failure caching to prevent 404 spam
 */

import { Router, Request, Response } from 'express';
import { Readable } from 'stream';
import { validateMediaRequest, getMediaFailureStats, clearMediaFailureCache } from '../middleware/media.validation.middleware.js';
import { mediaFallbackService } from '../services/media.fallback.service.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

/**
 * GET /api/media/thumbnail/:videoId
 * Get thumbnail with failure caching
 */
router.get('/thumbnail/:videoId', validateMediaRequest, async (req: Request, res: Response) => {
  try {
    const videoId = Array.isArray(req.params.videoId) ? req.params.videoId[0] : req.params.videoId;

    // Get content from database
    const { data: content, error } = await supabase
      .from('content')
      .select('thumbnail_url, video_url')
      .eq('id', videoId)
      .single();

    if (error || !content?.thumbnail_url) {
      // Return fallback response instead of 404
      mediaFallbackService.sendFallbackThumbnail(res, videoId, content?.thumbnail_url);
      return;
    }

    // Proxy the thumbnail request with proper error handling
    try {
      const thumbnailResponse = await fetch(content.thumbnail_url);

      if (!thumbnailResponse.ok) {
        throw new Error(`Thumbnail request failed: ${thumbnailResponse.status}`);
      }

      // Set appropriate headers
      res.set({
        'Content-Type': thumbnailResponse.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600', // 1 hour cache
        'X-Video-ID': videoId
      });

      // Convert ReadableStream to Node.js stream and pipe response
      if (thumbnailResponse.body) {
        const reader = thumbnailResponse.body.getReader();
        const stream = new Readable({
          read() {
            reader.read().then(({ done, value }) => {
              if (done) {
                this.push(null);
              } else {
                this.push(Buffer.from(value));
              }
            }).catch(err => {
              this.destroy(err);
            });
          }
        });
        stream.pipe(res);
      } else {
        // Return fallback response instead of 404
        mediaFallbackService.sendFallbackThumbnail(res, videoId, content.thumbnail_url);
        return;
      }
    } catch (fetchError: any) {
      // Record the failure to prevent future attempts
      const { recordMediaFailure } = await import('../middleware/media.validation.middleware.js');
      recordMediaFailure(videoId, content.thumbnail_url, content.video_url || '', fetchError);

      // Return fallback response instead of 404
      mediaFallbackService.sendFallbackThumbnail(res, videoId, content.thumbnail_url);
      return;
    }
  } catch (err: any) {
    console.error('[THUMBNAIL ERROR]', err.message);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process thumbnail request'
    });
  }
});

/**
 * GET /api/media/video/:videoId
 * Get video with failure caching
 */
router.get('/video/:videoId', validateMediaRequest, async (req: Request, res: Response) => {
  try {
    const videoId = Array.isArray(req.params.videoId) ? req.params.videoId[0] : req.params.videoId;

    // Get content from database
    const { data: content, error } = await supabase
      .from('content')
      .select('video_url, thumbnail_url')
      .eq('id', videoId)
      .single();

    if (error || !content?.video_url) {
      // Return fallback response instead of 404
      mediaFallbackService.sendFallbackVideo(res, videoId, content?.video_url);
      return;
    }

    // For video requests, return the URL rather than proxying (to save bandwidth)
    // The frontend can handle the actual video loading
    return res.json({
      videoUrl: content.video_url,
      videoId,
      available: true
    });
  } catch (err: any) {
    console.error('[VIDEO ERROR]', err.message);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process video request'
    });
  }
});

/**
 * GET /api/media/stats
 * Get media failure statistics (admin only)
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = getMediaFailureStats();

    return res.json({
      mediaFailures: stats,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[MEDIA STATS ERROR]', err.message);
    return res.status(500).json({
      error: 'Failed to get media statistics'
    });
  }
});

/**
 * DELETE /api/media/cache
 * Clear media failure cache (admin only)
 */
router.delete('/cache', async (req: Request, res: Response) => {
  try {
    clearMediaFailureCache();

    return res.json({
      message: 'Media failure cache cleared',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[CLEAR CACHE ERROR]', err.message);
    return res.status(500).json({
      error: 'Failed to clear media cache'
    });
  }
});

/**
 * GET /api/media/analytics
 * Get comprehensive media analytics (admin only)
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const { timeframe = '24' } = req.query;
    const hours = parseInt(timeframe as string) || 24;

    const { mediaAnalyticsService } = await import('../services/media.analytics.service.js');
    const report = mediaAnalyticsService.getAnalyticsReport(hours);

    return res.json(report);
  } catch (err: any) {
    console.error('[MEDIA ANALYTICS ERROR]', err.message);
    return res.status(500).json({
      error: 'Failed to get media analytics'
    });
  }
});

/**
 * GET /api/media/analytics/tenant/:tenantId
 * Get tenant-specific media analytics (admin only)
 */
router.get('/analytics/tenant/:tenantId', async (req: Request, res: Response) => {
  try {
    const tenantId = Array.isArray(req.params.tenantId) ? req.params.tenantId[0] : req.params.tenantId;
    const { timeframe = '24' } = req.query;
    const hours = parseInt(timeframe as string) || 24;

    const { mediaAnalyticsService } = await import('../services/media.analytics.service.js');
    const analytics = mediaAnalyticsService.getTenantAnalytics(tenantId, hours);

    return res.json({
      tenantId,
      timeframe: `${hours}h`,
      ...analytics,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[TENANT ANALYTICS ERROR]', err.message);
    return res.status(500).json({
      error: 'Failed to get tenant analytics'
    });
  }
});

/**
 * GET /api/media/analytics/sources
 * Get problematic media sources (admin only)
 */
router.get('/analytics/sources', async (req: Request, res: Response) => {
  try {
    const { timeframe = '24' } = req.query;
    const hours = parseInt(timeframe as string) || 24;

    const { mediaAnalyticsService } = await import('../services/media.analytics.service.js');
    const sources = mediaAnalyticsService.getProblematicSources(hours);

    return res.json({
      timeframe: `${hours}h`,
      sources,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[SOURCES ANALYTICS ERROR]', err.message);
    return res.status(500).json({
      error: 'Failed to get source analytics'
    });
  }
});

export default router;
