import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ChallengeCard from '@/components/challenge-card'
import type { Challenge } from '@/types/database'

export default async function BrowseChallengesPage() {
  const supabase = await createClient()

  const { data: challenges } = await supabase
    .from('challenges')
    .select('*')
    .neq('status', 'draft')
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={styles.pageTitle}>Challenges</h1>
            <p style={styles.pageDesc}>
              Browse open challenges and apply to compete.
            </p>
          </div>
          <Link href="/challenges/new" style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: '40px',
            padding: '0 20px',
            background: 'var(--text-primary)',
            color: 'var(--bg-primary)',
            fontSize: '14px',
            fontWeight: 500,
            borderRadius: '8px',
            textDecoration: 'none',
            whiteSpace: 'nowrap' as const,
          }}>
            + Post a Challenge
          </Link>
        </div>
      </div>

      {typedChallenges.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyTitle}>No challenges available</p>
          <p style={styles.emptyDesc}>
            Check back soon — new challenges are posted regularly.
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
    marginBottom: '32px',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    marginBottom: '4px',
  },
  pageDesc: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
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
  },
}
