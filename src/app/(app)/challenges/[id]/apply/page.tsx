'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/status-badge'
import type { Challenge, Profile, Application } from '@/types/database'

function triggerEmail(type: string, data: Record<string, string>) {
  fetch('/api/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, data }),
  }).catch(() => {}) // Fire and forget
}

export default function ApplyToChallengePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [existingApp, setExistingApp] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [pitch, setPitch] = useState('')
  const [background, setBackground] = useState('')
  const [relevantWins, setRelevantWins] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || (profile as Pick<Profile, 'role'>).role !== 'operator') {
        router.push('/dashboard')
        return
      }

      // Fetch challenge
      const { data: challengeData } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', id)
        .single()

      if (!challengeData || (challengeData as Challenge).status !== 'open') {
        router.push(`/challenges/${id}`)
        return
      }

      setChallenge(challengeData as Challenge)

      // Check existing application
      const { data: appData } = await supabase
        .from('applications')
        .select('*')
        .eq('challenge_id', id)
        .eq('operator_id', user.id)
        .single()

      if (appData) {
        setExistingApp(appData as Application)
      }

      setLoading(false)
    }
    load()
  }, [id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('You must be logged in.')
      setSubmitting(false)
      return
    }

    const { error: insertError } = await supabase.from('applications').insert({
      challenge_id: id,
      operator_id: user.id,
      pitch,
      background: background || null,
      relevant_wins: relevantWins || null,
    })

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    triggerEmail('new_application', { challengeId: id, operatorId: user.id })

    router.push(`/challenges/${id}`)
  }

  if (loading) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

  if (existingApp) {
    return (
      <div style={styles.wrapper}>
        <Link href={`/challenges/${id}`} style={styles.backLink}>
          &larr; Back to Challenge
        </Link>
        <div className="detail-card" style={styles.card}>
          <h1 style={styles.title}>You&apos;ve already applied</h1>
          <p style={styles.subtitle}>Your application is currently:</p>
          <div style={{ marginTop: '12px' }}>
            <StatusBadge status={existingApp.status} variant="application" />
          </div>
          <div style={{ marginTop: '24px' }}>
            <Link href={`/challenges/${id}`} style={styles.ghostButton}>
              Back to Challenge
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.wrapper}>
      <Link href={`/challenges/${id}`} style={styles.backLink}>
        &larr; Back to Challenge
      </Link>

      <div style={styles.card}>
        <h1 style={styles.title}>Apply to Challenge</h1>
        <p style={styles.subtitle}>
          {challenge?.title}
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="pitch">
              Why would you beat this challenge?
            </label>
            <textarea
              id="pitch"
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="Your pitch — why should the brand pick you?"
              required
              rows={5}
              style={styles.textarea}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="background">
              Your relevant experience
            </label>
            <textarea
              id="background"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="What have you done in this space before?"
              rows={4}
              style={styles.textarea}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="relevantWins">
              Past results you can point to
            </label>
            <textarea
              id="relevantWins"
              value={relevantWins}
              onChange={(e) => setRelevantWins(e.target.value)}
              placeholder="Concrete examples of results you've achieved..."
              rows={4}
              style={styles.textarea}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={submitting} style={styles.button}>
            {submitting ? 'Submitting...' : 'Submit Application'}
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
  },
  label: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    marginBottom: '6px',
    fontWeight: 500,
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
    height: '40px',
    padding: '0 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    background: 'none',
    border: '1px solid var(--border-primary)',
    borderRadius: '8px',
    textDecoration: 'none',
    cursor: 'pointer',
  },
}
