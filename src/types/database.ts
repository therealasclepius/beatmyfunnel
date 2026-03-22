// Enums
export type UserRole = 'brand' | 'operator' | 'admin'
export type ChallengeStatus = 'draft' | 'open' | 'in_review' | 'judging' | 'completed' | 'cancelled'
export type ApplicationStatus = 'pending' | 'shortlisted' | 'finalist' | 'rejected'
export type SubmissionStatus = 'pending' | 'submitted' | 'under_review' | 'winner' | 'runner_up'

// Tables
export interface Profile {
  id: string
  role: UserRole
  display_name: string
  company_name: string | null
  bio: string | null
  avatar_url: string | null
  website_url: string | null
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
  created_at: string
  updated_at: string
}

// Insert types (omit auto-generated fields)
export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>
export type ChallengeInsert = Omit<Challenge, 'id' | 'status' | 'created_at' | 'updated_at'>
export type ApplicationInsert = Omit<Application, 'id' | 'status' | 'created_at' | 'updated_at'>
export type SubmissionInsert = Omit<Submission, 'id' | 'status' | 'verified_value' | 'brand_feedback' | 'admin_notes' | 'created_at' | 'updated_at'>

// Update types (all fields optional except id)
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
export type ChallengeUpdate = Partial<Omit<Challenge, 'id' | 'brand_id' | 'created_at' | 'updated_at'>>
export type ApplicationUpdate = Partial<Pick<Application, 'status'>>
export type SubmissionUpdate = Partial<Omit<Submission, 'id' | 'challenge_id' | 'operator_id' | 'application_id' | 'created_at' | 'updated_at'>>
