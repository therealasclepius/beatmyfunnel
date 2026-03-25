'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Profile, ChallengeType } from '@/types/database'

const STEP_LABELS = [
  'What are you challenging?',
  "What's your baseline?",
  'Set your prize',
  'Review & Deposit',
]

const METRIC_DEFAULTS: Record<ChallengeType, { metric: string; unit: string }> = {
  landing_page: { metric: 'Landing Page CVR', unit: '%' },
  email_flow: { metric: 'Email Open Rate', unit: '%' },
}

export default function NewChallengePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [checkingRole, setCheckingRole] = useState(true)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [metricType, setMetricType] = useState('Landing Page CVR')
  const [challengeType, setChallengeType] = useState<ChallengeType>('landing_page')
  const [metricUnit, setMetricUnit] = useState('%')
  const [baselineValue, setBaselineValue] = useState('')
  const [prizeAmount, setPrizeAmount] = useState('')
  const [maxFinalists, setMaxFinalists] = useState('3')
  const [deadline, setDeadline] = useState('')
  const [trafficSessions, setTrafficSessions] = useState('5000')
  const [trafficDays, setTrafficDays] = useState('14')

  // Computed values
  const finalistPool = (parseInt(maxFinalists, 10) || 0) * 500
  const prizeNum = parseFloat(prizeAmount) || 0
  const platformFee = Math.round(prizeNum * 0.15 * 100) / 100
  const totalBrandCost = prizeNum + finalistPool + platformFee

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

  const handleChallengeTypeSelect = (type: ChallengeType) => {
    setChallengeType(type)
    const defaults = METRIC_DEFAULTS[type]
    setMetricType(defaults.metric)
    setMetricUnit(defaults.unit)
  }

  const validateStep = (s: number): string | null => {
    switch (s) {
      case 1:
        if (!challengeType) return 'Please select a challenge type.'
        if (!title.trim()) return 'Please enter a title.'
        return null
      case 2:
        if (!baselineValue) return 'Please enter your current baseline value.'
        if (isNaN(parseFloat(baselineValue))) return 'Baseline must be a number.'
        return null
      case 3: {
        const prizeInCents = Math.round(parseFloat(prizeAmount) * 100)
        if (isNaN(prizeInCents) || prizeInCents <= 0) return 'Prize amount must be greater than $0.'
        if (prizeInCents < 500000) return 'Minimum prize amount is $5,000.'
        if (!deadline) return 'Please select a deadline.'
        const deadlineDate = new Date(deadline)
        if (deadlineDate <= new Date()) return 'Deadline must be in the future.'
        return null
      }
      default:
        return null
    }
  }

  const goNext = () => {
    const err = validateStep(step)
    if (err) {
      setError(err)
      return
    }
    setError('')
    setDirection('forward')
    setStep((s) => Math.min(s + 1, 4))
  }

  const goBack = () => {
    setError('')
    setDirection('back')
    setStep((s) => Math.max(s - 1, 1))
  }

  const handleSaveDraft = async () => {
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('You must be logged in.')
      setLoading(false)
      return
    }

    const prizeInCents = Math.round(parseFloat(prizeAmount) * 100)
    const baseline = parseFloat(baselineValue)

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
        traffic_commitment_sessions: parseInt(trafficSessions, 10) || 5000,
        traffic_commitment_days: parseInt(trafficDays, 10) || 14,
        finalist_floor_payout: 500,
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
    if (!savedId) {
      // Save first, then publish
      setError('')
      setPublishing(true)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be logged in.')
        setPublishing(false)
        return
      }

      const prizeInCents = Math.round(parseFloat(prizeAmount) * 100)
      const baseline = parseFloat(baselineValue)

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
          traffic_commitment_sessions: parseInt(trafficSessions, 10) || 5000,
          traffic_commitment_days: parseInt(trafficDays, 10) || 14,
          finalist_floor_payout: 500,
          status: 'open',
        })
        .select('id')
        .single()

      if (insertError) {
        setError(insertError.message)
        setPublishing(false)
        return
      }

      router.push(`/challenges/${data.id}/manage`)
      return
    }

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
        <p style={{ color: '#8a8f98', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

  // ─── Progress Bar ───
  const ProgressBar = () => (
    <div style={styles.progressWrapper}>
      <div style={styles.progressTrack}>
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1
          const isActive = stepNum === step
          const isComplete = stepNum < step
          return (
            <div key={i} style={styles.progressStep}>
              <div
                style={{
                  ...styles.progressDot,
                  background: isComplete ? '#f7f8f8' : isActive ? '#f7f8f8' : '#23252a',
                  border: isActive ? '2px solid #f7f8f8' : isComplete ? '2px solid #f7f8f8' : '2px solid #23252a',
                  color: isComplete || isActive ? '#08090a' : '#8a8f98',
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {isComplete ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7L6 10L11 4" stroke="#08090a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive || isComplete ? '#f7f8f8' : '#8a8f98',
                  marginTop: '8px',
                  textAlign: 'center',
                  lineHeight: '1.3',
                }}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>
      {/* Connecting lines */}
      <div style={styles.progressLineContainer}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              ...styles.progressLine,
              background: i < step ? '#f7f8f8' : '#23252a',
            }}
          />
        ))}
      </div>
    </div>
  )

  // ─── Step 1: Challenge Type ───
  const Step1 = () => (
    <div style={styles.stepContent}>
      <h2 style={styles.stepTitle}>What are you challenging?</h2>
      <p style={styles.stepSubtitle}>Pick the funnel element you want optimized.</p>

      <div style={styles.cardGrid}>
        <button
          type="button"
          onClick={() => handleChallengeTypeSelect('landing_page')}
          style={{
            ...styles.typeCard,
            borderColor: challengeType === 'landing_page' ? '#f7f8f8' : '#23252a',
            background: challengeType === 'landing_page' ? '#1a1a1f' : '#141416',
          }}
        >
          <div style={styles.typeIcon}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="4" width="24" height="24" rx="4" stroke={challengeType === 'landing_page' ? '#f7f8f8' : '#8a8f98'} strokeWidth="2"/>
              <rect x="8" y="8" width="16" height="4" rx="1" fill={challengeType === 'landing_page' ? '#f7f8f8' : '#8a8f98'} opacity="0.5"/>
              <rect x="8" y="16" width="10" height="2" rx="1" fill={challengeType === 'landing_page' ? '#f7f8f8' : '#8a8f98'} opacity="0.3"/>
              <rect x="8" y="20" width="8" height="4" rx="2" fill={challengeType === 'landing_page' ? '#f7f8f8' : '#8a8f98'}/>
            </svg>
          </div>
          <span style={{
            ...styles.typeLabel,
            color: challengeType === 'landing_page' ? '#f7f8f8' : '#8a8f98',
          }}>
            Landing Page
          </span>
          <span style={styles.typeDesc}>Conversion rate optimization</span>
        </button>

        <button
          type="button"
          onClick={() => handleChallengeTypeSelect('email_flow')}
          style={{
            ...styles.typeCard,
            borderColor: challengeType === 'email_flow' ? '#f7f8f8' : '#23252a',
            background: challengeType === 'email_flow' ? '#1a1a1f' : '#141416',
          }}
        >
          <div style={styles.typeIcon}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="7" width="24" height="18" rx="3" stroke={challengeType === 'email_flow' ? '#f7f8f8' : '#8a8f98'} strokeWidth="2"/>
              <path d="M4 10L16 18L28 10" stroke={challengeType === 'email_flow' ? '#f7f8f8' : '#8a8f98'} strokeWidth="2"/>
            </svg>
          </div>
          <span style={{
            ...styles.typeLabel,
            color: challengeType === 'email_flow' ? '#f7f8f8' : '#8a8f98',
          }}>
            Email Flow
          </span>
          <span style={styles.typeDesc}>Open rate & click rate</span>
        </button>
      </div>

      <div style={{ ...styles.field, marginTop: '24px' }}>
        <label style={styles.label} htmlFor="title">Challenge Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            challengeType === 'landing_page'
              ? 'e.g. Beat our checkout conversion rate'
              : 'e.g. Beat our welcome flow open rate'
          }
          style={styles.input}
        />
      </div>

      <div style={{ ...styles.field, marginTop: '12px' }}>
        <label style={styles.label} htmlFor="description">Description (optional)</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the challenge, your current funnel, and what you're looking for..."
          rows={4}
          style={styles.textarea}
        />
      </div>
    </div>
  )

  // ─── Step 2: Baseline ───
  const Step2 = () => (
    <div style={styles.stepContent}>
      <h2 style={styles.stepTitle}>What&apos;s your baseline?</h2>
      <p style={styles.stepSubtitle}>Tell operators what they need to beat.</p>

      <div style={styles.field}>
        <label style={styles.label}>Metric</label>
        <div style={styles.metricDisplay}>
          <span style={{ color: '#f7f8f8', fontSize: '15px', fontWeight: 500 }}>{metricType}</span>
          <span style={{ color: '#8a8f98', fontSize: '13px' }}>Auto-selected for {challengeType.replace(/_/g, ' ')}</span>
        </div>
        {challengeType === 'email_flow' && (
          <div style={{ marginTop: '8px' }}>
            <select
              value={metricType}
              onChange={(e) => setMetricType(e.target.value)}
              style={styles.select}
            >
              <option value="Email Open Rate">Email Open Rate</option>
              <option value="Email Click Rate">Email Click Rate</option>
            </select>
          </div>
        )}
      </div>

      <div style={styles.field}>
        <label style={styles.label} htmlFor="baseline">Current Value</label>
        <div style={styles.inlineInputGroup}>
          <input
            id="baseline"
            type="number"
            step="any"
            value={baselineValue}
            onChange={(e) => setBaselineValue(e.target.value)}
            placeholder="e.g. 3.2"
            style={{ ...styles.input, flex: 1 }}
          />
          <span style={styles.unitBadge}>{metricUnit}</span>
        </div>
        <span style={styles.hint}>
          This is the number operators need to beat to win.
        </span>
      </div>

      <div style={{ ...styles.divider }} />

      <div style={styles.field}>
        <label style={styles.label}>Traffic Commitment</label>
        <p style={styles.hint}>How much traffic will you send to the challenger&apos;s variant?</p>
      </div>

      <div style={styles.row}>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="trafficSessions">Sessions</label>
          <input
            id="trafficSessions"
            type="number"
            min="1000"
            value={trafficSessions}
            onChange={(e) => setTrafficSessions(e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="trafficDays">Over (days)</label>
          <input
            id="trafficDays"
            type="number"
            min="1"
            value={trafficDays}
            onChange={(e) => setTrafficDays(e.target.value)}
            style={styles.input}
          />
        </div>
      </div>
    </div>
  )

  // ─── Step 3: Prize ───
  const Step3 = () => (
    <div style={styles.stepContent}>
      <h2 style={styles.stepTitle}>Set your prize</h2>
      <p style={styles.stepSubtitle}>The winner takes the prize. Finalists get paid just for competing.</p>

      <div style={styles.field}>
        <label style={styles.label} htmlFor="prize">Winner Prize Amount</label>
        <div style={styles.prizeInputWrapper}>
          <span style={styles.dollarSign}>$</span>
          <input
            id="prize"
            type="number"
            step="0.01"
            min="5000"
            value={prizeAmount}
            onChange={(e) => setPrizeAmount(e.target.value)}
            placeholder="5,000"
            style={styles.prizeInput}
          />
        </div>
        <span style={styles.hint}>Minimum $5,000</span>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Max Finalists</label>
        <div style={styles.finalistSelector}>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMaxFinalists(String(n))}
              style={{
                ...styles.finalistOption,
                borderColor: maxFinalists === String(n) ? '#f7f8f8' : '#23252a',
                background: maxFinalists === String(n) ? '#1a1a1f' : 'transparent',
                color: maxFinalists === String(n) ? '#f7f8f8' : '#8a8f98',
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <span style={styles.hint}>Each finalist receives $500 upon submission, on top of the prize.</span>
      </div>

      <div style={{ ...styles.divider }} />

      <div style={styles.costBreakdown}>
        <div style={styles.costRow}>
          <span style={styles.costLabel}>Winner Prize</span>
          <span style={styles.costValue}>${prizeNum.toLocaleString()}</span>
        </div>
        <div style={styles.costRow}>
          <span style={styles.costLabel}>Finalist Pool ({maxFinalists} x $500)</span>
          <span style={styles.costValue}>${finalistPool.toLocaleString()}</span>
        </div>
        <div style={styles.costRow}>
          <span style={styles.costLabel}>Platform Fee (15%)</span>
          <span style={styles.costValue}>${platformFee.toLocaleString()}</span>
        </div>
        <div style={{ ...styles.costRow, ...styles.costTotal }}>
          <span style={{ ...styles.costLabel, color: '#f7f8f8', fontWeight: 600 }}>Total Brand Cost</span>
          <span style={{ ...styles.costValue, color: '#f7f8f8', fontWeight: 700, fontSize: '18px' }}>
            ${totalBrandCost.toLocaleString()}
          </span>
        </div>
      </div>

      <div style={styles.field}>
        <label style={styles.label} htmlFor="deadline">Submission Deadline</label>
        <input
          id="deadline"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          style={styles.input}
        />
      </div>
    </div>
  )

  // ─── Step 4: Review ───
  const Step4 = () => (
    <div style={styles.stepContent}>
      <h2 style={styles.stepTitle}>Review & Deposit</h2>
      <p style={styles.stepSubtitle}>Everything look good? Save as draft or publish immediately.</p>

      <div style={styles.reviewSection}>
        <div style={styles.reviewGroup}>
          <h3 style={styles.reviewGroupTitle}>Challenge</h3>
          <div style={styles.reviewRow}>
            <span style={styles.reviewLabel}>Type</span>
            <span style={styles.reviewValue}>{challengeType.replace(/_/g, ' ')}</span>
          </div>
          <div style={styles.reviewRow}>
            <span style={styles.reviewLabel}>Title</span>
            <span style={styles.reviewValue}>{title}</span>
          </div>
          {description && (
            <div style={styles.reviewRow}>
              <span style={styles.reviewLabel}>Description</span>
              <span style={{ ...styles.reviewValue, maxWidth: '300px', textAlign: 'right' }}>{description}</span>
            </div>
          )}
        </div>

        <div style={styles.reviewGroup}>
          <h3 style={styles.reviewGroupTitle}>Baseline</h3>
          <div style={styles.reviewRow}>
            <span style={styles.reviewLabel}>Metric</span>
            <span style={styles.reviewValue}>{metricType}</span>
          </div>
          <div style={styles.reviewRow}>
            <span style={styles.reviewLabel}>Current Value</span>
            <span style={styles.reviewValue}>{baselineValue}{metricUnit}</span>
          </div>
          <div style={styles.reviewRow}>
            <span style={styles.reviewLabel}>Traffic</span>
            <span style={styles.reviewValue}>{parseInt(trafficSessions).toLocaleString()} sessions over {trafficDays} days</span>
          </div>
        </div>

        <div style={styles.reviewGroup}>
          <h3 style={styles.reviewGroupTitle}>Prize & Costs</h3>
          <div style={styles.reviewRow}>
            <span style={styles.reviewLabel}>Winner Prize</span>
            <span style={styles.reviewValue}>${prizeNum.toLocaleString()}</span>
          </div>
          <div style={styles.reviewRow}>
            <span style={styles.reviewLabel}>Max Finalists</span>
            <span style={styles.reviewValue}>{maxFinalists}</span>
          </div>
          <div style={styles.reviewRow}>
            <span style={styles.reviewLabel}>Finalist Pool</span>
            <span style={styles.reviewValue}>${finalistPool.toLocaleString()}</span>
          </div>
          <div style={styles.reviewRow}>
            <span style={styles.reviewLabel}>Platform Fee (15%)</span>
            <span style={styles.reviewValue}>${platformFee.toLocaleString()}</span>
          </div>
          <div style={{ ...styles.reviewRow, borderTop: '1px solid #23252a', paddingTop: '12px', marginTop: '4px' }}>
            <span style={{ ...styles.reviewLabel, color: '#f7f8f8', fontWeight: 600 }}>Total Cost</span>
            <span style={{ ...styles.reviewValue, color: '#f7f8f8', fontWeight: 700, fontSize: '18px' }}>
              ${totalBrandCost.toLocaleString()}
            </span>
          </div>
          <div style={styles.reviewRow}>
            <span style={styles.reviewLabel}>Deadline</span>
            <span style={styles.reviewValue}>{deadline ? new Date(deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-'}</span>
          </div>
        </div>
      </div>

      <p style={{ fontSize: '13px', color: '#8a8f98', marginTop: '16px', lineHeight: '1.5' }}>
        Escrow will be set up when your challenge goes live. Funds are held securely by Escrow.com and only released when a winner is confirmed.
      </p>
    </div>
  )

  const renderStep = () => {
    switch (step) {
      case 1: return <Step1 />
      case 2: return <Step2 />
      case 3: return <Step3 />
      case 4: return <Step4 />
      default: return null
    }
  }

  return (
    <div style={styles.wrapper}>
      <Link href="/dashboard" style={styles.backLink}>
        &larr; Back to Dashboard
      </Link>

      <div style={styles.card}>
        <ProgressBar />

        <div
          key={step}
          style={{
            animation: direction === 'forward' ? 'wizardSlideIn 0.3s ease-out' : 'wizardSlideBack 0.3s ease-out',
          }}
        >
          {renderStep()}
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {/* Navigation */}
        <div style={styles.navRow}>
          {step > 1 ? (
            <button type="button" onClick={goBack} style={styles.ghostButton}>
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button type="button" onClick={goNext} style={styles.button}>
              Continue
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={loading}
                style={styles.ghostButton}
              >
                {loading ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing}
                style={styles.button}
              >
                {publishing ? 'Publishing...' : 'Publish Challenge'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inline keyframes for animations */}
      <style>{`
        @keyframes wizardSlideIn {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes wizardSlideBack {
          from { opacity: 0; transform: translateX(-24px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
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
    color: '#8a8f98',
    textDecoration: 'none',
    marginBottom: '24px',
  },
  card: {
    background: '#141416',
    border: '1px solid #23252a',
    borderRadius: '12px',
    padding: '32px',
  },

  // ── Progress ──
  progressWrapper: {
    position: 'relative' as const,
    marginBottom: '36px',
  },
  progressTrack: {
    display: 'flex',
    justifyContent: 'space-between',
    position: 'relative' as const,
    zIndex: 2,
  },
  progressStep: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'all 0.3s ease',
  },
  progressLineContainer: {
    position: 'absolute' as const,
    top: '16px',
    left: '12.5%',
    right: '12.5%',
    display: 'flex',
    gap: '0px',
    zIndex: 1,
    transform: 'translateY(-50%)',
  },
  progressLine: {
    flex: 1,
    height: '2px',
    transition: 'background 0.3s ease',
  },

  // ── Step Content ──
  stepContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  stepTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#f7f8f8',
    letterSpacing: '-0.02em',
    marginBottom: '0',
  },
  stepSubtitle: {
    fontSize: '14px',
    color: '#8a8f98',
    marginBottom: '8px',
    marginTop: '-8px',
  },

  // ── Form Fields ──
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  label: {
    fontSize: '13px',
    color: '#8a8f98',
    marginBottom: '6px',
    fontWeight: 500,
  },
  input: {
    height: '44px',
    padding: '0 16px',
    fontSize: '15px',
    color: '#f7f8f8',
    background: '#08090a',
    border: '1px solid #23252a',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  textarea: {
    padding: '12px 16px',
    fontSize: '15px',
    color: '#f7f8f8',
    background: '#08090a',
    border: '1px solid #23252a',
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
    color: '#f7f8f8',
    background: '#08090a',
    border: '1px solid #23252a',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'inherit',
    appearance: 'none' as const,
  },
  hint: {
    fontSize: '12px',
    color: '#8a8f98',
    marginTop: '6px',
    lineHeight: '1.4',
  },

  // ── Type Cards ──
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  typeCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '28px 16px',
    borderRadius: '12px',
    border: '2px solid #23252a',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  typeIcon: {
    marginBottom: '4px',
  },
  typeLabel: {
    fontSize: '16px',
    fontWeight: 600,
  },
  typeDesc: {
    fontSize: '12px',
    color: '#8a8f98',
  },

  // ── Metric Display ──
  metricDisplay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: '#08090a',
    border: '1px solid #23252a',
    borderRadius: '8px',
  },

  // ── Inline input group ──
  inlineInputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  unitBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '44px',
    padding: '0 16px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#8a8f98',
    background: '#08090a',
    border: '1px solid #23252a',
    borderRadius: '8px',
    minWidth: '48px',
  },

  // ── Prize ──
  prizeInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    background: '#08090a',
    border: '1px solid #23252a',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  dollarSign: {
    padding: '0 0 0 16px',
    fontSize: '20px',
    fontWeight: 600,
    color: '#8a8f98',
  },
  prizeInput: {
    flex: 1,
    height: '52px',
    padding: '0 16px',
    fontSize: '20px',
    fontWeight: 600,
    color: '#f7f8f8',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontFamily: 'inherit',
  },

  // ── Finalist Selector ──
  finalistSelector: {
    display: 'flex',
    gap: '8px',
  },
  finalistOption: {
    width: '56px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    border: '2px solid #23252a',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 600,
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  },

  // ── Cost Breakdown ──
  costBreakdown: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    padding: '20px',
    background: '#08090a',
    border: '1px solid #23252a',
    borderRadius: '10px',
  },
  costRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLabel: {
    fontSize: '13px',
    color: '#8a8f98',
  },
  costValue: {
    fontSize: '14px',
    color: '#8a8f98',
    fontWeight: 500,
  },
  costTotal: {
    borderTop: '1px solid #23252a',
    paddingTop: '12px',
    marginTop: '4px',
  },

  // ── Divider ──
  divider: {
    height: '1px',
    background: '#23252a',
    margin: '8px 0',
  },

  // ── Review ──
  reviewSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  reviewGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    padding: '20px',
    background: '#08090a',
    border: '1px solid #23252a',
    borderRadius: '10px',
  },
  reviewGroupTitle: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#8a8f98',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    marginBottom: '4px',
  },
  reviewRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewLabel: {
    fontSize: '13px',
    color: '#8a8f98',
    fontWeight: 500,
  },
  reviewValue: {
    fontSize: '14px',
    color: '#f7f8f8',
    fontWeight: 500,
  },

  // ── Navigation ──
  navRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #23252a',
  },
  button: {
    height: '44px',
    padding: '0 28px',
    background: '#f7f8f8',
    color: '#08090a',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  ghostButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '44px',
    padding: '0 24px',
    fontSize: '15px',
    fontWeight: 500,
    color: '#8a8f98',
    background: 'none',
    border: '1px solid #23252a',
    borderRadius: '8px',
    textDecoration: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },

  // ── Error ──
  error: {
    fontSize: '13px',
    color: '#eb5757',
    marginTop: '16px',
  },
}
