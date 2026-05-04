// Database indexes for performance optimization
// These should be run once on the Supabase database

export const databaseIndexes = [
  // Users table indexes
  {
    table: 'users',
    name: 'idx_users_firebase_uid',
    columns: ['firebase_uid'],
    unique: true,
    sql: 'CREATE UNIQUE INDEX idx_users_firebase_uid ON users(firebase_uid);'
  },
  {
    table: 'users',
    name: 'idx_users_tenant_id',
    columns: ['tenant_id'],
    sql: 'CREATE INDEX idx_users_tenant_id ON users(tenant_id);'
  },
  
  // Content table indexes
  {
    table: 'content',
    name: 'idx_content_tenant_id',
    columns: ['tenant_id'],
    sql: 'CREATE INDEX idx_content_tenant_id ON content(tenant_id);'
  },
  {
    table: 'content',
    name: 'idx_content_category',
    columns: ['category'],
    sql: 'CREATE INDEX idx_content_category ON content(category);'
  },
  {
    table: 'content',
    name: 'idx_content_created_at',
    columns: ['created_at'],
    sql: 'CREATE INDEX idx_content_created_at ON content(created_at DESC);'
  },
  {
    table: 'content',
    name: 'idx_content_search_vector',
    columns: ['search_vector'],
    type: 'GIN',
    sql: 'CREATE INDEX idx_content_search_vector ON content USING GIN(search_vector);'
  },
  
  // Favorites table indexes
  {
    table: 'favorites',
    name: 'idx_favorites_user_content',
    columns: ['user_id', 'content_id'],
    unique: true,
    sql: 'CREATE UNIQUE INDEX idx_favorites_user_content ON favorites(user_id, content_id);'
  },
  {
    table: 'favorites',
    name: 'idx_favorites_user_id',
    columns: ['user_id'],
    sql: 'CREATE INDEX idx_favorites_user_id ON favorites(user_id);'
  },
  {
    table: 'favorites',
    name: 'idx_favorites_content_id',
    columns: ['content_id'],
    sql: 'CREATE INDEX idx_favorites_content_id ON favorites(content_id);'
  },
  {
    table: 'favorites',
    name: 'idx_favorites_tenant_id',
    columns: ['user_id'], // Will be filtered through users table
    sql: 'CREATE INDEX idx_favorites_tenant_id ON favorites(user_id);'
  },
  
  // Proposals table indexes
  {
    table: 'proposals',
    name: 'idx_proposals_user_id',
    columns: ['user_id'],
    sql: 'CREATE INDEX idx_proposals_user_id ON proposals(user_id);'
  },
  {
    table: 'proposals',
    name: 'idx_proposals_status',
    columns: ['status'],
    sql: 'CREATE INDEX idx_proposals_status ON proposals(status);'
  },
  {
    table: 'proposals',
    name: 'idx_proposals_created_at',
    columns: ['created_at'],
    sql: 'CREATE INDEX idx_proposals_created_at ON proposals(created_at DESC);'
  },
  {
    table: 'proposals',
    name: 'idx_proposals_client_name',
    columns: ['client_name'],
    sql: 'CREATE INDEX idx_proposals_client_name ON proposals(client_name);'
  }
];

// SQL script to create all indexes
export const createIndexesSQL = databaseIndexes.map(index => index.sql).join('\n');

// Function to check if index exists
export const checkIndexExistsSQL = `
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'content', 'favorites', 'proposals');
`;

// Performance optimization queries
export const optimizationQueries = {
  // Update statistics for query planner
  updateStats: `
    ANALYZE users;
    ANALYZE content;
    ANALYZE favorites;
    ANALYZE proposals;
  `,
  
  // Check slow queries (requires pg_stat_statements extension)
  slowQueries: `
    SELECT query, calls, total_time, mean_time
    FROM pg_stat_statements
    ORDER BY mean_time DESC
    LIMIT 10;
  `,
  
  // Check table sizes
  tableSizes: `
    SELECT 
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
  `,
  
  // Check index usage
  indexUsage: `
    SELECT 
      schemaname,
      tablename,
      indexname,
      idx_scan,
      idx_tup_read,
      idx_tup_fetch
    FROM pg_stat_user_indexes
    ORDER BY idx_scan DESC;
  `
};
