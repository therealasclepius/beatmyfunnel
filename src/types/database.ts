// Enums
export type UserRole = 'brand' | 'operator' | 'admin'
export type ChallengeStatus = 'draft' | 'open' | 'accepting_submissions' | 'testing' | 'verifying' | 'completed' | 'refunded' | 'cancelled'
export type ApplicationStatus = 'pending' | 'shortlisted' | 'finalist' | 'rejected'
export type SubmissionStatus = 'pending' | 'submitted' | 'selected_for_testing' | 'tested' | 'winner' | 'runner_up'
export type ChallengeType = 'landing_page' | 'email_flow'

// Tables
export interface Profile {
  id: string
  role: UserRole
  display_name: string
  company_name: string | null
  bio: string | null
  avatar_url: string | null
  website_url: string | null
  badges: Record<string, unknown>[] | null
  created_at: string
  updated_at: string
}

export interface Challenge {
  id: string
  brand_id: string
  title: string
  description: string
  metric_type: string
  baseline_value: number
  prize_amount: number
  max_finalists: number
  deadline: string
  status: ChallengeStatus
  metric_unit: string
  challenge_type: ChallengeType
  traffic_commitment_sessions: number
  traffic_commitment_days: number
  finalist_floor_payout: number
  current_sessions_delivered: number
  escrow_transaction_id: string | null
  payment_status: string
  winner_id: string | null
  verified_result: number | null
  admin_verification_notes: string | null
  created_at: string
  updated_at: string
}

export interface Application {
  id: string
  challenge_id: string
  operator_id: string
  pitch: string
  background: string | null
  relevant_wins: string | null
  status: ApplicationStatus
  shortlisted_badge: boolean
  created_at: string
  updated_at: string
}

export interface Submission {
  id: string
  challenge_id: string
  operator_id: string
  application_id: string
  description: string
  evidence_url: string | null
  claimed_value: number | null
  verified_value: number | null
  status: SubmissionStatus
  brand_feedback: string | null
  admin_notes: string | null
  is_portfolio_visible: boolean
  tested_at: string | null
  test_result: number | null
  created_at: string
  updated_at: string
}

// Insert types (omit auto-generated fields)
export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>
export type ChallengeInsert = Omit<Challenge, 'id' | 'status' | 'current_sessions_delivered' | 'escrow_transaction_id' | 'payment_status' | 'winner_id' | 'verified_result' | 'admin_verification_notes' | 'created_at' | 'updated_at'>
export type ApplicationInsert = Omit<Application, 'id' | 'status' | 'shortlisted_badge' | 'created_at' | 'updated_at'>
export type SubmissionInsert = Omit<Submission, 'id' | 'status' | 'claimed_value' | 'verified_value' | 'brand_feedback' | 'admin_notes' | 'is_portfolio_visible' | 'tested_at' | 'test_result' | 'created_at' | 'updated_at'>

// Update types (all fields optional except id)
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
export type ChallengeUpdate = Partial<Omit<Challenge, 'id' | 'brand_id' | 'created_at' | 'updated_at'>>
export type ApplicationUpdate = Partial<Pick<Application, 'status' | 'shortlisted_badge'>>
export type SubmissionUpdate = Partial<Omit<Submission, 'id' | 'challenge_id' | 'operator_id' | 'application_id' | 'created_at' | 'updated_at'>>
