/**
 * Supabase Client (Backend - Service Role)
 *
 * Uses service role key for full database access
 * Backend only - never expose to frontend
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';

// Force correct .env path
dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// DEBUG: Environment loading verification
console.log('🔍 ENV DEBUG - Working Directory:', process.cwd());
console.log('🔍 ENV DEBUG - SUPABASE URL:', supabaseUrl);
console.log('🔍 ENV DEBUG - KEY LENGTH:', supabaseServiceRoleKey?.length);

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env'
  );
}

// Create Supabase client with service role (bypasses RLS)
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    fetch: fetch as any,
  },
});

console.log('✅ Supabase backend client initialized');
console.log('🔍 DEBUG - SUPABASE KEY LENGTH:', supabaseServiceRoleKey?.length);
console.log('🔍 DEBUG - SUPABASE KEY FORMAT:', supabaseServiceRoleKey?.startsWith('eyJ') ? 'JWT FORMAT' : 'WRONG FORMAT');
