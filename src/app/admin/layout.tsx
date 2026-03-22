import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/dashboard')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || (profile as Profile).role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <div style={styles.navLeft}>
            <Link href="/admin" style={styles.logo}>
              Beat My Funnel <span style={styles.logoAdmin}>Admin</span>
            </Link>
            <div style={styles.navLinks}>
              <Link href="/admin" style={styles.navLink}>Overview</Link>
              <Link href="/admin/challenges" style={styles.navLink}>Challenges</Link>
              <Link href="/admin/users" style={styles.navLink}>Users</Link>
            </div>
          </div>
          <Link href="/dashboard" style={styles.backLink}>
            &larr; Back to Site
          </Link>
        </div>
      </nav>
      <main style={styles.main}>{children}</main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    borderBottom: '1px solid var(--border-primary)',
    background: 'var(--bg-card)',
  },
  navInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  },
  logo: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    textDecoration: 'none',
    letterSpacing: '-0.02em',
  },
  logoAdmin: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--accent)',
    marginLeft: '6px',
    padding: '2px 8px',
    background: 'rgba(138, 143, 255, 0.12)',
    borderRadius: '4px',
  },
  navLinks: {
    display: 'flex',
    gap: '24px',
  },
  navLink: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    fontWeight: 400,
  },
  backLink: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    textDecoration: 'none',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 24px',
  },
}
