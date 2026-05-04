-- Create favorites table for user-saved content
-- This table stores which content items users have favorited

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL,
  content_type TEXT DEFAULT 'video',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_content_id ON favorites(content_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_content ON favorites(user_id, content_id);

-- Add unique constraint to prevent duplicate favorites
ALTER TABLE favorites ADD CONSTRAINT unique_user_content 
  UNIQUE (user_id, content_id);

-- Enable Row Level Security
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can insert own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON favorites;

-- Policy: Users can view their own favorites
CREATE POLICY "Users can view own favorites" ON favorites
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE firebase_uid = auth.uid()
    )
  );

-- Policy: Users can insert their own favorites
CREATE POLICY "Users can insert own favorites" ON favorites
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE firebase_uid = auth.uid()
    )
  );

-- Policy: Users can delete their own favorites
CREATE POLICY "Users can delete own favorites" ON favorites
  FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM users WHERE firebase_uid = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON favorites TO authenticated;
GRANT SELECT ON favorites TO anon;

-- Create helper function to check if content is favorited
CREATE OR REPLACE FUNCTION is_favorited(
  p_firebase_uid TEXT,
  p_content_id TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM favorites f
    JOIN users u ON f.user_id = u.id
    WHERE u.firebase_uid = p_firebase_uid
    AND f.content_id = p_content_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify table creation
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_name = 'favorites'
ORDER BY 
  ordinal_position;
