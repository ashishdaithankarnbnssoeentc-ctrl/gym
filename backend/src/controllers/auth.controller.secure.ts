/**
 * Secure Auth Controller
 * 
 * Handles user authentication and profile management with strict security
 * Prevents mass assignment attacks and enforces proper input validation
 */

import { Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

// Strict validation schema for user sync
const userSyncSchema = z.object({
  first_name: z.string().min(1).max(50).optional(),
  last_name: z.string().min(1).max(50).optional(),
  phone: z.string().regex(/^\+?[\d\s-()]+$/).optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  membership_plan: z.enum(['basic', 'premium', 'enterprise']).optional(),
  location: z.string().max(100).optional()
}).strict();

/**
 * Sync Firebase user to Supabase (SECURE VERSION)
 * Creates or updates user profile in Supabase database with strict validation
 *
 * POST /api/auth/sync-user
 */
export const syncUser = async (req: AuthRequest, res: Response) => {
  try {
    const { uid, email } = req.user!;
    
    // ❌ CRITICAL FIX: Validate input strictly
    const validatedData = userSyncSchema.parse(req.body);
    
    // ❌ CRITICAL FIX: Only allow specific fields
    const { first_name, last_name, phone, date_of_birth, membership_plan, location } = validatedData;

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', uid)
      .single();

    let userData;

    if (existingUser) {
      // ❌ CRITICAL FIX: Only update allowed fields with validation
      const updateData: any = {
        email,
        updated_at: new Date().toISOString(),
      };

      // Only update fields that were provided and validated
      if (first_name !== undefined) updateData.first_name = first_name;
      if (last_name !== undefined) updateData.last_name = last_name;
      if (phone !== undefined) updateData.phone = phone;
      if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth;
      if (membership_plan !== undefined) updateData.membership_plan = membership_plan;
      if (location !== undefined) updateData.location = location;

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('firebase_uid', uid)
        .select()
        .single();

      if (error) throw error;
      userData = data;
      console.log(`✅ User updated: ${uid}`);
    } else {
      // ❌ CRITICAL FIX: Only insert validated fields
      const insertData: any = {
        firebase_uid: uid,
        email,
        membership_plan: membership_plan || 'basic',
        updated_at: new Date().toISOString(),
      };

      // Only add optional fields if they were provided
      if (first_name) insertData.first_name = first_name;
      if (last_name) insertData.last_name = last_name;
      if (phone) insertData.phone = phone;
      if (date_of_birth) insertData.date_of_birth = date_of_birth;
      if (location) insertData.location = location;
      else insertData.location = '';

      const { data, error } = await supabase
        .from('users')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      userData = data;
      console.log(`✅ User created: ${uid}`);
    }

    return res.json({
      success: true,
      message: 'User synced successfully',
      user: userData
    });

  } catch (error: any) {
    console.error('❌ User sync error:', error);
    
    // ❌ CRITICAL FIX: Proper error handling without information leakage
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'Request contains invalid data',
        details: error.errors
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'User sync failed'
    });
  }
};

/**
 * Get user profile (SECURE VERSION)
 * 
 * GET /api/auth/me
 */
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { uid } = req.user!;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, firebase_uid, email, first_name, last_name, phone, date_of_birth, membership_plan, location, created_at, updated_at')
      .eq('firebase_uid', uid)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    return res.json({
      success: true,
      user
    });

  } catch (error: any) {
    console.error('❌ Get profile error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get user profile'
    });
  }
};

/**
 * Update user profile (SECURE VERSION)
 * 
 * PUT /api/auth/profile
 */
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { uid } = req.user!;
    
    // ❌ CRITICAL FIX: Validate input strictly
    const validatedData = userSyncSchema.parse(req.body);

    // ❌ CRITICAL FIX: Only update allowed fields
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    const { first_name, last_name, phone, date_of_birth, membership_plan, location } = validatedData;

    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (phone !== undefined) updateData.phone = phone;
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth;
    if (membership_plan !== undefined) updateData.membership_plan = membership_plan;
    if (location !== undefined) updateData.location = location;

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('firebase_uid', uid)
      .select('id, firebase_uid, email, first_name, last_name, phone, date_of_birth, membership_plan, location, created_at, updated_at')
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });

  } catch (error: any) {
    console.error('❌ Update profile error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'Request contains invalid data',
        details: error.errors
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update profile'
    });
  }
};
