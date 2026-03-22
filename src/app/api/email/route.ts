import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendEmail,
  emailNewApplication,
  emailSelectedAsFinalist,
  emailNewSubmission,
  emailSelectedForTesting,
  emailWinner,
  emailChallengeComplete,
  emailRefund,
  emailChallengeResult,
} from '@/lib/email'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { type, data } = await request.json()
  const admin = createAdminClient()

  try {
    switch (type) {
      case 'new_application': {
        // Get brand email
        const { data: challenge } = await admin.from('challenges').select('*, brand:profiles!brand_id(*)').eq('id', data.challengeId).single()
        if (!challenge) break
        const { data: brandAuth } = await admin.auth.admin.getUserById(challenge.brand_id)
        const { data: operator } = await admin.from('profiles').select('*').eq('id', data.operatorId).single()

        if (brandAuth?.user?.email && operator) {
          const email = emailNewApplication(challenge.brand.display_name, challenge.title, operator.display_name, challenge.id)
          await sendEmail({ to: brandAuth.user.email, ...email })
        }
        break
      }

      case 'finalist_selected': {
        const { data: challenge } = await admin.from('challenges').select('*').eq('id', data.challengeId).single()
        if (!challenge) break
        const { data: operator } = await admin.from('profiles').select('*').eq('id', data.operatorId).single()
        const { data: operatorAuth } = await admin.auth.admin.getUserById(data.operatorId)

        if (operatorAuth?.user?.email && operator) {
          const email = emailSelectedAsFinalist(operator.display_name, challenge.title, challenge.id)
          await sendEmail({ to: operatorAuth.user.email, ...email })
        }
        break
      }

      case 'new_submission': {
        const { data: challenge } = await admin.from('challenges').select('*, brand:profiles!brand_id(*)').eq('id', data.challengeId).single()
        if (!challenge) break
        const { data: brandAuth } = await admin.auth.admin.getUserById(challenge.brand_id)
        const { data: operator } = await admin.from('profiles').select('*').eq('id', data.operatorId).single()

        if (brandAuth?.user?.email && operator) {
          const email = emailNewSubmission(challenge.brand.display_name, challenge.title, operator.display_name, challenge.id)
          await sendEmail({ to: brandAuth.user.email, ...email })
        }
        break
      }

      case 'selected_for_testing': {
        const { data: challenge } = await admin.from('challenges').select('*').eq('id', data.challengeId).single()
        if (!challenge) break
        const { data: operator } = await admin.from('profiles').select('*').eq('id', data.operatorId).single()
        const { data: operatorAuth } = await admin.auth.admin.getUserById(data.operatorId)

        if (operatorAuth?.user?.email && operator) {
          const email = emailSelectedForTesting(operator.display_name, challenge.title)
          await sendEmail({ to: operatorAuth.user.email, ...email })
        }
        break
      }

      case 'winner_confirmed': {
        const { data: challenge } = await admin.from('challenges').select('*, brand:profiles!brand_id(*)').eq('id', data.challengeId).single()
        if (!challenge) break
        const { data: winner } = await admin.from('profiles').select('*').eq('id', data.winnerId).single()
        const { data: winnerAuth } = await admin.auth.admin.getUserById(data.winnerId)
        const { data: brandAuth } = await admin.auth.admin.getUserById(challenge.brand_id)

        // Email winner
        if (winnerAuth?.user?.email && winner) {
          const email = emailWinner(winner.display_name, challenge.title, challenge.prize_amount)
          await sendEmail({ to: winnerAuth.user.email, ...email })
        }

        // Email brand
        if (brandAuth?.user?.email && winner) {
          const email = emailChallengeComplete(challenge.brand.display_name, challenge.title, winner.display_name, challenge.id)
          await sendEmail({ to: brandAuth.user.email, ...email })
        }

        // Email all other finalists
        const { data: submissions } = await admin.from('submissions').select('operator_id').eq('challenge_id', data.challengeId).neq('operator_id', data.winnerId)
        if (submissions) {
          for (const sub of submissions) {
            const { data: op } = await admin.from('profiles').select('*').eq('id', sub.operator_id).single()
            const { data: opAuth } = await admin.auth.admin.getUserById(sub.operator_id)
            if (opAuth?.user?.email && op) {
              const email = emailChallengeResult(op.display_name, challenge.title, false)
              await sendEmail({ to: opAuth.user.email, ...email })
            }
          }
        }
        break
      }

      case 'refund': {
        const { data: challenge } = await admin.from('challenges').select('*, brand:profiles!brand_id(*)').eq('id', data.challengeId).single()
        if (!challenge) break
        const { data: brandAuth } = await admin.auth.admin.getUserById(challenge.brand_id)

        if (brandAuth?.user?.email) {
          const email = emailRefund(challenge.brand.display_name, challenge.title)
          await sendEmail({ to: brandAuth.user.email, ...email })
        }
        break
      }

      default:
        return NextResponse.json({ error: 'Unknown email type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Email error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
