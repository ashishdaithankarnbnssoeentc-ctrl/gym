/**
 * Auth Controller
 *
 * Handles user authentication and profile management
 */

import { Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { AuthRequest } from '../middleware/auth.js';

/**
 * Sync Firebase user to Supabase
 * Creates or updates user profile in Supabase database
 *
 * POST /api/auth/sync-user
 */
export const syncUser = async (req: AuthRequest, res: Response) => {
  try {
    const { uid, email } = req.user!;
    const { first_name, last_name, phone, date_of_birth, membership_plan, location } = req.body;

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', uid)
      .single();

    let userData;

    if (existingUser) {
      // Update existing user
      const { data, error } = await supabase
        .from('users')
        .update({
          email,
          first_name: first_name || existingUser.first_name,
          last_name: last_name || existingUser.last_name,
          phone,
          date_of_birth,
          membership_plan: membership_plan || 'basic',
          location,
          updated_at: new Date().toISOString(),
        })
        .eq('firebase_uid', uid)
        .select()
        .single();

      if (error) throw error;
      userData = data;
      console.log(`✅ User updated: ${uid}`);
    } else {
      // Create new user
      const { data, error } = await supabase
        .from('users')
        .insert({
          firebase_uid: uid,
          email,
          first_name: first_name || 'User',
          last_name: last_name || '',
          phone,
          date_of_birth,
          membership_plan: membership_plan || 'basic',
          location: location || '',
        })
        .select()
        .single();

      if (error) throw error;
      userData = data;
      console.log(`✅ User created: ${uid}`);
    }

    return res.json({
      success: true,
      user: userData,
    });
  } catch (err: any) {
    console.error('[SYNC USER ERROR]', err.message);
    return res.status(500).json({
      error: 'Failed to sync user',
      message: err.message,
    });
  }
};

/**
 * Get current user profile
 *
 * GET /api/auth/me
 */
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const { uid } = req.user!;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', uid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'User not found',
          message: 'User profile does not exist. Please sync user first.',
        });
      }
      throw error;
    }

    return res.json(data);
  } catch (err: any) {
    console.error('[GET ME ERROR]', err.message);
    return res.status(500).json({
      error: 'Failed to fetch user',
      message: err.message,
    });
  }
};

/**
 * Update user profile
 *
 * PATCH /api/auth/me
 */
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { uid } = req.user!;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.firebase_uid;
    delete updates.id;
    delete updates.created_at;

    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('firebase_uid', uid)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Profile updated: ${uid}`);

    return res.json({
      success: true,
      user: data,
    });
  } catch (err: any) {
    console.error('[UPDATE PROFILE ERROR]', err.message);
    return res.status(500).json({
      error: 'Failed to update profile',
      message: err.message,
    });
  }
};
