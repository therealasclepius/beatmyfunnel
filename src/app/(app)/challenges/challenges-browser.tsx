'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import StatusBadge from '@/components/status-badge'
import type { Challenge, ChallengeType } from '@/types/database'

interface ChallengesBrowserProps {
  challenges: Challenge[]
  brandMap: Record<string, string>
  countMap: Record<string, number>
}

type TypeFilter = 'all' | ChallengeType
type PrizeFilter = 'all' | '5k-10k' | '10k-25k' | '25k+'
type SortOption = 'newest' | 'prize_desc' | 'deadline_soonest'

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100)

const getDaysRemaining = (deadline: string) => {
  const now = new Date()
  const dl = new Date(deadline)
  const diff = dl.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return days
}

const formatDeadline = (deadline: string) => {
  const days = getDaysRemaining(deadline)
  if (days < 0) return 'Ended'
  if (days === 0) return 'Today'
  if (days === 1) return '1 day left'
  if (days <= 30) return `${days} days left`
  return new Date(deadline).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

const formatChallengeType = (type: ChallengeType) => {
  switch (type) {
    case 'landing_page': return 'Landing Page'
    case 'email_flow': return 'Email Flow'
    default: return type
  }
}

export default function ChallengesBrowser({ challenges, brandMap, countMap }: ChallengesBrowserProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [prizeFilter, setPrizeFilter] = useState<PrizeFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')

  const filtered = useMemo(() => {
    let result = [...challenges]

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter((c) => c.challenge_type === typeFilter)
    }

    // Prize filter (prize_amount is in cents)
    if (prizeFilter === '5k-10k') {
      result = result.filter((c) => c.prize_amount >= 500000 && c.prize_amount < 1000000)
    } else if (prizeFilter === '10k-25k') {
      result = result.filter((c) => c.prize_amount >= 1000000 && c.prize_amount < 2500000)
    } else if (prizeFilter === '25k+') {
      result = result.filter((c) => c.prize_amount >= 2500000)
    }

    // Sort
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (sortBy === 'prize_desc') {
      result.sort((a, b) => b.prize_amount - a.prize_amount)
    } else if (sortBy === 'deadline_soonest') {
      result.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    }

    return result
  }, [challenges, typeFilter, prizeFilter, sortBy])

  return (
    <div>
      <style>{`
        .challenges-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          align-items: stretch;
        }
        .challenges-grid > a {
          height: 100%;
        }
        @media (max-width: 768px) {
          .challenges-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .filter-bar-inner {
            flex-direction: column;
            align-items: flex-start !important;
          }
        }
        .challenge-card:hover {
          border-color: rgba(138, 143, 255, 0.3) !important;
          box-shadow: 0 0 0 1px rgba(138, 143, 255, 0.1);
        }
        .filter-pill:hover {
          border-color: rgba(138, 143, 255, 0.3) !important;
          color: var(--text-secondary) !important;
        }
      `}</style>
      {/* Page header */}
      <div style={styles.pageHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={styles.pageTitle}>Challenges</h1>
            <p style={styles.pageDesc}>
              Browse open challenges and apply to compete.
            </p>
          </div>
          <Link href="/challenges/new" style={styles.postButton}>
            + Post a Challenge
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div style={styles.filterBar} className="filter-bar-inner filter-bar-mobile">
        {/* Type filter */}
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Type</span>
          <div className="filter-pill-group" style={styles.pillGroup}>
            {([['all', 'All'], ['landing_page', 'Landing Page'], ['email_flow', 'Email'], ['price_testing', 'Pricing'], ['offer_strategy', 'Offers'], ['checkout_flow', 'Checkout'], ['product_page', 'Product Page'], ['shipping_strategy', 'Shipping'], ['homepage', 'Homepage'], ['ad_creative', 'Ads']] as const).map(([value, label]) => (
              <button
                key={value}
                className="filter-pill"
                onClick={() => setTypeFilter(value)}
                style={{
                  ...styles.pill,
                  ...(typeFilter === value ? styles.pillActive : {}),
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Prize filter */}
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Prize</span>
          <div className="filter-pill-group" style={styles.pillGroup}>
            {([['all', 'All'], ['5k-10k', '$5K\u2013$10K'], ['10k-25k', '$10K\u2013$25K'], ['25k+', '$25K+']] as const).map(([value, label]) => (
              <button
                key={value}
                className="filter-pill"
                onClick={() => setPrizeFilter(value)}
                style={{
                  ...styles.pill,
                  ...(prizeFilter === value ? styles.pillActive : {}),
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Sort by</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            style={styles.sortSelect}
          >
            <option value="newest">Newest</option>
            <option value="prize_desc">Prize (High to Low)</option>
            <option value="deadline_soonest">Deadline (Soonest)</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <p style={styles.emptyTitle}>No challenges match your filters</p>
          <p style={styles.emptyDesc}>
            Try broadening your search.
          </p>
          <button
            onClick={() => { setTypeFilter('all'); setPrizeFilter('all'); setSortBy('newest') }}
            style={styles.resetButton}
          >
            Reset filters
          </button>
        </div>
      ) : (
        <>
          <p style={styles.resultCount}>
            {filtered.length} {filtered.length === 1 ? 'challenge' : 'challenges'}
          </p>
          <div className="challenges-grid">
            {filtered.map((challenge) => {
              const days = getDaysRemaining(challenge.deadline)
              const isUrgent = days >= 0 && days <= 7
              const applicants = countMap[challenge.id] || 0
              const brand = brandMap[challenge.brand_id]

              return (
                <Link
                  key={challenge.id}
                  href={`/challenges/${challenge.id}`}
                  className="challenge-card"
                  style={styles.card}
                >
                  {/* Top row: status + type tag */}
                  <div style={styles.cardTop}>
                    <StatusBadge status={challenge.status} variant="challenge" />
                    <span style={styles.typeTag}>
                      {formatChallengeType(challenge.challenge_type)}
                    </span>
                  </div>

                  {/* Prize */}
                  <div style={styles.prizeAmount}>
                    {formatCurrency(challenge.prize_amount)}
                  </div>

                  {/* Title */}
                  <h3 style={styles.cardTitle}>{challenge.title}</h3>

                  {/* Brand tag */}
                  {brand && (
                    <span style={styles.brandTag}>
                      {brand}
                    </span>
                  )}

                  {/* Divider */}
                  <div style={styles.divider} />

                  {/* Metrics row */}
                  <div style={styles.metricsRow}>
                    <div style={styles.metricItem}>
                      <span style={styles.metricLabel}>Metric</span>
                      <span style={styles.metricValue}>{challenge.metric_type}</span>
                    </div>
                    <div style={styles.metricItem}>
                      <span style={styles.metricLabel}>Baseline</span>
                      <span style={styles.metricValue}>
                        {challenge.baseline_value}
                        {challenge.metric_unit ? ` ${challenge.metric_unit}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Footer row */}
                  <div style={styles.cardFooter}>
                    <div style={styles.footerItem}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span style={{
                        ...styles.footerText,
                        color: isUrgent ? '#eb5757' : 'var(--text-tertiary)',
                        fontWeight: isUrgent ? 600 : 400,
                      }}>
                        {formatDeadline(challenge.deadline)}
                      </span>
                    </div>
                    <div style={styles.footerItem}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      <span style={styles.footerText}>
                        {applicants} {applicants === 1 ? 'applicant' : 'applicants'}
                      </span>
                    </div>
                  </div>

                  {/* Traffic commitment */}
                  {(challenge.traffic_commitment_sessions > 0 || challenge.traffic_commitment_days > 0) && (
                    <div style={styles.trafficInfo}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, flexShrink: 0 }}>
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                      <span>
                        {challenge.traffic_commitment_sessions.toLocaleString()} sessions over {challenge.traffic_commitment_days} days
                      </span>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  /* Page header */
  pageHeader: {
    marginBottom: '24px',
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
  postButton: {
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
  },

  /* Filter bar */
  filterBar: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '20px',
    alignItems: 'center',
    padding: '16px 20px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '12px',
    marginBottom: '20px',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-quaternary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap' as const,
  },
  pillGroup: {
    display: 'flex',
    gap: '4px',
  },
  pill: {
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: 500,
    borderRadius: '9999px',
    border: '1px solid var(--border-primary)',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
  },
  pillActive: {
    background: 'rgba(138, 143, 255, 0.15)',
    borderColor: 'rgba(138, 143, 255, 0.3)',
    color: '#8a8fff',
  },
  sortSelect: {
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: 500,
    borderRadius: '8px',
    border: '1px solid var(--border-primary)',
    background: 'var(--bg-primary)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    outline: 'none',
  },

  /* Results */
  resultCount: {
    fontSize: '13px',
    color: 'var(--text-quaternary)',
    marginBottom: '12px',
  },

  /* Card */
  card: {
    display: 'flex',
    flexDirection: 'column' as const,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '12px',
    padding: '24px',
    textDecoration: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    cursor: 'pointer',
    minWidth: 0,
    overflow: 'hidden',
    height: '100%',
    boxSizing: 'border-box' as const,
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
    marginBottom: '16px',
  },
  typeTag: {
    fontSize: '10px',
    fontWeight: 500,
    color: 'var(--text-quaternary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    padding: '3px 8px',
    borderRadius: '6px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border-primary)',
    whiteSpace: 'nowrap' as const,
  },
  prizeAmount: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--accent)',
    letterSpacing: '-0.03em',
    lineHeight: 1.1,
    marginBottom: '8px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    lineHeight: 1.4,
    marginBottom: '8px',
  },
  brandTag: {
    display: 'inline-block',
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-tertiary)',
    padding: '2px 10px',
    borderRadius: '6px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border-primary)',
    alignSelf: 'flex-start',
    marginBottom: '4px',
  },
  divider: {
    height: '1px',
    background: 'var(--border-primary)',
    margin: '16px 0',
  },
  metricsRow: {
    display: 'flex',
    gap: '24px',
    marginBottom: '16px',
  },
  metricItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  metricLabel: {
    fontSize: '11px',
    color: 'var(--text-quaternary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    fontWeight: 500,
  },
  metricValue: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  footerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  footerText: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
  },
  trafficInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: 'var(--text-quaternary)',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid var(--border-primary)',
  },

  /* Empty state */
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 24px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '12px',
    textAlign: 'center' as const,
    gap: '12px',
  },
  emptyIcon: {
    color: 'var(--text-quaternary)',
    marginBottom: '4px',
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
  resetButton: {
    marginTop: '8px',
    padding: '8px 20px',
    fontSize: '13px',
    fontWeight: 500,
    borderRadius: '8px',
    border: '1px solid var(--border-primary)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
}
