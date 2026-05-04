/**
 * Supabase Client (Backend)
 * 
 * Uses SERVICE ROLE KEY for full database access
 * NEVER expose this key to the frontend!
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables. Check backend/.env file.');
}

// Create Supabase client with SERVICE ROLE KEY
// This bypasses Row Level Security (RLS) - use carefully!
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

console.log('✅ Supabase backend client initialized');
