import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ChallengeCard from '@/components/challenge-card'
import StatusBadge from '@/components/status-badge'
import type { Profile, Challenge, Application } from '@/types/database'

const ACTIVE_STATUSES = ['draft', 'open', 'accepting_submissions', 'testing', 'verifying']
const COMPLETED_STATUSES = ['completed', 'refunded', 'cancelled']

const STEP_LABELS: Record<string, string> = {
  draft: 'Draft',
  open: 'Accepting Applications',
  accepting_submissions: 'Awaiting Submissions',
  testing: 'Live Testing',
  verifying: 'Verifying Results',
  completed: 'Completed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const typedProfile = profile as Profile

  if (typedProfile.role === 'brand') {
    return <BrandDashboard userId={user.id} />
  }

  return <OperatorDashboard userId={user.id} />
}

async function BrandDashboard({ userId }: { userId: string }) {
  const supabase = await createClient()

  const { data: challenges } = await supabase
    .from('challenges')
    .select('*')
    .eq('brand_id', userId)
    .order('created_at', { ascending: false })

  const typedChallenges = (challenges || []) as Challenge[]

  const activeChallenges = typedChallenges.filter((c) => ACTIVE_STATUSES.includes(c.status))
  const completedChallenges = typedChallenges.filter((c) => COMPLETED_STATUSES.includes(c.status))

  // Fetch application counts for each challenge
  const challengeIds = typedChallenges.map((c) => c.id)
  const { data: appCounts } = challengeIds.length > 0
    ? await supabase
        .from('applications')
        .select('challenge_id')
        .in('challenge_id', challengeIds)
    : { data: [] }

  const countMap: Record<string, number> = {}
  ;(appCounts || []).forEach((a: { challenge_id: string }) => {
    countMap[a.challenge_id] = (countMap[a.challenge_id] || 0) + 1
  })

  return (
    <div>
      <div className="dashboard-page-header" style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Your Challenges</h1>
        <Link href="/challenges/new" style={styles.primaryButton}>
          Post a Challenge
        </Link>
      </div>

      {typedChallenges.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyTitle}>No challenges yet</p>
          <p style={styles.emptyDesc}>
            Post your first challenge and find operators who can beat your metrics.
          </p>
          <Link href="/challenges/new" style={styles.primaryButton}>
            Post a Challenge
          </Link>
        </div>
      ) : (
        <>
          {/* Active Challenges */}
          {activeChallenges.length > 0 && (
            <div style={{ marginBottom: '40px' }}>
              <h2 style={styles.sectionTitle}>Active Challenges</h2>
              <div className="dashboard-grid" style={styles.grid}>
                {activeChallenges.map((challenge) => (
                  <div key={challenge.id} style={{ position: 'relative' }}>
                    <ChallengeCard
                      challenge={challenge}
                      applicationCount={countMap[challenge.id] || 0}
                    />
                    <div style={styles.progressIndicator}>
                      <StatusBadge status={challenge.status} variant="challenge" />
                      <span style={styles.stepLabel}>{STEP_LABELS[challenge.status] || challenge.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Challenges */}
          {completedChallenges.length > 0 && (
            <div>
              <h2 style={styles.sectionTitle}>Completed</h2>
              <div className="dashboard-grid" style={styles.grid}>
                {completedChallenges.map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    applicationCount={countMap[challenge.id] || 0}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

async function OperatorDashboard({ userId }: { userId: string }) {
  const supabase = await createClient()

  // Fetch open challenges
  const { data: challenges } = await supabase
    .from('challenges')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  const typedChallenges = (challenges || []) as Challenge[]

  // Fetch brand names
  const brandIds = [...new Set(typedChallenges.map((c) => c.brand_id))]
  const { data: profiles } = brandIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', brandIds)
    : { data: [] }

  const brandMap: Record<string, string> = {}
  ;(profiles || []).forEach((p: { id: string; display_name: string }) => {
    brandMap[p.id] = p.display_name
  })

  // Fetch application counts for open challenges
  const challengeIds = typedChallenges.map((c) => c.id)
  const { data: appCounts } = challengeIds.length > 0
    ? await supabase
        .from('applications')
        .select('challenge_id')
        .in('challenge_id', challengeIds)
    : { data: [] }

  const countMap: Record<string, number> = {}
  ;(appCounts || []).forEach((a: { challenge_id: string }) => {
    countMap[a.challenge_id] = (countMap[a.challenge_id] || 0) + 1
  })

  // Fetch user's applications with challenge info
  const { data: userApps } = await supabase
    .from('applications')
    .select('*, challenges(*)')
    .eq('operator_id', userId)
    .order('created_at', { ascending: false })

  const typedUserApps = (userApps || []) as (Application & { challenges: Challenge })[]

  return (
    <div>
      {/* Your Applications Section */}
      {typedUserApps.length > 0 && (
        <div style={{ marginBottom: '48px' }}>
          <div className="dashboard-page-header" style={styles.pageHeader}>
            <h1 style={styles.pageTitle}>Your Applications</h1>
          </div>
          <div style={styles.appList}>
            {typedUserApps.map((app) => (
              <Link
                key={app.id}
                href={`/challenges/${app.challenge_id}`}
                className="app-row-link"
                style={styles.appRow}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={styles.appChallengeTitle}>{app.challenges?.title || 'Unknown Challenge'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' as const }}>
                    <StatusBadge status={app.status} variant="application" />
                    {app.challenges && (
                      <StatusBadge status={app.challenges.status} variant="challenge" />
                    )}
                    <span style={styles.appDateInline}>
                      Applied {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Open Challenges Section */}
      <div>
        <div className="dashboard-page-header" style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>Open Challenges</h1>
          <Link href="/challenges" style={styles.ghostButton}>
            Browse All
          </Link>
        </div>

        {typedChallenges.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>No open challenges</p>
            <p style={styles.emptyDesc}>
              Check back soon — brands are always posting new challenges.
            </p>
          </div>
        ) : (
          <div className="dashboard-grid" style={styles.grid}>
            {typedChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                applicationCount={countMap[challenge.id] || 0}
                brandName={brandMap[challenge.brand_id]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '32px',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    marginBottom: '16px',
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    height: '40px',
    padding: '0 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--bg-primary)',
    background: 'var(--text-primary)',
    border: 'none',
    borderRadius: '8px',
    textDecoration: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  ghostButton: {
    display: 'inline-flex',
    alignItems: 'center',
    height: '40px',
    padding: '0 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    background: 'none',
    border: '1px solid var(--border-primary)',
    borderRadius: '8px',
    textDecoration: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 24px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '12px',
    textAlign: 'center',
    gap: '12px',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  emptyDesc: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
    maxWidth: '360px',
    marginBottom: '8px',
  },
  progressIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
    paddingLeft: '4px',
  },
  stepLabel: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    fontWeight: 500,
  },
  appList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  appRow: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '14px 16px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '10px',
    textDecoration: 'none',
  },
  appChallengeTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    lineHeight: 1.3,
  },
  appDateInline: {
    fontSize: '12px',
    color: 'var(--text-quaternary)',
    whiteSpace: 'nowrap',
  },
}
