/**
 * Authentication Routes
 *
 * Clean route definitions using controller pattern
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { syncUser, getMe, updateProfile } from '../controllers/auth.controller.js';

const router = Router();

/**
 * POST /api/auth/sync-user
 * Sync Firebase user to Supabase database
 */
router.post('/sync-user', requireAuth, syncUser);

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', requireAuth, getMe);

/**
 * PATCH /api/auth/me
 * Update user profile
 */
router.patch('/me', requireAuth, updateProfile);

export default router;
