'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/status-badge'
import type {
  Challenge,
  Application,
  Submission,
  Profile,
  ChallengeStatus,
  ApplicationStatus,
  SubmissionStatus,
} from '@/types/database'

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

const ALL_CHALLENGE_STATUSES: ChallengeStatus[] = [
  'draft', 'open', 'accepting_submissions', 'testing', 'verifying', 'completed', 'refunded', 'cancelled',
]

const ALL_APPLICATION_STATUSES: ApplicationStatus[] = [
  'pending', 'shortlisted', 'finalist', 'rejected',
]

const ALL_SUBMISSION_STATUSES: SubmissionStatus[] = [
  'pending', 'submitted', 'selected_for_testing', 'tested', 'winner', 'runner_up',
]

function triggerEmail(type: string, data: Record<string, string>) {
  fetch('/api/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, data }),
  }).catch(() => {}) // Fire and forget
}

export default function AdminChallengeDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [brandProfile, setBrandProfile] = useState<Profile | null>(null)
  const [applications, setApplications] = useState<ApplicationWithProfile[]>([])
  const [submissions, setSubmissions] = useState<SubmissionWithProfile[]>([])
  const [loading, setLoading] = useState(true)

  // Admin action state
  const [verifiedResult, setVerifiedResult] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusOverride, setStatusOverride] = useState<ChallengeStatus | ''>('')
  const [savingOverride, setSavingOverride] = useState(false)

  // Escrow state
  const [escrowStatus, setEscrowStatus] = useState<string | null>(null)
  const [escrowLoading, setEscrowLoading] = useState(false)
  const [escrowError, setEscrowError] = useState('')

  const loadData = useCallback(async () => {
    const supabase = createClient()

    const { data: challengeData } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', id)
      .single()

    if (!challengeData) {
      setLoading(false)
      return
    }

    const c = challengeData as Challenge
    setChallenge(c)
    setStatusOverride(c.status)
    if (c.admin_verification_notes) setAdminNotes(c.admin_verification_notes)
    if (c.verified_result !== null) setVerifiedResult(String(c.verified_result))

    // Fetch brand profile
    const { data: brandData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', c.brand_id)
      .single()

    setBrandProfile(brandData as Profile | null)

    // Applications
    const { data: appsData } = await supabase
      .from('applications')
      .select('*, profiles:operator_id(display_name)')
      .eq('challenge_id', id)
      .order('created_at', { ascending: false })

    setApplications((appsData || []) as unknown as ApplicationWithProfile[])

    // Submissions
    const { data: subsData } = await supabase
      .from('submissions')
      .select('*, profiles:operator_id(display_name)')
      .eq('challenge_id', id)
      .order('created_at', { ascending: false })

    setSubmissions((subsData || []) as unknown as SubmissionWithProfile[])
    setLoading(false)

    // Fetch escrow status if transaction exists
    if (c.escrow_transaction_id) {
      fetchEscrowStatus(c.id)
    }
  }, [id])

  const fetchEscrowStatus = async (challengeId: string) => {
    try {
      const res = await fetch('/api/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', challengeId }),
      })
      if (res.ok) {
        const data = await res.json()
        setEscrowStatus(data.status)
      }
    } catch {
      // Silently fail — escrow status is supplementary
    }
  }

  const createEscrow = async () => {
    if (!challenge) return
    setEscrowLoading(true)
    setEscrowError('')
    try {
      const res = await fetch('/api/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', challengeId: challenge.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEscrowError(data.error || 'Failed to create escrow')
      } else {
        setEscrowStatus(data.status)
        await loadData()
      }
    } catch {
      setEscrowError('Network error creating escrow')
    }
    setEscrowLoading(false)
  }

  const disburseEscrow = async () => {
    if (!challenge) return
    setEscrowLoading(true)
    setEscrowError('')
    try {
      const res = await fetch('/api/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disburse', challengeId: challenge.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEscrowError(data.error || 'Failed to disburse escrow')
      } else {
        setEscrowStatus(data.status)
        await loadData()
      }
    } catch {
      setEscrowError('Network error disbursing escrow')
    }
    setEscrowLoading(false)
  }

  const cancelEscrow = async () => {
    if (!challenge) return
    if (!confirm('Cancel escrow and refund the buyer?')) return
    setEscrowLoading(true)
    setEscrowError('')
    try {
      const res = await fetch('/api/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', challengeId: challenge.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEscrowError(data.error || 'Failed to cancel escrow')
      } else {
        setEscrowStatus(data.status)
        await loadData()
      }
    } catch {
      setEscrowError('Network error cancelling escrow')
    }
    setEscrowLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  const confirmWinner = async () => {
    if (!challenge) return
    setSaving(true)
    const supabase = createClient()

    const selectedSub = submissions.find(
      (s) => s.status === 'selected_for_testing' || s.status === 'tested'
    )
    if (!selectedSub) {
      alert('No submission selected for testing.')
      setSaving(false)
      return
    }

    const result = parseFloat(verifiedResult)
    if (isNaN(result)) {
      alert('Enter a valid number for verified result.')
      setSaving(false)
      return
    }

    // Update submission to winner
    await supabase
      .from('submissions')
      .update({
        status: 'winner' as SubmissionStatus,
        verified_value: result,
        admin_notes: adminNotes || null,
      })
      .eq('id', selectedSub.id)

    // Update challenge
    await supabase
      .from('challenges')
      .update({
        status: 'completed' as ChallengeStatus,
        verified_result: result,
        admin_verification_notes: adminNotes || null,
        winner_id: selectedSub.operator_id,
      })
      .eq('id', id)

    triggerEmail('winner_confirmed', { challengeId: id, winnerId: selectedSub.operator_id })

    // Disburse escrow funds to winner if escrow exists
    if (challenge.escrow_transaction_id) {
      try {
        await fetch('/api/escrow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'disburse', challengeId: id }),
        })
      } catch {
        // Non-blocking — admin can manually disburse later
        console.error('Failed to auto-disburse escrow on winner confirmation')
      }
    }

    await loadData()
    setSaving(false)
  }

  const refundChallenge = async () => {
    if (!challenge) return
    if (!confirm('Are you sure you want to refund this challenge? This will mark all submissions as runner_up.')) return
    setSaving(true)
    const supabase = createClient()

    // Mark all submissions as runner_up
    await supabase
      .from('submissions')
      .update({ status: 'runner_up' as SubmissionStatus })
      .eq('challenge_id', id)

    // Update challenge to refunded
    await supabase
      .from('challenges')
      .update({
        status: 'refunded' as ChallengeStatus,
        admin_verification_notes: adminNotes || null,
      })
      .eq('id', id)

    triggerEmail('refund', { challengeId: id })

    // Cancel escrow and refund buyer if escrow exists
    if (challenge.escrow_transaction_id) {
      try {
        await fetch('/api/escrow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cancel', challengeId: id }),
        })
      } catch {
        // Non-blocking — admin can manually cancel later
        console.error('Failed to auto-cancel escrow on refund')
      }
    }

    await loadData()
    setSaving(false)
  }

  const overrideChallengeStatus = async () => {
    if (!statusOverride || statusOverride === challenge?.status) return
    setSavingOverride(true)
    const supabase = createClient()

    await supabase
      .from('challenges')
      .update({ status: statusOverride })
      .eq('id', id)

    await loadData()
    setSavingOverride(false)
  }

  const updateApplicationStatus = async (appId: string, newStatus: ApplicationStatus) => {
    const supabase = createClient()
    await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', appId)
    await loadData()
  }

  const updateSubmissionStatus = async (subId: string, newStatus: SubmissionStatus) => {
    const supabase = createClient()
    await supabase
      .from('submissions')
      .update({ status: newStatus })
      .eq('id', subId)
    await loadData()
  }

  if (loading) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>Challenge not found.</p>
      </div>
    )
  }

  const currentStepIndex = FLOW_STEPS.findIndex((s) => s.status === challenge.status)
  const selectedSub = submissions.find(
    (s) => s.status === 'selected_for_testing' || s.status === 'tested' || s.status === 'winner'
  )
  const isActionable = challenge.status === 'testing' || challenge.status === 'verifying'
  const isReadOnly = challenge.status === 'completed' || challenge.status === 'refunded'

  return (
    <div style={styles.wrapper}>
      <Link href="/admin/challenges" style={styles.backLink}>
        &larr; Back to Challenges
      </Link>

      {/* Challenge Header */}
      <div className="detail-card" style={styles.card}>
        <div className="manage-header" style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>{challenge.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
              <StatusBadge status={challenge.status} variant="challenge" />
              <span style={styles.meta}>{formatCurrency(challenge.prize_amount)} prize</span>
              <span style={styles.meta}>Deadline: {formatDate(challenge.deadline)}</span>
              <span style={styles.meta}>Type: {challenge.challenge_type.replace(/_/g, ' ')}</span>
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
              <div key={step.status} style={styles.progressStep}>
                <div
                  style={{
                    ...styles.progressDot,
                    background: isComplete ? '#2ed573' : isActive ? 'var(--accent)' : 'var(--border-secondary)',
                  }}
                />
                <span className="progress-step-label" style={{
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

        {/* Challenge Details */}
        <div className="detail-grid" style={styles.detailsGrid}>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Brand</span>
            <span style={styles.detailValue}>
              {brandProfile?.company_name || brandProfile?.display_name || 'Unknown'}
            </span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Metric</span>
            <span style={styles.detailValue}>{challenge.metric_type}</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Baseline</span>
            <span style={styles.detailValue}>{challenge.baseline_value}{challenge.metric_unit}</span>
          </div>
          <div style={styles.detailItem}>
            <span style={styles.detailLabel}>Max Finalists</span>
            <span style={styles.detailValue}>{challenge.max_finalists}</span>
          </div>
        </div>

        {challenge.description && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-primary)' }}>
            <span style={styles.detailLabel}>Description</span>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '4px', whiteSpace: 'pre-wrap' }}>
              {challenge.description}
            </p>
          </div>
        )}
      </div>

      {/* Admin Actions for testing/verifying */}
      {isActionable && (
        <div style={{ ...styles.card, marginTop: '24px', border: '1px solid var(--accent)' }}>
          <h2 style={styles.sectionTitle}>Admin Verification</h2>

          {selectedSub && (
            <div style={{ marginTop: '16px', padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  Submission being tested: {selectedSub.profiles?.display_name || 'Unknown'}
                </span>
                <StatusBadge status={selectedSub.status} variant="submission" />
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {selectedSub.description}
              </p>
              {selectedSub.evidence_url && (
                <a href={selectedSub.evidence_url} target="_blank" rel="noopener noreferrer" style={styles.evidenceLink}>
                  View Evidence
                </a>
              )}
            </div>
          )}

          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={styles.formLabel}>Verified Result</label>
              <input
                type="number"
                value={verifiedResult}
                onChange={(e) => setVerifiedResult(e.target.value)}
                placeholder={`Baseline: ${challenge.baseline_value}${challenge.metric_unit}`}
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.formLabel}>Admin Notes</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Notes about verification process..."
                rows={3}
                style={styles.textarea}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              <button onClick={confirmWinner} disabled={saving} style={styles.successButton}>
                {saving ? 'Saving...' : 'Confirm Winner'}
              </button>
              <button onClick={refundChallenge} disabled={saving} style={styles.dangerButton}>
                {saving ? 'Saving...' : 'No Winner — Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Read-only results for completed/refunded */}
      {isReadOnly && (
        <div style={{ ...styles.card, marginTop: '24px' }}>
          <h2 style={styles.sectionTitle}>
            {challenge.status === 'completed' ? 'Results' : 'Refund'}
          </h2>

          {challenge.status === 'completed' && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Baseline</span>
                  <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {challenge.baseline_value}{challenge.metric_unit}
                  </span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Verified Result</span>
                  <span style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    color: challenge.verified_result && challenge.verified_result > challenge.baseline_value ? '#2ed573' : '#eb5757',
                  }}>
                    {challenge.verified_result !== null ? `${challenge.verified_result}${challenge.metric_unit}` : 'N/A'}
                  </span>
                </div>
              </div>
              {challenge.winner_id && selectedSub && (
                <div style={{ marginTop: '12px' }}>
                  <span style={styles.detailLabel}>Winner</span>
                  <span style={{ fontSize: '14px', color: '#2ed573', fontWeight: 500, marginLeft: '8px' }}>
                    {selectedSub.profiles?.display_name || challenge.winner_id}
                  </span>
                </div>
              )}
            </div>
          )}

          {challenge.status === 'refunded' && (
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '12px' }}>
              This challenge was refunded. No winner was selected.
            </p>
          )}

          {challenge.admin_verification_notes && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-primary)' }}>
              <span style={styles.detailLabel}>Admin Notes</span>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '4px' }}>
                {challenge.admin_verification_notes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Status Override */}
      <div style={{ ...styles.card, marginTop: '24px' }}>
        <h2 style={styles.sectionTitle}>Override Challenge Status</h2>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', alignItems: 'center' }}>
          <select
            value={statusOverride}
            onChange={(e) => setStatusOverride(e.target.value as ChallengeStatus)}
            style={styles.select}
          >
            {ALL_CHALLENGE_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <button
            onClick={overrideChallengeStatus}
            disabled={savingOverride || statusOverride === challenge.status}
            style={{
              ...styles.ghostButton,
              opacity: statusOverride === challenge.status ? 0.4 : 1,
            }}
          >
            {savingOverride ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Escrow */}
      <div style={{ ...styles.card, marginTop: '24px' }}>
        <h2 style={styles.sectionTitle}>Escrow Payment</h2>

        {challenge.escrow_transaction_id ? (
          <div style={{ marginTop: '16px' }}>
            <div className="detail-grid" style={styles.detailsGrid}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Transaction ID</span>
                <span style={styles.detailValue}>{challenge.escrow_transaction_id}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Payment Status</span>
                <span style={styles.detailValue}>{challenge.payment_status || 'unknown'}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Escrow Status</span>
                <span style={styles.detailValue}>{escrowStatus || 'loading...'}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Amount</span>
                <span style={styles.detailValue}>{formatCurrency(challenge.prize_amount)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                onClick={disburseEscrow}
                disabled={escrowLoading}
                style={styles.successButton}
              >
                {escrowLoading ? 'Processing...' : 'Disburse Funds'}
              </button>
              <button
                onClick={cancelEscrow}
                disabled={escrowLoading}
                style={styles.dangerButton}
              >
                {escrowLoading ? 'Processing...' : 'Cancel & Refund'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '16px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
              No escrow transaction has been created for this challenge yet.
            </p>
            <button
              onClick={createEscrow}
              disabled={escrowLoading}
              style={styles.ghostButton}
            >
              {escrowLoading ? 'Creating...' : 'Create Escrow Transaction'}
            </button>
          </div>
        )}

        {escrowError && (
          <p style={{ fontSize: '13px', color: '#eb5757', marginTop: '12px' }}>
            {escrowError}
          </p>
        )}
      </div>

      {/* Applications */}
      <div style={{ marginTop: '32px' }}>
        <h2 style={styles.sectionTitle}>Applications ({applications.length})</h2>
        <div style={{ ...styles.tableWrapper, marginTop: '16px' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Operator</th>
                <th style={styles.th}>Pitch</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Applied</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {app.profiles?.display_name || 'Unknown'}
                  </td>
                  <td style={{ ...styles.td, color: 'var(--text-secondary)', maxWidth: '300px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {app.pitch}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <StatusBadge status={app.status} variant="application" />
                  </td>
                  <td style={{ ...styles.td, color: 'var(--text-tertiary)' }}>
                    {formatDate(app.created_at)}
                  </td>
                  <td style={styles.td}>
                    <select
                      value={app.status}
                      onChange={(e) => updateApplicationStatus(app.id, e.target.value as ApplicationStatus)}
                      style={styles.selectSmall}
                    >
                      {ALL_APPLICATION_STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ ...styles.td, textAlign: 'center', color: 'var(--text-tertiary)', padding: '32px 16px' }}>
                    No applications.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submissions */}
      <div style={{ marginTop: '32px' }}>
        <h2 style={styles.sectionTitle}>Submissions ({submissions.length})</h2>
        <div style={{ ...styles.tableWrapper, marginTop: '16px' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Operator</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Claimed</th>
                <th style={styles.th}>Verified</th>
                <th style={styles.th}>Evidence</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr key={sub.id} style={{
                  ...styles.tr,
                  ...(sub.status === 'winner' ? { background: 'rgba(46, 213, 115, 0.05)' } : {}),
                  ...(sub.status === 'selected_for_testing' ? { background: 'rgba(138, 143, 255, 0.05)' } : {}),
                }}>
                  <td style={{ ...styles.td, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {sub.profiles?.display_name || 'Unknown'}
                  </td>
                  <td style={{ ...styles.td, color: 'var(--text-secondary)', maxWidth: '250px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sub.description}
                    </div>
                  </td>
                  <td style={{ ...styles.td, color: 'var(--text-secondary)' }}>
                    {sub.claimed_value !== null ? `${sub.claimed_value}` : '—'}
                  </td>
                  <td style={{ ...styles.td, color: 'var(--text-secondary)' }}>
                    {sub.verified_value !== null ? `${sub.verified_value}` : '—'}
                  </td>
                  <td style={styles.td}>
                    {sub.evidence_url ? (
                      <a href={sub.evidence_url} target="_blank" rel="noopener noreferrer" style={styles.evidenceLink}>
                        View
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-quaternary)' }}>—</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <StatusBadge status={sub.status} variant="submission" />
                  </td>
                  <td style={styles.td}>
                    <select
                      value={sub.status}
                      onChange={(e) => updateSubmissionStatus(sub.id, e.target.value as SubmissionStatus)}
                      style={styles.selectSmall}
                    >
                      {ALL_SUBMISSION_STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: 'var(--text-tertiary)', padding: '32px 16px' }}>
                    No submissions.
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
  wrapper: {
    maxWidth: '1000px',
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
  headerRow: {
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
  meta: {
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
  progressDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid var(--border-primary)',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailLabel: {
    fontSize: '11px',
    color: 'var(--text-quaternary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 500,
  },
  detailValue: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    fontWeight: 500,
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  evidenceLink: {
    fontSize: '13px',
    color: 'var(--accent)',
    textDecoration: 'none',
    fontWeight: 500,
  },
  formLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-secondary)',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-secondary)',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
    lineHeight: 1.5,
    boxSizing: 'border-box',
  },
  successButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '40px',
    padding: '0 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    background: '#2ed573',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  dangerButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '40px',
    padding: '0 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#eb5757',
    background: 'rgba(235, 87, 87, 0.1)',
    border: '1px solid rgba(235, 87, 87, 0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  ghostButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '40px',
    padding: '0 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    background: 'transparent',
    border: '1px solid var(--border-primary)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  select: {
    padding: '10px 14px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-secondary)',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
    minWidth: '200px',
  },
  selectSmall: {
    padding: '4px 8px',
    fontSize: '12px',
    color: 'var(--text-primary)',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-secondary)',
    borderRadius: '6px',
    outline: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
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
}
