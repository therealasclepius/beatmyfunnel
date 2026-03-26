'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

type Screen = {
  title: string
  subtitle: string
  content: React.ReactNode
  cta?: { label: string; href: string }
}

function getBrandScreens(): Screen[] {
  return [
    {
      title: 'Welcome to Beat My Funnel',
      subtitle: 'The performance marketplace where real results win.',
      content: (
        <p style={textStyles.body}>
          Post a challenge with a real metric. Operators compete to beat it. The winner gets paid
          automatically — and you get a proven performer you can hire with confidence.
        </p>
      ),
    },
    {
      title: 'How challenges work',
      subtitle: 'Three simple steps to better results.',
      content: (
        <div style={textStyles.stepsGrid}>
          <div style={textStyles.step}>
            <div style={textStyles.stepNumber}>1</div>
            <div>
              <p style={textStyles.stepTitle}>Post a challenge</p>
              <p style={textStyles.stepDesc}>
                Define your metric, baseline, and prize. Funds go into escrow.
              </p>
            </div>
          </div>
          <div style={textStyles.step}>
            <div style={textStyles.stepNumber}>2</div>
            <div>
              <p style={textStyles.stepTitle}>Select finalists</p>
              <p style={textStyles.stepDesc}>
                Review applications and pick 3-5 operators to compete.
              </p>
            </div>
          </div>
          <div style={textStyles.step}>
            <div style={textStyles.stepNumber}>3</div>
            <div>
              <p style={textStyles.stepTitle}>Verify and pay</p>
              <p style={textStyles.stepDesc}>
                Results are verified automatically. The winner gets paid from escrow.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Create your first challenge',
      subtitle: 'Ready to find someone who can beat your metrics?',
      content: (
        <p style={textStyles.body}>
          Set up your first challenge and start receiving applications from operators who are ready
          to prove their skills.
        </p>
      ),
      cta: { label: 'Create a Challenge', href: '/challenges/new' },
    },
  ]
}

function getOperatorScreens(): Screen[] {
  return [
    {
      title: 'Welcome to Beat My Funnel',
      subtitle: 'The marketplace where skills speak louder than pitches.',
      content: (
        <p style={textStyles.body}>
          No more pitch decks. No more unpaid spec work. Apply to challenges, prove your skills
          with real results, and get paid when you win.
        </p>
      ),
    },
    {
      title: 'How competing works',
      subtitle: 'Four steps from application to payout.',
      content: (
        <div style={textStyles.stepsGrid}>
          <div style={textStyles.step}>
            <div style={textStyles.stepNumber}>1</div>
            <div>
              <p style={textStyles.stepTitle}>Apply</p>
              <p style={textStyles.stepDesc}>
                Browse open challenges and apply with a quick pitch.
              </p>
            </div>
          </div>
          <div style={textStyles.step}>
            <div style={textStyles.stepNumber}>2</div>
            <div>
              <p style={textStyles.stepTitle}>Get selected</p>
              <p style={textStyles.stepDesc}>
                Brands review applications and pick finalists to compete.
              </p>
            </div>
          </div>
          <div style={textStyles.step}>
            <div style={textStyles.stepNumber}>3</div>
            <div>
              <p style={textStyles.stepTitle}>Submit your work</p>
              <p style={textStyles.stepDesc}>
                Build your version and submit it for live testing.
              </p>
            </div>
          </div>
          <div style={textStyles.step}>
            <div style={textStyles.stepNumber}>4</div>
            <div>
              <p style={textStyles.stepTitle}>Win</p>
              <p style={textStyles.stepDesc}>
                Beat the baseline and the prize releases automatically.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Complete your profile',
      subtitle: 'Stand out to brands with a strong profile.',
      content: (
        <p style={textStyles.body}>
          Add your bio, relevant experience, and portfolio links. A complete profile increases
          your chances of being selected as a finalist.
        </p>
      ),
      cta: { label: 'Complete Profile', href: '/profile' },
    },
  ]
}

export default function OnboardingPage() {
  const router = useRouter()
  const [currentScreen, setCurrentScreen] = useState(0)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()

      if (!data) {
        router.push('/login')
        return
      }

      const typedProfile = data as Profile

      if (typedProfile.onboarding_completed) {
        router.push('/dashboard')
        return
      }

      setProfile(typedProfile)
      setLoading(false)
    }
    load()
  }, [router])

  const completeOnboarding = async (redirectTo?: string) => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id)

    router.push(redirectTo || '/dashboard')
    router.refresh()
  }

  if (loading || !profile) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>Loading...</p>
        </div>
      </div>
    )
  }

  const screens = profile.role === 'brand' ? getBrandScreens() : getOperatorScreens()
  const screen = screens[currentScreen]
  const isLast = currentScreen === screens.length - 1

  const handleNext = () => {
    if (isLast) {
      completeOnboarding(screen.cta?.href)
    } else {
      setCurrentScreen((prev) => prev + 1)
    }
  }

  const handleSkip = () => {
    completeOnboarding()
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div className="onboarding-content" style={styles.content}>
          <h1 style={styles.title}>{screen.title}</h1>
          <p style={styles.subtitle}>{screen.subtitle}</p>
          <div style={styles.body}>{screen.content}</div>
        </div>

        <div className="onboarding-footer" style={styles.footer}>
          {/* Progress dots */}
          <div style={styles.dots}>
            {screens.map((_, i) => (
              <span
                key={i}
                style={{
                  ...styles.dot,
                  ...(i === currentScreen ? styles.dotActive : {}),
                }}
              />
            ))}
          </div>

          <div style={styles.buttons}>
            <button onClick={handleSkip} style={styles.skipButton}>
              Skip
            </button>
            {isLast && screen.cta ? (
              <button onClick={handleNext} style={styles.primaryButton}>
                {screen.cta.label}
              </button>
            ) : (
              <button onClick={handleNext} style={styles.primaryButton}>
                {isLast ? 'Get Started' : 'Next'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const textStyles: Record<string, React.CSSProperties> = {
  body: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: 'var(--text-secondary)',
    margin: 0,
  },
  stepsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  step: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
  },
  stepNumber: {
    flexShrink: 0,
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    background: 'rgba(255, 255, 255, 0.06)',
    borderRadius: '8px',
  },
  stepTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-primary)',
    margin: '0 0 4px 0',
  },
  stepDesc: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    lineHeight: '1.5',
    margin: 0,
  },
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 56px)',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: '520px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '16px',
    overflow: 'hidden',
  },
  content: {
    padding: '48px 40px 32px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '15px',
    color: 'var(--text-tertiary)',
    margin: '0 0 32px 0',
    lineHeight: '1.5',
  },
  body: {
    minHeight: '120px',
  },
  footer: {
    padding: '24px 40px 32px',
    borderTop: '1px solid var(--border-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dots: {
    display: 'flex',
    gap: '8px',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.1)',
    transition: 'background 0.2s',
  },
  dotActive: {
    background: 'var(--text-primary)',
  },
  buttons: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  skipButton: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-tertiary)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: '8px 16px',
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    height: '40px',
    padding: '0 24px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--bg-primary)',
    background: 'var(--text-primary)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
}
