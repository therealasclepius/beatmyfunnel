'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/status-badge'
import type { Challenge, Application, Profile, Submission, ChallengeStatus } from '@/types/database'

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

const FLOW_STEPS: { status: ChallengeStatus; label: string }[] = [
  { status: 'draft', label: 'Draft' },
  { status: 'open', label: 'Open' },
  { status: 'accepting_submissions', label: 'Submissions' },
  { status: 'testing', label: 'Testing' },
  { status: 'verifying', label: 'Verifying' },
  { status: 'completed', label: 'Completed' },
]

function triggerEmail(type: string, data: Record<string, string>) {
  fetch('/api/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, data }),
  }).catch(() => {}) // Fire and forget
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
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({})
  const [savingFeedback, setSavingFeedback] = useState<string | null>(null)

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

    const subs = (subsData || []) as unknown as SubmissionWithProfile[]
    setSubmissions(subs)

    // Pre-populate feedback text
    const fb: Record<string, string> = {}
    subs.forEach((s) => {
      if (s.brand_feedback) fb[s.id] = s.brand_feedback
    })
    setFeedbackText((prev) => ({ ...prev, ...fb }))

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

    if (status === 'finalist' && challenge) {
      const app = applications.find((a) => a.id === applicationId)
      if (app) {
        triggerEmail('finalist_selected', { challengeId: challenge.id, operatorId: app.operator_id })
      }
    }

    await loadData()
    setUpdating(null)
  }

  const moveToAcceptingSubmissions = async () => {
    setUpdating('move-submissions')
    const supabase = createClient()

    await supabase
      .from('challenges')
      .update({ status: 'accepting_submissions' })
      .eq('id', id)

    await loadData()
    setUpdating(null)
  }

  const selectForTesting = async (submissionId: string) => {
    setUpdating(submissionId)
    const supabase = createClient()

    // Set the selected submission to selected_for_testing
    await supabase
      .from('submissions')
      .update({ status: 'selected_for_testing' })
      .eq('id', submissionId)

    // Set all other submissions to runner_up
    await supabase
      .from('submissions')
      .update({ status: 'runner_up' })
      .eq('challenge_id', id)
      .neq('id', submissionId)
      .in('status', ['submitted', 'pending'])

    // Move challenge to testing
    await supabase
      .from('challenges')
      .update({ status: 'testing' })
      .eq('id', id)

    if (challenge) {
      const submission = submissions.find((s) => s.id === submissionId)
      if (submission) {
        triggerEmail('selected_for_testing', { challengeId: challenge.id, operatorId: submission.operator_id })
      }
    }

    await loadData()
    setUpdating(null)
  }

  const saveFeedback = async (submissionId: string) => {
    setSavingFeedback(submissionId)
    const supabase = createClient()

    await supabase
      .from('submissions')
      .update({ brand_feedback: feedbackText[submissionId] || '' })
      .eq('id', submissionId)

    await loadData()
    setSavingFeedback(null)
  }

  if (loading || !challenge) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

  const finalistCount = applications.filter((a) => a.status === 'finalist').length
  const finalists = applications.filter((a) => a.status === 'finalist')
  const submittedSubs = submissions.filter((s) => s.status === 'submitted')
  const selectedSub = submissions.find((s) => s.status === 'selected_for_testing' || s.status === 'winner')
  const currentStepIndex = FLOW_STEPS.findIndex((s) => s.status === challenge.status)

  const effectiveMaxFinalists = Math.min(challenge.max_finalists, 3)
  const finalistFloorPayout = challenge.finalist_floor_payout ?? 500
  const finalistPool = effectiveMaxFinalists * finalistFloorPayout * 100 // in cents
  const platformFee = Math.round(challenge.prize_amount * 0.15) // 15% platform fee in cents
  const totalBrandCost = challenge.prize_amount + finalistPool + platformFee

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
              <span style={styles.metaText}>Max {effectiveMaxFinalists} finalists</span>
            </div>
          </div>
        </div>

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
                  ...styles.progressStep,
                  ...(isActive ? styles.progressStepActive : {}),
                  ...(isComplete ? styles.progressStepComplete : {}),
                  ...(isFuture ? styles.progressStepFuture : {}),
                }}
              >
                <div
                  style={{
                    ...styles.progressDot,
                    background: isComplete ? '#2ed573' : isActive ? 'var(--accent)' : 'var(--border-secondary)',
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
      </div>

      {/* Total Brand Cost Summary */}
      <div style={{ ...styles.card, marginTop: '16px' }}>
        <h2 style={{ ...styles.sectionTitle, fontSize: '15px', marginBottom: '12px' }}>Total Brand Cost</h2>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={styles.metaText}>Prize</span>
            <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>{formatCurrency(challenge.prize_amount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={styles.metaText}>Finalist pool ({effectiveMaxFinalists} x ${finalistFloorPayout})</span>
            <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>{formatCurrency(finalistPool)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={styles.metaText}>Platform fee (15%)</span>
            <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>{formatCurrency(platformFee)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-primary)', paddingTop: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>Total</span>
            <span style={{ fontSize: '14px', color: 'var(--accent)', fontWeight: 600 }}>{formatCurrency(totalBrandCost)}</span>
          </div>
        </div>
      </div>

      {/* Status: draft — Prompt to publish */}
      {challenge.status === 'draft' && (
        <div style={{ ...styles.statusSection, marginTop: '24px' }}>
          <div style={styles.statusCard}>
            <p style={styles.statusMessage}>This challenge is still a draft. Publish it to start accepting applications.</p>
            <button
              onClick={async () => {
                setUpdating('publish')
                const supabase = createClient()
                await supabase.from('challenges').update({ status: 'open' }).eq('id', id)
                await loadData()
                setUpdating(null)
              }}
              disabled={updating === 'publish'}
              style={styles.primaryButton}
            >
              {updating === 'publish' ? 'Publishing...' : 'Publish Challenge'}
            </button>
          </div>
        </div>
      )}

      {/* Status: open — Applications phase */}
      {challenge.status === 'open' && (
        <div style={{ marginTop: '24px' }}>
          <div style={styles.statusCard}>
            <p style={styles.statusMessage}>Applications are open. Waiting for operators to apply.</p>
          </div>

          <div style={{ marginTop: '24px' }}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Applications</h2>
              <span style={styles.finalistCount}>
                {finalistCount}/{effectiveMaxFinalists} finalists selected
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
                              disabled={updating === app.id || finalistCount >= effectiveMaxFinalists}
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

            {finalistCount >= 1 && (
              <button
                onClick={moveToAcceptingSubmissions}
                disabled={updating === 'move-submissions'}
                style={{ ...styles.primaryButton, marginTop: '20px', width: '100%' }}
              >
                {updating === 'move-submissions'
                  ? 'Moving...'
                  : `Close Applications & Move to Submissions (${finalistCount} finalist${finalistCount !== 1 ? 's' : ''})`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Status: accepting_submissions — Waiting for finalist submissions */}
      {challenge.status === 'accepting_submissions' && (
        <div style={{ marginTop: '24px' }}>
          <div style={styles.statusCard}>
            <p style={styles.statusMessage}>Waiting for finalist submissions.</p>
          </div>

          <div style={{ marginTop: '24px' }}>
            <h2 style={styles.sectionTitle}>Finalists</h2>
            <div style={{ ...styles.list, marginTop: '16px' }}>
              {finalists.map((app) => {
                const sub = submissions.find((s) => s.operator_id === app.operator_id)
                return (
                  <div key={app.id} style={styles.appCard}>
                    <div style={styles.appHeader}>
                      <div style={styles.appInfo}>
                        <span style={styles.appName}>{app.profiles?.display_name || 'Unknown'}</span>
                        {sub ? (
                          <StatusBadge status={sub.status} variant="submission" />
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-quaternary)' }}>Awaiting submission</span>
                        )}
                      </div>
                    </div>
                    {sub && (
                      <div style={styles.appBody}>
                        <p style={styles.appFieldValue}>{sub.description}</p>
                        {sub.evidence_url && (
                          <a href={sub.evidence_url} target="_blank" rel="noopener noreferrer" style={styles.evidenceLink}>
                            View Evidence
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Review submissions section */}
          {submittedSubs.length > 0 && (
            <div style={{ marginTop: '32px' }}>
              <h2 style={styles.sectionTitle}>Review Submissions</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px', marginBottom: '16px' }}>
                Select one submission to test live. All others will become runners-up.
              </p>
              <div style={styles.list}>
                {submittedSubs.map((sub) => (
                  <div key={sub.id} style={styles.appCard}>
                    <div style={styles.appHeader}>
                      <div style={styles.appInfo}>
                        <span style={styles.appName}>{sub.profiles?.display_name || 'Unknown'}</span>
                        <StatusBadge status={sub.status} variant="submission" />
                      </div>
                      <button
                        onClick={() => selectForTesting(sub.id)}
                        disabled={updating === sub.id}
                        style={styles.selectButton}
                      >
                        {updating === sub.id ? '...' : 'Select for Testing'}
                      </button>
                    </div>
                    <div style={styles.appBody}>
                      <p style={styles.appFieldValue}>{sub.description}</p>
                      {sub.evidence_url && (
                        <a href={sub.evidence_url} target="_blank" rel="noopener noreferrer" style={styles.evidenceLink}>
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
      )}

      {/* Status: testing — One submission selected for live testing */}
      {challenge.status === 'testing' && (
        <div style={{ marginTop: '24px' }}>
          <div style={styles.statusCard}>
            <p style={styles.statusMessage}>One submission selected for live testing. Admin will verify results.</p>
          </div>

          {selectedSub && (
            <div style={{ marginTop: '24px' }}>
              <h2 style={styles.sectionTitle}>Selected for Testing</h2>
              <div style={{ ...styles.appCard, marginTop: '16px', border: '2px solid var(--accent)' }}>
                <div style={styles.appHeader}>
                  <div style={styles.appInfo}>
                    <span style={styles.appName}>{selectedSub.profiles?.display_name || 'Unknown'}</span>
                    <StatusBadge status={selectedSub.status} variant="submission" />
                  </div>
                </div>
                <div style={styles.appBody}>
                  <p style={styles.appFieldValue}>{selectedSub.description}</p>
                  {selectedSub.evidence_url && (
                    <a href={selectedSub.evidence_url} target="_blank" rel="noopener noreferrer" style={styles.evidenceLink}>
                      View Evidence
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* All submissions with feedback */}
          <div style={{ marginTop: '32px' }}>
            <h2 style={styles.sectionTitle}>All Finalist Submissions</h2>
            <div style={{ ...styles.list, marginTop: '16px' }}>
              {submissions.map((sub) => (
                <div key={sub.id} style={styles.appCard}>
                  <div style={styles.appHeader}>
                    <div style={styles.appInfo}>
                      <span style={styles.appName}>{sub.profiles?.display_name || 'Unknown'}</span>
                      <StatusBadge status={sub.status} variant="submission" />
                    </div>
                  </div>
                  <div style={styles.appBody}>
                    <p style={styles.appFieldValue}>{sub.description}</p>
                    {sub.evidence_url && (
                      <a href={sub.evidence_url} target="_blank" rel="noopener noreferrer" style={styles.evidenceLink}>
                        View Evidence
                      </a>
                    )}
                    <div style={styles.feedbackSection}>
                      <label style={styles.appFieldLabel}>Brand Feedback</label>
                      <textarea
                        value={feedbackText[sub.id] || ''}
                        onChange={(e) => setFeedbackText((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                        placeholder="Leave feedback for this finalist..."
                        rows={3}
                        style={styles.feedbackTextarea}
                      />
                      <button
                        onClick={() => saveFeedback(sub.id)}
                        disabled={savingFeedback === sub.id}
                        style={styles.feedbackButton}
                      >
                        {savingFeedback === sub.id ? 'Saving...' : 'Save Feedback'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Status: verifying / completed / refunded — Show results */}
      {(challenge.status === 'verifying' || challenge.status === 'completed' || challenge.status === 'refunded') && (
        <div style={{ marginTop: '24px' }}>
          <div style={styles.statusCard}>
            <p style={styles.statusMessage}>
              {challenge.status === 'verifying' && 'Admin is verifying the test results.'}
              {challenge.status === 'completed' && 'Challenge completed! A winner has been selected.'}
              {challenge.status === 'refunded' && 'Challenge refunded. Nobody beat the baseline.'}
            </p>
          </div>

          {/* Results summary */}
          {(challenge.status === 'completed' || challenge.status === 'refunded') && (
            <div style={{ ...styles.card, marginTop: '24px' }}>
              <h2 style={styles.sectionTitle}>Results</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                <div style={styles.appField}>
                  <span style={styles.appFieldLabel}>Baseline</span>
                  <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {challenge.baseline_value}{challenge.metric_unit}
                  </span>
                </div>
                <div style={styles.appField}>
                  <span style={styles.appFieldLabel}>Verified Result</span>
                  <span style={{ fontSize: '20px', fontWeight: 600, color: challenge.verified_result && challenge.verified_result > challenge.baseline_value ? '#2ed573' : '#eb5757' }}>
                    {challenge.verified_result !== null ? `${challenge.verified_result}${challenge.metric_unit}` : 'Pending'}
                  </span>
                </div>
              </div>
              {challenge.admin_verification_notes && (
                <div style={{ marginTop: '16px' }}>
                  <span style={styles.appFieldLabel}>Admin Notes</span>
                  <p style={styles.appFieldValue}>{challenge.admin_verification_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* All submissions with feedback */}
          <div style={{ marginTop: '32px' }}>
            <h2 style={styles.sectionTitle}>All Finalist Submissions</h2>
            <div style={{ ...styles.list, marginTop: '16px' }}>
              {submissions.map((sub) => (
                <div key={sub.id} style={{
                  ...styles.appCard,
                  ...(sub.status === 'winner' ? { border: '2px solid #2ed573' } : {}),
                }}>
                  <div style={styles.appHeader}>
                    <div style={styles.appInfo}>
                      <span style={styles.appName}>{sub.profiles?.display_name || 'Unknown'}</span>
                      <StatusBadge status={sub.status} variant="submission" />
                    </div>
                  </div>
                  <div style={styles.appBody}>
                    <p style={styles.appFieldValue}>{sub.description}</p>
                    {sub.evidence_url && (
                      <a href={sub.evidence_url} target="_blank" rel="noopener noreferrer" style={styles.evidenceLink}>
                        View Evidence
                      </a>
                    )}
                    {sub.brand_feedback && (
                      <div style={styles.appField}>
                        <span style={styles.appFieldLabel}>Your Feedback</span>
                        <p style={styles.appFieldValue}>{sub.brand_feedback}</p>
                      </div>
                    )}
                    <div style={styles.feedbackSection}>
                      <label style={styles.appFieldLabel}>Brand Feedback</label>
                      <textarea
                        value={feedbackText[sub.id] || ''}
                        onChange={(e) => setFeedbackText((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                        placeholder="Leave feedback for this finalist..."
                        rows={3}
                        style={styles.feedbackTextarea}
                      />
                      <button
                        onClick={() => saveFeedback(sub.id)}
                        disabled={savingFeedback === sub.id}
                        style={styles.feedbackButton}
                      >
                        {savingFeedback === sub.id ? 'Saving...' : 'Save Feedback'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
  progressBar: {
    display: 'flex',
    gap: '4px',
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid var(--border-primary)',
  },
  progressStep: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
  progressStepActive: {},
  progressStepComplete: {},
  progressStepFuture: {},
  progressDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  statusSection: {},
  statusCard: {
    padding: '20px 24px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
  },
  statusMessage: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '40px',
    padding: '0 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--bg-primary)',
    background: 'var(--text-primary)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textDecoration: 'none',
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
  evidenceLink: {
    fontSize: '14px',
    color: 'var(--accent)',
    textDecoration: 'none',
    fontWeight: 500,
  },
  feedbackSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '8px',
    paddingTop: '12px',
    borderTop: '1px solid var(--border-primary)',
  },
  feedbackTextarea: {
    padding: '10px 14px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-secondary)',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
    lineHeight: 1.5,
  },
  feedbackButton: {
    alignSelf: 'flex-start',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-primary)',
    borderRadius: '6px',
    padding: '6px 14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
}
