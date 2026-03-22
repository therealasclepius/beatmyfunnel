'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')

  // Form fields
  const [displayName, setDisplayName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [bio, setBio] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      setEmail(user.email || '')

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        const p = data as Profile
        setProfile(p)
        setDisplayName(p.display_name || '')
        setCompanyName(p.company_name || '')
        setBio(p.bio || '')
        setWebsiteUrl(p.website_url || '')
      }
      setLoading(false)
    }
    loadProfile()
  }, [router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setSaving(true)

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        company_name: companyName || null,
        bio: bio || null,
        website_url: websiteUrl || null,
      })
      .eq('id', profile?.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
    setSaving(false)
  }

  const handlePasswordChange = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?redirect=/profile`,
    })
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setError('')
      alert('Password reset email sent. Check your inbox.')
    }
  }

  if (loading) {
    return <div style={styles.wrapper}><p style={{ color: 'var(--text-tertiary)' }}>Loading...</p></div>
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h1 style={styles.title}>Profile</h1>
        <p style={styles.subtitle}>Manage your account settings</p>
      </div>

      <form onSubmit={handleSave} style={styles.form}>
        {/* Avatar + Role */}
        <div style={styles.avatarSection}>
          <div style={styles.avatar}>
            {displayName?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p style={styles.roleBadge}>{profile?.role}</p>
            <p style={styles.emailText}>{email}</p>
          </div>
        </div>

        {/* Display Name */}
        <div style={styles.field}>
          <label style={styles.label}>Display name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={styles.input}
            required
          />
        </div>

        {/* Company */}
        <div style={styles.field}>
          <label style={styles.label}>
            {profile?.role === 'operator' ? 'Agency / Company (optional)' : 'Company / Brand name'}
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            style={styles.input}
            placeholder={profile?.role === 'operator' ? 'Freelance, agency name, etc.' : 'Your brand or company'}
          />
        </div>

        {/* Bio */}
        <div style={styles.field}>
          <label style={styles.label}>
            {profile?.role === 'operator' ? 'About you — your experience & skills' : 'About your brand'}
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            style={{ ...styles.input, height: '100px', resize: 'vertical' as const, paddingTop: '12px' }}
            placeholder={profile?.role === 'operator'
              ? 'CRO specialist with 5+ years, worked with DTC brands...'
              : 'DTC brand doing $X/year, looking to optimize...'
            }
          />
        </div>

        {/* Website */}
        <div style={styles.field}>
          <label style={styles.label}>Website / Portfolio URL</label>
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            style={styles.input}
            placeholder="https://yoursite.com"
          />
        </div>

        {error && <p style={styles.error}>{error}</p>}
        {success && <p style={styles.success}>Profile updated!</p>}

        <button type="submit" disabled={saving} style={styles.button}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Password section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Security</h2>
        <p style={styles.sectionDesc}>Change your password via email reset.</p>
        <button onClick={handlePasswordChange} style={styles.ghostButton}>
          Send Password Reset Email
        </button>
      </div>

      {/* Account info */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Account</h2>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Role</span>
          <span style={styles.infoValue}>{profile?.role}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Member since</span>
          <span style={styles.infoValue}>
            {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 0',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
  },
  form: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '12px',
    padding: '32px',
    marginBottom: '24px',
  },
  avatarSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '28px',
    paddingBottom: '28px',
    borderBottom: '1px solid var(--border-primary)',
  },
  avatar: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    fontWeight: 600,
    color: 'white',
  },
  roleBadge: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    textTransform: 'capitalize' as const,
    marginBottom: '2px',
  },
  emailText: {
    fontSize: '13px',
    color: 'var(--text-quaternary)',
  },
  field: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-tertiary)',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    height: '44px',
    padding: '0 16px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-secondary)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '15px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  button: {
    width: '100%',
    height: '44px',
    background: 'var(--text-primary)',
    color: 'var(--bg-primary)',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    fontFamily: 'inherit',
    cursor: 'pointer',
    marginTop: '8px',
  },
  ghostButton: {
    height: '40px',
    padding: '0 20px',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    border: '1px solid var(--border-secondary)',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  error: {
    color: '#eb5757',
    fontSize: '13px',
    marginBottom: '12px',
  },
  success: {
    color: '#27a644',
    fontSize: '13px',
    marginBottom: '12px',
  },
  section: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '12px',
    padding: '24px 32px',
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  sectionDesc: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    marginBottom: '16px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid var(--border-primary)',
  },
  infoLabel: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
  },
  infoValue: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    fontWeight: 500,
    textTransform: 'capitalize' as const,
  },
}
