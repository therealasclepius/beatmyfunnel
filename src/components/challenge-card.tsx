import React from 'react'
import Link from 'next/link'
import StatusBadge from '@/components/status-badge'
import type { Challenge } from '@/types/database'

interface ChallengeCardProps {
  challenge: Challenge
  applicationCount?: number
  brandName?: string
}

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

export default function ChallengeCard({ challenge, applicationCount, brandName }: ChallengeCardProps) {
  return (
    <Link href={`/challenges/${challenge.id}`} style={styles.card}>
      <div style={styles.header}>
        <StatusBadge status={challenge.status} variant="challenge" />
        <span style={styles.prize}>{formatCurrency(challenge.prize_amount)}</span>
      </div>

      <h3 style={styles.title}>{challenge.title}</h3>

      {brandName && <p style={styles.brandName}>by {brandName}</p>}

      <div style={styles.meta}>
        <span style={styles.metaItem}>
          <span style={styles.metaLabel}>Metric</span>
          <span style={styles.metaValue}>{challenge.metric_type}</span>
        </span>
        <span style={styles.metaItem}>
          <span style={styles.metaLabel}>Baseline</span>
          <span style={styles.metaValue}>{challenge.baseline_value}</span>
        </span>
        <span style={styles.metaItem}>
          <span style={styles.metaLabel}>Deadline</span>
          <span style={styles.metaValue}>{formatDate(challenge.deadline)}</span>
        </span>
      </div>

      {applicationCount !== undefined && (
        <p style={styles.applications}>
          {applicationCount} {applicationCount === 1 ? 'applicant' : 'applicants'}
        </p>
      )}
    </Link>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: 'block',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '12px',
    padding: '20px',
    textDecoration: 'none',
    transition: 'border-color 0.15s',
    minWidth: 0,
    overflow: 'hidden',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  prize: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--accent)',
    letterSpacing: '-0.02em',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '4px',
    letterSpacing: '-0.02em',
    lineHeight: 1.4,
  },
  brandName: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    marginBottom: '16px',
  },
  meta: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginTop: '16px',
  },
  metaItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  metaLabel: {
    fontSize: '11px',
    color: 'var(--text-quaternary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 500,
  },
  metaValue: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  applications: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px solid var(--border-primary)',
  },
}
