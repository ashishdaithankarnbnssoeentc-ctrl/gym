-- Create users table for Elite Fitness gym application
-- This table stores user profile data, linked to Firebase Auth via firebase_uid

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  date_of_birth TEXT,
  membership_plan TEXT NOT NULL DEFAULT 'basic',
  location TEXT,
  join_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  emergency_contact TEXT,
  goals TEXT[],
  preferred_classes TEXT[],
  profile_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_membership_plan ON users(membership_plan);
CREATE INDEX IF NOT EXISTS idx_users_join_date ON users(join_date);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function before any update
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;

-- Policy: Users can view their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT
  USING (firebase_uid = auth.uid() OR auth.uid() IS NULL);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE
  USING (firebase_uid = auth.uid());

-- Policy: Users can insert their own data
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT
  WITH CHECK (firebase_uid = auth.uid() OR auth.uid() IS NULL);

-- Insert test user with join date of November 10, 2025
-- NOTE: Replace 'YOUR_FIREBASE_UID_HERE' with actual Firebase UID from Firebase Console
-- You can find the UID in Firebase Console > Authentication > Users
INSERT INTO users (
  firebase_uid,
  first_name,
  last_name,
  email,
  phone,
  membership_plan,
  location,
  join_date,
  emergency_contact,
  goals,
  preferred_classes
) VALUES (
  'YOUR_FIREBASE_UID_HERE',
  'Test',
  'User',
  'test@example.com',
  '+1234567890',
  'Premium',
  'New York',
  '2025-11-10 00:00:00+00',
  '+1987654321',
  ARRAY['Weight Loss', 'Muscle Gain'],
  ARRAY['HIIT', 'Yoga', 'Strength']
) ON CONFLICT (firebase_uid) DO NOTHING;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON users TO anon;

-- Verify table creation
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_name = 'users'
ORDER BY 
  ordinal_position;
