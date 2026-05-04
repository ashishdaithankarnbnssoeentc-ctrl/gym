-- Gym System Database Schema
-- Adds roles, memberships, workout plans, and progress tracking

-- 1. Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member' CHECK (role IN ('member', 'trainer', 'admin'));

-- 2. Create memberships table
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly', 'premium_monthly', 'premium_yearly')),
  price DECIMAL(10, 2) NOT NULL,

  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),

  auto_renew BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Create index on user_id for fast lookups
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_memberships_status ON memberships(status);
CREATE INDEX idx_memberships_end_date ON memberships(end_date);

-- 3. Create workout_plans table
CREATE TABLE IF NOT EXISTS workout_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  exercises JSONB NOT NULL,
  schedule JSONB,

  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  duration_weeks INT,

  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_exercises CHECK (jsonb_array_length(exercises) > 0)
);

-- Create indexes
CREATE INDEX idx_workout_plans_trainer ON workout_plans(trainer_id);
CREATE INDEX idx_workout_plans_member ON workout_plans(member_id);
CREATE INDEX idx_workout_plans_status ON workout_plans(status);

-- 4. Create progress_tracking table
CREATE TABLE IF NOT EXISTS progress_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_plan_id UUID REFERENCES workout_plans(id) ON DELETE SET NULL,

  exercise_name TEXT NOT NULL,
  sets_completed INT NOT NULL DEFAULT 0,
  reps_completed INT NOT NULL DEFAULT 0,
  weight_used DECIMAL(6, 2),

  duration_minutes INT,
  calories_burned INT,

  notes TEXT,
  difficulty_rating INT CHECK (difficulty_rating BETWEEN 1 AND 10),

  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX idx_progress_user ON progress_tracking(user_id);
CREATE INDEX idx_progress_workout_plan ON progress_tracking(workout_plan_id);
CREATE INDEX idx_progress_completed_at ON progress_tracking(completed_at DESC);
CREATE INDEX idx_progress_exercise ON progress_tracking(exercise_name);

-- 5. Create trainer_assignments table (which members are assigned to which trainers)
CREATE TABLE IF NOT EXISTS trainer_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

  notes TEXT,

  UNIQUE(trainer_id, member_id)
);

-- Create indexes
CREATE INDEX idx_trainer_assignments_trainer ON trainer_assignments(trainer_id);
CREATE INDEX idx_trainer_assignments_member ON trainer_assignments(member_id);

-- 6. Row Level Security Policies

-- Memberships RLS
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own membership" ON memberships
  FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()));

CREATE POLICY "Users can update own membership" ON memberships
  FOR UPDATE
  USING (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()));

-- Workout Plans RLS
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own workout plans" ON workout_plans
  FOR SELECT
  USING (
    member_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid())
    OR trainer_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid())
  );

CREATE POLICY "Trainers can create workout plans" ON workout_plans
  FOR INSERT
  WITH CHECK (trainer_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid() AND role = 'trainer'));

CREATE POLICY "Trainers can update own workout plans" ON workout_plans
  FOR UPDATE
  USING (trainer_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()));

-- Progress Tracking RLS
ALTER TABLE progress_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON progress_tracking
  FOR SELECT
  USING (
    user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid())
    OR EXISTS (
      SELECT 1 FROM trainer_assignments ta
      JOIN users u ON u.id = ta.trainer_id
      WHERE ta.member_id = progress_tracking.user_id
      AND u.firebase_uid = auth.uid()
      AND u.role = 'trainer'
    )
  );

CREATE POLICY "Users can insert own progress" ON progress_tracking
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()));

CREATE POLICY "Users can update own progress" ON progress_tracking
  FOR UPDATE
  USING (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()));

-- Trainer Assignments RLS
ALTER TABLE trainer_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assignments" ON trainer_assignments
  FOR SELECT
  USING (
    trainer_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid())
    OR member_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid())
  );

CREATE POLICY "Trainers can create assignments" ON trainer_assignments
  FOR INSERT
  WITH CHECK (trainer_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid() AND role = 'trainer'));

-- 7. Function to auto-expire memberships
CREATE OR REPLACE FUNCTION check_membership_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_date < CURRENT_DATE AND NEW.status = 'active' THEN
    NEW.status = 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_membership_expiry
  BEFORE UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION check_membership_expiry();

-- 8. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_gym_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_memberships_updated_at
  BEFORE UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_gym_updated_at();

CREATE TRIGGER trigger_workout_plans_updated_at
  BEFORE UPDATE ON workout_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_gym_updated_at();
