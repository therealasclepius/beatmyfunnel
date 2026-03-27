import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect app routes
  const protectedPaths = ['/dashboard', '/challenges/new', '/admin', '/profile', '/onboarding']
  const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from auth pages
  const authPaths = ['/login', '/signup']
  const isAuthPage = authPaths.some(path => request.nextUrl.pathname === path)

  if (isAuthPage && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Allow access to /verify-email without email check (avoid redirect loop)
  const isVerifyEmailPage = request.nextUrl.pathname === '/verify-email'

  // Check email verification for authenticated users on protected routes
  if (user && isProtected && !isVerifyEmailPage) {
    const emailConfirmedAt = user.email_confirmed_at
    if (!emailConfirmedAt) {
      const url = request.nextUrl.clone()
      url.pathname = '/verify-email'
      return NextResponse.redirect(url)
    }
  }

  // If user is on /verify-email but already verified, redirect to dashboard
  if (user && isVerifyEmailPage) {
    const emailConfirmedAt = user.email_confirmed_at
    if (emailConfirmedAt) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Redirect to onboarding if not completed (skip if already on onboarding or admin)
  const isOnboardingPage = request.nextUrl.pathname === '/onboarding'
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin')

  if (user && isProtected && !isOnboardingPage && !isAdminPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()

    if (profile && profile.onboarding_completed === false) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/challenges/new', '/admin/:path*', '/profile/:path*', '/login', '/signup', '/onboarding', '/verify-email'],
}
