-- Enhanced Atomic Functions with Hard Business Constraints
-- Prevents expired membership revival and enforces strict business rules

-- Enhanced membership extension function with hard constraints
CREATE OR REPLACE FUNCTION safe_extend_membership_hardened(
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
BEGIN
  -- Input validation
  IF p_user_id IS NULL OR p_tenant_id IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid parameters', NULL::DATE;
    RETURN;
  END IF;
  
  IF p_days <= 0 OR p_days > 30 THEN
    RETURN QUERY SELECT false, 'Extension days must be between 1 and 30', NULL::DATE;
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

-- Payment verification with replay protection
CREATE OR REPLACE FUNCTION verify_payment_hardened(
  p_verification_id UUID,
  p_user_id TEXT,
  p_tenant_id TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  verification_data JSONB
) AS $$
DECLARE
  verification RECORD;
  updated_count INTEGER;
BEGIN
  -- Get and lock verification record atomically
  SELECT * INTO verification 
  FROM payment_verifications 
  WHERE id = p_verification_id 
  AND user_id = p_user_id
  AND tenant_id = p_tenant_id
  AND status = 'verified'
  AND used = false  -- CRITICAL: Must not be used
  AND expires_at > NOW()  -- CRITICAL: Must not be expired
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid, expired, or already used payment verification', NULL::JSONB;
    RETURN;
  END IF;

  -- Mark as consumed in the same transaction
  UPDATE payment_verifications 
  SET 
    used = true,
    status = 'consumed',
    updated_at = NOW()
  WHERE id = p_verification_id
  AND used = false;  -- Ensure we only update if still unused

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count != 1 THEN
    RETURN QUERY SELECT false, 'Payment verification was already used by another request', NULL::JSONB;
    RETURN;
  END IF;

  -- Update membership payment_verified flag
  UPDATE memberships 
  SET payment_verified = TRUE 
  WHERE user_id = p_user_id 
  AND tenant_id = p_tenant_id;

  -- Log consumption
  INSERT INTO payment_verification_history (
    verification_id, 
    user_id, 
    tenant_id, 
    action, 
    old_status, 
    new_state
  ) VALUES (
    p_verification_id,
    p_user_id,
    p_tenant_id,
    'consumed',
    'verified',
    json_build_object('used', true, 'consumed_at', NOW())
  );

  RETURN QUERY SELECT true, 'Payment verification consumed successfully', 
    json_build_object(
      'verification_id', p_verification_id,
      'plan_from', verification.plan_from,
      'plan_to', verification.plan_to,
      'amount', verification.amount
    )::JSONB;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced favorites creation with tenant validation
CREATE OR REPLACE FUNCTION create_favorite_hardened(
  p_user_id TEXT,
  p_tenant_id TEXT,
  p_content_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  favorite_id UUID
) AS $$
DECLARE
  content_record RECORD;
  existing_favorite RECORD;
  new_favorite_id UUID;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL OR p_tenant_id IS NULL OR p_content_id IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid parameters', NULL::UUID;
    RETURN;
  END IF;

  -- CRITICAL: Validate content exists and belongs to SAME tenant
  SELECT * INTO content_record 
  FROM content 
  WHERE id = p_content_id 
  AND tenant_id = p_tenant_id  -- TENANT VALIDATION
  FOR SHARE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Content not found or belongs to different tenant', NULL::UUID;
    RETURN;
  END IF;

  -- Check if favorite already exists
  SELECT * INTO existing_favorite
  FROM favorites
  WHERE user_id = p_user_id
  AND tenant_id = p_tenant_id
  AND content_id = p_content_id;

  IF FOUND THEN
    RETURN QUERY SELECT false, 'Already in favorites', existing_favorite.id;
    RETURN;
  END IF;

  -- Create favorite with tenant enforcement
  INSERT INTO favorites (
    user_id,
    tenant_id,
    content_id,
    created_at
  ) VALUES (
    p_user_id,
    p_tenant_id,
    p_content_id,
    NOW()
  )
  RETURNING id INTO new_favorite_id;

  -- Audit log
  INSERT INTO favorites_audit (
    user_id,
    tenant_id,
    content_id,
    action,
    created_at
  ) VALUES (
    p_user_id,
    p_tenant_id,
    p_content_id,
    'create',
    NOW()
  );

  RETURN QUERY SELECT true, 'Added to favorites successfully', new_favorite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User blocking function for anomaly response
CREATE OR REPLACE FUNCTION block_user_temporarily(
  p_user_id TEXT,
  p_tenant_id TEXT,
  p_ip TEXT,
  p_reason TEXT DEFAULT 'suspicious_activity',
  p_duration_minutes INTEGER DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
  block_id UUID;
BEGIN
  -- Insert block record
  INSERT INTO user_blocks (
    user_id,
    tenant_id,
    ip,
    reason,
    expires_at,
    created_at
  ) VALUES (
    p_user_id,
    p_tenant_id,
    p_ip,
    p_reason,
    NOW() + (p_duration_minutes || ' minutes')::INTERVAL,
    NOW()
  )
  RETURNING id INTO block_id;

  -- Log the block
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
    'user_blocked',
    false,
    p_ip,
    json_build_object(
      'reason', p_reason,
      'duration_minutes', p_duration_minutes,
      'block_id', block_id
    ),
    NOW()
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced RLS helper functions
CREATE OR REPLACE FUNCTION set_rls_context(
  p_user_id TEXT,
  p_tenant_id TEXT,
  p_role TEXT DEFAULT 'user'
)
RETURNS void AS $$
BEGIN
  -- Set JWT claims for RLS
  PERFORM set_config('request.jwt.claim.sub', p_user_id, true);
  PERFORM set_config('request.jwt.claim.tenant_id', p_tenant_id, true);
  PERFORM set_config('request.jwt.claim.role', p_role, true);
  
  -- Set tenant context
  PERFORM set_config('app.tenant_id', p_tenant_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup expired blocks
CREATE OR REPLACE FUNCTION cleanup_expired_blocks()
RETURNS INTEGER AS $$
DECLARE
  cleanup_count INTEGER;
BEGIN
  DELETE FROM user_blocks 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  
  RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memberships_active_nonexpired 
ON memberships(user_id, tenant_id, status, next_payment_date)
WHERE status = 'active' AND next_payment_date > CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_payment_verifications_unused 
ON payment_verifications(user_id, tenant_id, status, used, expires_at)
WHERE status = 'verified' AND used = false AND expires_at > NOW();

CREATE INDEX IF NOT EXISTS idx_favorites_tenant_content 
ON favorites(tenant_id, content_id);

CREATE INDEX IF NOT EXISTS idx_user_blocks_active 
ON user_blocks(user_id, tenant_id, ip, expires_at)
WHERE expires_at > NOW();

CREATE INDEX IF NOT EXISTS idx_membership_audit_user_action 
ON membership_audit(user_id, tenant_id, action, created_at);

-- Triggers for automatic cleanup
CREATE OR REPLACE FUNCTION auto_cleanup_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Clean up expired blocks
  PERFORM cleanup_expired_blocks();
  
  -- Clean up expired payment verifications
  UPDATE payment_verifications 
  SET status = 'expired' 
  WHERE status = 'pending' 
  AND expires_at < NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for periodic cleanup (would be called by cron)
-- CREATE TRIGGER periodic_cleanup
--   AFTER INSERT ON membership_audit
--   FOR EACH STATEMENT
--   EXECUTE FUNCTION auto_cleanup_trigger();
