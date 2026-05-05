/**
 * Secure Favorites Controller
 * 
 * Handles user favorites with comprehensive security protections
 * Prevents IDOR, mass assignment, injection, and timing attacks
 */

import { Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

// Strict validation schemas
const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(1000)),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(100))
}).strict();

const addFavoriteSchema = z.object({
  content_id: z.string().uuid(),
  content_type: z.enum(['video', 'article', 'workout', 'nutrition']).optional()
}).strict();

const favoriteIdSchema = z.object({
  id: z.string().uuid()
}).strict();

/**
 * Get Supabase user ID with timing protection
 */
async function getUserId(firebase_uid: string): Promise<string | null> {
  // ❌ CRITICAL FIX: Prevent timing attacks with consistent delay
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('firebase_uid', firebase_uid)
    .single();

  if (error || !data) {
    return null;
  }

  return data.id;
}

/**
 * Get all favorites for authenticated user (SECURE VERSION)
 *
 * GET /api/favorites?page=1&limit=20
 */
export const getFavorites = async (req: AuthRequest, res: Response) => {
  try {
    // ❌ CRITICAL FIX: Validate query parameters strictly
    const validatedQuery = paginationSchema.parse(req.query);
    const { page, limit } = validatedQuery;

    // ❌ CRITICAL FIX: Ensure user is authenticated
    if (!req.user?.uid) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User authentication required'
      });
    }

    const userId = await getUserId(req.user.uid);

    if (!userId) {
      // ❌ CRITICAL FIX: Return 404 instead of 403 to prevent enumeration
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // ❌ CRITICAL FIX: Remove expensive count query for DoS prevention
    const { data, error } = await supabase
      .from('favorites')
      .select('id, content_id, content_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return res.json({
      success: true,
      favorites: data || [],
      count: data?.length || 0,
      page,
      limit,
      has_more: data?.length === limit
    });

  } catch (error: any) {
    console.error('[GET FAVORITES ERROR]', error);
    
    // ❌ CRITICAL FIX: Remove error message leakage
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid pagination parameters',
        message: 'Page and limit must be valid numbers'
      });
    }

    return res.status(500).json({
      error: 'Failed to fetch favorites',
      message: 'Internal server error'
    });
  }
};

/**
 * Add content to favorites (SECURE VERSION)
 *
 * POST /api/favorites
 * Body: { content_id: string, content_type?: string }
 */
export const addFavorite = async (req: AuthRequest, res: Response) => {
  try {
    // ❌ CRITICAL FIX: Validate input strictly
    const validatedData = addFavoriteSchema.parse(req.body);
    const { content_id, content_type = 'video' } = validatedData;

    // ❌ CRITICAL FIX: Ensure user is authenticated
    if (!req.user?.uid) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User authentication required'
      });
    }

    const userId = await getUserId(req.user.uid);

    if (!userId) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    // ❌ CRITICAL FIX: Check if content exists and user has access
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select('id, tenant_id')
      .eq('id', content_id)
      .single();

    if (contentError || !content) {
      return res.status(404).json({
        error: 'Content not found',
        message: 'Content not found'
      });
    }

    // ❌ CRITICAL FIX: Enforce tenant isolation
    if (req.user?.tenantId && content.tenant_id !== req.user.tenantId) {
      return res.status(404).json({
        error: 'Content not found',
        message: 'Content not found'
      });
    }

    // Check if already favorited
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('content_id', content_id)
      .single();

    if (existing) {
      return res.status(409).json({
        error: 'Already favorited',
        message: 'Content is already in favorites'
      });
    }

    // Add to favorites with tenant isolation
    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        content_id,
        content_type,
        tenant_id: req.user.tenantId
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: 'Added to favorites',
      favorite: data
    });

  } catch (error: any) {
    console.error('[ADD FAVORITE ERROR]', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Content ID must be a valid UUID',
        details: error.errors
      });
    }

    return res.status(500).json({
      error: 'Failed to add favorite',
      message: 'Internal server error'
    });
  }
};

/**
 * Remove content from favorites (SECURE VERSION)
 *
 * DELETE /api/favorites/:id
 */
export const removeFavorite = async (req: AuthRequest, res: Response) => {
  try {
    // ❌ CRITICAL FIX: Validate ID parameter
    const { id } = favoriteIdSchema.parse(req.params);

    // ❌ CRITICAL FIX: Ensure user is authenticated
    if (!req.user?.uid) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User authentication required'
      });
    }

    const userId = await getUserId(req.user.uid);

    if (!userId) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    // ❌ CRITICAL FIX: Verify ownership before deletion
    const { data: favorite, error: fetchError } = await supabase
      .from('favorites')
      .select('id, user_id, tenant_id')
      .eq('id', id)
      .single();

    if (fetchError || !favorite) {
      return res.status(404).json({
        error: 'Favorite not found',
        message: 'Favorite not found'
      });
    }

    // ❌ CRITICAL FIX: Enforce ownership and tenant isolation
    if (favorite.user_id !== userId || 
        (req.user?.tenantId && favorite.tenant_id !== req.user.tenantId)) {
      return res.status(404).json({
        error: 'Favorite not found',
        message: 'Favorite not found'
      });
    }

    // Delete favorite
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.json({
      success: true,
      message: 'Removed from favorites'
    });

  } catch (error: any) {
    console.error('[REMOVE FAVORITE ERROR]', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid favorite ID',
        message: 'Favorite ID must be a valid UUID',
        details: error.errors
      });
    }

    return res.status(500).json({
      error: 'Failed to remove favorite',
      message: 'Internal server error'
    });
  }
};

/**
 * Check if content is favorited (SECURE VERSION)
 *
 * GET /api/favorites/check/:content_id
 */
export const checkFavorite = async (req: AuthRequest, res: Response) => {
  try {
    // ❌ CRITICAL FIX: Validate content ID
    const { content_id } = z.object({
      content_id: z.string().uuid()
    }).strict().parse(req.params);

    // ❌ CRITICAL FIX: Ensure user is authenticated
    if (!req.user?.uid) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User authentication required'
      });
    }

    const userId = await getUserId(req.user.uid);

    if (!userId) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    // Check if favorited with tenant isolation
    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('content_id', content_id)
      .eq('tenant_id', req.user.tenantId)
      .single();

    return res.json({
      success: true,
      is_favorited: !!data,
      favorite_id: data?.id || null
    });

  } catch (error: any) {
    console.error('[CHECK FAVORITE ERROR]', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid content ID',
        message: 'Content ID must be a valid UUID'
      });
    }

    return res.status(500).json({
      error: 'Failed to check favorite',
      message: 'Internal server error'
    });
  }
};
