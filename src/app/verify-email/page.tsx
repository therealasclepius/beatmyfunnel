'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function VerifyEmailPage() {
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleResend = async () => {
    setResending(true)
    setMessage('')
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      setError('Unable to determine your email address.')
      setResending(false)
      return
    }

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    })

    if (resendError) {
      setError(resendError.message)
    } else {
      setMessage('Verification email sent! Check your inbox.')
    }

    setResending(false)
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.iconCircle}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>
        <h1 style={styles.heading}>Check your email</h1>
        <p style={styles.description}>
          We sent a verification link to your email address. Please check your inbox and click the link to verify your account.
        </p>

        {message && <p style={styles.successText}>{message}</p>}
        {error && <p style={styles.errorText}>{error}</p>}

        <button
          onClick={handleResend}
          disabled={resending}
          style={styles.primaryButton}
        >
          {resending ? 'Sending...' : 'Resend verification email'}
        </button>

        <button onClick={handleSignOut} style={styles.signOutLink}>
          Sign out
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#08090a',
    padding: '24px',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '40px 32px',
    maxWidth: '420px',
    width: '100%',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '16px',
  },
  iconCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'rgba(138, 143, 255, 0.1)',
    border: '1px solid rgba(138, 143, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  heading: {
    fontSize: '22px',
    fontWeight: 600,
    color: '#fff',
    letterSpacing: '-0.02em',
    margin: 0,
  },
  description: {
    fontSize: '15px',
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 1.6,
    margin: 0,
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '44px',
    padding: '0 24px',
    fontSize: '15px',
    fontWeight: 500,
    color: '#08090a',
    background: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: '8px',
    width: '100%',
  },
  signOutLink: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.4)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textDecoration: 'underline',
    padding: 0,
  },
  successText: {
    fontSize: '14px',
    color: '#2ed573',
    margin: 0,
  },
  errorText: {
    fontSize: '14px',
    color: '#ff4757',
    margin: 0,
  },
}
