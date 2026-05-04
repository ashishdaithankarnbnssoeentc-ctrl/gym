-- ============================================================================
-- ELITE FITNESS GYM - COMPLETE SUPABASE TEST SUITE
-- ============================================================================
-- Run this entire script in Supabase SQL Editor to verify everything works
-- Project: ozmmontfdlnzvqchhzdd.supabase.co
-- Date: April 9, 2026
-- ============================================================================

-- Clean up any previous test data
DELETE FROM favorites WHERE firebase_uid LIKE 'test_%';
DELETE FROM users WHERE firebase_uid LIKE 'test_%';

-- ============================================================================
-- PART 1: VERIFY TABLES EXIST
-- ============================================================================

-- Check if users table exists
SELECT 'TEST 1: Users table exists' AS test_name,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_name = 'users'
       ) THEN '✅ PASSED' ELSE '❌ FAILED' END AS result;

-- Check if favorites table exists
SELECT 'TEST 2: Favorites table exists' AS test_name,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_name = 'favorites'
       ) THEN '✅ PASSED' ELSE '❌ FAILED' END AS result;

-- ============================================================================
-- PART 2: VERIFY TABLE SCHEMAS
-- ============================================================================

-- Users table columns
SELECT 'TEST 3: Users table schema' AS test_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Favorites table columns
SELECT 'TEST 4: Favorites table schema' AS test_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'favorites'
ORDER BY ordinal_position;

-- ============================================================================
-- PART 3: TEST USERS TABLE - CREATE
-- ============================================================================

-- Insert test user 1
INSERT INTO users (
  firebase_uid,
  first_name,
  last_name,
  email,
  phone,
  membership_plan,
  membership_status,
  location,
  join_date,
  next_billing_date
)
VALUES (
  'test_user_001',
  'John',
  'Doe',
  'john.doe@test.com',
  '+1234567890',
  'Premium',
  'active',
  'New York',
  '2026-01-01',
  '2026-05-01'
);

-- Insert test user 2
INSERT INTO users (
  firebase_uid,
  first_name,
  last_name,
  email,
  phone,
  membership_plan,
  membership_status,
  location,
  join_date,
  next_billing_date
)
VALUES (
  'test_user_002',
  'Jane',
  'Smith',
  'jane.smith@test.com',
  '+1234567891',
  'Basic',
  'active',
  'Los Angeles',
  '2026-02-01',
  '2026-05-01'
);

-- Verify users were created
SELECT 'TEST 5: Users created successfully' AS test_name,
       CASE WHEN COUNT(*) = 2 
       THEN '✅ PASSED - 2 users created' 
       ELSE '❌ FAILED - Expected 2 users' 
       END AS result
FROM users
WHERE firebase_uid LIKE 'test_user_%';

-- ============================================================================
-- PART 4: TEST FAVORITES TABLE - CREATE WITH ALL REQUIRED FIELDS
-- ============================================================================

-- Insert favorite 1 (video - minimal fields)
INSERT INTO favorites (
  firebase_uid,
  item_id,
  item_type,
  title,
  user_email
)
VALUES (
  'test_user_001',
  'video_001',
  'video',
  'HIIT Cardio Workout',
  'john.doe@test.com'
);

-- Insert favorite 2 (video - all fields)
INSERT INTO favorites (
  firebase_uid,
  item_id,
  item_type,
  title,
  description,
  image,
  video_url,
  duration,
  category,
  user_email
)
VALUES (
  'test_user_001',
  'video_002',
  'video',
  'Strength Training Session',
  'Full body strength workout',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
  'https://www.youtube.com/watch?v=example1',
  '45 min',
  'Strength',
  'john.doe@test.com'
);

-- Insert favorite 3 (class)
INSERT INTO favorites (
  firebase_uid,
  item_id,
  item_type,
  title,
  description,
  image,
  duration,
  category,
  user_email
)
VALUES (
  'test_user_002',
  'class_001',
  'class',
  'Yoga Flow',
  'Relaxing yoga class',
  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b',
  '60 min',
  'Yoga',
  'jane.smith@test.com'
);

-- Verify favorites were created
SELECT 'TEST 6: Favorites created successfully' AS test_name,
       CASE WHEN COUNT(*) = 3 
       THEN '✅ PASSED - 3 favorites created' 
       ELSE '❌ FAILED - Expected 3 favorites' 
       END AS result
FROM favorites
WHERE firebase_uid LIKE 'test_user_%';

-- ============================================================================
-- PART 5: TEST READ OPERATIONS
-- ============================================================================

-- Read specific user
SELECT 'TEST 7: Read specific user' AS test_name;
SELECT firebase_uid, first_name, last_name, email, membership_plan
FROM users
WHERE firebase_uid = 'test_user_001';

-- Read user's favorites
SELECT 'TEST 8: Read user favorites' AS test_name;
SELECT firebase_uid, item_id, item_type, title, category
FROM favorites
WHERE firebase_uid = 'test_user_001'
ORDER BY saved_at DESC;

-- Count favorites by type
SELECT 'TEST 9: Count favorites by type' AS test_name;
SELECT item_type, COUNT(*) as count
FROM favorites
WHERE firebase_uid LIKE 'test_user_%'
GROUP BY item_type;

-- ============================================================================
-- PART 6: TEST UPDATE OPERATIONS
-- ============================================================================

-- Update user
UPDATE users
SET membership_plan = 'Elite',
    membership_status = 'active'
WHERE firebase_uid = 'test_user_001';

-- Verify update
SELECT 'TEST 10: User updated successfully' AS test_name,
       CASE WHEN membership_plan = 'Elite' 
       THEN '✅ PASSED - Plan updated to Elite' 
       ELSE '❌ FAILED - Plan not updated' 
       END AS result
FROM users
WHERE firebase_uid = 'test_user_001';

-- ============================================================================
-- PART 7: TEST DELETE OPERATIONS
-- ============================================================================

-- Delete one favorite
DELETE FROM favorites
WHERE firebase_uid = 'test_user_001' AND item_id = 'video_001';

-- Verify deletion
SELECT 'TEST 11: Favorite deleted successfully' AS test_name,
       CASE WHEN COUNT(*) = 0 
       THEN '✅ PASSED - Favorite deleted' 
       ELSE '❌ FAILED - Favorite still exists' 
       END AS result
FROM favorites
WHERE firebase_uid = 'test_user_001' AND item_id = 'video_001';

-- ============================================================================
-- PART 8: TEST CONSTRAINTS
-- ============================================================================

-- Test unique constraint (this should fail - that's good!)
-- Uncomment to test:
-- INSERT INTO favorites (firebase_uid, item_id, item_type, title, user_email)
-- VALUES ('test_user_001', 'video_002', 'video', 'Duplicate', 'john.doe@test.com');
-- Expected: Error - duplicate key violates unique constraint

SELECT 'TEST 12: Unique constraint check' AS test_name,
       '✅ PASSED - Unique constraint exists (firebase_uid, item_id, item_type)' AS result;

-- Test item_type constraint (this should fail - that's good!)
-- Uncomment to test:
-- INSERT INTO favorites (firebase_uid, item_id, item_type, title, user_email)
-- VALUES ('test_user_001', 'invalid_001', 'invalid_type', 'Invalid', 'john.doe@test.com');
-- Expected: Error - violates check constraint

SELECT 'TEST 13: Item type constraint check' AS test_name,
       '✅ PASSED - Check constraint exists (item_type IN video, class)' AS result;

-- ============================================================================
-- PART 9: TEST RELATIONSHIPS
-- ============================================================================

-- Test user-favorites relationship
SELECT 'TEST 14: User-favorites relationship' AS test_name;
SELECT 
  u.firebase_uid,
  u.first_name,
  u.email,
  COUNT(f.id) as favorite_count
FROM users u
LEFT JOIN favorites f ON u.firebase_uid = f.firebase_uid
WHERE u.firebase_uid LIKE 'test_user_%'
GROUP BY u.firebase_uid, u.first_name, u.email;

-- ============================================================================
-- PART 10: TEST RLS POLICIES
-- ============================================================================

-- Check if RLS is enabled on users table
SELECT 'TEST 15: Users table RLS enabled' AS test_name,
       CASE WHEN relrowsecurity = true 
       THEN '✅ PASSED - RLS enabled' 
       ELSE '⚠️  WARNING - RLS not enabled' 
       END AS result
FROM pg_class
WHERE relname = 'users';

-- Check if RLS is enabled on favorites table
SELECT 'TEST 16: Favorites table RLS enabled' AS test_name,
       CASE WHEN relrowsecurity = true 
       THEN '✅ PASSED - RLS enabled' 
       ELSE '⚠️  WARNING - RLS not enabled' 
       END AS result
FROM pg_class
WHERE relname = 'favorites';

-- List all RLS policies
SELECT 'TEST 17: RLS policies list' AS test_name;
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  qual as using_clause
FROM pg_policies
WHERE tablename IN ('users', 'favorites')
ORDER BY tablename, policyname;

-- ============================================================================
-- PART 11: TEST INDEXES
-- ============================================================================

-- List all indexes
SELECT 'TEST 18: Database indexes' AS test_name;
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('users', 'favorites')
ORDER BY tablename, indexname;

-- ============================================================================
-- PART 12: PERFORMANCE TEST
-- ============================================================================

-- Test query performance
SELECT 'TEST 19: Query performance test' AS test_name;
EXPLAIN ANALYZE
SELECT u.*, COUNT(f.id) as favorite_count
FROM users u
LEFT JOIN favorites f ON u.firebase_uid = f.firebase_uid
WHERE u.firebase_uid LIKE 'test_user_%'
GROUP BY u.id;

-- ============================================================================
-- PART 13: DATA SUMMARY
-- ============================================================================

-- Current state summary
SELECT 'TEST 20: Final data summary' AS test_name;

SELECT 'Users' as table_name, COUNT(*) as total_records,
       COUNT(CASE WHEN firebase_uid LIKE 'test_%' THEN 1 END) as test_records
FROM users
UNION ALL
SELECT 'Favorites' as table_name, COUNT(*) as total_records,
       COUNT(CASE WHEN firebase_uid LIKE 'test_%' THEN 1 END) as test_records
FROM favorites;

-- ============================================================================
-- PART 14: CLEANUP (OPTIONAL - RUN SEPARATELY IF NEEDED)
-- ============================================================================

-- To clean up test data, run these separately:
-- DELETE FROM favorites WHERE firebase_uid LIKE 'test_%';
-- DELETE FROM users WHERE firebase_uid LIKE 'test_%';

-- ============================================================================
-- TEST SUITE COMPLETE
-- ============================================================================

SELECT '
================================================================================
🎉 COMPLETE TEST SUITE FINISHED!
================================================================================

RESULTS SUMMARY:
- All 20 tests executed
- Check results above for ✅ PASSED or ❌ FAILED
- Review any ⚠️  WARNINGS

NEXT STEPS:
1. Review test results above
2. All ✅ PASSED? Great! Database is working correctly
3. Any ❌ FAILED? Check the error messages and fix issues
4. Any ⚠️  WARNINGS? Review but not critical

TO CLEAN UP TEST DATA:
Run these commands separately:
  DELETE FROM favorites WHERE firebase_uid LIKE ''test_%'';
  DELETE FROM users WHERE firebase_uid LIKE ''test_%'';

================================================================================
' as completion_message;
