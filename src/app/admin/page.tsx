import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/status-badge'
import type { Challenge, Profile, ChallengeStatus } from '@/types/database'

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

interface ChallengeWithBrand extends Challenge {
  profiles: Pick<Profile, 'display_name' | 'company_name'>
}

const STATUSES: ChallengeStatus[] = ['draft', 'open', 'accepting_submissions', 'testing', 'verifying', 'completed', 'refunded', 'cancelled']

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  // Fetch all challenges with brand profiles
  const { data: challenges } = await supabase
    .from('challenges')
    .select('*, profiles:brand_id(display_name, company_name)')
    .order('created_at', { ascending: false })

  const allChallenges = (challenges || []) as unknown as ChallengeWithBrand[]

  // Count challenges by status
  const statusCounts: Record<string, number> = {}
  STATUSES.forEach((s) => { statusCounts[s] = 0 })
  allChallenges.forEach((c) => {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1
  })

  // Fetch profiles grouped by role
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('role')

  const profiles = (allProfiles || []) as Pick<Profile, 'role'>[]
  const brandCount = profiles.filter((p) => p.role === 'brand').length
  const operatorCount = profiles.filter((p) => p.role === 'operator').length

  // Count applications
  const { count: applicationCount } = await supabase
    .from('applications')
    .select('*', { count: 'exact', head: true })

  // Recent 10 challenges
  const recentChallenges = allChallenges.slice(0, 10)

  const stats = [
    { label: 'Total Challenges', value: allChallenges.length },
    { label: 'Open', value: statusCounts['open'] || 0 },
    { label: 'Testing', value: statusCounts['testing'] || 0 },
    { label: 'Completed', value: statusCounts['completed'] || 0 },
    { label: 'Brands', value: brandCount },
    { label: 'Operators', value: operatorCount },
    { label: 'Applications', value: applicationCount || 0 },
  ]

  return (
    <div>
      <h1 style={styles.pageTitle}>Admin Overview</h1>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        {stats.map((stat) => (
          <div key={stat.label} style={styles.statCard}>
            <span style={styles.statValue}>{stat.value}</span>
            <span style={styles.statLabel}>{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Recent Challenges Table */}
      <div style={{ marginTop: '40px' }}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Recent Challenges</h2>
          <Link href="/admin/challenges" style={styles.viewAllLink}>View all &rarr;</Link>
        </div>

        <div className="admin-table-wrapper" style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Brand</th>
                <th style={styles.th}>Prize</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {recentChallenges.map((challenge) => (
                <tr key={challenge.id} style={styles.tr}>
                  <td style={styles.td}>
                    <Link href={`/admin/challenges/${challenge.id}`} style={styles.challengeLink}>
                      {challenge.title}
                    </Link>
                  </td>
                  <td style={{ ...styles.td, color: 'var(--text-secondary)' }}>
                    {challenge.profiles?.company_name || challenge.profiles?.display_name || 'Unknown'}
                  </td>
                  <td style={{ ...styles.td, color: 'var(--text-secondary)' }}>
                    {formatCurrency(challenge.prize_amount)}
                  </td>
                  <td style={styles.td}>
                    <StatusBadge status={challenge.status} variant="challenge" />
                  </td>
                  <td style={{ ...styles.td, color: 'var(--text-tertiary)' }}>
                    {formatDate(challenge.created_at)}
                  </td>
                </tr>
              ))}
              {recentChallenges.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ ...styles.td, textAlign: 'center', color: 'var(--text-tertiary)', padding: '40px 16px' }}>
                    No challenges yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  pageTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    marginBottom: '24px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '12px',
  },
  statCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  statLabel: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    fontWeight: 400,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  viewAllLink: {
    fontSize: '13px',
    color: 'var(--accent)',
    textDecoration: 'none',
    fontWeight: 500,
  },
  tableWrapper: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--text-quaternary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border-primary)',
  },
  tr: {
    borderBottom: '1px solid var(--border-primary)',
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
  },
  challengeLink: {
    color: 'var(--text-primary)',
    textDecoration: 'none',
    fontWeight: 500,
  },
}
