'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'
import NotificationDropdown from '@/components/NotificationDropdown'

interface NavbarProps {
  profile: Profile
}

export default function Navbar({ profile }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  return (
    <nav style={styles.nav}>
      <div className="navbar-inner" style={styles.inner}>
        <div className="navbar-left" style={styles.left}>
          <Link href="/" className="navbar-logo" style={styles.logo}>
            Beat My Funnel
          </Link>
          <div className="navbar-links" style={styles.links}>
            <Link
              href="/dashboard"
              style={{
                ...styles.link,
                ...(isActive('/dashboard') ? styles.linkActive : {}),
              }}
            >
              Dashboard
            </Link>
            <Link
              href="/challenges"
              style={{
                ...styles.link,
                ...(isActive('/challenges') ? styles.linkActive : {}),
              }}
            >
              Challenges
            </Link>
          </div>
        </div>
        <div className="navbar-right" style={styles.right}>
          <NotificationDropdown />
          <Link href="/profile" className="navbar-username" style={{ ...styles.userName, textDecoration: 'none', cursor: 'pointer' }}>
            {profile.display_name}
          </Link>
          <button onClick={handleSignOut} className="navbar-signout" style={styles.signOut}>
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'rgba(8, 9, 10, 0.8)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--border-primary)',
  },
  inner: {
    maxWidth: '1080px',
    margin: '0 auto',
    padding: '0 24px',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  },
  logo: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    textDecoration: 'none',
    letterSpacing: '-0.02em',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  link: {
    fontSize: '14px',
    color: 'var(--text-tertiary)',
    textDecoration: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontWeight: 500,
    transition: 'color 0.15s',
  },
  linkActive: {
    color: 'var(--text-primary)',
    background: 'var(--accent-muted)',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userName: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  signOut: {
    fontSize: '13px',
    color: 'var(--text-tertiary)',
    background: 'none',
    border: '1px solid var(--border-primary)',
    borderRadius: '6px',
    padding: '4px 12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  },
}
