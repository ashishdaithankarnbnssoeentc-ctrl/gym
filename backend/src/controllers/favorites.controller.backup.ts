/**
 * Favorites Controller
 *
 * Handles user favorites (saved content)
 */

import { Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { AuthRequest } from '../middleware/auth.js';

/**
 * Helper function to get Supabase user ID from Firebase UID
 */
async function getUserId(firebase_uid: string): Promise<string | null> {
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
 * Get all favorites for authenticated user (with pagination)
 *
 * GET /api/favorites?page=1&limit=20
 */
export const getFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const userId = await getUserId((req.user as any).uid || '');

    if (!userId) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile does not exist in database',
      });
    }

    // Parse and validate pagination
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Get favorites with pagination
    const { data, error, count } = await supabase
      .from('favorites')
      .select('id, content_id, content_type, created_at', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const totalPages = count ? Math.ceil(count / limit) : 0;

    return res.json({
      favorites: data || [],
      count: data?.length || 0,
      total: count || 0,
      page,
      limit,
      total_pages: totalPages,
    });
  } catch (err: any) {
    console.error('[GET FAVORITES ERROR]', err.message);
    return res.status(500).json({
      error: 'Failed to fetch favorites',
      message: err.message,
    });
  }
};

/**
 * Add content to favorites
 *
 * POST /api/favorites
 * Body: { content_id: string, content_type?: string }
 */
export const addFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const userId = await getUserId((req.user as any).uid || '');

    if (!userId) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile does not exist in database',
      });
    }

    const { content_id, content_type = 'video' } = req.body;

    // Validate input
    if (!content_id || typeof content_id !== 'string' || content_id.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'content_id is required and must be a non-empty string',
      });
    }

    if (typeof content_type !== 'string' || content_type.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'content_type must be a non-empty string',
      });
    }

    const sanitizedContentId = content_id.trim();
    const sanitizedContentType = content_type.trim();

    // Insert favorite (upsert to handle duplicates gracefully)
    const { data, error } = await supabase
      .from('favorites')
      .upsert(
        {
          user_id: userId,
          content_id: sanitizedContentId,
          content_type: sanitizedContentType,
        },
        {
          onConflict: 'user_id,content_id',
          ignoreDuplicates: true,
        }
      )
      .select()
      .single();

    if (error) {
      // Handle duplicate (if upsert didn't work)
      if (error.code === '23505') {
        return res.status(200).json({
          success: true,
          message: 'Already in favorites',
        });
      }
      throw error;
    }

    console.log(`✅ Favorite added: ${sanitizedContentId} for user ${req.user!.uid}`);

    return res.status(201).json({
      success: true,
      favorite: data,
    });
  } catch (err: any) {
    console.error('[ADD FAVORITE ERROR]', err.message);
    return res.status(500).json({
      error: 'Failed to add favorite',
      message: err.message,
    });
  }
};

/**
 * Remove favorite by content ID
 *
 * DELETE /api/favorites/:contentId
 */
export const removeFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const userId = await getUserId((req.user as any).uid || '');

    if (!userId) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile does not exist in database',
      });
    }

    const { contentId } = req.params;

    if (!contentId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Content ID is required',
      });
    }

    // Delete favorite (with user ownership check)
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('content_id', contentId);

    if (error) throw error;

    console.log(`✅ Favorite removed: ${contentId} for user ${req.user!.uid}`);

    return res.json({
      success: true,
      message: 'Favorite removed',
    });
  } catch (err: any) {
    console.error('[REMOVE FAVORITE ERROR]', err.message);
    return res.status(500).json({
      error: 'Failed to remove favorite',
      message: err.message,
    });
  }
};

/**
 * Check if content is favorited
 *
 * GET /api/favorites/check/:contentId
 */
export const checkFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const userId = await getUserId((req.user as any).uid || '');

    if (!userId) {
      return res.json({ favorited: false });
    }

    const { contentId } = req.params;

    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('content_id', contentId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return res.json({
      favorited: !!data,
    });
  } catch (err: any) {
    console.error('[CHECK FAVORITE ERROR]', err.message);
    return res.status(500).json({
      error: 'Failed to check favorite',
      message: err.message,
    });
  }
};
