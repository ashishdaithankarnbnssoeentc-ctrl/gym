/**
 * Content Routes
 *
 * Clean route definitions using controller pattern
 */

import { Router } from 'express';
import { getContent, getContentById, searchContent, getContentByCategory } from '../controllers/content.controller';
import { cacheMiddleware, invalidateCache, cachePatterns } from '../middleware/cache.js';
import { validateContentQuery, validateContentId } from '../middleware/input.validation';

const router = Router();

/**
 * GET /api/content/search
 * Search content by title, description, or tags
 */
router.get('/search', cacheMiddleware(180), validateContentQuery, searchContent);

/**
 * GET /api/content/category/:category
 * Get content by category
 */
router.get('/category/:category', cacheMiddleware(300), validateContentQuery, getContentByCategory);

/**
 * GET /api/content/:id
 * Get single content by ID
 */
router.get('/:id', cacheMiddleware(600), validateContentId, getContentById);

/**
 * GET /api/content
 * Get all content with optional filtering
 */
router.get('/', cacheMiddleware(300), validateContentQuery, getContent);

export default router;
