import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/navbar'
import { AuthProvider } from '@/components/auth-provider'
import type { Profile } from '@/types/database'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  return (
    <AuthProvider initialProfile={profile as Profile}>
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', overflowX: 'hidden', maxWidth: '100vw' }}>
        <Navbar />
        <main className="app-main" style={styles.main}>{children}</main>
      </div>
    </AuthProvider>
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    maxWidth: '1080px',
    margin: '0 auto',
    padding: '32px 24px',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
}
