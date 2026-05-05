-- Payment Verification Schema
-- Ensures plan upgrades require proper payment verification

-- Payment verification table
CREATE TABLE IF NOT EXISTS payment_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  plan_from TEXT NOT NULL,
  plan_to TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT NOT NULL,
  transaction_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'refunded')),
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
  
  -- Constraints
  CONSTRAINT valid_plan_transition CHECK (plan_to != plan_from),
  CONSTRAINT valid_amount CHECK (amount > 0),
  CONSTRAINT valid_currency CHECK (currency IN ('USD', 'EUR', 'GBP')),
  CONSTRAINT unique_pending_verification UNIQUE (user_id, tenant_id, status) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Add payment_verified column to memberships
ALTER TABLE memberships 
ADD COLUMN IF NOT EXISTS payment_verified BOOLEAN DEFAULT false;

-- Payment verification history table
CREATE TABLE IF NOT EXISTS payment_verification_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  verification_id UUID REFERENCES payment_verifications(id),
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_verifications_user_tenant 
ON payment_verifications(user_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_payment_verifications_status 
ON payment_verifications(status);

CREATE INDEX IF NOT EXISTS idx_payment_verifications_expires_at 
ON payment_verifications(expires_at);

CREATE INDEX IF NOT EXISTS idx_payment_verification_history_verification 
ON payment_verification_history(verification_id);

-- RLS Policies for payment_verifications
ALTER TABLE payment_verifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own payment verifications
CREATE POLICY "users_read_own_payment_verifications" 
ON payment_verifications 
FOR SELECT 
USING (auth.uid()::text = user_id);

-- Users can insert their own payment verifications
CREATE POLICY "users_insert_own_payment_verifications" 
ON payment_verifications 
FOR INSERT 
WITH CHECK (
  auth.uid()::text = user_id 
  AND tenant_id = current_setting('app.tenant_id', true)::text
);

-- System can update payment verifications
CREATE POLICY "system_update_payment_verifications" 
ON payment_verifications 
FOR UPDATE 
USING (true);

-- RLS Policies for payment_verification_history
ALTER TABLE payment_verification_history ENABLE ROW LEVEL SECURITY;

-- Users can read their own payment history
CREATE POLICY "users_read_own_payment_history" 
ON payment_verification_history 
FOR SELECT 
USING (auth.uid()::text = user_id);

-- System can insert payment history
CREATE POLICY "system_insert_payment_history" 
ON payment_verification_history 
FOR INSERT 
WITH CHECK (true);

-- Functions for payment verification
CREATE OR REPLACE FUNCTION create_payment_verification(
  p_user_id TEXT,
  p_tenant_id TEXT,
  p_plan_from TEXT,
  p_plan_to TEXT,
  p_amount DECIMAL,
  p_payment_method TEXT,
  p_transaction_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  verification_id UUID;
BEGIN
  -- Insert payment verification
  INSERT INTO payment_verifications (
    user_id, tenant_id, plan_from, plan_to, amount, payment_method, transaction_id
  ) VALUES (
    p_user_id, p_tenant_id, p_plan_from, p_plan_to, p_amount, p_payment_method, p_transaction_id
  )
  RETURNING id INTO verification_id;
  
  -- Log creation
  INSERT INTO payment_verification_history (
    verification_id, user_id, tenant_id, action, old_status, new_status
  ) VALUES (
    verification_id, p_user_id, p_tenant_id, 'created', NULL, 'pending'
  );
  
  RETURN verification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION verify_payment(
  p_verification_id UUID,
  p_transaction_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  verification RECORD;
BEGIN
  -- Get verification record
  SELECT * INTO verification 
  FROM payment_verifications 
  WHERE id = p_verification_id 
  AND status = 'pending'
  AND expires_at > NOW()
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update verification status
  UPDATE payment_verifications 
  SET 
    status = 'verified',
    verified_at = NOW(),
    transaction_id = COALESCE(p_transaction_id, transaction_id),
    updated_at = NOW()
  WHERE id = p_verification_id;
  
  -- Update membership payment_verified flag
  UPDATE memberships 
  SET payment_verified = TRUE 
  WHERE user_id = verification.user_id 
  AND tenant_id = verification.tenant_id;
  
  -- Log verification
  INSERT INTO payment_verification_history (
    verification_id, user_id, tenant_id, action, old_status, new_status
  ) VALUES (
    p_verification_id, verification.user_id, verification.tenant_id, 
    'verified', 'pending', 'verified'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION consume_payment_verification(
  p_user_id TEXT,
  p_tenant_id TEXT,
  p_plan_to TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  verification RECORD;
BEGIN
  -- Find and consume a valid verification
  SELECT * INTO verification 
  FROM payment_verifications 
  WHERE user_id = p_user_id 
  AND tenant_id = p_tenant_id
  AND plan_to = p_plan_to
  AND status = 'verified'
  AND verified_at > NOW() - INTERVAL '24 hours'
  ORDER BY verified_at DESC
  LIMIT 1
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Mark as consumed
  UPDATE payment_verifications 
  SET status = 'consumed', updated_at = NOW()
  WHERE id = verification.id;
  
  -- Reset membership payment_verified flag
  UPDATE memberships 
  SET payment_verified = FALSE 
  WHERE user_id = p_user_id 
  AND tenant_id = p_tenant_id;
  
  -- Log consumption
  INSERT INTO payment_verification_history (
    verification_id, user_id, tenant_id, action, old_status, new_status
  ) VALUES (
    verification.id, p_user_id, p_tenant_id, 'consumed', 'verified', 'consumed'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically clean up expired verifications
CREATE OR REPLACE FUNCTION cleanup_expired_verifications()
RETURNS INTEGER AS $$
DECLARE
  cleanup_count INTEGER;
BEGIN
  -- Mark expired verifications as failed
  UPDATE payment_verifications 
  SET status = 'failed', updated_at = NOW()
  WHERE status = 'pending' 
  AND expires_at < NOW();
  
  -- Get count of cleaned up records
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  
  RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_verifications_trigger()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM cleanup_expired_verifications();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run hourly)
-- This would be set up as a cron job or scheduled function

-- Example plan pricing
CREATE TABLE IF NOT EXISTS plan_pricing (
  plan TEXT PRIMARY KEY,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default pricing
INSERT INTO plan_pricing (plan, price, currency) VALUES
('basic', 10.00, 'USD'),
('premium', 29.00, 'USD'),
('pro', 49.00, 'USD')
ON CONFLICT (plan) DO NOTHING;

-- Function to get plan pricing
CREATE OR REPLACE FUNCTION get_plan_price(p_plan TEXT, p_billing_cycle TEXT DEFAULT 'monthly')
RETURNS DECIMAL AS $$
DECLARE
  plan_price DECIMAL;
BEGIN
  SELECT price INTO plan_price 
  FROM plan_pricing 
  WHERE plan = p_plan 
  AND billing_cycle = p_billing_cycle;
  
  RETURN COALESCE(plan_price, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to validate plan upgrade pricing
CREATE OR REPLACE FUNCTION validate_plan_upgrade_price(
  p_plan_from TEXT,
  p_plan_to TEXT,
  p_amount DECIMAL
)
RETURNS BOOLEAN AS $$
DECLARE
  expected_amount DECIMAL;
BEGIN
  -- Get expected price for new plan
  expected_amount := get_plan_price(p_plan_to);
  
  -- For upgrades, amount should match new plan price
  -- (simplified - in real system would handle pro-rating, etc.)
  RETURN p_amount = expected_amount;
END;
$$ LANGUAGE plpgsql;
