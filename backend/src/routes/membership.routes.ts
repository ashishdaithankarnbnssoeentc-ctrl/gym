/**
 * Membership Routes
 *
 * Handles membership status, plans, and billing
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * Get current user's membership status
 * 
 * GET /api/membership/me
 */
router.get('/me', requireAuth, async (req: any, res: Response) => {
  try {
    const user = req.user;

    const { data, error } = await supabase
      .from('memberships')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (error) {
      // If no active membership found, return default status
      if (error.code === 'PGRST116') {
        return res.json({
          status: 'inactive',
          plan: null,
          next_payment_date: null,
          is_active: false
        });
      }

      return res.status(500).json({
        error: 'Failed to fetch membership',
        message: error.message,
      });
    }

    return res.json({
      status: data.status || 'inactive',
      plan: data.plan || null,
      next_payment_date: data.next_payment_date || null,
      is_active: data.status === 'active'
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Server error',
      message: err.message,
    });
  }
});

/**
 * Update membership plan
 * 
 * PATCH /api/membership/upgrade
 */
router.patch('/upgrade', requireAuth, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { plan } = req.body;

    if (!plan) {
      return res.status(400).json({
        error: 'Plan is required',
      });
    }

    const { data, error } = await supabase
      .from('memberships')
      .upsert({
        user_id: user.id,
        plan,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: 'Failed to update membership',
        message: error.message,
      });
    }

    return res.json({
      success: true,
      membership: data
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Server error',
      message: err.message,
    });
  }
});

export default router;
