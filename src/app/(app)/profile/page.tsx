'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/status-badge'
import type { Profile, Challenge, Application, Submission } from '@/types/database'

const SPECIALTIES = ['Landing Pages', 'Email', 'CRO', 'Ad Creative'] as const

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100)

interface ChallengeHistoryItem {
  challenge_id: string
  challenge_title: string
  prize_amount: number
  application_status: string
  submission_status: string | null
}

interface BrandChallengeItem {
  id: string
  title: string
  status: string
  prize_amount: number
  applicant_count: number
}

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
  const [specialties, setSpecialties] = useState<string[]>([])

  // History data
  const [challengeHistory, setChallengeHistory] = useState<ChallengeHistoryItem[]>([])
  const [brandChallenges, setBrandChallenges] = useState<BrandChallengeItem[]>([])
  const [winCount, setWinCount] = useState(0)
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [badges, setBadges] = useState<Record<string, unknown>[]>([])

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
        setBadges(p.badges || [])

        // Parse specialties from bio or a dedicated field — store in bio as JSON prefix or use badges
        // For now, try to read from badges
        const specBadge = (p.badges || []).find((b: Record<string, unknown>) => b.type === 'specialties')
        if (specBadge && Array.isArray(specBadge.values)) {
          setSpecialties(specBadge.values as string[])
        }

        if (p.role === 'operator') {
          await loadOperatorHistory(supabase, user.id)
        } else if (p.role === 'brand') {
          await loadBrandChallenges(supabase, user.id)
        }
      }
      setLoading(false)
    }

    async function loadOperatorHistory(supabase: ReturnType<typeof createClient>, userId: string) {
      // Fetch applications with challenge info
      const { data: apps } = await supabase
        .from('applications')
        .select('*, challenges:challenge_id(id, title, prize_amount)')
        .eq('operator_id', userId)
        .order('created_at', { ascending: false })

      // Fetch submissions
      const { data: subs } = await supabase
        .from('submissions')
        .select('challenge_id, status')
        .eq('operator_id', userId)

      const submissionMap: Record<string, string> = {}
      if (subs) {
        for (const s of subs as Pick<Submission, 'challenge_id' | 'status'>[]) {
          submissionMap[s.challenge_id] = s.status
        }
      }

      const history: ChallengeHistoryItem[] = []
      let wins = 0
      let earnings = 0

      if (apps) {
        for (const app of apps as (Application & { challenges: Pick<Challenge, 'id' | 'title' | 'prize_amount'> })[]) {
          const subStatus = submissionMap[app.challenge_id] || null
          history.push({
            challenge_id: app.challenge_id,
            challenge_title: app.challenges?.title || 'Unknown',
            prize_amount: app.challenges?.prize_amount || 0,
            application_status: app.status,
            submission_status: subStatus,
          })
          if (subStatus === 'winner') {
            wins++
            earnings += app.challenges?.prize_amount || 0
          }
        }
      }

      setChallengeHistory(history)
      setWinCount(wins)
      setTotalEarnings(earnings)
    }

    async function loadBrandChallenges(supabase: ReturnType<typeof createClient>, userId: string) {
      const { data: challenges } = await supabase
        .from('challenges')
        .select('id, title, status, prize_amount')
        .eq('brand_id', userId)
        .order('created_at', { ascending: false })

      if (challenges) {
        const items: BrandChallengeItem[] = []
        for (const c of challenges as Pick<Challenge, 'id' | 'title' | 'status' | 'prize_amount'>[]) {
          const { count } = await supabase
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .eq('challenge_id', c.id)

          items.push({
            id: c.id,
            title: c.title,
            status: c.status,
            prize_amount: c.prize_amount,
            applicant_count: count || 0,
          })
        }
        setBrandChallenges(items)
      }
    }

    loadProfile()
  }, [router])

  const toggleSpecialty = (spec: string) => {
    setSpecialties(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setSaving(true)

    const supabase = createClient()

    // Update badges with specialties
    const otherBadges = (badges || []).filter((b: Record<string, unknown>) => b.type !== 'specialties')
    const updatedBadges = specialties.length > 0
      ? [...otherBadges, { type: 'specialties', values: specialties }]
      : otherBadges

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        company_name: companyName || null,
        bio: bio || null,
        website_url: websiteUrl || null,
        badges: updatedBadges.length > 0 ? updatedBadges : null,
      })
      .eq('id', profile?.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setBadges(updatedBadges)
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

  const getEffectiveStatus = (item: ChallengeHistoryItem): string => {
    if (item.submission_status === 'winner') return 'winner'
    if (item.application_status === 'finalist') return 'finalist'
    return item.application_status
  }

  if (loading) {
    return <div style={styles.wrapper}><p style={{ color: 'var(--text-tertiary)' }}>Loading...</p></div>
  }

  const isOperator = profile?.role === 'operator'
  const isBrand = profile?.role === 'brand'
  const totalCompeted = challengeHistory.filter(h => h.application_status === 'finalist').length
  const winRate = totalCompeted > 0 ? Math.round((winCount / totalCompeted) * 100) : 0

  // Extract "Beat [Brand]" badges
  const beatBadges = (badges || []).filter((b: Record<string, unknown>) => b.type === 'beat')

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h1 style={styles.title}>Profile</h1>
        <p style={styles.subtitle}>
          {isOperator ? 'Your operator profile and challenge history' : 'Manage your brand profile'}
        </p>
      </div>

      <form onSubmit={handleSave} className="profile-form-card" style={styles.form}>
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
            {isOperator ? 'Agency / Company (optional)' : 'Company / Brand name'}
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            style={styles.input}
            placeholder={isOperator ? 'Freelance, agency name, etc.' : 'Your brand or company'}
          />
        </div>

        {/* Bio */}
        <div style={styles.field}>
          <label style={styles.label}>
            {isOperator ? 'Bio' : 'About your brand'}
          </label>
          <textarea
            value={bio}
            onChange={(e) => {
              if (e.target.value.length <= 280) setBio(e.target.value)
            }}
            style={{ ...styles.input, height: '100px', resize: 'vertical' as const, paddingTop: '12px' }}
            placeholder={isOperator
              ? 'CRO specialist with 5+ years, worked with DTC brands...'
              : 'DTC brand doing $X/year, looking to optimize...'
            }
            maxLength={280}
          />
          {isOperator && (
            <span style={{ fontSize: '12px', color: 'var(--text-quaternary)', marginTop: '4px', display: 'block' }}>
              {bio.length}/280
            </span>
          )}
        </div>

        {/* Portfolio URL */}
        <div style={styles.field}>
          <label style={styles.label}>
            {isOperator ? 'Portfolio URL' : 'Website URL'}
          </label>
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            style={styles.input}
            placeholder="https://yoursite.com"
          />
        </div>

        {/* Specialties (Operator only) */}
        {isOperator && (
          <div style={styles.field}>
            <label style={styles.label}>Specialties</label>
            <div style={styles.pillContainer}>
              {SPECIALTIES.map((spec) => {
                const isSelected = specialties.includes(spec)
                return (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => toggleSpecialty(spec)}
                    style={{
                      ...styles.pill,
                      ...(isSelected ? styles.pillActive : {}),
                    }}
                  >
                    {spec}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {error && <p style={styles.error}>{error}</p>}
        {success && <p style={styles.success}>Profile updated!</p>}

        <button type="submit" disabled={saving} style={styles.button}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Operator: Challenge History */}
      {isOperator && (
        <>
          {/* Stats Row */}
          <div className="profile-stats-row" style={styles.statsRow}>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{challengeHistory.length}</span>
              <span style={styles.statLabel}>Applied</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{winCount}</span>
              <span style={styles.statLabel}>Wins</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{winRate}%</span>
              <span style={styles.statLabel}>Win Rate</span>
            </div>
            <div style={styles.statCard}>
              <span style={{ ...styles.statValue, color: 'var(--accent)' }}>
                {formatCurrency(totalEarnings)}
              </span>
              <span style={styles.statLabel}>Earnings</span>
            </div>
          </div>

          {/* Challenge History List */}
          <div className="profile-section-card" style={styles.section}>
            <h2 style={styles.sectionTitle}>Challenge History</h2>
            {challengeHistory.length === 0 ? (
              <p style={styles.emptyText}>No challenges yet. Browse open challenges to get started.</p>
            ) : (
              <div style={styles.historyList}>
                {challengeHistory.map((item) => (
                  <Link
                    key={item.challenge_id}
                    href={`/challenges/${item.challenge_id}`}
                    style={styles.historyItem}
                  >
                    <div style={styles.historyInfo}>
                      <span style={styles.historyTitle}>{item.challenge_title}</span>
                      <span style={styles.historyPrize}>{formatCurrency(item.prize_amount)}</span>
                    </div>
                    <StatusBadge status={getEffectiveStatus(item)} variant="application" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Badges */}
          {beatBadges.length > 0 && (
            <div className="profile-section-card" style={styles.section}>
              <h2 style={styles.sectionTitle}>Badges</h2>
              <div style={styles.badgeGrid}>
                {beatBadges.map((badge, i) => (
                  <div key={i} style={styles.badgeCard}>
                    <span style={styles.badgeIcon}>&#9876;</span>
                    <span style={styles.badgeText}>
                      Beat {(badge as Record<string, string>).brand_name || 'Unknown'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Brand: Challenges Posted */}
      {isBrand && (
        <div className="profile-section-card" style={styles.section}>
          <h2 style={styles.sectionTitle}>Challenges Posted</h2>
          {brandChallenges.length === 0 ? (
            <p style={styles.emptyText}>No challenges posted yet.</p>
          ) : (
            <div style={styles.historyList}>
              {brandChallenges.map((item) => (
                <Link
                  key={item.id}
                  href={`/challenges/${item.id}/manage`}
                  style={styles.historyItem}
                >
                  <div style={styles.historyInfo}>
                    <span style={styles.historyTitle}>{item.title}</span>
                    <span style={styles.historyMeta}>
                      {formatCurrency(item.prize_amount)} &middot; {item.applicant_count} applicant{item.applicant_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <StatusBadge status={item.status} variant="challenge" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

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
            {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '\u2014'}
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
    boxSizing: 'border-box' as const,
  },
  pillContainer: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  pill: {
    padding: '6px 16px',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-tertiary)',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-secondary)',
    borderRadius: '9999px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
  },
  pillActive: {
    color: 'var(--accent)',
    background: 'rgba(138, 143, 255, 0.1)',
    borderColor: 'var(--accent)',
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
  // Stats row
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginBottom: '24px',
  },
  statCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '12px',
    padding: '20px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
  },
  statValue: {
    fontSize: '22px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  statLabel: {
    fontSize: '12px',
    color: 'var(--text-quaternary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    fontWeight: 500,
  },
  // Sections
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
  emptyText: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
    marginTop: '12px',
  },
  // History list
  historyList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    marginTop: '16px',
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'background 0.15s ease',
    cursor: 'pointer',
    borderBottom: '1px solid var(--border-primary)',
  },
  historyInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  historyTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  historyPrize: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
  },
  historyMeta: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
  },
  // Badges
  badgeGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '10px',
    marginTop: '16px',
  },
  badgeCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    background: 'rgba(46, 213, 115, 0.08)',
    border: '1px solid rgba(46, 213, 115, 0.2)',
    borderRadius: '10px',
  },
  badgeIcon: {
    fontSize: '16px',
  },
  badgeText: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#2ed573',
  },
  // Account info
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
