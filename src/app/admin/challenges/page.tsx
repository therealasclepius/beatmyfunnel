'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
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

interface ChallengeWithDetails extends Challenge {
  profiles: Pick<Profile, 'display_name' | 'company_name'>
  application_count: number
  submission_count: number
}

const FILTER_TABS: { label: string; value: ChallengeStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Testing', value: 'testing' },
  { label: 'Verifying', value: 'verifying' },
  { label: 'Completed', value: 'completed' },
]

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState<ChallengeWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ChallengeStatus | 'all'>('all')

  const loadData = useCallback(async () => {
    const supabase = createClient()

    const { data: challengeData } = await supabase
      .from('challenges')
      .select('*, profiles:brand_id(display_name, company_name)')
      .order('created_at', { ascending: false })

    const allChallenges = (challengeData || []) as unknown as (Challenge & { profiles: Pick<Profile, 'display_name' | 'company_name'> })[]

    // Get application counts
    const { data: appCounts } = await supabase
      .from('applications')
      .select('challenge_id')

    const appCountMap: Record<string, number> = {}
    ;(appCounts || []).forEach((a: { challenge_id: string }) => {
      appCountMap[a.challenge_id] = (appCountMap[a.challenge_id] || 0) + 1
    })

    // Get submission counts
    const { data: subCounts } = await supabase
      .from('submissions')
      .select('challenge_id')

    const subCountMap: Record<string, number> = {}
    ;(subCounts || []).forEach((s: { challenge_id: string }) => {
      subCountMap[s.challenge_id] = (subCountMap[s.challenge_id] || 0) + 1
    })

    const enriched: ChallengeWithDetails[] = allChallenges.map((c) => ({
      ...c,
      application_count: appCountMap[c.id] || 0,
      submission_count: subCountMap[c.id] || 0,
    }))

    setChallenges(enriched)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filtered = filter === 'all'
    ? challenges
    : challenges.filter((c) => c.status === filter)

  if (loading) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div>
      <h1 style={styles.pageTitle}>All Challenges</h1>

      {/* Filter Tabs */}
      <div className="admin-tabs" style={styles.tabs}>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            style={{
              ...styles.tab,
              ...(filter === tab.value ? styles.tabActive : {}),
            }}
          >
            {tab.label}
            {tab.value !== 'all' && (
              <span style={styles.tabCount}>
                {challenges.filter((c) => c.status === tab.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="admin-table-wrapper" style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Title</th>
              <th style={styles.th}>Brand</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Prize</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Apps</th>
              <th style={styles.th}>Subs</th>
              <th style={styles.th}>Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((challenge) => (
              <tr key={challenge.id} style={styles.tr}>
                <td style={styles.td}>
                  <Link href={`/admin/challenges/${challenge.id}`} style={styles.challengeLink}>
                    {challenge.title}
                  </Link>
                </td>
                <td style={{ ...styles.td, color: 'var(--text-secondary)' }}>
                  {challenge.profiles?.company_name || challenge.profiles?.display_name || 'Unknown'}
                </td>
                <td style={{ ...styles.td, color: 'var(--text-tertiary)' }}>
                  {challenge.challenge_type.replace(/_/g, ' ')}
                </td>
                <td style={{ ...styles.td, color: 'var(--text-secondary)' }}>
                  {formatCurrency(challenge.prize_amount)}
                </td>
                <td style={styles.td}>
                  <StatusBadge status={challenge.status} variant="challenge" />
                </td>
                <td style={{ ...styles.td, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                  {challenge.application_count}
                </td>
                <td style={{ ...styles.td, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                  {challenge.submission_count}
                </td>
                <td style={{ ...styles.td, color: 'var(--text-tertiary)' }}>
                  {formatDate(challenge.created_at)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ ...styles.td, textAlign: 'center', color: 'var(--text-tertiary)', padding: '40px 16px' }}>
                  No challenges found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
  tabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '20px',
    background: 'var(--bg-secondary)',
    padding: '4px',
    borderRadius: '10px',
    width: 'fit-content',
  },
  tab: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-tertiary)',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  tabActive: {
    color: 'var(--text-primary)',
    background: 'var(--bg-card)',
  },
  tabCount: {
    fontSize: '11px',
    color: 'var(--text-quaternary)',
    background: 'var(--bg-primary)',
    padding: '1px 6px',
    borderRadius: '4px',
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
