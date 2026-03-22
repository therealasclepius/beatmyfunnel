-- Drop and recreate challenge_status with new values
ALTER TYPE challenge_status RENAME TO challenge_status_old;
CREATE TYPE challenge_status AS ENUM ('draft', 'open', 'accepting_submissions', 'testing', 'verifying', 'completed', 'refunded', 'cancelled');
ALTER TABLE challenges ALTER COLUMN status TYPE challenge_status USING status::text::challenge_status;
DROP TYPE challenge_status_old;

-- Drop and recreate submission_status with new values
ALTER TYPE submission_status RENAME TO submission_status_old;
CREATE TYPE submission_status AS ENUM ('pending', 'submitted', 'selected_for_testing', 'tested', 'winner', 'runner_up');
ALTER TABLE challenges ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE submissions ALTER COLUMN status TYPE submission_status USING status::text::submission_status;
DROP TYPE submission_status_old;

-- Add new fields to challenges
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS metric_unit text DEFAULT '%';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS challenge_type text DEFAULT 'landing_page';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS escrow_transaction_id text;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS winner_id uuid REFERENCES profiles(id);
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS verified_result numeric;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS admin_verification_notes text;

-- Add constraint for challenge_type
ALTER TABLE challenges ADD CONSTRAINT valid_challenge_type CHECK (challenge_type IN ('landing_page', 'email_flow'));

-- Add shortlisted badge field for applications
ALTER TABLE applications ADD COLUMN IF NOT EXISTS shortlisted_badge boolean DEFAULT false;

-- Add portfolio visibility field for submissions
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS is_portfolio_visible boolean DEFAULT true;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS tested_at timestamptz;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS test_result numeric;
