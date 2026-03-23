-- Add traffic commitment and finalist floor columns to challenges
ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS traffic_commitment_sessions integer DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS traffic_commitment_days integer DEFAULT 14,
  ADD COLUMN IF NOT EXISTS finalist_floor_payout integer DEFAULT 500,
  ADD COLUMN IF NOT EXISTS current_sessions_delivered integer DEFAULT 0;

-- Update max_finalists default to 3
ALTER TABLE challenges ALTER COLUMN max_finalists SET DEFAULT 3;

-- Add constraint: prize_amount must be >= 5000 (stored in cents, so 500000)
ALTER TABLE challenges ADD CONSTRAINT prize_amount_minimum CHECK (prize_amount >= 500000);

-- Add badges jsonb column to profiles for operator achievement badges
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS badges jsonb DEFAULT '[]'::jsonb;
