/**
 * Favorites Routes
 *
 * Clean route definitions using controller pattern
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getFavorites, addFavorite, removeFavorite, checkFavorite } from '../controllers/favorites.controller.js';

const router = Router();

/**
 * GET /api/favorites
 * Get all favorites for authenticated user (with pagination)
 */
router.get('/', requireAuth, getFavorites);

/**
 * POST /api/favorites
 * Add content to favorites
 */
router.post('/', requireAuth, addFavorite);

/**
 * DELETE /api/favorites/:contentId
 * Remove favorite by content ID
 */
router.delete('/:contentId', requireAuth, removeFavorite);

/**
 * GET /api/favorites/check/:contentId
 * Check if content is favorited
 */
router.get('/check/:contentId', requireAuth, checkFavorite);

export default router;
