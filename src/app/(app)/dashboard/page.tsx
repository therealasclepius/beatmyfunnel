import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ChallengeCard from '@/components/challenge-card'
import type { Profile, Challenge } from '@/types/database'

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

  return <OperatorDashboard />
}

async function BrandDashboard({ userId }: { userId: string }) {
  const supabase = await createClient()

  const { data: challenges } = await supabase
    .from('challenges')
    .select('*')
    .eq('brand_id', userId)
    .order('created_at', { ascending: false })

  const typedChallenges = (challenges || []) as Challenge[]

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
      <div style={styles.pageHeader}>
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
        <div style={styles.grid}>
          {typedChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              applicationCount={countMap[challenge.id] || 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}

async function OperatorDashboard() {
  const supabase = await createClient()

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

  // Fetch application counts
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
      <div style={styles.pageHeader}>
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
        <div style={styles.grid}>
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
}
