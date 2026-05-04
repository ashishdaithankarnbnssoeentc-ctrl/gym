-- Create proposals table for AI-generated client proposals
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Client information
  project_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_type TEXT NOT NULL CHECK (client_type IN ('startup', 'corporate', 'small_business')),
  client_industry TEXT,

  -- Request information
  request_hash TEXT UNIQUE,
  project_description TEXT,
  project_goals TEXT[],
  budget_range TEXT,
  timeline TEXT,

  -- AI-generated content
  strategy JSONB,
  generated_proposal TEXT NOT NULL,
  tone_profile TEXT,

  -- Pricing and invoice
  pricing_tier TEXT,
  pricing_summary JSONB,
  invoice_data JSONB,

  -- PDF generation
  pdf_url TEXT,
  pdf_generated_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,

  -- Indexing
  CONSTRAINT valid_proposal_length CHECK (LENGTH(generated_proposal) >= 200)
);

-- Create index on user_id for fast user queries
CREATE INDEX idx_proposals_user_id ON proposals(user_id);

-- Create index on status for filtering
CREATE INDEX idx_proposals_status ON proposals(status);

-- Create index on created_at for sorting
CREATE INDEX idx_proposals_created_at ON proposals(created_at DESC);

-- Create index on request_hash for duplicate detection
CREATE INDEX idx_proposals_request_hash ON proposals(request_hash);

-- Row Level Security Policies
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Users can view their own proposals
CREATE POLICY "Users can view own proposals" ON proposals
  FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()));

-- Users can insert their own proposals
CREATE POLICY "Users can insert own proposals" ON proposals
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()));

-- Users can update their own proposals
CREATE POLICY "Users can update own proposals" ON proposals
  FOR UPDATE
  USING (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()));

-- Users can delete their own proposals
CREATE POLICY "Users can delete own proposals" ON proposals
  FOR DELETE
  USING (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_proposals_updated_at();

-- Create client memory table for repeat clients
CREATE TABLE IF NOT EXISTS client_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  client_name TEXT NOT NULL,
  client_type TEXT NOT NULL,
  client_industry TEXT,

  -- Historical data
  total_proposals INT DEFAULT 0,
  accepted_proposals INT DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,

  -- Preferences
  preferred_tone TEXT,
  preferred_pricing_tier TEXT,
  communication_style JSONB,

  -- Metadata
  first_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, client_name)
);

-- Create index on user_id and client_name
CREATE INDEX idx_client_memory_user_client ON client_memory(user_id, client_name);

-- Row Level Security for client_memory
ALTER TABLE client_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own client memory" ON client_memory
  FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()));
