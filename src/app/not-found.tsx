import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <span style={styles.code}>404</span>
        <h1 style={styles.heading}>Page not found</h1>
        <p style={styles.description}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div style={styles.actions}>
          <Link href="/" style={styles.primaryButton}>
            Go Home
          </Link>
          <Link href="/challenges" style={styles.secondaryButton}>
            Browse Challenges
          </Link>
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
    background: '#08090a',
    padding: '24px',
  },
  container: {
    textAlign: 'center',
    maxWidth: '480px',
  },
  code: {
    fontSize: '96px',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '-0.04em',
    lineHeight: 1,
    display: 'block',
    marginBottom: '16px',
  },
  heading: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#fff',
    marginBottom: '12px',
    letterSpacing: '-0.02em',
  },
  description: {
    fontSize: '15px',
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 1.6,
    marginBottom: '32px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    height: '44px',
    padding: '0 24px',
    fontSize: '15px',
    fontWeight: 500,
    color: '#08090a',
    background: '#fff',
    border: 'none',
    borderRadius: '8px',
    textDecoration: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    height: '44px',
    padding: '0 24px',
    fontSize: '15px',
    fontWeight: 500,
    color: '#fff',
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    textDecoration: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
}
