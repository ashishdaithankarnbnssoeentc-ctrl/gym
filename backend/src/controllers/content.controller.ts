/**
 * Secure Content Controller
 * 
 * Handles content retrieval, search, and filtering with strict security
 * Prevents SQL injection, XSS, and IDOR attacks
 */

import { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { trackApiCall, trackError, trackPerformance } from '../sentry.js';
import { recordMediaFailure } from '../middleware/media.validation.middleware.js';
import { z } from 'zod';

// Strict validation schemas
const contentQuerySchema = z.object({
  category: z.string().max(50).regex(/^[a-zA-Z0-9\s_-]+$/).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(50)),
  offset: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(0)),
  search: z.string().max(100).regex(/^[a-zA-Z0-9\s_-]+$/).optional(),
  tags: z.array(z.string().max(20)).max(3).optional()
}).strict();

const contentIdSchema = z.object({
  id: z.string().uuid()
}).strict();

/**
 * Get all content with optional filtering (SECURE VERSION)
 *
 * GET /api/content?category=cardio&limit=20
 */
export const getContent = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // ❌ CRITICAL FIX: Validate query parameters strictly
    const validatedQuery = contentQuerySchema.parse(req.query);
    const { category, limit, offset, search, tags } = validatedQuery;

    // Track API call
    trackApiCall('/api/content', 'GET', req.user?.id);

    // ❌ CRITICAL FIX: Ensure user is authenticated for tenant isolation
    if (!req.user?.tenantId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User authentication required for content access'
      });
    }

    let query = supabase
      .from('content')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // ❌ CRITICAL FIX: Enforce tenant isolation (MANDATORY)
    query = query.eq('tenant_id', req.user.tenantId);

    // Apply filters with validation
    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      // ❌ CRITICAL FIX: Safe search implementation
      query = query.ilike('title', `%${search}%`);
    }

    if (tags && tags.length > 0) {
      query = query.contains('tags', tags);
    }

    // Apply pagination with validated limits
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('getContent', duration);

    return res.json({
      success: true,
      data: data || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (offset + limit) < (count || 0)
      }
    });

  } catch (error: any) {
    console.error('❌ Get content error:', error);
    trackError(error, { path: '/api/content', method: 'GET', userId: req.user?.id });

    // ❌ CRITICAL FIX: Proper error handling
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        message: 'Request contains invalid parameters',
        details: error.issues
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve content'
    });
  }
};

/**
 * Get content by ID (SECURE VERSION)
 *
 * GET /api/content/:id
 */
export const getContentById = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // ❌ CRITICAL FIX: Validate ID parameter
    const { id } = contentIdSchema.parse(req.params);

    // ❌ CRITICAL FIX: Ensure user is authenticated
    if (!req.user?.tenantId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User authentication required for content access'
      });
    }

    // Track API call
    trackApiCall('/api/content/:id', 'GET', req.user?.id);

    // ❌ CRITICAL FIX: Enforce tenant isolation and ownership
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', req.user.tenantId)  // Mandatory tenant check
      .single();

    if (error || !data) {
      // Return 404 instead of 403 to prevent IDOR enumeration
      return res.status(404).json({
        error: 'Content not found',
        message: 'Content not found'
      });
    }

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('getContentById', duration);

    return res.json({
      success: true,
      data
    });

  } catch (error: any) {
    console.error('❌ Get content by ID error:', error);
    trackError(error, { path: '/api/content/:id', method: 'GET', userId: req.user?.id });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid content ID',
        message: 'Content ID must be a valid UUID',
        details: error.issues
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve content'
    });
  }
};

/**
 * Search content (SECURE VERSION)
 *
 * GET /api/content/search?q=workout
 */
export const searchContent = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // ❌ CRITICAL FIX: Validate search parameters
    const searchSchema = z.object({
      q: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s_-]+$/),
      category: z.string().max(50).regex(/^[a-zA-Z0-9\s_-]+$/).optional(),
      limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(50)),
      offset: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(0))
    }).strict();

    const { q, category, limit, offset } = searchSchema.parse(req.query);

    // ❌ CRITICAL FIX: Ensure user is authenticated
    if (!req.user?.tenantId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User authentication required for content search'
      });
    }

    // Track API call
    trackApiCall('/api/content/search', 'GET', req.user?.id);

    let query = supabase
      .from('content')
      .select('*', { count: 'exact' })
      .ilike('title', `%${q}%`)
      .eq('tenant_id', req.user.tenantId);  // Mandatory tenant check

    if (category) {
      query = query.eq('category', category);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('searchContent', duration);

    return res.json({
      success: true,
      data: data || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (offset + limit) < (count || 0)
      },
      query: q
    });

  } catch (error: any) {
    console.error('❌ Search content error:', error);
    trackError(error, { path: '/api/content/search', method: 'GET', userId: req.user?.id });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid search parameters',
        message: 'Request contains invalid search parameters',
        details: error.issues
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to search content'
    });
  }
};

/**
 * Get content by category (SECURE VERSION)
 *
 * GET /api/content/category/:category
 */
export const getContentByCategory = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const categorySchema = z.object({
      category: z.string().max(50).regex(/^[a-zA-Z0-9\s_-]+$/),
      limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(50)),
      offset: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(0))
    }).strict();

    const { category, limit, offset } = categorySchema.parse({
      category: req.params.category,
      limit: req.query.limit || '20',
      offset: req.query.offset || '0'
    });

    // ❌ CRITICAL FIX: Ensure user is authenticated
    if (!req.user?.tenantId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User authentication required for content access'
      });
    }

    // Track API call
    trackApiCall('/api/content/category/:category', 'GET', req.user?.id);

    const { data, error, count } = await supabase
      .from('content')
      .select('*', { count: 'exact' })
      .eq('category', category)
      .eq('tenant_id', req.user.tenantId)  // Mandatory tenant check
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Track performance
    const duration = Date.now() - startTime;
    trackPerformance('getContentByCategory', duration);

    return res.json({
      success: true,
      data: data || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (offset + limit) < (count || 0)
      },
      category
    });

  } catch (error: any) {
    console.error('❌ Get content by category error:', error);
    trackError(error, { path: '/api/content/category/:category', method: 'GET', userId: req.user?.id });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid category parameters',
        message: 'Request contains invalid category parameters',
        details: error.issues
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve content by category'
    });
  }
};
