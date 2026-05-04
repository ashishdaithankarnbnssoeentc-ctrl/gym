/**
 * Content Routes
 *
 * Clean route definitions using controller pattern
 */

import { Router } from 'express';
import { getContent, getContentById, searchContent, getContentByCategory } from '../controllers/content.controller.js';
import { cacheMiddleware, invalidateCache, cachePatterns } from '../middleware/cache.js';

const router = Router();

/**
 * GET /api/content/search
 * Search content by title, description, or tags
 */
router.get('/search', cacheMiddleware(180), searchContent);

/**
 * GET /api/content/category/:category
 * Get content by category
 */
router.get('/category/:category', cacheMiddleware(300), getContentByCategory);

/**
 * GET /api/content/:id
 * Get single content by ID
 */
router.get('/:id', cacheMiddleware(600), getContentById);

/**
 * GET /api/content
 * Get all content with optional filtering
 */
router.get('/', cacheMiddleware(300), getContent);

export default router;
