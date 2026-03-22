'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Application, Submission, Challenge } from '@/types/database'

export default function SubmitWorkPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [application, setApplication] = useState<Application | null>(null)
  const [existingSub, setExistingSub] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [description, setDescription] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')

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

      // Check challenge status is accepting_submissions
      const { data: challengeData } = await supabase
        .from('challenges')
        .select('status')
        .eq('id', id)
        .single()

      if (!challengeData || (challengeData as Pick<Challenge, 'status'>).status !== 'accepting_submissions') {
        router.push(`/challenges/${id}`)
        return
      }

      // Check that user is a finalist
      const { data: appData } = await supabase
        .from('applications')
        .select('*')
        .eq('challenge_id', id)
        .eq('operator_id', user.id)
        .eq('status', 'finalist')
        .single()

      if (!appData) {
        router.push(`/challenges/${id}`)
        return
      }

      setApplication(appData as Application)

      // Check existing submission
      const { data: subData } = await supabase
        .from('submissions')
        .select('*')
        .eq('challenge_id', id)
        .eq('operator_id', user.id)
        .single()

      if (subData) {
        setExistingSub(subData as Submission)
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

    if (!user || !application) {
      setError('You must be logged in.')
      setSubmitting(false)
      return
    }

    const { error: insertError } = await supabase.from('submissions').insert({
      challenge_id: id,
      operator_id: user.id,
      application_id: application.id,
      description,
      evidence_url: evidenceUrl || null,
    })

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    // Update the submission status to 'submitted'
    await supabase
      .from('submissions')
      .update({ status: 'submitted' })
      .eq('challenge_id', id)
      .eq('operator_id', user.id)

    router.push(`/challenges/${id}`)
  }

  if (loading) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

  if (existingSub) {
    return (
      <div style={styles.wrapper}>
        <Link href={`/challenges/${id}`} style={styles.backLink}>
          &larr; Back to Challenge
        </Link>
        <div style={styles.card}>
          <h1 style={styles.title}>Submission Received</h1>
          <p style={styles.subtitle}>Your work has been submitted. The brand will review it.</p>

          <div style={styles.submissionPreview}>
            <div style={styles.field}>
              <span style={styles.previewLabel}>Description</span>
              <p style={styles.previewValue}>{existingSub.description}</p>
            </div>
            {existingSub.evidence_url && (
              <div style={styles.field}>
                <span style={styles.previewLabel}>Evidence</span>
                <a href={existingSub.evidence_url} target="_blank" rel="noopener noreferrer" style={styles.link}>
                  {existingSub.evidence_url}
                </a>
              </div>
            )}
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
        <h1 style={styles.title}>Submit Your Work</h1>
        <p style={styles.subtitle}>
          Describe what you built and provide evidence. The platform will verify results during the testing phase.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you build? How does it improve the metric?"
              required
              rows={6}
              style={styles.textarea}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="evidenceUrl">
              Evidence URL
            </label>
            <input
              id="evidenceUrl"
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://... (link to your work, screenshot, demo)"
              style={styles.input}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={submitting} style={styles.button}>
            {submitting ? 'Submitting...' : 'Submit Work'}
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
  submissionPreview: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '20px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-primary)',
    borderRadius: '8px',
  },
  previewLabel: {
    fontSize: '11px',
    color: 'var(--text-quaternary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 500,
    marginBottom: '4px',
  },
  previewValue: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap' as const,
  },
  link: {
    fontSize: '14px',
    color: 'var(--accent)',
    textDecoration: 'none',
    wordBreak: 'break-all' as const,
  },
}
