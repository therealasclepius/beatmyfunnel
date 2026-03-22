import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const { email, password, displayName, role } = await request.json()

  if (!email || !password || !displayName || !role) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  if (!['brand', 'operator'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Create the auth user
  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm for now (skip email verification)
    user_metadata: { role, display_name: displayName },
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  // Create the profile using service role (bypasses RLS)
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userData.user.id,
    role,
    display_name: displayName,
  })

  if (profileError) {
    // Clean up the auth user if profile creation fails
    await supabase.auth.admin.deleteUser(userData.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
