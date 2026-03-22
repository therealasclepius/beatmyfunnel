'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/status-badge'
import type { Challenge, Application, Profile, Submission } from '@/types/database'

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

interface ApplicationWithProfile extends Application {
  profiles: Pick<Profile, 'display_name'>
}

interface SubmissionWithProfile extends Submission {
  profiles: Pick<Profile, 'display_name'>
}

export default function ManageChallengePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [applications, setApplications] = useState<ApplicationWithProfile[]>([])
  const [submissions, setSubmissions] = useState<SubmissionWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedApp, setExpandedApp] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { data: challengeData } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', id)
      .single()

    if (!challengeData || (challengeData as Challenge).brand_id !== user.id) {
      router.push('/dashboard')
      return
    }

    setChallenge(challengeData as Challenge)

    const { data: appsData } = await supabase
      .from('applications')
      .select('*, profiles:operator_id(display_name)')
      .eq('challenge_id', id)
      .order('created_at', { ascending: false })

    setApplications((appsData || []) as unknown as ApplicationWithProfile[])

    const { data: subsData } = await supabase
      .from('submissions')
      .select('*, profiles:operator_id(display_name)')
      .eq('challenge_id', id)
      .order('created_at', { ascending: false })

    setSubmissions((subsData || []) as unknown as SubmissionWithProfile[])
    setLoading(false)
  }, [id, router])

  useEffect(() => {
    loadData()
  }, [loadData])

  const updateApplicationStatus = async (applicationId: string, status: 'finalist' | 'rejected') => {
    setUpdating(applicationId)
    const supabase = createClient()

    await supabase
      .from('applications')
      .update({ status })
      .eq('id', applicationId)

    await loadData()
    setUpdating(null)
  }

  if (loading || !challenge) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

  const finalistCount = applications.filter((a) => a.status === 'finalist').length

  return (
    <div style={styles.wrapper}>
      <Link href="/dashboard" style={styles.backLink}>
        &larr; Back to Dashboard
      </Link>

      {/* Challenge Overview */}
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>{challenge.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
              <StatusBadge status={challenge.status} variant="challenge" />
              <span style={styles.metaText}>{formatCurrency(challenge.prize_amount)} prize</span>
              <span style={styles.metaText}>Deadline: {formatDate(challenge.deadline)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Applications */}
      <div style={{ marginTop: '24px' }}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Applications</h2>
          <span style={styles.finalistCount}>
            {finalistCount}/{challenge.max_finalists} finalists selected
          </span>
        </div>

        {applications.length === 0 ? (
          <div style={styles.emptyCard}>
            <p style={styles.emptyText}>No applications yet.</p>
          </div>
        ) : (
          <div style={styles.list}>
            {applications.map((app) => (
              <div key={app.id} style={styles.appCard}>
                <div
                  style={styles.appHeader}
                  onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                >
                  <div style={styles.appInfo}>
                    <span style={styles.appName}>{app.profiles?.display_name || 'Unknown'}</span>
                    <StatusBadge status={app.status} variant="application" />
                  </div>
                  <div style={styles.appActions}>
                    {app.status === 'pending' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            updateApplicationStatus(app.id, 'finalist')
                          }}
                          disabled={updating === app.id || finalistCount >= challenge.max_finalists}
                          style={styles.selectButton}
                        >
                          {updating === app.id ? '...' : 'Select as Finalist'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            updateApplicationStatus(app.id, 'rejected')
                          }}
                          disabled={updating === app.id}
                          style={styles.rejectButton}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <span style={styles.expandIcon}>
                      {expandedApp === app.id ? '\u25B2' : '\u25BC'}
                    </span>
                  </div>
                </div>

                {expandedApp === app.id && (
                  <div style={styles.appBody}>
                    <div style={styles.appField}>
                      <span style={styles.appFieldLabel}>Pitch</span>
                      <p style={styles.appFieldValue}>{app.pitch}</p>
                    </div>
                    {app.background && (
                      <div style={styles.appField}>
                        <span style={styles.appFieldLabel}>Background</span>
                        <p style={styles.appFieldValue}>{app.background}</p>
                      </div>
                    )}
                    {app.relevant_wins && (
                      <div style={styles.appField}>
                        <span style={styles.appFieldLabel}>Relevant Wins</span>
                        <p style={styles.appFieldValue}>{app.relevant_wins}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submissions */}
      {submissions.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h2 style={styles.sectionTitle}>Submissions</h2>
          <div style={{ ...styles.list, marginTop: '16px' }}>
            {submissions.map((sub) => (
              <div key={sub.id} style={styles.appCard}>
                <div style={styles.appHeader}>
                  <div style={styles.appInfo}>
                    <span style={styles.appName}>{sub.profiles?.display_name || 'Unknown'}</span>
                    <StatusBadge status={sub.status} variant="submission" />
                  </div>
                  {sub.claimed_value !== null && (
                    <span style={styles.claimedValue}>
                      Claimed: {sub.claimed_value}
                    </span>
                  )}
                </div>
                <div style={styles.appBody}>
                  <p style={styles.appFieldValue}>{sub.description}</p>
                  {sub.evidence_url && (
                    <a
                      href={sub.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.evidenceLink}
                    >
                      View Evidence
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    maxWidth: '800px',
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
    padding: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  metaText: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
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
  finalistCount: {
    fontSize: '14px',
    color: 'var(--accent)',
    fontWeight: 500,
  },
  emptyCard: {
    padding: '40px 24px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '12px',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  appCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  appHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    cursor: 'pointer',
  },
  appInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  appName: {
    fontSize: '15px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  appActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  selectButton: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--bg-primary)',
    background: 'var(--accent)',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  rejectButton: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#eb5757',
    background: 'rgba(235, 87, 87, 0.1)',
    border: '1px solid rgba(235, 87, 87, 0.2)',
    borderRadius: '6px',
    padding: '6px 14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  expandIcon: {
    fontSize: '10px',
    color: 'var(--text-quaternary)',
    marginLeft: '8px',
  },
  appBody: {
    padding: '0 20px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    borderTop: '1px solid var(--border-primary)',
    paddingTop: '16px',
  },
  appField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  appFieldLabel: {
    fontSize: '11px',
    color: 'var(--text-quaternary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 500,
  },
  appFieldValue: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap' as const,
  },
  claimedValue: {
    fontSize: '14px',
    color: 'var(--accent)',
    fontWeight: 500,
  },
  evidenceLink: {
    fontSize: '14px',
    color: 'var(--accent)',
    textDecoration: 'none',
    fontWeight: 500,
  },
}
