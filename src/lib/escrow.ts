/**
 * Escrow.com API Client
 *
 * Handles payment escrow for Beat My Funnel challenges.
 * Brand (buyer) funds escrow -> winner (seller) receives funds on completion.
 *
 * Required env vars:
 *   ESCROW_EMAIL    — The email associated with your Escrow.com account
 *   ESCROW_API_KEY  — API key in format "customerNumber_actualKey" (e.g. "18682_XXXXX")
 */

const BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://api.escrow.com/2017-09-01'
    : 'https://api.escrow-sandbox.com/2017-09-01'

const ESCROW_EMAIL = process.env.ESCROW_EMAIL || ''
const ESCROW_API_KEY = process.env.ESCROW_API_KEY || ''

// Platform email used as placeholder seller until a winner is determined
const PLATFORM_EMAIL = process.env.ESCROW_EMAIL || ''

function getAuthHeader(): string {
  const credentials = Buffer.from(`${ESCROW_EMAIL}:${ESCROW_API_KEY}`).toString('base64')
  return `Basic ${credentials}`
}

async function escrowFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T | null> {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(),
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(
        `[Escrow API] ${options.method || 'GET'} ${path} failed (${response.status}):`,
        errorBody
      )
      return null
    }

    const data = await response.json()
    return data as T
  } catch (error) {
    console.error(`[Escrow API] ${options.method || 'GET'} ${path} error:`, error)
    return null
  }
}

// ── Types ──────────────────────────────────────────────────────────────

export interface EscrowTransaction {
  id: number
  status: string
  currency: string
  description: string
  items: EscrowItem[]
  parties: EscrowParty[]
  [key: string]: unknown
}

export interface EscrowItem {
  id: number
  title: string
  description: string
  type: string
  inspection_period: number
  quantity: number
  schedule: EscrowSchedule[]
  [key: string]: unknown
}

export interface EscrowSchedule {
  amount: number
  payer_customer: string
  beneficiary_customer: string
  [key: string]: unknown
}

export interface EscrowParty {
  role: string
  customer: string
  [key: string]: unknown
}

// ── API Functions ──────────────────────────────────────────────────────

export interface CreateTransactionParams {
  challengeTitle: string
  /** Prize amount in cents (from our DB). Will be converted to dollars for Escrow.com. */
  prizeAmountCents: number
  /** Optional seller email. Defaults to platform email as placeholder. */
  sellerEmail?: string
}

/**
 * Creates an escrow transaction for a challenge.
 * Brand is the buyer (payer). Winner/operator will be the seller.
 * Initially uses platform email as placeholder seller since we don't know the winner yet.
 */
export async function createTransaction(
  params: CreateTransactionParams
): Promise<EscrowTransaction | null> {
  const { challengeTitle, prizeAmountCents, sellerEmail } = params
  const amountInDollars = prizeAmountCents / 100
  const seller = sellerEmail || PLATFORM_EMAIL

  const body = {
    parties: [
      { role: 'buyer', customer: 'me' },
      { role: 'seller', customer: seller },
    ],
    currency: 'usd',
    description: `Challenge: ${challengeTitle}`,
    items: [
      {
        title: 'Challenge Prize',
        description: `Performance challenge prize for: ${challengeTitle}`,
        type: 'general_merchandise',
        inspection_period: 259200, // 3 days in seconds
        quantity: 1,
        schedule: [
          {
            amount: amountInDollars,
            payer_customer: 'me',
            beneficiary_customer: seller,
          },
        ],
      },
    ],
  }

  return escrowFetch<EscrowTransaction>('/transaction', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * Get transaction status and details.
 */
export async function getTransaction(
  transactionId: string
): Promise<EscrowTransaction | null> {
  return escrowFetch<EscrowTransaction>(`/transaction/${transactionId}`)
}

/**
 * Mark transaction as funded (after brand pays).
 * In practice, the brand pays through Escrow.com's payment flow.
 * This triggers the funding action on the API side.
 */
export async function fundTransaction(
  transactionId: string
): Promise<EscrowTransaction | null> {
  return escrowFetch<EscrowTransaction>(`/transaction/${transactionId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      action: 'fund',
    }),
  })
}

/**
 * Release funds to the winner.
 * Called when admin confirms the winner of a challenge.
 */
export async function disburseTransaction(
  transactionId: string
): Promise<EscrowTransaction | null> {
  return escrowFetch<EscrowTransaction>(`/transaction/${transactionId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      action: 'release',
    }),
  })
}

/**
 * Cancel transaction and refund the buyer.
 * Called when admin decides there is no winner.
 */
export async function cancelTransaction(
  transactionId: string
): Promise<EscrowTransaction | null> {
  return escrowFetch<EscrowTransaction>(`/transaction/${transactionId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      action: 'cancel',
    }),
  })
}
