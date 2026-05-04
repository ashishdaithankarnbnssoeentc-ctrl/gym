-- ============================================================================
-- PERFORMANCE OPTIMIZATIONS
-- ============================================================================
-- This migration implements performance improvements for the database
-- Created: November 21, 2025
-- Version: 1.0.0
-- ============================================================================

-- ============================================================================
-- INDEXES FOR BETTER QUERY PERFORMANCE
-- ============================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_membership_plan ON users(membership_plan);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location);
CREATE INDEX IF NOT EXISTS idx_users_join_date ON users(join_date);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_users_plan_location ON users(membership_plan, location);

-- Favorites table indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user_email ON favorites(user_email);
CREATE INDEX IF NOT EXISTS idx_favorites_item ON favorites(item_id, item_type);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);

-- Composite index for user's favorites by type
CREATE INDEX IF NOT EXISTS idx_favorites_user_type ON favorites(user_email, item_type);

-- ============================================================================
-- FULL-TEXT SEARCH INDEXES (Optional but recommended)
-- ============================================================================

-- Add tsvector column for full-text search on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(first_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(last_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(email, '')), 'B')
  ) STORED;

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_users_search ON users USING GIN (search_vector);

-- ============================================================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================================================

-- View 1: Membership statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_membership_stats AS
SELECT 
  membership_plan,
  location,
  COUNT(*) as member_count,
  COUNT(*) FILTER (WHERE join_date >= CURRENT_DATE - INTERVAL '30 days') as new_members_30d,
  COUNT(*) FILTER (WHERE join_date >= CURRENT_DATE - INTERVAL '7 days') as new_members_7d
FROM users
GROUP BY membership_plan, location;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_membership_stats_plan ON mv_membership_stats(membership_plan);

-- View 2: Popular favorites
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_popular_favorites AS
SELECT 
  item_id,
  item_type,
  COUNT(*) as favorite_count,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as favorites_last_week
FROM favorites
GROUP BY item_id, item_type
ORDER BY favorite_count DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_popular_favorites_type ON mv_popular_favorites(item_type);

-- ============================================================================
-- AUTOMATIC REFRESH FUNCTIONS FOR MATERIALIZED VIEWS
-- ============================================================================

-- Function to refresh membership stats
CREATE OR REPLACE FUNCTION refresh_membership_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_membership_stats;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh popular favorites
CREATE OR REPLACE FUNCTION refresh_popular_favorites()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_favorites;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AUTOMATIC UPDATED_AT TRIGGER
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PARTITION TABLES FOR LARGE DATASETS (Optional - for future scaling)
-- ============================================================================

-- Example: Partition favorites table by date if it grows very large
-- Uncomment when needed:

-- CREATE TABLE favorites_partitioned (
--   id SERIAL,
--   user_email TEXT NOT NULL,
--   item_id TEXT NOT NULL,
--   item_type TEXT NOT NULL,
--   created_at TIMESTAMP DEFAULT NOW()
-- ) PARTITION BY RANGE (created_at);
-- 
-- -- Create partitions for each month
-- CREATE TABLE favorites_2025_11 PARTITION OF favorites_partitioned
--   FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
-- 
-- CREATE TABLE favorites_2025_12 PARTITION OF favorites_partitioned
--   FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- ============================================================================
-- QUERY OPTIMIZATION FUNCTIONS
-- ============================================================================

-- Function: Get user's favorites with item counts
CREATE OR REPLACE FUNCTION get_user_favorites_summary(p_user_email TEXT)
RETURNS TABLE (
  item_type TEXT,
  favorite_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.item_type,
    COUNT(*) as favorite_count
  FROM favorites f
  WHERE f.user_email = p_user_email
  GROUP BY f.item_type;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Search users with full-text search
CREATE OR REPLACE FUNCTION search_users(search_query TEXT, result_limit INT DEFAULT 20)
RETURNS TABLE (
  firebase_uid TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  membership_plan TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.firebase_uid,
    u.first_name,
    u.last_name,
    u.email,
    u.membership_plan,
    ts_rank(u.search_vector, plainto_tsquery('english', search_query)) as rank
  FROM users u
  WHERE u.search_vector @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- DATABASE STATISTICS AND MAINTENANCE
-- ============================================================================

-- Function to get table statistics
CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE (
  table_name TEXT,
  row_count BIGINT,
  total_size TEXT,
  index_size TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname || '.' || tablename as table_name,
    n_tup_ins - n_tup_del as row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CONNECTION POOLING RECOMMENDATIONS
-- ============================================================================

-- Supabase automatically handles connection pooling, but here are settings:
-- 
-- For high-traffic applications:
-- - Use Supabase connection pooler (enabled by default)
-- - Use transaction mode for short queries
-- - Use session mode for long-running transactions
-- 
-- Configuration (set in Supabase dashboard):
-- - pool_mode = transaction (recommended)
-- - default_pool_size = 20
-- - max_client_conn = 100

-- ============================================================================
-- CACHE CONFIGURATION
-- ============================================================================

-- Enable query result caching for frequently accessed data
-- Set cache headers in your application:
-- - Use Supabase client's caching options
-- - Implement Redis/Memcached for application-level caching
-- - Use CDN for static assets

-- ============================================================================
-- MONITORING QUERIES
-- ============================================================================

-- Query 1: Find slow queries
-- SELECT 
--   query,
--   calls,
--   total_time,
--   mean_time,
--   max_time
-- FROM pg_stat_statements
-- ORDER BY mean_time DESC
-- LIMIT 10;

-- Query 2: Check index usage
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan,
--   idx_tup_read,
--   idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan ASC;

-- Query 3: Check table bloat
-- SELECT 
--   schemaname,
--   tablename,
--   pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- MAINTENANCE SCHEDULE
-- ============================================================================

-- Recommended maintenance tasks:
-- 
-- Daily:
-- - Refresh materialized views during low-traffic hours
--   SELECT refresh_membership_stats();
--   SELECT refresh_popular_favorites();
-- 
-- Weekly:
-- - Run VACUUM ANALYZE on large tables
--   VACUUM ANALYZE users;
--   VACUUM ANALYZE favorites;
-- 
-- Monthly:
-- - Review query performance
-- - Check index effectiveness
-- - Analyze table statistics
-- - Review and optimize slow queries

-- ============================================================================
-- PERFORMANCE TESTING
-- ============================================================================

-- Test query performance:
-- EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
-- EXPLAIN ANALYZE SELECT * FROM favorites WHERE user_email = 'test@example.com';

-- Benchmark before/after optimization:
-- \timing on
-- SELECT COUNT(*) FROM users WHERE membership_plan = 'Premium';
-- \timing off

-- ============================================================================
