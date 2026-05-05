/**
 * RLS Audit Script
 * 
 * Periodic check for tables without RLS policies
 * Detects database-level drift over time
 */

-- Find tables without RLS policies
SELECT 
    schemaname,
    tablename,
    'MISSING RLS' as issue
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename NOT IN (
        SELECT DISTINCT tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    )
ORDER BY tablename;

-- Check RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity = false THEN 'RLS DISABLED'
        ELSE 'RLS ENABLED'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        SELECT DISTINCT tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    )
ORDER BY tablename;

-- Check for critical tables without admin-only policies
SELECT 
    p.tablename,
    p.policyname,
    p.cmd,
    p.roles,
    'REVIEW NEEDED' as note
FROM pg_policies p
WHERE p.schemaname = 'public'
    AND p.tablename IN ('memberships', 'tenants', 'users')
    AND p.roles IS NULL  -- Should have admin-only restrictions
ORDER BY p.tablename, p.policyname;

-- Check tenant isolation policies exist
SELECT 
    p.tablename,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) = 0 THEN 'NO POLICIES'
        WHEN COUNT(*) < 3 THEN 'INCOMPLETE COVERAGE'
        ELSE 'FULL COVERAGE'
    END as coverage_status
FROM pg_policies p
WHERE p.schemaname = 'public'
    AND p.tablename IN ('content', 'favorites', 'audit_logs')
GROUP BY p.tablename
ORDER BY p.tablename;
