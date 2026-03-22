import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createTransaction,
  getTransaction,
  disburseTransaction,
  cancelTransaction,
} from '@/lib/escrow'

type EscrowAction = 'create' | 'status' | 'disburse' | 'cancel'

interface EscrowRequestBody {
  action: EscrowAction
  challengeId: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: EscrowRequestBody = await request.json()
  const { action, challengeId } = body

  if (!action || !challengeId) {
    return NextResponse.json(
      { error: 'Missing required fields: action, challengeId' },
      { status: 400 }
    )
  }

  // Get user profile for role check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const isAdmin = profile.role === 'admin'

  // Get the challenge
  const { data: challenge } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single()

  if (!challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
  }

  // ── CREATE ─────────────────────────────────────────────────────────
  if (action === 'create') {
    // Only the brand owner or admin can create escrow
    if (challenge.brand_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (challenge.escrow_transaction_id) {
      return NextResponse.json(
        { error: 'Escrow transaction already exists for this challenge' },
        { status: 400 }
      )
    }

    const transaction = await createTransaction({
      challengeTitle: challenge.title,
      prizeAmountCents: challenge.prize_amount,
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Failed to create escrow transaction' },
        { status: 500 }
      )
    }

    // Store the transaction ID on the challenge
    await supabase
      .from('challenges')
      .update({
        escrow_transaction_id: String(transaction.id),
        payment_status: 'escrow_created',
      })
      .eq('id', challengeId)

    return NextResponse.json({
      transactionId: transaction.id,
      status: transaction.status,
    })
  }

  // ── STATUS ─────────────────────────────────────────────────────────
  if (action === 'status') {
    if (!challenge.escrow_transaction_id) {
      return NextResponse.json(
        { error: 'No escrow transaction for this challenge' },
        { status: 404 }
      )
    }

    const transaction = await getTransaction(challenge.escrow_transaction_id)

    if (!transaction) {
      return NextResponse.json(
        { error: 'Failed to fetch escrow transaction' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      transactionId: transaction.id,
      status: transaction.status,
      currency: transaction.currency,
      description: transaction.description,
    })
  }

  // ── DISBURSE ───────────────────────────────────────────────────────
  if (action === 'disburse') {
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    if (!challenge.escrow_transaction_id) {
      return NextResponse.json(
        { error: 'No escrow transaction for this challenge' },
        { status: 404 }
      )
    }

    const transaction = await disburseTransaction(challenge.escrow_transaction_id)

    if (!transaction) {
      return NextResponse.json(
        { error: 'Failed to disburse escrow transaction' },
        { status: 500 }
      )
    }

    // Update payment status
    await supabase
      .from('challenges')
      .update({ payment_status: 'disbursed' })
      .eq('id', challengeId)

    return NextResponse.json({
      transactionId: transaction.id,
      status: transaction.status,
    })
  }

  // ── CANCEL ─────────────────────────────────────────────────────────
  if (action === 'cancel') {
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    if (!challenge.escrow_transaction_id) {
      return NextResponse.json(
        { error: 'No escrow transaction for this challenge' },
        { status: 404 }
      )
    }

    const transaction = await cancelTransaction(challenge.escrow_transaction_id)

    if (!transaction) {
      return NextResponse.json(
        { error: 'Failed to cancel escrow transaction' },
        { status: 500 }
      )
    }

    // Update payment status
    await supabase
      .from('challenges')
      .update({ payment_status: 'refunded' })
      .eq('id', challengeId)

    return NextResponse.json({
      transactionId: transaction.id,
      status: transaction.status,
    })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
