'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Profile, ChallengeType } from '@/types/database'

const METRIC_OPTIONS: { label: string; value: string; challengeType: ChallengeType }[] = [
  { label: 'Landing Page CVR', value: 'Landing Page CVR', challengeType: 'landing_page' },
  { label: 'Email Open Rate', value: 'Email Open Rate', challengeType: 'email_flow' },
  { label: 'Email Click Rate', value: 'Email Click Rate', challengeType: 'email_flow' },
]

export default function NewChallengePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [checkingRole, setCheckingRole] = useState(true)
  const [savedId, setSavedId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [metricType, setMetricType] = useState('')
  const [challengeType, setChallengeType] = useState<ChallengeType>('landing_page')
  const [metricUnit, setMetricUnit] = useState('%')
  const [baselineValue, setBaselineValue] = useState('')
  const [prizeAmount, setPrizeAmount] = useState('')
  const [maxFinalists, setMaxFinalists] = useState('5')
  const [deadline, setDeadline] = useState('')

  useEffect(() => {
    const checkRole = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const userRole = (profile as Pick<Profile, 'role'>)?.role
      if (!profile || (userRole !== 'brand' && userRole !== 'admin')) {
        router.push('/dashboard')
        return
      }
      setCheckingRole(false)
    }
    checkRole()
  }, [router])

  const handleMetricChange = (value: string) => {
    setMetricType(value)
    const option = METRIC_OPTIONS.find((o) => o.value === value)
    if (option) {
      setChallengeType(option.challengeType)
    }
  }

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    const prizeInCents = Math.round(parseFloat(prizeAmount) * 100)
    if (isNaN(prizeInCents) || prizeInCents <= 0) {
      setError('Prize amount must be greater than $0.')
      return
    }

    const deadlineDate = new Date(deadline)
    if (deadlineDate <= new Date()) {
      setError('Deadline must be in the future.')
      return
    }

    const baseline = parseFloat(baselineValue)
    if (isNaN(baseline)) {
      setError('Baseline value must be a number.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('You must be logged in.')
      setLoading(false)
      return
    }

    const { data, error: insertError } = await supabase
      .from('challenges')
      .insert({
        brand_id: user.id,
        title,
        description,
        metric_type: metricType,
        baseline_value: baseline,
        prize_amount: prizeInCents,
        max_finalists: parseInt(maxFinalists, 10),
        deadline: deadline,
        metric_unit: metricUnit,
        challenge_type: challengeType,
      })
      .select('id')
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setSavedId(data.id)
    setLoading(false)
  }

  const handlePublish = async () => {
    if (!savedId) return
    setPublishing(true)
    setError('')

    const supabase = createClient()

    const { error: updateError } = await supabase
      .from('challenges')
      .update({ status: 'open' })
      .eq('id', savedId)

    if (updateError) {
      setError(updateError.message)
      setPublishing(false)
      return
    }

    router.push(`/challenges/${savedId}/manage`)
  }

  if (checkingRole) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

  if (savedId) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.card}>
          <h1 style={styles.title}>Challenge Saved as Draft</h1>
          <p style={styles.subtitle}>
            Your challenge has been saved. Publish it to start accepting applications from operators.
          </p>

          <div style={styles.draftSummary}>
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Title</span>
              <span style={styles.summaryValue}>{title}</span>
            </div>
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Metric</span>
              <span style={styles.summaryValue}>{metricType} ({metricUnit})</span>
            </div>
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Baseline</span>
              <span style={styles.summaryValue}>{baselineValue}{metricUnit}</span>
            </div>
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Prize</span>
              <span style={styles.summaryValue}>${prizeAmount}</span>
            </div>
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Type</span>
              <span style={styles.summaryValue}>{challengeType.replace(/_/g, ' ')}</span>
            </div>
          </div>

          <div style={styles.publishActions}>
            <button onClick={handlePublish} disabled={publishing} style={styles.button}>
              {publishing ? 'Publishing...' : 'Publish Challenge'}
            </button>
            <Link href={`/challenges/${savedId}/manage`} style={styles.ghostButton}>
              Keep as Draft
            </Link>
          </div>

          {error && <p style={styles.error}>{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div style={styles.wrapper}>
      <Link href="/dashboard" style={styles.backLink}>
        &larr; Back to Dashboard
      </Link>

      <div style={styles.card}>
        <h1 style={styles.title}>Post a Challenge</h1>
        <p style={styles.subtitle}>
          Describe your funnel metric and set a prize for the operator who beats it.
        </p>

        <form onSubmit={handleSaveDraft} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="title">Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Beat our checkout conversion rate"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the challenge, your current funnel, and what you're looking for..."
              required
              rows={5}
              style={styles.textarea}
            />
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="metricType">Metric Type</label>
              <select
                id="metricType"
                value={metricType}
                onChange={(e) => handleMetricChange(e.target.value)}
                required
                style={styles.select}
              >
                <option value="">Select a metric...</option>
                {METRIC_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label} htmlFor="metricUnit">Metric Unit</label>
              <input
                id="metricUnit"
                type="text"
                value={metricUnit}
                onChange={(e) => setMetricUnit(e.target.value)}
                placeholder="%"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="baseline">Current Baseline Value</label>
              <input
                id="baseline"
                type="number"
                step="any"
                value={baselineValue}
                onChange={(e) => setBaselineValue(e.target.value)}
                placeholder="e.g. 3.2"
                required
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Challenge Type</label>
              <input
                type="text"
                value={challengeType.replace(/_/g, ' ')}
                readOnly
                style={{ ...styles.input, color: 'var(--text-tertiary)', cursor: 'default' }}
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="prize">Prize Amount ($)</label>
              <input
                id="prize"
                type="number"
                step="0.01"
                min="1"
                value={prizeAmount}
                onChange={(e) => setPrizeAmount(e.target.value)}
                placeholder="e.g. 5000"
                required
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label} htmlFor="maxFinalists">Max Finalists</label>
              <input
                id="maxFinalists"
                type="number"
                min="1"
                max="20"
                value={maxFinalists}
                onChange={(e) => setMaxFinalists(e.target.value)}
                required
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="deadline">Deadline</label>
            <input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Saving...' : 'Save as Draft'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    maxWidth: '640px',
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
    padding: '32px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '4px',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
    marginBottom: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  label: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    marginBottom: '6px',
    fontWeight: 500,
  },
  input: {
    height: '44px',
    padding: '0 16px',
    fontSize: '15px',
    color: 'var(--text-primary)',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-secondary)',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  textarea: {
    padding: '12px 16px',
    fontSize: '15px',
    color: 'var(--text-primary)',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-secondary)',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
    lineHeight: 1.5,
  },
  select: {
    height: '44px',
    padding: '0 16px',
    fontSize: '15px',
    color: 'var(--text-primary)',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-secondary)',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'inherit',
    appearance: 'none' as const,
  },
  error: {
    fontSize: '13px',
    color: '#eb5757',
  },
  button: {
    height: '44px',
    background: 'var(--text-primary)',
    color: 'var(--bg-primary)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: '4px',
  },
  ghostButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '44px',
    padding: '0 24px',
    fontSize: '15px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    background: 'none',
    border: '1px solid var(--border-primary)',
    borderRadius: '8px',
    textDecoration: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  draftSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '20px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-primary)',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    fontWeight: 500,
  },
  summaryValue: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    fontWeight: 500,
  },
  publishActions: {
    display: 'flex',
    gap: '16px',
    marginTop: '32px',
  },
}
