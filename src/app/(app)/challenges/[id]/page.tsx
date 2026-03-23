import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/status-badge'
import type { Challenge, Profile, Application, ChallengeStatus, Submission } from '@/types/database'

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

const FLOW_STEPS: { status: ChallengeStatus; label: string }[] = [
  { status: 'draft', label: 'Draft' },
  { status: 'open', label: 'Open' },
  { status: 'accepting_submissions', label: 'Submissions' },
  { status: 'testing', label: 'Testing' },
  { status: 'verifying', label: 'Verifying' },
  { status: 'completed', label: 'Completed' },
]

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch challenge
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .single()

  if (challengeError || !challenge) {
    return (
      <div style={styles.notFound}>
        <h1 style={styles.notFoundTitle}>Challenge not found</h1>
        <Link href="/challenges" style={styles.backLink}>
          &larr; Back to Challenges
        </Link>
      </div>
    )
  }

  const typedChallenge = challenge as Challenge

  // Fetch brand profile
  const { data: brandProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', typedChallenge.brand_id)
    .single()

  const brandName = (brandProfile as Pick<Profile, 'display_name'> | null)?.display_name || 'Unknown'

  // Fetch current user profile
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = (userProfile as Pick<Profile, 'role'> | null)?.role

  // Check if user has already applied
  const { data: existingApplication } = await supabase
    .from('applications')
    .select('id, status')
    .eq('challenge_id', id)
    .eq('operator_id', user.id)
    .single()

  const typedApplication = existingApplication as Pick<Application, 'id' | 'status'> | null

  // Get application count
  const { count: applicationCount } = await supabase
    .from('applications')
    .select('*', { count: 'exact', head: true })
    .eq('challenge_id', id)

  // Check for winner submission
  const { data: winnerSub } = await supabase
    .from('submissions')
    .select('*, profiles:operator_id(display_name)')
    .eq('challenge_id', id)
    .eq('status', 'winner')
    .single()

  const winnerSubmission = winnerSub as (Submission & { profiles: Pick<Profile, 'display_name'> }) | null

  const isOwner = user.id === typedChallenge.brand_id
  const isOperator = userRole === 'operator'
  const hasApplied = !!typedApplication
  const isFinalist = typedApplication?.status === 'finalist'
  const currentStepIndex = FLOW_STEPS.findIndex((s) => s.status === typedChallenge.status)

  return (
    <div style={styles.wrapper}>
      <Link href="/challenges" style={styles.backLink}>
        &larr; Back to Challenges
      </Link>

      <div style={styles.card}>
        <div style={styles.header}>
          <StatusBadge status={typedChallenge.status} variant="challenge" />
          <span style={styles.prize}>{formatCurrency(typedChallenge.prize_amount)}</span>
        </div>

        <h1 style={styles.title}>{typedChallenge.title}</h1>
        <p style={styles.brandName}>by {brandName}</p>

        {/* Progress Steps */}
        <div style={styles.progressBar}>
          {FLOW_STEPS.map((step, i) => {
            const isActive = i === currentStepIndex
            const isComplete = i < currentStepIndex
            const isFuture = i > currentStepIndex
            return (
              <div
                key={step.status}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column' as const,
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: isComplete ? '#2ed573' : isActive ? 'var(--accent, #8a8fff)' : 'var(--border-secondary, #333)',
                  }}
                />
                <span style={{
                  fontSize: '11px',
                  fontWeight: isActive ? 600 : 400,
                  color: isFuture ? 'var(--text-quaternary)' : 'var(--text-secondary)',
                }}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>

        <p style={styles.description}>{typedChallenge.description}</p>

        <div style={styles.details}>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Metric Type</span>
            <span style={styles.detailValue}>{typedChallenge.metric_type}</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Baseline</span>
            <span style={styles.detailValue}>{typedChallenge.baseline_value}{typedChallenge.metric_unit}</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Prize</span>
            <span style={styles.detailValue}>{formatCurrency(typedChallenge.prize_amount)}</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Deadline</span>
            <span style={styles.detailValue}>{formatDate(typedChallenge.deadline)}</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Max Finalists</span>
            <span style={styles.detailValue}>{typedChallenge.max_finalists}</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Applicants</span>
            <span style={styles.detailValue}>{applicationCount || 0} operators have applied</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Traffic Commitment</span>
            <span style={styles.detailValue}>
              {typedChallenge.traffic_commitment_sessions?.toLocaleString() ?? '5,000'} sessions in {typedChallenge.traffic_commitment_days ?? 14} days
            </span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Finalist Floor</span>
            <span style={styles.detailValue}>Each finalist receives ${typedChallenge.finalist_floor_payout ?? 500} upon submission</span>
          </div>
        </div>

        {/* Winner Display */}
        {typedChallenge.status === 'completed' && winnerSubmission && (
          <div style={styles.winnerBox}>
            <span style={{ fontSize: '11px', color: 'var(--text-quaternary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 500 }}>Winner</span>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#2ed573' }}>
              {winnerSubmission.profiles?.display_name || 'Unknown'}
            </span>
            {typedChallenge.verified_result !== null && (
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Verified result: {typedChallenge.verified_result}{typedChallenge.metric_unit} (baseline: {typedChallenge.baseline_value}{typedChallenge.metric_unit})
              </span>
            )}
          </div>
        )}

        {typedChallenge.status === 'refunded' && (
          <div style={{ ...styles.winnerBox, borderColor: 'var(--border-primary)' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
              Challenge refunded — nobody beat the baseline.
            </span>
          </div>
        )}

        <div style={styles.actions}>
          {isOwner && (
            <Link href={`/challenges/${id}/manage`} style={styles.primaryButton}>
              Manage Challenge
            </Link>
          )}

          {/* Operator CTAs based on status */}
          {isOperator && typedChallenge.status === 'open' && !hasApplied && (
            <Link href={`/challenges/${id}/apply`} style={styles.primaryButton}>
              Apply to This Challenge
            </Link>
          )}

          {isOperator && typedChallenge.status === 'open' && hasApplied && !isFinalist && (
            <div style={styles.statusBox}>
              <p style={styles.statusText}>
                You applied to this challenge.
              </p>
              <StatusBadge status={typedApplication!.status} variant="application" />
            </div>
          )}

          {isOperator && typedChallenge.status === 'accepting_submissions' && isFinalist && (
            <div style={styles.statusBox}>
              <p style={styles.statusText}>
                You are a finalist!
              </p>
              <Link href={`/challenges/${id}/submit`} style={styles.primaryButton}>
                Submit Your Work
              </Link>
            </div>
          )}

          {isOperator && typedChallenge.status === 'accepting_submissions' && !isFinalist && (
            <div style={styles.statusBox}>
              <p style={styles.statusText}>
                Applications closed. {hasApplied ? 'You were not selected as a finalist.' : 'This challenge is no longer accepting applications.'}
              </p>
            </div>
          )}

          {isOperator && (typedChallenge.status === 'testing' || typedChallenge.status === 'verifying') && (
            <div style={styles.statusBox}>
              <p style={styles.statusText}>
                Challenge in progress — {typedChallenge.status === 'testing' ? 'live testing underway' : 'results being verified'}.
              </p>
            </div>
          )}

          {isOperator && hasApplied && isFinalist && typedChallenge.status === 'open' && (
            <div style={styles.statusBox}>
              <p style={styles.statusText}>
                You are a finalist! Waiting for the brand to close applications.
              </p>
              <StatusBadge status={typedApplication!.status} variant="application" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    maxWidth: '720px',
    margin: '0 auto',
  },
  backLink: {
    display: 'inline-block',
    fontSize: '14px',
    color: 'var(--text-tertiary)',
    textDecoration: 'none',
    marginBottom: '24px',
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '12px',
    padding: '32px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  prize: {
    fontSize: '24px',
    fontWeight: 600,
    color: 'var(--accent)',
    letterSpacing: '-0.02em',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '4px',
    letterSpacing: '-0.02em',
    lineHeight: 1.3,
  },
  brandName: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
    marginBottom: '20px',
  },
  progressBar: {
    display: 'flex',
    gap: '4px',
    marginBottom: '24px',
    paddingBottom: '20px',
    borderBottom: '1px solid var(--border-primary)',
  },
  description: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    marginBottom: '28px',
    whiteSpace: 'pre-wrap' as const,
  },
  details: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    padding: '24px 0',
    borderTop: '1px solid var(--border-primary)',
    borderBottom: '1px solid var(--border-primary)',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailLabel: {
    fontSize: '11px',
    color: 'var(--text-quaternary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 500,
  },
  detailValue: {
    fontSize: '15px',
    color: 'var(--text-primary)',
    fontWeight: 500,
  },
  winnerBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '20px',
    marginTop: '24px',
    background: 'rgba(46, 213, 115, 0.05)',
    border: '1px solid rgba(46, 213, 115, 0.2)',
    borderRadius: '10px',
  },
  actions: {
    marginTop: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    height: '44px',
    padding: '0 24px',
    fontSize: '15px',
    fontWeight: 500,
    color: 'var(--bg-primary)',
    background: 'var(--text-primary)',
    border: 'none',
    borderRadius: '8px',
    textDecoration: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  statusBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-primary)',
    borderRadius: '8px',
    width: '100%',
  },
  statusText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  notFound: {
    textAlign: 'center',
    padding: '80px 24px',
  },
  notFoundTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '16px',
  },
}
