-- Migration 001: Add tenant support for multi-tenant SaaS architecture
-- This migration adds tenant_id columns and constraints for data isolation

-- Add tenant_id to users table
ALTER TABLE users 
ADD COLUMN tenant_id UUID DEFAULT gen_random_uuid() NOT NULL;

-- Add tenant_id to content table
ALTER TABLE content 
ADD COLUMN tenant_id UUID DEFAULT gen_random_uuid() NOT NULL;

-- Add tenant_id to favorites table
ALTER TABLE favorites 
ADD COLUMN tenant_id UUID DEFAULT gen_random_uuid() NOT NULL;

-- Add tenant_id to proposals table
ALTER TABLE proposals 
ADD COLUMN tenant_id UUID DEFAULT gen_random_uuid() NOT NULL;

-- Create foreign key constraints to ensure tenant isolation
-- Note: In production, you might want to reference a tenants table
ALTER TABLE users 
ADD CONSTRAINT fk_users_tenant 
FOREIGN KEY (tenant_id) REFERENCES users(tenant_id) ON DELETE CASCADE;

ALTER TABLE content 
ADD CONSTRAINT fk_content_tenant 
FOREIGN KEY (tenant_id) REFERENCES users(tenant_id) ON DELETE CASCADE;

ALTER TABLE favorites 
ADD CONSTRAINT fk_favorites_tenant 
FOREIGN KEY (tenant_id) REFERENCES users(tenant_id) ON DELETE CASCADE;

ALTER TABLE proposals 
ADD CONSTRAINT fk_proposals_tenant 
FOREIGN KEY (tenant_id) REFERENCES users(tenant_id) ON DELETE CASCADE;

-- Add role column to users table for SaaS authorization
ALTER TABLE users 
ADD COLUMN role VARCHAR(20) DEFAULT 'user' NOT NULL CHECK (role IN ('admin', 'user'));

-- Add indexes for tenant-based queries
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_content_tenant_id ON content(tenant_id);
CREATE INDEX idx_favorites_tenant_id ON favorites(tenant_id);
CREATE INDEX idx_proposals_tenant_id ON proposals(tenant_id);

-- Create composite indexes for tenant + user queries
CREATE INDEX idx_favorites_tenant_user ON favorites(tenant_id, user_id);
CREATE INDEX idx_proposals_tenant_user ON proposals(tenant_id, user_id);
CREATE INDEX idx_content_tenant_category ON content(tenant_id, category);

-- Add RLS policies for tenant isolation
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Content is viewable by everyone" ON content;
DROP POLICY IF EXISTS "Favorites policies" ON favorites;
DROP POLICY IF EXISTS "Proposal policies" ON proposals;

-- Create new tenant-aware RLS policies
CREATE POLICY "Users can view own tenant profile" ON users
    FOR SELECT USING (
        auth.uid() = firebase_uid OR 
        (SELECT role FROM users WHERE firebase_uid = auth.uid()) = 'admin'
    );

CREATE POLICY "Users can update own tenant profile" ON users
    FOR UPDATE USING (auth.uid() = firebase_uid)
    WITH CHECK (auth.uid() = firebase_uid);

CREATE POLICY "Content is viewable within tenant" ON content
    FOR SELECT USING (
        tenant_id = (SELECT tenant_id FROM users WHERE firebase_uid = auth.uid())
    );

CREATE POLICY "Admins can manage content" ON content
    FOR ALL USING (
        (SELECT role FROM users WHERE firebase_uid = auth.uid()) = 'admin'
    );

CREATE POLICY "Users can manage own tenant favorites" ON favorites
    FOR ALL USING (
        user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid()) AND
        tenant_id = (SELECT tenant_id FROM users WHERE firebase_uid = auth.uid())
    );

CREATE POLICY "Users can manage own tenant proposals" ON proposals
    FOR ALL USING (
        user_id = (SELECT id FROM users WHERE firebase_uid = auth.uid()) AND
        tenant_id = (SELECT tenant_id FROM users WHERE firebase_uid = auth.uid())
    );

-- Create a default tenant for existing users
UPDATE users SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;

-- Set all existing content to belong to the first user's tenant
UPDATE content SET tenant_id = (SELECT MIN(tenant_id) FROM users) WHERE tenant_id IS NULL;
UPDATE favorites SET tenant_id = (SELECT MIN(tenant_id) FROM users) WHERE tenant_id IS NULL;
UPDATE proposals SET tenant_id = (SELECT MIN(tenant_id) FROM users) WHERE tenant_id IS NULL;

-- Add comment explaining the migration
COMMENT ON COLUMN users.tenant_id IS 'Tenant identifier for multi-tenant isolation';
COMMENT ON COLUMN content.tenant_id IS 'Tenant identifier for multi-tenant data isolation';
COMMENT ON COLUMN favorites.tenant_id IS 'Tenant identifier for multi-tenant data isolation';
COMMENT ON COLUMN proposals.tenant_id IS 'Tenant identifier for multi-tenant data isolation';
COMMENT ON COLUMN users.role IS 'User role within tenant: admin or user';
