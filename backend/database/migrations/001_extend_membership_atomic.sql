-- Migration: Create atomic membership extension function
-- This prevents race conditions and ensures safe date calculations

CREATE OR REPLACE FUNCTION extend_membership_atomic(
  p_user_id TEXT,
  p_tenant_id TEXT,
  p_days INTEGER
)
RETURNS TABLE (
  id TEXT,
  user_id TEXT,
  tenant_id TEXT,
  plan TEXT,
  start_date DATE,
  next_payment_date DATE,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Atomic update with safe date arithmetic
  -- Uses GREATEST to prevent date reset attacks
  RETURN QUERY
  UPDATE memberships
  SET 
    next_payment_date = GREATEST(next_payment_date, CURRENT_DATE) + (p_days || ' days')::INTERVAL,
    status = 'active',
    updated_at = NOW()
  WHERE 
    user_id = p_user_id 
    AND tenant_id = p_tenant_id
    AND status IN ('active', 'paused')
  RETURNING *;
  
  -- If no rows were updated, raise an error for the application layer
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membership not found or not active for user %s in tenant %s', p_user_id, p_tenant_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add index for performance on the atomic function queries
CREATE INDEX IF NOT EXISTS idx_memberships_user_tenant_status 
ON memberships(user_id, tenant_id, status)
WHERE status IN ('active', 'paused');

-- Add constraint to prevent invalid extension days
ALTER TABLE memberships 
ADD CONSTRAINT IF NOT EXISTS valid_extension_days 
CHECK (next_payment_date >= CURRENT_DATE OR status IN ('expired', 'cancelled'));

-- Create audit trigger for membership extensions
CREATE OR REPLACE FUNCTION log_membership_extension()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the extension for security monitoring
  INSERT INTO membership_audit (
    user_id, 
    tenant_id, 
    action, 
    previous_state, 
    new_state, 
    created_at
  ) VALUES (
    NEW.user_id,
    NEW.tenant_id,
    'extend',
    row_to_json(OLD),
    row_to_json(NEW),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for extension logging
DROP TRIGGER IF EXISTS membership_extension_trigger ON memberships;
CREATE TRIGGER membership_extension_trigger
  AFTER UPDATE ON memberships
  FOR EACH ROW
  WHEN (OLD.next_payment_date IS DISTINCT FROM NEW.next_payment_date)
  EXECUTE FUNCTION log_membership_extension();
