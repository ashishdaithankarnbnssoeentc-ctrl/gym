/**
 * Simple Membership Routes (no complex dependencies)
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * Get current user's membership status
 * 
 * GET /api/membership/me
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    // For now, return mock membership status
    // TODO: Add proper auth middleware when ready
    return res.json({
      status: 'active',
      plan: 'premium',
      next_payment_date: '2026-06-01',
      is_active: true
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Server error',
      message: err.message,
    });
  }
});

export default router;
