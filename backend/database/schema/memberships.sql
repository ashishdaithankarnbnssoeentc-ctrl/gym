-- Core Membership Schema
-- Multi-tenant SaaS foundation

-- Users table (tenant-aware)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid TEXT UNIQUE NOT NULL,
    tenant_id UUID NOT NULL,
    email TEXT NOT NULL,
    display_name TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    date_of_birth DATE,
    membership_plan TEXT DEFAULT 'basic',
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memberships table (tenant-aware)
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    plan TEXT NOT NULL DEFAULT 'basic',
    status TEXT NOT NULL DEFAULT 'active',
    start_date DATE NOT NULL,
    next_payment_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content table (tenant-aware)
CREATE TABLE IF NOT EXISTS public.content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favorites table (tenant-aware)
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, content_id)
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies (tenant isolation)
CREATE POLICY "Users can view own tenant data" ON public.users
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', '00000000-0000-0000-0000-000000000000')::UUID);

CREATE POLICY "Memberships can view own tenant data" ON public.memberships
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', '00000000-0000-0000-0000-000000000000')::UUID);

CREATE POLICY "Content can view own tenant data" ON public.content
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', '00000000-0000-0000-0000-000000000000')::UUID);

CREATE POLICY "Favorites can view own tenant data" ON public.favorites
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', '00000000-0000-0000-0000-000000000000')::UUID);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON public.users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_memberships_tenant_user ON public.memberships(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_tenant_status ON public.memberships(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_content_tenant_id ON public.content(tenant_id);
CREATE INDEX IF NOT EXISTS idx_favorites_tenant_user ON public.favorites(tenant_id, user_id);
