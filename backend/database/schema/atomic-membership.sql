-- Atomic Membership Service SQL Functions
-- These functions provide database-level atomic operations for membership management

-- Function to atomically upsert membership with row-level locking
CREATE OR REPLACE FUNCTION upsert_membership_atomic(
  p_user_id TEXT,
  p_tenant_id TEXT,
  p_plan TEXT,
  p_start_date DATE,
  p_next_payment_date DATE,
  p_status TEXT DEFAULT 'active'
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
  -- Insert or update with row-level locking
  INSERT INTO memberships (
    user_id, tenant_id, plan, start_date, next_payment_date, status, created_at, updated_at
  ) VALUES (
    p_user_id, p_tenant_id, p_plan, p_start_date, p_next_payment_date, p_status, NOW(), NOW()
  )
  ON CONFLICT (user_id, tenant_id) 
  DO UPDATE SET
    plan = EXCLUDED.plan,
    start_date = EXCLUDED.start_date,
    next_payment_date = EXCLUDED.next_payment_date,
    status = EXCLUDED.status,
    updated_at = NOW()
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Function to atomically extend membership with row-level locking
CREATE OR REPLACE FUNCTION extend_membership_atomic(
  p_membership_id TEXT,
  p_user_id TEXT,
  p_tenant_id TEXT,
  p_next_payment_date DATE
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
  -- Update membership with row-level locking and ownership verification
  UPDATE memberships 
  SET 
    next_payment_date = p_next_payment_date,
    status = 'active',
    updated_at = NOW()
  WHERE 
    id = p_membership_id 
    AND user_id = p_user_id 
    AND tenant_id = p_tenant_id
    AND status = 'active'
  RETURNING *;
  
  -- If no rows were updated, raise an error
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membership not found, not active, or access denied';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to atomically cancel membership with row-level locking
CREATE OR REPLACE FUNCTION cancel_membership_atomic(
  p_membership_id TEXT,
  p_user_id TEXT,
  p_tenant_id TEXT
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
  -- Cancel membership with row-level locking and ownership verification
  UPDATE memberships 
  SET 
    status = 'cancelled',
    updated_at = NOW()
  WHERE 
    id = p_membership_id 
    AND user_id = p_user_id 
    AND tenant_id = p_tenant_id
  RETURNING *;
  
  -- If no rows were updated, raise an error
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membership not found or access denied';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to atomically pause membership with row-level locking
CREATE OR REPLACE FUNCTION pause_membership_atomic(
  p_membership_id TEXT,
  p_user_id TEXT,
  p_tenant_id TEXT,
  p_pause_until DATE DEFAULT NULL
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
  -- Pause membership with row-level locking and ownership verification
  UPDATE memberships 
  SET 
    status = 'paused',
    updated_at = NOW()
  WHERE 
    id = p_membership_id 
    AND user_id = p_user_id 
    AND tenant_id = p_tenant_id
    AND status = 'active'
  RETURNING *;
  
  -- If no rows were updated, raise an error
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membership not found, not active, or access denied';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to mark expired memberships atomically
CREATE OR REPLACE FUNCTION mark_expired_memberships()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Mark expired memberships
  UPDATE memberships 
  SET status = 'expired'
  WHERE 
    next_payment_date < CURRENT_DATE 
    AND status = 'active';
  
  -- Get count of updated rows
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Create membership audit table if it doesn't exist
CREATE TABLE IF NOT EXISTS membership_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('extend', 'cancel', 'pause', 'upgrade', 'downgrade', 'create')),
  previous_state JSONB,
  new_state JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for audit table
CREATE INDEX IF NOT EXISTS idx_membership_audit_user_tenant ON membership_audit(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_membership_audit_created_at ON membership_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_membership_audit_action ON membership_audit(action);

-- Add constraint to prevent duplicate extensions within cooldown period
ALTER TABLE membership_audit 
ADD CONSTRAINT IF NOT EXISTS unique_recent_extension 
UNIQUE (user_id, tenant_id, action, created_at)
WHERE action = 'extend'
AND created_at > (NOW() - INTERVAL '5 minutes');

-- Add check constraint for audit action types
ALTER TABLE membership_audit 
ADD CONSTRAINT IF NOT EXISTS valid_audit_action 
CHECK (action IN ('extend', 'cancel', 'pause', 'upgrade', 'downgrade', 'create'));

-- Create trigger to automatically log membership changes
CREATE OR REPLACE FUNCTION log_membership_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the change
  INSERT INTO membership_audit (
    user_id, tenant_id, action, previous_state, new_state, created_at
  ) VALUES (
    NEW.user_id, 
    NEW.tenant_id, 
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'create'
      WHEN TG_OP = 'UPDATE' THEN 
        CASE 
          WHEN OLD.status != NEW.status THEN 
            CASE NEW.status
              WHEN 'cancelled' THEN 'cancel'
              WHEN 'paused' THEN 'pause'
              WHEN 'expired' THEN 'expire'
              ELSE 'update'
            END
          WHEN OLD.plan != NEW.plan THEN 
            CASE 
              WHEN (OLD.plan = 'basic' AND NEW.plan IN ('premium', 'pro')) OR 
                   (OLD.plan = 'premium' AND NEW.plan = 'pro') THEN 'upgrade'
              WHEN (OLD.plan = 'pro' AND NEW.plan IN ('premium', 'basic')) OR 
                   (OLD.plan = 'premium' AND NEW.plan = 'basic') THEN 'downgrade'
              ELSE 'update'
            END
          ELSE 'update'
        END
      ELSE 'unknown'
    END,
    row_to_json(OLD),
    row_to_json(NEW),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for membership audit logging
DROP TRIGGER IF EXISTS membership_audit_trigger ON memberships;
CREATE TRIGGER membership_audit_trigger
  AFTER INSERT OR UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION log_membership_changes();

-- Add row-level security policies for membership_audit
ALTER TABLE membership_audit ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see their own audit logs
CREATE POLICY IF NOT EXISTS users_view_own_audit ON membership_audit
  FOR SELECT USING (
    auth.uid()::text = user_id
  );

-- Policy to allow admins to see all audit logs
CREATE POLICY IF NOT EXISTS admins_view_all_audit ON membership_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text 
      AND is_admin = true
      AND tenant_id = membership_audit.tenant_id
    )
  );

-- Policy to allow system to insert audit logs
CREATE POLICY IF NOT EXISTS system_insert_audit ON membership_audit
  FOR INSERT WITH CHECK (true);

-- Add unique constraint to prevent duplicate active memberships per user
ALTER TABLE memberships 
ADD CONSTRAINT IF NOT EXISTS unique_active_membership 
UNIQUE (user_id, tenant_id) 
WHERE status = 'active';

-- Add check constraint for valid plans
ALTER TABLE memberships 
ADD CONSTRAINT IF NOT EXISTS valid_plan 
CHECK (plan IN ('basic', 'premium', 'pro'));

-- Add check constraint for valid statuses
ALTER TABLE memberships 
ADD CONSTRAINT IF NOT EXISTS valid_status 
CHECK (status IN ('active', 'expired', 'paused', 'cancelled'));

-- Add check constraint for future payment dates
ALTER TABLE memberships 
ADD CONSTRAINT IF NOT EXISTS future_payment_date 
CHECK (next_payment_date >= CURRENT_DATE OR status IN ('expired', 'cancelled'));

-- Create index for efficient membership lookups
CREATE INDEX IF NOT EXISTS idx_memberships_user_tenant ON memberships(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_next_payment ON memberships(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_memberships_plan ON memberships(plan);
