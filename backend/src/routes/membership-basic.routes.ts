/**
 * Basic Membership Routes (with Firebase auth protection)
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { verifyFirebaseToken } from '../firebase.js';

const router = Router();

/**
 * Get current user's membership status
 * 
 * GET /api/membership/me
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    // Check for auth token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Extract and verify Firebase token
    const token = authHeader.split(' ')[1];
    const decodedToken = await verifyFirebaseToken(token);

    if (!decodedToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Attach user info to request for potential use
    (req as any).user = {
      id: decodedToken.uid,
      email: decodedToken.email,
      tenantId: decodedToken.tenantId || 'default'
    };

    // Query membership from Supabase
    const { data: membership, error } = await supabase
      .from('memberships')
      .select('*')
      .eq('user_id', decodedToken.uid)
      .eq('status', 'active')
      .single();

    if (error || !membership) {
      return res.json({
        status: 'inactive',
        plan: 'basic',
        next_payment_date: null,
        is_active: false
      });
    }

    return res.json({
      status: membership.status,
      plan: membership.plan,
      next_payment_date: membership.next_payment_date,
      is_active: membership.status === 'active'
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Server error',
      message: err.message,
    });
  }
});

export default router;
