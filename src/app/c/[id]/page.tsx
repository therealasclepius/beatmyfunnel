import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase-server'
import type { Challenge, Profile } from '@/types/database'

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

// Dynamic OG metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: challenge } = await supabase
    .from('challenges')
    .select('title, prize_amount, metric_type, baseline_value, metric_unit')
    .eq('id', id)
    .single()

  if (!challenge) {
    return { title: 'Challenge Not Found | Beat My Funnel' }
  }

  const c = challenge as Pick<Challenge, 'title' | 'prize_amount' | 'metric_type' | 'baseline_value' | 'metric_unit'>
  const prizeText = formatCurrency(c.prize_amount)
  const description = `${prizeText} challenge: Beat ${c.baseline_value}${c.metric_unit} ${c.metric_type}. Think you can do better? Apply now on Beat My Funnel.`

  return {
    title: `${c.title} — ${prizeText} Challenge | Beat My Funnel`,
    description,
    openGraph: {
      type: 'website',
      url: `https://beatmyfunnel.com/c/${id}`,
      title: `${c.title} — ${prizeText} Challenge`,
      description,
      siteName: 'Beat My Funnel',
      images: ['https://beatmyfunnel.com/og-image.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${c.title} — ${prizeText} Challenge`,
      description,
      images: ['https://beatmyfunnel.com/og-image.png'],
    },
  }
}

export default async function PublicChallengePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createServiceClient()

  // Fetch challenge
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .single()

  if (challengeError || !challenge) {
    notFound()
  }

  const c = challenge as Challenge

  // Fetch brand profile
  const { data: brandProfile } = await supabase
    .from('profiles')
    .select('display_name, company_name')
    .eq('id', c.brand_id)
    .single()

  const brand = brandProfile as Pick<Profile, 'display_name' | 'company_name'> | null
  const brandName = brand?.company_name || brand?.display_name || 'Anonymous Brand'

  // Get application count
  const { count: applicationCount } = await supabase
    .from('applications')
    .select('*', { count: 'exact', head: true })
    .eq('challenge_id', id)

  // Check for winner if completed
  const isCompleted = c.status === 'completed'
  const isRefunded = c.status === 'refunded'
  const isClosed = isCompleted || isRefunded || c.status === 'cancelled'

  let winnerName: string | null = null
  if (isCompleted && c.winner_id) {
    const { data: winnerProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', c.winner_id)
      .single()
    winnerName = (winnerProfile as Pick<Profile, 'display_name'> | null)?.display_name || 'Unknown'
  }

  const isOpen = c.status === 'open'
  const deadlinePassed = new Date(c.deadline) < new Date()

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Nav */}
        <div style={styles.nav}>
          <Link href="/" style={styles.logo}>
            Beat My Funnel
          </Link>
        </div>

        {/* Hero Card */}
        <div style={styles.heroCard}>
          {/* Status indicator */}
          <div style={styles.statusRow}>
            <span style={{
              ...styles.statusPill,
              ...(isOpen ? styles.statusOpen : isClosed ? styles.statusClosed : styles.statusInProgress),
            }}>
              {isOpen ? 'Open for Applications' : isClosed ? (isCompleted ? 'Completed' : isRefunded ? 'Refunded' : 'Closed') : c.status.replace(/_/g, ' ')}
            </span>
            {!isClosed && !deadlinePassed && (
              <span style={styles.deadline}>Deadline: {formatDate(c.deadline)}</span>
            )}
          </div>

          {/* Prize */}
          <div style={styles.prizeSection}>
            <span style={styles.prizeLabel}>PRIZE</span>
            <span style={styles.prizeAmount}>{formatCurrency(c.prize_amount)}</span>
          </div>

          {/* Title */}
          <h1 style={styles.title}>{c.title}</h1>
          <p style={styles.brandLine}>by {brandName}</p>

          {/* Description */}
          <p style={styles.description}>{c.description}</p>

          {/* Metrics Grid */}
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>METRIC</span>
              <span style={styles.metricValue}>{c.metric_type}</span>
            </div>
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>BASELINE TO BEAT</span>
              <span style={styles.metricValue}>{c.baseline_value}{c.metric_unit}</span>
            </div>
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>TRAFFIC COMMITMENT</span>
              <span style={styles.metricValue}>
                {c.traffic_commitment_sessions?.toLocaleString() ?? '5,000'} sessions / {c.traffic_commitment_days ?? 14} days
              </span>
            </div>
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>APPLICANTS</span>
              <span style={styles.metricValue}>{applicationCount || 0}</span>
            </div>
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>MAX FINALISTS</span>
              <span style={styles.metricValue}>{Math.min(c.max_finalists, 3)}</span>
            </div>
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>FINALIST FLOOR</span>
              <span style={styles.metricValue}>${c.finalist_floor_payout ?? 500}</span>
            </div>
          </div>

          {/* Winner / Result */}
          {isCompleted && (
            <div style={styles.resultBox}>
              <span style={styles.resultLabel}>WINNER</span>
              <span style={styles.resultWinner}>{winnerName}</span>
              {c.verified_result !== null && (
                <span style={styles.resultDetail}>
                  Verified: {c.verified_result}{c.metric_unit} (baseline: {c.baseline_value}{c.metric_unit})
                </span>
              )}
            </div>
          )}

          {isRefunded && (
            <div style={{ ...styles.resultBox, borderColor: 'var(--border-primary)' }}>
              <span style={styles.refundedText}>
                Challenge refunded — nobody beat the baseline.
              </span>
            </div>
          )}

          {/* CTA */}
          <div style={styles.ctaSection}>
            {isOpen && !deadlinePassed ? (
              <Link href={`/challenges/${id}/apply`} style={styles.ctaButton}>
                Apply to This Challenge
              </Link>
            ) : isClosed ? (
              <Link href="/challenges" style={styles.ctaButtonSecondary}>
                Browse Open Challenges
              </Link>
            ) : (
              <div style={styles.inProgressNote}>
                <span style={styles.inProgressText}>
                  This challenge is in progress — {c.status.replace(/_/g, ' ')}.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            Beat My Funnel is a performance marketplace where operators compete to beat real metrics.{' '}
            <Link href="/" style={styles.footerLink}>Learn more</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0b',
    display: 'flex',
    justifyContent: 'center',
    padding: '0 24px',
  },
  container: {
    maxWidth: '640px',
    width: '100%',
    padding: '40px 0 60px',
  },
  nav: {
    marginBottom: '40px',
  },
  logo: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#e0e0e0',
    textDecoration: 'none',
    letterSpacing: '-0.02em',
  },
  heroCard: {
    background: '#111113',
    border: '1px solid #1e1e22',
    borderRadius: '16px',
    padding: '40px',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '32px',
  },
  statusPill: {
    display: 'inline-block',
    padding: '4px 14px',
    fontSize: '12px',
    fontWeight: 600,
    borderRadius: '9999px',
    textTransform: 'capitalize' as const,
    letterSpacing: '0.02em',
  },
  statusOpen: {
    background: 'rgba(138, 143, 255, 0.15)',
    color: '#8a8fff',
  },
  statusClosed: {
    background: 'rgba(110, 114, 121, 0.15)',
    color: '#6e7279',
  },
  statusInProgress: {
    background: 'rgba(255, 200, 55, 0.15)',
    color: '#ffc837',
  },
  deadline: {
    fontSize: '13px',
    color: '#6e7279',
  },
  prizeSection: {
    marginBottom: '24px',
  },
  prizeLabel: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: '#6e7279',
    letterSpacing: '0.1em',
    marginBottom: '4px',
  },
  prizeAmount: {
    fontSize: '48px',
    fontWeight: 700,
    color: '#8a8fff',
    letterSpacing: '-0.03em',
    lineHeight: 1.1,
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#f0f0f0',
    letterSpacing: '-0.02em',
    lineHeight: 1.3,
    marginBottom: '6px',
  },
  brandLine: {
    fontSize: '14px',
    color: '#6e7279',
    marginBottom: '24px',
  },
  description: {
    fontSize: '15px',
    color: '#a0a0a8',
    lineHeight: 1.7,
    marginBottom: '32px',
    whiteSpace: 'pre-wrap' as const,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '32px',
  },
  metricCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    padding: '16px',
    background: '#0a0a0b',
    borderRadius: '10px',
    border: '1px solid #1e1e22',
  },
  metricLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#555',
    letterSpacing: '0.1em',
  },
  metricValue: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#e0e0e0',
  },
  resultBox: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    padding: '20px',
    marginBottom: '32px',
    background: 'rgba(46, 213, 115, 0.05)',
    border: '1px solid rgba(46, 213, 115, 0.2)',
    borderRadius: '12px',
  },
  resultLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#6e7279',
    letterSpacing: '0.1em',
  },
  resultWinner: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#2ed573',
  },
  resultDetail: {
    fontSize: '14px',
    color: '#a0a0a8',
  },
  refundedText: {
    fontSize: '14px',
    color: '#6e7279',
    fontWeight: 500,
  },
  ctaSection: {
    paddingTop: '8px',
  },
  ctaButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '52px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#0a0a0b',
    background: '#f0f0f0',
    borderRadius: '10px',
    textDecoration: 'none',
    letterSpacing: '-0.01em',
    cursor: 'pointer',
  },
  ctaButtonSecondary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '52px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#a0a0a8',
    background: 'transparent',
    border: '1px solid #1e1e22',
    borderRadius: '10px',
    textDecoration: 'none',
    letterSpacing: '-0.01em',
    cursor: 'pointer',
  },
  inProgressNote: {
    padding: '16px 20px',
    background: '#0a0a0b',
    border: '1px solid #1e1e22',
    borderRadius: '10px',
    textAlign: 'center' as const,
  },
  inProgressText: {
    fontSize: '14px',
    color: '#6e7279',
    fontWeight: 500,
    textTransform: 'capitalize' as const,
  },
  footer: {
    marginTop: '40px',
    textAlign: 'center' as const,
  },
  footerText: {
    fontSize: '13px',
    color: '#555',
    lineHeight: 1.6,
  },
  footerLink: {
    color: '#8a8fff',
    textDecoration: 'none',
  },
}
