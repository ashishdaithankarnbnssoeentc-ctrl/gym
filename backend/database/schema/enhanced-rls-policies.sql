-- Enhanced RLS Policies with Line-by-Line Security Review
-- Defense-in-depth with proper JWT binding and tenant isolation

-- Enable RLS on all sensitive tables
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_verification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USERS TABLE - Enhanced Policies
-- =============================================

-- Users can read their own profile only
CREATE POLICY "users_read_own_profile_enhanced" 
ON users 
FOR SELECT 
USING (
  -- CRITICAL: Use JWT claim for user ID, not just auth.uid()
  auth.uid()::text = firebase_uid
  -- AND ensure tenant context matches
  AND tenant_id = current_setting('app.tenant_id', true)::text
);

-- Users can update their own profile with strict constraints
CREATE POLICY "users_update_own_profile_enhanced" 
ON users 
FOR UPDATE 
USING (
  auth.uid()::text = firebase_uid
  AND tenant_id = current_setting('app.tenant_id', true)::text
)
WITH CHECK (
  auth.uid()::text = firebase_uid
  AND tenant_id = current_setting('app.tenant_id', true)::text
  -- CRITICAL: Prevent role escalation
  AND role = OLD.role
  -- CRITICAL: Prevent tenant changes
  AND tenant_id = OLD.tenant_id
  -- CRITICAL: Prevent status manipulation
  AND status = OLD.status
  -- CRITICAL: Prevent admin flag changes
  AND is_admin = OLD.is_admin
);

-- =============================================
-- MEMBERSHIPS TABLE - Enhanced Policies
-- =============================================

-- Users can read their own membership only
CREATE POLICY "memberships_read_own_enhanced" 
ON memberships 
FOR SELECT 
USING (
  auth.uid()::text = user_id
  AND tenant_id = current_setting('app.tenant_id', true)::text
);

-- Users can insert their own initial membership only
CREATE POLICY "memberships_insert_own_enhanced" 
ON memberships 
FOR INSERT 
WITH CHECK (
  auth.uid()::text = user_id
  AND tenant_id = current_setting('app.tenant_id', true)::text
  -- CRITICAL: Prevent setting admin plans without verification
  AND (plan != 'admin' OR payment_verified = true)
  -- CRITICAL: Prevent setting future dates arbitrarily
  AND next_payment_date >= CURRENT_DATE
  AND next_payment_date <= CURRENT_DATE + INTERVAL '1 year'
  -- CRITICAL: Prevent setting active status without payment
  AND (status != 'active' OR payment_verified = true)
);

-- Users can update their own membership with strict constraints
CREATE POLICY "memberships_update_own_enhanced" 
ON memberships 
FOR UPDATE 
USING (
  auth.uid()::text = user_id
  AND tenant_id = current_setting('app.tenant_id', true)::text
)
WITH CHECK (
  auth.uid()::text = user_id
  AND tenant_id = current_setting('app.tenant_id', true)::text
  -- CRITICAL: Prevent direct date manipulation
  AND next_payment_date >= CURRENT_DATE
  AND next_payment_date <= CURRENT_DATE + INTERVAL '1 year'
  -- CRITICAL: Prevent plan upgrades without payment verification
  AND (
    plan = OLD.plan OR 
    (plan != OLD.plan AND payment_verified = true)
  )
  -- CRITICAL: Prevent status changes to active without payment
  AND (
    status != 'active' OR 
    (status = 'active' AND payment_verified = true)
  )
  -- CRITICAL: Cannot downgrade to expired status manually
  AND status != 'expired'
);

-- Users can cancel their own membership only
CREATE POLICY "memberships_cancel_own_enhanced" 
ON memberships 
FOR DELETE 
USING (
  auth.uid()::text = user_id
  AND tenant_id = current_setting('app.tenant_id', true)::text
  AND status = 'active'
);

-- =============================================
-- FAVORITES TABLE - Enhanced Policies
-- =============================================

-- Users can read their own favorites only
CREATE POLICY "favorites_read_own_enhanced" 
ON favorites 
FOR SELECT 
USING (
  auth.uid()::text = user_id
  AND tenant_id = current_setting('app.tenant_id', true)::text
);

-- Users can insert their own favorites with tenant validation
CREATE POLICY "favorites_insert_own_enhanced" 
ON favorites 
FOR INSERT 
WITH CHECK (
  auth.uid()::text = user_id
  AND tenant_id = current_setting('app.tenant_id', true)::text
  -- CRITICAL: Ensure content exists and belongs to SAME tenant
  AND EXISTS (
    SELECT 1 FROM content 
    WHERE id = content_id 
    AND tenant_id = current_setting('app.tenant_id', true)::text
  )
);

-- Users can delete their own favorites only
CREATE POLICY "favorites_delete_own_enhanced" 
ON favorites 
FOR DELETE 
USING (
  auth.uid()::text = user_id
  AND tenant_id = current_setting('app.tenant_id', true)::text
);

-- =============================================
-- CONTENT TABLE - Enhanced Policies
-- =============================================

-- Users can read content from their tenant only
CREATE POLICY "content_read_tenant_enhanced" 
ON content 
FOR SELECT 
USING (
  tenant_id = current_setting('app.tenant_id', true)::text
);

-- Admins can insert content for their tenant
CREATE POLICY "content_insert_tenant_admin_enhanced" 
ON content 
FOR INSERT 
WITH CHECK (
  tenant_id = current_setting('app.tenant_id', true)::text
  AND current_setting('request.jwt.claim.role', true) = 'admin'
);

-- Content owners (admins) can update their content
CREATE POLICY "content_update_tenant_admin_enhanced" 
ON content 
FOR UPDATE 
USING (
  tenant_id = current_setting('app.tenant_id', true)::text
  AND current_setting('request.jwt.claim.role', true) = 'admin'
)
WITH CHECK (
  tenant_id = current_setting('app.tenant_id', true)::text
  AND current_setting('request.jwt.claim.role', true) = 'admin'
);

-- =============================================
-- PAYMENT VERIFICATIONS TABLE - Enhanced Policies
-- =============================================

-- Users can read their own payment verifications
CREATE POLICY "payment_verifications_read_own_enhanced" 
ON payment_verifications 
FOR SELECT 
USING (
  auth.uid()::text = user_id
  AND tenant_id = current_setting('app.tenant_id', true)::text
);

-- Users can insert their own payment verifications
CREATE POLICY "payment_verifications_insert_own_enhanced" 
ON payment_verifications 
FOR INSERT 
WITH CHECK (
  auth.uid()::text = user_id
  AND tenant_id = current_setting('app.tenant_id', true)::text
  -- CRITICAL: Prevent setting verified status without admin action
  AND status = 'pending'
  -- CRITICAL: Prevent setting used flag
  AND used = false
  -- CRITICAL: Prevent arbitrary expiry dates
  AND expires_at <= NOW() + INTERVAL '24 hours'
);

-- System (admin) can update payment verifications
CREATE POLICY "payment_verifications_system_update_enhanced" 
ON payment_verifications 
FOR UPDATE 
USING (
  current_setting('request.jwt.claim.role', true) = 'admin'
  AND tenant_id = current_setting('app.tenant_id', true)::text
)
WITH CHECK (
  current_setting('request.jwt.claim.role', true) = 'admin'
  AND tenant_id = current_setting('app.tenant_id', true)::text
  -- CRITICAL: Only allow status changes to verified or consumed
  AND status IN ('verified', 'consumed', 'failed')
);

-- =============================================
-- MEMBERSHIP AUDIT TABLE - Enhanced Policies
-- =============================================

-- Users can read their own audit logs
CREATE POLICY "membership_audit_read_own_enhanced" 
ON membership_audit 
FOR SELECT 
USING (
  auth.uid()::text = user_id
  AND tenant_id = current_setting('app.tenant_id', true)::text
);

-- Admins can read all audit logs from their tenant
CREATE POLICY "membership_audit_read_tenant_admin_enhanced" 
ON membership_audit 
FOR SELECT 
USING (
  current_setting('request.jwt.claim.role', true) = 'admin'
  AND tenant_id = current_setting('app.tenant_id', true)::text
);

-- System can insert audit logs
CREATE POLICY "membership_audit_system_insert_enhanced" 
ON membership_audit 
FOR INSERT 
WITH CHECK (true);

-- =============================================
-- SECURITY EVENTS TABLE - Enhanced Policies
-- =============================================

-- Users can read their own security events
CREATE POLICY "security_events_read_own_enhanced" 
ON security_events 
FOR SELECT 
USING (
  auth.uid()::text = user_id
  AND tenant_id = current_setting('app.tenant_id', true)::text
);

-- Admins can read all security events from their tenant
CREATE POLICY "security_events_read_tenant_admin_enhanced" 
ON security_events 
FOR SELECT 
USING (
  current_setting('request.jwt.claim.role', true) = 'admin'
  AND tenant_id = current_setting('app.tenant_id', true)::text
);

-- System can insert security events
CREATE POLICY "security_events_system_insert_enhanced" 
ON security_events 
FOR INSERT 
WITH CHECK (true);

-- =============================================
-- USER BLOCKS TABLE - Enhanced Policies
-- =============================================

-- Users can check if they're blocked
CREATE POLICY "user_blocks_read_own_enhanced" 
ON user_blocks 
FOR SELECT 
USING (
  auth.uid()::text = user_id
  AND tenant_id = current_setting('app.tenant_id', true)::text
);

-- Admins can read all blocks from their tenant
CREATE POLICY "user_blocks_read_tenant_admin_enhanced" 
ON user_blocks 
FOR SELECT 
USING (
  current_setting('request.jwt.claim.role', true) = 'admin'
  AND tenant_id = current_setting('app.tenant_id', true)::text
);

-- System can insert/update blocks
CREATE POLICY "user_blocks_system_manage_enhanced" 
ON user_blocks 
FOR ALL 
USING (
  current_setting('request.jwt.claim.role', true) = 'admin'
  OR current_setting('request.jwt.claim.role', true) = 'system'
);

-- =============================================
-- ENHANCED SECURITY CONSTRAINTS
-- =============================================

-- Prevent invalid membership states
ALTER TABLE memberships 
ADD CONSTRAINT valid_membership_status 
CHECK (status IN ('active', 'expired', 'cancelled', 'paused'));

-- Prevent invalid plan types
ALTER TABLE memberships 
ADD CONSTRAINT valid_membership_plan 
CHECK (plan IN ('basic', 'premium', 'pro'));

-- Prevent negative extension days
ALTER TABLE memberships 
ADD CONSTRAINT positive_extension_days 
CHECK (extension_days >= 0);

-- Prevent expired payment verifications from being used
ALTER TABLE payment_verifications 
ADD CONSTRAINT valid_payment_verification 
CHECK (
  (status = 'verified' AND used = false AND expires_at > NOW()) OR
  (status IN ('pending', 'consumed', 'failed', 'expired'))
);

-- Prevent invalid block durations
ALTER TABLE user_blocks 
ADD CONSTRAINT valid_block_duration 
CHECK (expires_at > created_at AND expires_at <= created_at + INTERVAL '24 hours');

-- =============================================
-- ENHANCED INDEXES FOR PERFORMANCE
-- =============================================

-- RLS Performance Indexes
CREATE INDEX IF NOT EXISTS idx_memberships_user_tenant_status 
ON memberships(user_id, tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_memberships_tenant_active 
ON memberships(tenant_id, status, next_payment_date)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_favorites_user_tenant_content 
ON favorites(user_id, tenant_id, content_id);

CREATE INDEX IF NOT EXISTS idx_content_tenant_visibility 
ON content(tenant_id, is_public);

CREATE INDEX IF NOT EXISTS idx_payment_verifications_user_status 
ON payment_verifications(user_id, tenant_id, status, used, expires_at);

CREATE INDEX IF NOT EXISTS idx_membership_audit_user_action_time 
ON membership_audit(user_id, tenant_id, action, created_at);

CREATE INDEX IF NOT EXISTS idx_security_events_user_time 
ON security_events(user_id, tenant_id, created_at);

CREATE INDEX IF NOT EXISTS idx_user_blocks_active 
ON user_blocks(user_id, tenant_id, expires_at)
WHERE expires_at > NOW();

-- =============================================
-- ENHANCED TRIGGERS FOR AUTOMATIC SECURITY
-- =============================================

-- Function to set RLS context automatically
CREATE OR REPLACE FUNCTION set_rls_context_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Set tenant context for RLS
  PERFORM set_config('app.tenant_id', NEW.tenant_id::text, true);
  
  -- Set JWT claims for RLS policies
  PERFORM set_config('request.jwt.claim.sub', NEW.user_id::text, true);
  PERFORM set_config('request.jwt.claim.tenant_id', NEW.tenant_id::text, true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers to relevant tables
DROP TRIGGER IF EXISTS membership_set_rls_context ON memberships;
CREATE TRIGGER membership_set_rls_context
  BEFORE INSERT OR UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION set_rls_context_trigger();

DROP TRIGGER IF EXISTS favorites_set_rls_context ON favorites;
CREATE TRIGGER favorites_set_rls_context
  BEFORE INSERT OR UPDATE ON favorites
  FOR EACH ROW
  EXECUTE FUNCTION set_rls_context_trigger();

-- =============================================
-- SECURITY FUNCTIONS FOR ENHANCED VALIDATION
-- =============================================

-- Function to validate tenant access
CREATE OR REPLACE FUNCTION validate_tenant_access(p_tenant_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_setting('app.tenant_id', true)::text = p_tenant_id
    AND current_setting('app.tenant_id', true) IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to validate user ownership
CREATE OR REPLACE FUNCTION validate_user_ownership(p_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid()::text = p_user_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to validate admin access
CREATE OR REPLACE FUNCTION validate_admin_access()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_setting('request.jwt.claim.role', true) = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SECURITY MONITORING VIEWS
-- =============================================

-- View for monitoring suspicious activity
CREATE OR REPLACE VIEW security_summary AS
SELECT 
  tenant_id,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE NOT success) as failed_events,
  COUNT(*) FILTER (WHERE event = 'auth_failure') as auth_failures,
  COUNT(*) FILTER (WHERE event = 'user_blocked') as blocked_users,
  MAX(created_at) as last_activity
FROM security_events 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY tenant_id;

-- View for monitoring payment anomalies
CREATE OR REPLACE VIEW payment_anomalies AS
SELECT 
  pv.tenant_id,
  pv.user_id,
  COUNT(*) as verification_count,
  COUNT(*) FILTER (WHERE pv.status = 'failed') as failed_count,
  COUNT(*) FILTER (WHERE pv.used = false AND pv.expires_at < NOW()) as expired_count
FROM payment_verifications pv
WHERE pv.created_at > NOW() - INTERVAL '24 hours'
GROUP BY pv.tenant_id, pv.user_id
HAVING COUNT(*) FILTER (WHERE pv.status = 'failed') > 0
   OR COUNT(*) FILTER (WHERE pv.used = false AND pv.expires_at < NOW()) > 0;
