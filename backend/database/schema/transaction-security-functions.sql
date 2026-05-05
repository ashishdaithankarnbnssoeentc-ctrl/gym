-- Transaction-Scoped Security Functions
-- Implements the final production hardening for connection safety and tenant isolation

-- Transaction management functions
CREATE OR REPLACE FUNCTION begin_transaction()
RETURNS void AS $$
BEGIN
  -- Start explicit transaction
  BEGIN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION end_transaction()
RETURNS void AS $$
BEGIN
  -- End transaction with cleanup
  COMMIT;
  
  -- Reset any session variables to prevent leakage
  RESET app.tenant_id;
  RESET app.user_id;
  RESET app.user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Transaction-scoped tenant context setting
CREATE OR REPLACE FUNCTION set_local_tenant_context(
  p_tenant_id TEXT,
  p_user_id TEXT,
  p_user_role TEXT DEFAULT 'user'
)
RETURNS void AS $$
BEGIN
  -- CRITICAL: Use SET LOCAL for transaction-scoped variables
  -- This prevents connection pool leakage between requests
  PERFORM set_config('app.tenant_id', p_tenant_id, true);
  PERFORM set_config('app.user_id', p_user_id, true);
  PERFORM set_config('app.user_role', p_user_role, true);
  
  -- Also set JWT claims for RLS compatibility
  PERFORM set_config('request.jwt.claim.sub', p_user_id, true);
  PERFORM set_config('request.jwt.claim.tenant_id', p_tenant_id, true);
  PERFORM set_config('request.jwt.claim.role', p_user_role, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced RLS policies using transaction context
-- These policies are now completely safe from connection pool leakage

-- Drop existing policies
DROP POLICY IF EXISTS "users_read_own_profile_enhanced" ON users;
DROP POLICY IF EXISTS "users_update_own_profile_enhanced" ON users;
DROP POLICY IF EXISTS "memberships_read_own_enhanced" ON memberships;
DROP POLICY IF EXISTS "memberships_insert_own_enhanced" ON memberships;
DROP POLICY IF EXISTS "memberships_update_own_enhanced" ON memberships;
DROP POLICY IF EXISTS "memberships_cancel_own_enhanced" ON memberships;
DROP POLICY IF EXISTS "favorites_read_own_enhanced" ON favorites;
DROP POLICY IF EXISTS "favorites_insert_own_enhanced" ON favorites;
DROP POLICY IF EXISTS "favorites_delete_own_enhanced" ON favorites;
DROP POLICY IF EXISTS "content_read_tenant_enhanced" ON content;
DROP POLICY IF EXISTS "content_insert_tenant_admin_enhanced" ON content;
DROP POLICY IF EXISTS "content_update_tenant_admin_enhanced" ON content;

-- Re-create enhanced policies using transaction context
CREATE POLICY "users_read_own_profile_transaction_safe" 
ON users 
FOR SELECT 
USING (
  -- Use transaction context instead of JWT
  current_setting('app.user_id', true) = firebase_uid
  AND current_setting('app.tenant_id', true) = tenant_id
);

CREATE POLICY "users_update_own_profile_transaction_safe" 
ON users 
FOR UPDATE 
USING (
  current_setting('app.user_id', true) = firebase_uid
  AND current_setting('app.tenant_id', true) = tenant_id
)
WITH CHECK (
  current_setting('app.user_id', true) = firebase_uid
  AND current_setting('app.tenant_id', true) = tenant_id
  AND role = OLD.role
  AND tenant_id = OLD.tenant_id
  AND status = OLD.status
  AND is_admin = OLD.is_admin
);

CREATE POLICY "memberships_read_own_transaction_safe" 
ON memberships 
FOR SELECT 
USING (
  current_setting('app.user_id', true) = user_id
  AND current_setting('app.tenant_id', true) = tenant_id
);

CREATE POLICY "memberships_insert_own_transaction_safe" 
ON memberships 
FOR INSERT 
WITH CHECK (
  current_setting('app.user_id', true) = user_id
  AND current_setting('app.tenant_id', true) = tenant_id
  AND (plan != 'admin' OR payment_verified = true)
  AND next_payment_date >= CURRENT_DATE
  AND next_payment_date <= CURRENT_DATE + INTERVAL '1 year'
  AND (status != 'active' OR payment_verified = true)
);

CREATE POLICY "memberships_update_own_transaction_safe" 
ON memberships 
FOR UPDATE 
USING (
  current_setting('app.user_id', true) = user_id
  AND current_setting('app.tenant_id', true) = tenant_id
)
WITH CHECK (
  current_setting('app.user_id', true) = user_id
  AND current_setting('app.tenant_id', true) = tenant_id
  AND next_payment_date >= CURRENT_DATE
  AND next_payment_date <= CURRENT_DATE + INTERVAL '1 year'
  AND (plan = OLD.plan OR (plan != OLD.plan AND payment_verified = true))
  AND (status != 'active' OR (status = 'active' AND payment_verified = true))
  AND status != 'expired'
);

CREATE POLICY "memberships_cancel_own_transaction_safe" 
ON memberships 
FOR DELETE 
USING (
  current_setting('app.user_id', true) = user_id
  AND current_setting('app.tenant_id', true) = tenant_id
  AND status = 'active'
);

CREATE POLICY "favorites_read_own_transaction_safe" 
ON favorites 
FOR SELECT 
USING (
  current_setting('app.user_id', true) = user_id
  AND current_setting('app.tenant_id', true) = tenant_id
);

CREATE POLICY "favorites_insert_own_transaction_safe" 
ON favorites 
FOR INSERT 
WITH CHECK (
  current_setting('app.user_id', true) = user_id
  AND current_setting('app.tenant_id', true) = tenant_id
  AND EXISTS (
    SELECT 1 FROM content 
    WHERE id = content_id 
    AND tenant_id = current_setting('app.tenant_id', true)
  )
);

CREATE POLICY "favorites_delete_own_transaction_safe" 
ON favorites 
FOR DELETE 
USING (
  current_setting('app.user_id', true) = user_id
  AND current_setting('app.tenant_id', true) = tenant_id
);

CREATE POLICY "content_read_tenant_transaction_safe" 
ON content 
FOR SELECT 
USING (
  current_setting('app.tenant_id', true) = tenant_id
);

CREATE POLICY "content_insert_tenant_admin_transaction_safe" 
ON content 
FOR INSERT 
WITH CHECK (
  current_setting('app.tenant_id', true) = tenant_id
  AND current_setting('app.user_role', true) = 'admin'
);

CREATE POLICY "content_update_tenant_admin_transaction_safe" 
ON content 
FOR UPDATE 
USING (
  current_setting('app.tenant_id', true) = tenant_id
  AND current_setting('app.user_role', true) = 'admin'
)
WITH CHECK (
  current_setting('app.tenant_id', true) = tenant_id
  AND current_setting('app.user_role', true) = 'admin'
);

-- Smart blocking functions
CREATE OR REPLACE FUNCTION create_smart_block(
  p_user_id TEXT,
  p_tenant_id TEXT,
  p_ip TEXT,
  p_reason TEXT DEFAULT 'suspicious_activity',
  p_anomalies JSONB DEFAULT '{}',
  p_duration_minutes INTEGER DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
  block_id UUID;
BEGIN
  -- Insert smart block with correlation data
  INSERT INTO user_blocks (
    user_id,
    tenant_id,
    ip,
    reason,
    details,
    expires_at,
    created_at
  ) VALUES (
    p_user_id,
    p_tenant_id,
    p_ip,
    p_reason,
    json_build_object(
      'anomalies', p_anomalies,
      'smart_detection', true,
      'correlation_score', calculate_correlation_score(p_user_id, p_ip)
    ),
    NOW() + (p_duration_minutes || ' minutes')::INTERVAL,
    NOW()
  )
  RETURNING id INTO block_id;

  -- Log the smart block
  INSERT INTO security_events (
    user_id,
    tenant_id,
    event,
    success,
    ip,
    details,
    created_at
  ) VALUES (
    p_user_id,
    p_tenant_id,
    'smart_block_created',
    false,
    p_ip,
    json_build_object(
      'reason', p_reason,
      'duration_minutes', p_duration_minutes,
      'block_id', block_id,
      'anomalies', p_anomalies
    ),
    NOW()
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION calculate_correlation_score(
  p_user_id TEXT,
  p_ip TEXT
)
RETURNS FLOAT AS $$
DECLARE
  recent_events INTEGER;
  ip_user_ratio FLOAT;
  correlation_score FLOAT;
BEGIN
  -- Count recent security events for this user
  SELECT COUNT(*) INTO recent_events
  FROM security_events
  WHERE user_id = p_user_id
  AND created_at > NOW() - INTERVAL '1 hour'
  AND NOT success;

  -- Calculate IP-user correlation (how often this IP is associated with this user)
  SELECT 
    CASE 
      WHEN total = 0 THEN 0.0
      ELSE user_count::FLOAT / total::FLOAT
    END INTO ip_user_ratio
  FROM (
    SELECT 
      COUNT(*) FILTER (WHERE user_id = p_user_id) as user_count,
      COUNT(*) as total
    FROM security_events
    WHERE ip = p_ip
    AND created_at > NOW() - INTERVAL '24 hours'
  ) ip_stats;

  -- Calculate correlation score
  correlation_score := 
    (recent_events::FLOAT / 10.0) * 0.6 +  -- Event frequency (60% weight)
    ip_user_ratio * 0.4;                     -- IP-user correlation (40% weight)

  RETURN LEAST(correlation_score, 1.0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced atomic functions with transaction safety
CREATE OR REPLACE FUNCTION safe_extend_membership_transaction(
  p_user_id TEXT,
  p_tenant_id TEXT,
  p_days INTEGER DEFAULT 30
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
  extension_count_today INTEGER;
  transaction_active BOOLEAN;
BEGIN
  -- Check if we're in a transaction
  SELECT current_setting('app.tenant_id', true) IS NOT NULL INTO transaction_active;
  
  IF NOT transaction_active THEN
    RETURN QUERY SELECT false, 'Transaction context required', NULL::DATE;
    RETURN;
  END IF;

  -- Input validation
  IF p_user_id IS NULL OR p_tenant_id IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid parameters', NULL::DATE;
    RETURN;
  END IF;
  
  IF p_days <= 0 OR p_days > 30 THEN
    RETURN QUERY SELECT false, 'Extension days must be between 1 and 30', NULL::DATE;
    RETURN;
  END IF;

  -- Verify tenant context matches
  IF current_setting('app.tenant_id', true) != p_tenant_id THEN
    RETURN QUERY SELECT false, 'Tenant context mismatch', NULL::DATE;
    RETURN;
  END IF;

  -- Check if user is in cooldown
  SELECT EXISTS(
    SELECT 1 FROM membership_audit 
    WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND action = 'extend'
    AND created_at > NOW() - INTERVAL '5 minutes'
  ) INTO cooldown_active;
  
  IF cooldown_active THEN
    RETURN QUERY SELECT false, 'Extension cooldown active - please wait 5 minutes', NULL::DATE;
    RETURN;
  END IF;

  -- Check daily extension limit
  SELECT COUNT(*) INTO extension_count_today
  FROM membership_audit 
  WHERE user_id = p_user_id
  AND tenant_id = p_tenant_id
  AND action = 'extend'
  AND created_at > NOW() - INTERVAL '1 day';
  
  IF extension_count_today >= 3 THEN
    RETURN QUERY SELECT false, 'Daily extension limit reached (3 per day)', NULL::DATE;
    RETURN;
  END IF;

  -- Get current membership with HARD business constraints
  SELECT * INTO current_membership 
  FROM memberships 
  WHERE user_id = p_user_id 
  AND tenant_id = p_tenant_id
  AND status = 'active'  -- HARD CONSTRAINT: Only active memberships
  AND next_payment_date > CURRENT_DATE  -- HARD CONSTRAINT: Not expired
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'No active, non-expired membership found', NULL::DATE;
    RETURN;
  END IF;

  -- Additional business rule: Prevent excessive extensions
  IF current_membership.next_payment_date > CURRENT_DATE + INTERVAL '90 days' THEN
    RETURN QUERY SELECT false, 'Membership already extended far into future', NULL::DATE;
    RETURN;
  END IF;

  -- Calculate new expiry date with safety
  new_expiry_date := GREATEST(
    current_membership.next_payment_date, 
    CURRENT_DATE
  ) + (p_days || ' days')::INTERVAL;

  -- Don't allow extensions beyond 1 year from today
  IF new_expiry_date > CURRENT_DATE + INTERVAL '1 year' THEN
    RETURN QUERY SELECT false, 'Cannot extend beyond 1 year from today', NULL::DATE;
    RETURN;
  END IF;

  -- Update membership atomically
  UPDATE memberships 
  SET 
    next_payment_date = new_expiry_date,
    updated_at = NOW()
  WHERE id = current_membership.id;

  -- Log the extension with full context
  INSERT INTO membership_audit (
    user_id, 
    tenant_id, 
    action, 
    previous_state, 
    new_state, 
    created_at
  ) VALUES (
    p_user_id,
    p_tenant_id,
    'extend',
    json_build_object(
      'next_payment_date', current_membership.next_payment_date,
      'status', current_membership.status
    ),
    json_build_object(
      'next_payment_date', new_expiry_date,
      'updated_at', NOW()
    ),
    NOW()
  );

  RETURN QUERY SELECT true, 'Membership extended successfully', new_expiry_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Connection pool safety function
CREATE OR REPLACE FUNCTION verify_transaction_context()
RETURNS TABLE (
  is_valid BOOLEAN,
  tenant_id TEXT,
  user_id TEXT,
  user_role TEXT
) AS $$
BEGIN
  RETURN QUERY SELECT 
    current_setting('app.tenant_id', true) IS NOT NULL as is_valid,
    current_setting('app.tenant_id', true) as tenant_id,
    current_setting('app.user_id', true) as user_id,
    current_setting('app.user_role', true) as user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced monitoring view
CREATE OR REPLACE VIEW transaction_security_summary AS
SELECT 
  tenant_id,
  COUNT(*) as total_transactions,
  COUNT(*) FILTER (WHERE details->>'smart_detection' = 'true') as smart_blocks,
  COUNT(*) FILTER (WHERE event = 'auth_success') as auth_successes,
  COUNT(*) FILTER (WHERE event = 'auth_failure') as auth_failures,
  COUNT(*) FILTER (WHERE event LIKE '%rate_limit%') as rate_limits,
  AVG((details->>'correlation_score')::FLOAT) FILTER (WHERE details->>'correlation_score' IS NOT NULL) as avg_correlation_score,
  MAX(created_at) as last_activity
FROM security_events 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY tenant_id;

-- Performance indexes for transaction safety
CREATE INDEX IF NOT EXISTS idx_security_events_tenant_transaction 
ON security_events(tenant_id, created_at, event)
WHERE created_at > NOW() - INTERVAL '24 hours';

CREATE INDEX IF NOT EXISTS idx_user_blocks_smart_active 
ON user_blocks(user_id, tenant_id, ip, expires_at)
WHERE expires_at > NOW()
AND details->>'smart_detection' = 'true';

CREATE INDEX IF NOT EXISTS idx_membership_audit_transaction_user 
ON membership_audit(user_id, tenant_id, action, created_at)
WHERE action = 'extend'
AND created_at > NOW() - INTERVAL '1 day';
