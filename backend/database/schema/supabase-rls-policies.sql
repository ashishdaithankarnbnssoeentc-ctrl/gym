-- Supabase Row Level Security (RLS) Policies
-- Defense-in-depth protection for sensitive tables

-- Enable RLS on all sensitive tables
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_audit ENABLE ROW LEVEL SECURITY;

-- =============================================
-- MEMBERSHIPS TABLE POLICIES
-- =============================================

-- Users can read their own membership
CREATE POLICY "users_read_own_membership" 
ON memberships 
FOR SELECT 
USING (auth.uid()::text = user_id);

-- Users can insert their own membership (for initial creation)
CREATE POLICY "users_insert_own_membership" 
ON memberships 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own membership with restrictions
CREATE POLICY "users_update_own_membership" 
ON memberships 
FOR UPDATE 
USING (auth.uid()::text = user_id)
WITH CHECK (
  auth.uid()::text = user_id 
  AND tenant_id = current_setting('app.tenant_id', true)::text
  -- Prevent direct date manipulation
  AND next_payment_date >= CURRENT_DATE 
  -- Prevent direct plan upgrades without payment verification
  AND (
    plan = OLD.plan OR 
    (plan != OLD.plan AND payment_verified = true)
  )
  -- Prevent status manipulation to active without payment
  AND (
    status != 'active' OR 
    (status = 'active' AND payment_verified = true)
  )
);

-- Users can delete their own membership (cancel)
CREATE POLICY "users_cancel_own_membership" 
ON memberships 
FOR DELETE 
USING (auth.uid()::text = user_id AND status = 'active');

-- =============================================
-- FAVORITES TABLE POLICIES
-- =============================================

-- Users can read their own favorites
CREATE POLICY "users_read_own_favorites" 
ON favorites 
FOR SELECT 
USING (auth.uid()::text = user_id);

-- Users can insert their own favorites
CREATE POLICY "users_insert_own_favorites" 
ON favorites 
FOR INSERT 
WITH CHECK (
  auth.uid()::text = user_id 
  AND tenant_id = current_setting('app.tenant_id', true)::text
  -- Ensure content exists and belongs to tenant
  AND EXISTS (
    SELECT 1 FROM content 
    WHERE id = content_id 
    AND tenant_id = current_setting('app.tenant_id', true)::text
  )
);

-- Users can delete their own favorites
CREATE POLICY "users_delete_own_favorites" 
ON favorites 
FOR DELETE 
USING (auth.uid()::text = user_id);

-- =============================================
-- CONTENT TABLE POLICIES
-- =============================================

-- Users can read content from their tenant
CREATE POLICY "users_read_tenant_content" 
ON content 
FOR SELECT 
USING (tenant_id = current_setting('app.tenant_id', true)::text);

-- =============================================
-- USERS TABLE POLICIES
-- =============================================

-- Users can read their own profile
CREATE POLICY "users_read_own_profile" 
ON users 
FOR SELECT 
USING (auth.uid()::text = firebase_uid);

-- Users can update their own profile (restricted fields)
CREATE POLICY "users_update_own_profile" 
ON users 
FOR UPDATE 
USING (auth.uid()::text = firebase_uid)
WITH CHECK (
  auth.uid()::text = firebase_uid
  -- Prevent role escalation
  AND role = OLD.role
  -- Prevent tenant changes
  AND tenant_id = OLD.tenant_id
  -- Prevent status manipulation
  AND status = OLD.status
);

-- =============================================
-- MEMBERSHIP_AUDIT TABLE POLICIES
-- =============================================

-- Users can read their own audit logs
CREATE POLICY "users_read_own_audit_logs" 
ON membership_audit 
FOR SELECT 
USING (auth.uid()::text = user_id);

-- Admins can read all audit logs from their tenant
CREATE POLICY "admins_read_tenant_audit_logs" 
ON membership_audit 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text 
    AND is_admin = true
    AND tenant_id = current_setting('app.tenant_id', true)::text
  )
);

-- System can insert audit logs (for triggers)
CREATE POLICY "system_insert_audit_logs" 
ON membership_audit 
FOR INSERT 
WITH CHECK (true);

-- =============================================
-- SECURITY CONSTRAINTS
-- =============================================

-- Prevent direct date manipulation on memberships
ALTER TABLE memberships 
ADD CONSTRAINT prevent_date_manipulation 
CHECK (
  next_payment_date >= CURRENT_DATE OR 
  status IN ('expired', 'cancelled')
);

-- Prevent invalid plan transitions
ALTER TABLE memberships 
ADD CONSTRAINT valid_plan_transitions 
CHECK (
  plan IN ('basic', 'premium', 'pro')
);

-- Prevent negative extension days
ALTER TABLE memberships 
ADD CONSTRAINT positive_extension_days 
CHECK (
  extension_days >= 0
);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to set tenant context for RLS
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.tenant_id', tenant_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can upgrade plan
CREATE OR REPLACE FUNCTION can_upgrade_plan(
  current_plan TEXT, 
  new_plan TEXT, 
  payment_verified BOOLEAN DEFAULT false
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Cannot downgrade without explicit action
  IF new_plan < current_plan THEN
    RETURN false;
  END IF;
  
  -- Cannot upgrade without payment verification
  IF new_plan > current_plan AND NOT payment_verified THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to safely extend membership
CREATE OR REPLACE FUNCTION safe_extend_membership(
  user_id TEXT,
  tenant_id TEXT,
  days INTEGER DEFAULT 30
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_expiry DATE
) AS $$
DECLARE
  current_membership RECORD;
  new_expiry_date DATE;
  cooldown_active BOOLEAN;
BEGIN
  -- Check if user is in cooldown
  SELECT EXISTS(
    SELECT 1 FROM membership_audit 
    WHERE user_id = safe_extend_membership.user_id
    AND action = 'extend'
    AND created_at > NOW() - INTERVAL '5 minutes'
  ) INTO cooldown_active;
  
  IF cooldown_active THEN
    RETURN QUERY SELECT false, 'Extension cooldown active', NULL::DATE;
    RETURN;
  END IF;
  
  -- Get current membership
  SELECT * INTO current_membership 
  FROM memberships 
  WHERE user_id = safe_extend_membership.user_id 
  AND tenant_id = safe_extend_membership.tenant_id
  AND status = 'active'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'No active membership found', NULL::DATE;
    RETURN;
  END IF;
  
  -- Calculate new expiry date (safe arithmetic)
  new_expiry_date := GREATEST(
    current_membership.next_payment_date, 
    CURRENT_DATE
  ) + (days || ' days')::INTERVAL;
  
  -- Update membership
  UPDATE memberships 
  SET 
    next_payment_date = new_expiry_date,
    updated_at = NOW()
  WHERE id = current_membership.id;
  
  -- Log the extension
  INSERT INTO membership_audit (
    user_id, 
    tenant_id, 
    action, 
    previous_state, 
    new_state, 
    created_at
  ) VALUES (
    user_id,
    tenant_id,
    'extend',
    row_to_json(current_membership),
    json_build_object(
      'next_payment_date', new_expiry_date,
      'updated_at', NOW()
    ),
    NOW()
  );
  
  RETURN QUERY SELECT true, 'Membership extended successfully', new_expiry_date;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Indexes for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_memberships_user_tenant 
ON memberships(user_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_favorites_user_tenant 
ON favorites(user_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_content_tenant 
ON content(tenant_id);

CREATE INDEX IF NOT EXISTS idx_membership_audit_user_tenant 
ON membership_audit(user_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_users_firebase_uid 
ON users(firebase_uid);

-- =============================================
-- TRIGGERS FOR AUTOMATIC AUDITING
-- =============================================

-- Trigger to automatically set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context_trigger()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM set_tenant_context(NEW.tenant_id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to relevant tables
CREATE TRIGGER membership_set_tenant_context
  BEFORE INSERT OR UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION set_tenant_context_trigger();

CREATE TRIGGER favorites_set_tenant_context
  BEFORE INSERT OR UPDATE ON favorites
  FOR EACH ROW
  EXECUTE FUNCTION set_tenant_context_trigger();
