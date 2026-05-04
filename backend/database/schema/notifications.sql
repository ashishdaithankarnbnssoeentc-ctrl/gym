-- Internal Notifications Schema
-- Database-only notification system (no external messaging)

-- Membership Notifications table
CREATE TABLE IF NOT EXISTS public.membership_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL DEFAULT 'reminder',
    priority TEXT NOT NULL DEFAULT 'normal',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    action TEXT NOT NULL,
    metadata JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.membership_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (tenant isolation)
CREATE POLICY "Notifications can view own tenant data" ON public.membership_notifications
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', '00000000-0000-0000-0000-000000000000')::UUID);

CREATE POLICY "Audit logs can view own tenant data" ON public.audit_logs
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', '00000000-0000-0000-0000-000000000000')::UUID);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_tenant ON public.membership_notifications(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_unread ON public.membership_notifications(tenant_id, read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_tenant ON public.audit_logs(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_action ON public.audit_logs(tenant_id, action);
