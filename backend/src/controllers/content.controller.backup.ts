/**
 * Content Controller
 *
 * Handles content retrieval, search, and filtering
 */

import { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { trackApiCall, trackError, trackPerformance } from '../sentry.js';
import { recordMediaFailure } from '../middleware/media.validation.middleware.js';

/**
 * Get all content with optional filtering
 *
 * GET /api/content?category=cardio&limit=20
 */
export const getContent = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { category, limit = '20', offset = '0' } = req.query;

    // Track API call
    trackApiCall('/api/content', 'GET', req.user?.id);

    let query = supabase
      .from('content')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // CRITICAL: Add tenant filtering for SaaS isolation
    // This prevents cross-tenant data access
    if (req.user?.tenantId) {
      query = query.eq('tenant_id', req.user.tenantId);
    }

    // Apply filters
    if (category && typeof category === 'string') {
      query = query.eq('category', category);
    }

    // Apply pagination
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const offsetNum = Math.max(0, parseInt(offset as string));

    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('get_content', duration);

    return res.json({
      content: data || [],
      count: data?.length || 0,
      total: count || 0,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (err: any) {
    console.error('[GET CONTENT ERROR]', err.message);
    console.error('[GET CONTENT ERROR DETAILS]', {
      error: err,
      stack: err.stack,
      details: err.details
    });

    // Track error in Sentry
    trackError(err, {
      endpoint: '/api/content',
      method: 'GET',
      query: req.query,
      user: req.user?.id
    });

    return res.status(500).json({
      error: 'Failed to fetch content',
      message: err.message,
    });
  }
};

/**
 * Get single content by ID
 *
 * GET /api/content/:id
 */
export const getContentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    let query = supabase
      .from('content')
      .select('*')
      .eq('id', id);

    // CRITICAL: Add tenant filtering for SaaS isolation
    if (req.user?.tenantId) {
      query = query.eq('tenant_id', req.user.tenantId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Not found',
          message: 'Content not found',
        });
      }
      throw error;
    }

    // Validate media URLs and record failures if needed
    const content = data;
    if (content?.thumbnail_url || content?.video_url) {
      try {
        // Check thumbnail URL availability (async, non-blocking)
        if (content.thumbnail_url) {
          const thumbnailCheck = await fetch(content.thumbnail_url, { method: 'HEAD' });
          if (!thumbnailCheck.ok) {
            recordMediaFailure(
              content.id,
              content.thumbnail_url,
              content.video_url || '',
              { response: { status: thumbnailCheck.status } }
            );
            console.log(`[CONTENT] Thumbnail failed for content ${content.id}: ${content.thumbnail_url}`);
          }
        }

        // Check video URL availability (async, non-blocking)
        if (content.video_url) {
          const videoCheck = await fetch(content.video_url, { method: 'HEAD' });
          if (!videoCheck.ok) {
            recordMediaFailure(
              content.id,
              content.thumbnail_url || '',
              content.video_url,
              { response: { status: videoCheck.status } }
            );
            console.log(`[CONTENT] Video failed for content ${content.id}: ${content.video_url}`);
          }
        }
      } catch (mediaError: any) {
        // Network errors during media validation
        recordMediaFailure(
          content.id,
          content.thumbnail_url || '',
          content.video_url || '',
          mediaError
        );
        console.log(`[CONTENT] Media validation error for content ${content.id}:`, mediaError.message);
      }
    }

    return res.json(data);
  } catch (err: any) {
    console.error('[GET CONTENT BY ID ERROR]', err.message);
    return res.status(500).json({
      error: 'Failed to fetch content',
      message: err.message,
    });
  }
};

/**
 * Search content by title, description, or tags
 *
 * GET /api/content/search?q=hiit&category=cardio&limit=20
 */
export const searchContent = async (req: Request, res: Response) => {
  try {
    const { q, category, limit = '20', offset = '0' } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Search query (q) is required and must be a non-empty string',
      });
    }

    const searchQuery = q.trim();

    // Build search query
    let query = supabase
      .from('content')
      .select('*', { count: 'exact' })
      .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      .order('created_at', { ascending: false });

    // CRITICAL: Add tenant filtering for SaaS isolation
    if (req.user?.tenantId) {
      query = query.eq('tenant_id', req.user.tenantId);
    }

    // Apply category filter
    if (category && typeof category === 'string') {
      query = query.eq('category', category);
    }

    // Apply pagination
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const offsetNum = Math.max(0, parseInt(offset as string));

    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return res.json({
      results: data || [],
      count: data?.length || 0,
      total: count || 0,
      query: searchQuery,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (err: any) {
    console.error('[SEARCH CONTENT ERROR]', err.message);
    return res.status(500).json({
      error: 'Search failed',
      message: err.message,
    });
  }
};

/**
 * Get content by category
 *
 * GET /api/content/category/:category
 */
export const getContentByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const { limit = '20', offset = '0' } = req.query;

    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const offsetNum = Math.max(0, parseInt(offset as string));

    const { data, error, count } = await supabase
      .from('content')
      .select('*', { count: 'exact' })
      .eq('category', category)
      .order('created_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (error) throw error;

    return res.json({
      content: data || [],
      count: data?.length || 0,
      total: count || 0,
      category,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (err: any) {
    console.error('[GET CONTENT BY CATEGORY ERROR]', err.message);
    return res.status(500).json({
      error: 'Failed to fetch content',
      message: err.message,
    });
  }
};
