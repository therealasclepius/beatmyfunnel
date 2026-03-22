'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types/database'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<UserRole | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!role) {
      setError('Please select whether you are a brand or an operator.')
      return
    }

    setLoading(true)

    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/dashboard`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Insert profile row
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        role,
        display_name: displayName,
      })

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }
    }

    setLoading(false)
    setSuccess(true)
  }

  if (success) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.container}>
          <Link href="/" style={styles.logo}>
            Beat My Funnel
          </Link>

          <div style={styles.card}>
            <h1 style={styles.title}>Check your email</h1>
            <p style={{ ...styles.subtitle, marginBottom: 0 }}>
              We sent a confirmation link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
              Click it to activate your account.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <Link href="/" style={styles.logo}>
          Beat My Funnel
        </Link>

        <div style={styles.card}>
          <h1 style={styles.title}>Create your account</h1>
          <p style={styles.subtitle}>Get started in under a minute</p>

          <form onSubmit={handleSignup} style={styles.form}>
            {/* Role selection */}
            <div style={styles.field}>
              <label style={styles.label}>I am a...</label>
              <div style={styles.roleRow}>
                <button
                  type="button"
                  onClick={() => setRole('brand')}
                  style={{
                    ...styles.roleCard,
                    ...(role === 'brand' ? styles.roleCardActive : {}),
                  }}
                >
                  <span style={styles.roleIcon}>&#x1f3e2;</span>
                  <span style={styles.roleTitle}>Brand</span>
                  <span style={styles.roleDesc}>Post challenges</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('operator')}
                  style={{
                    ...styles.roleCard,
                    ...(role === 'operator' ? styles.roleCardActive : {}),
                  }}
                >
                  <span style={styles.roleIcon}>&#x1f528;</span>
                  <span style={styles.roleTitle}>Operator</span>
                  <span style={styles.roleDesc}>Compete &amp; win</span>
                </button>
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label} htmlFor="displayName">Display name</label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name or company"
                required
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label} htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label} htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                style={styles.input}
              />
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p style={styles.footer}>
            Already have an account?{' '}
            <Link href="/login" style={styles.link}>Log in</Link>
          </p>
        </div>
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
    background: 'var(--bg-primary)',
    padding: '24px',
  },
  container: {
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '32px',
  },
  logo: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    textDecoration: 'none',
    letterSpacing: '-0.02em',
  },
  card: {
    width: '100%',
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
  roleRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  roleCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '16px 12px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-secondary)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  },
  roleCardActive: {
    borderColor: 'var(--accent)',
    background: 'var(--accent-muted)',
  },
  roleIcon: {
    fontSize: '24px',
    lineHeight: 1,
    marginBottom: '2px',
  },
  roleTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  roleDesc: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
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
  footer: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
    textAlign: 'center',
    marginTop: '20px',
  },
  link: {
    color: 'var(--accent)',
    textDecoration: 'none',
  },
}
