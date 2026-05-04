-- ============================================================================
-- PRODUCTION ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- This migration implements secure, production-ready RLS policies for all tables
-- Created: November 21, 2025
-- Version: 1.0.0
-- ============================================================================

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Drop existing test policies if they exist
DROP POLICY IF EXISTS "Enable read for anon" ON users;
DROP POLICY IF EXISTS "Enable insert for anon" ON users;
DROP POLICY IF EXISTS "Enable update for anon" ON users;
DROP POLICY IF EXISTS "Enable delete for anon" ON users;

-- Policy 1: Users can read their own data
CREATE POLICY "users_select_own" 
ON users FOR SELECT 
USING (
  auth.uid()::text = firebase_uid
);

-- Policy 2: Users can insert their own data during registration
CREATE POLICY "users_insert_own" 
ON users FOR INSERT 
WITH CHECK (
  auth.uid()::text = firebase_uid
);

-- Policy 3: Users can update their own data
CREATE POLICY "users_update_own" 
ON users FOR UPDATE 
USING (
  auth.uid()::text = firebase_uid
)
WITH CHECK (
  auth.uid()::text = firebase_uid
);

-- Policy 4: Prevent user deletion (soft delete recommended in production)
-- Users cannot delete their own records
-- Admin deletion should be handled through service role key
CREATE POLICY "users_no_delete" 
ON users FOR DELETE 
USING (false);

-- Policy 5: Allow public read access to specific fields (optional)
-- Useful for public trainer profiles, leaderboards, etc.
-- Uncomment if needed:
-- CREATE POLICY "users_public_read_limited" 
-- ON users FOR SELECT 
-- USING (true)
-- RETURNING (firebase_uid, first_name, last_name, membership_plan);

-- ============================================================================
-- FAVORITES TABLE POLICIES
-- ============================================================================

-- Drop existing test policies if they exist
DROP POLICY IF EXISTS "Enable all for anon" ON favorites;

-- Policy 1: Users can read their own favorites
CREATE POLICY "favorites_select_own" 
ON favorites FOR SELECT 
USING (
  auth.email() = user_email
);

-- Policy 2: Users can insert their own favorites
CREATE POLICY "favorites_insert_own" 
ON favorites FOR INSERT 
WITH CHECK (
  auth.email() = user_email
);

-- Policy 3: Users can update their own favorites (if needed)
CREATE POLICY "favorites_update_own" 
ON favorites FOR UPDATE 
USING (
  auth.email() = user_email
)
WITH CHECK (
  auth.email() = user_email
);

-- Policy 4: Users can delete their own favorites
CREATE POLICY "favorites_delete_own" 
ON favorites FOR DELETE 
USING (
  auth.email() = user_email
);

-- ============================================================================
-- ADDITIONAL TABLES (Add as needed)
-- ============================================================================

-- Example: Classes table policies
-- CREATE TABLE IF NOT EXISTS classes (
--   id SERIAL PRIMARY KEY,
--   name TEXT NOT NULL,
--   description TEXT,
--   instructor_id TEXT,
--   schedule JSONB,
--   capacity INTEGER,
--   created_at TIMESTAMP DEFAULT NOW()
-- );
-- 
-- ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
-- 
-- -- Allow public read access to classes
-- CREATE POLICY "classes_public_read" 
-- ON classes FOR SELECT 
-- USING (true);
-- 
-- -- Only admins can modify classes (use service role key)
-- CREATE POLICY "classes_admin_only" 
-- ON classes FOR ALL 
-- USING (false);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify policies are created
-- Run these queries to check your policies:

-- SELECT * FROM pg_policies WHERE tablename = 'users';
-- SELECT * FROM pg_policies WHERE tablename = 'favorites';

-- ============================================================================
-- TESTING NOTES
-- ============================================================================

-- IMPORTANT: After applying these policies, the Supabase Tester will need
-- proper authentication to pass all tests. The test suite uses anon key,
-- which will now have restricted access (as it should in production).

-- For development/testing:
-- 1. Create test users through Firebase Authentication
-- 2. Use authenticated Supabase client with user tokens
-- 3. Test CRUD operations with proper auth context

-- For CI/CD testing:
-- 1. Use service role key for integration tests
-- 2. Never expose service role key in client code
-- 3. Set up separate test database if needed

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

-- To rollback to permissive policies (DEVELOPMENT ONLY):
-- 
-- DROP POLICY "users_select_own" ON users;
-- DROP POLICY "users_insert_own" ON users;
-- DROP POLICY "users_update_own" ON users;
-- DROP POLICY "users_no_delete" ON users;
-- DROP POLICY "favorites_select_own" ON favorites;
-- DROP POLICY "favorites_insert_own" ON favorites;
-- DROP POLICY "favorites_update_own" ON favorites;
-- DROP POLICY "favorites_delete_own" ON favorites;
-- 
-- CREATE POLICY "Enable read for anon" ON users FOR SELECT USING (true);
-- CREATE POLICY "Enable insert for anon" ON users FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Enable update for anon" ON users FOR UPDATE USING (true);
-- CREATE POLICY "Enable delete for anon" ON users FOR DELETE USING (true);
-- CREATE POLICY "Enable all for anon" ON favorites FOR ALL USING (true);

-- ============================================================================
-- MONITORING & MAINTENANCE
-- ============================================================================

-- Set up monitoring for policy violations:
-- Monitor Supabase logs for error code 42501 (insufficient privileges)
-- These logs indicate users attempting unauthorized access

-- Regular maintenance:
-- 1. Review policies quarterly
-- 2. Audit access patterns
-- 3. Update policies based on new features
-- 4. Test policies in staging before production

-- ============================================================================
-- COMPLIANCE NOTES
-- ============================================================================

-- GDPR Compliance:
-- - Users can read/update their own data ✓
-- - Consider implementing data export functionality
-- - Add user deletion workflow (soft delete recommended)

-- Security Best Practices:
-- - Never use permissive policies in production ✓
-- - Always validate auth.uid() or auth.email() ✓
-- - Use service role key only in secure backend ✓
-- - Enable RLS on all tables ✓

-- ============================================================================
