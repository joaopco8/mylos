// Server-only — same JUPITER_API_KEY guard as lib/jupiterPrediction.ts.
// Verified live against the real API before writing this (the literal
// spec guessed wrong on several points):
// - There is ONE endpoint for a wallet's bets — GET /positions?ownerPubkey=
//   — not separate /positions and /closed-positions endpoints, and the
//   param is ownerPubkey, not user.
// - Auth is x-api-key, not Authorization: Bearer.
// - There is no "status" field. A position is resolved once its market's
//   marketMetadata.status is no longer "open"; among resolved positions,
//   claimable === true means it won (per Jupiter's docs: "Market settled
//   in your favor"), claimable === false means it lost.
// - Positions don't carry a transaction hash — that's only in a separate
//   /history endpoint this feature doesn't need, since bets placed
//   through this app already have their signature saved locally
//   (lib/localBets.ts) at the moment they're sent.

const JUPITER_API = 'https://api.jup.ag/prediction/v1'

function getHeaders() {
  const key = process.env.JUPITER_API_KEY
  if (!key) throw new Error('JUPITER_API_KEY is not set')
  return { 'x-api-key': key }
}

export interface Bet {
  id: string
  marketId: string
  marketTitle: string
  outcome: 'yes' | 'no'
  amountUsdc: number
  valueUsd: number
  pnlUsd: number
  payoutUsd: number
  claimedUsd: number
  /** Average entry price per contract, 0-1 (e.g. 0.42 = 42¢) */
  odds: number
  /** Current market price per contract, 0-1; only meaningful while open */
  currentOdds: number
  status: 'open' | 'won' | 'lost'
  placedAt: string
  settledAt?: string
  marketUrl: string
}

interface JupiterPositionRaw {
  pubkey: string
  marketId: string
  isYes: boolean
  totalCostUsd?: string | number
  valueUsd?: string | number | null
  pnlUsd?: string | number
  payoutUsd?: string | number
  claimedUsd?: string | number
  claimable?: boolean
  claimed?: boolean
  avgPriceUsd?: string | number
  markPriceUsd?: string | number
  // Unix seconds, verified against a live position payload — NOT an ISO string
  openedAt?: number | string
  settlementDate?: number | string
  marketMetadata?: {
    title?: string
    status?: string
    result?: string | null
  }
  eventMetadata?: {
    eventId?: string
    slug?: string
  }
}

function toDollars(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined) return 0
  return Number(raw) / 1_000_000
}

function toIso(unixSeconds: number | string | undefined): string | undefined {
  if (unixSeconds === undefined || unixSeconds === null) return undefined
  const n = Number(unixSeconds)
  if (!Number.isFinite(n) || n <= 0) return undefined
  return new Date(n * 1000).toISOString()
}

function toBet(p: JupiterPositionRaw): Bet {
  const marketStatus = p.marketMetadata?.status
  const isResolved = !!marketStatus && marketStatus !== 'open'
  const status: Bet['status'] = !isResolved ? 'open' : p.claimable ? 'won' : 'lost'
  const eventId = p.eventMetadata?.eventId || p.eventMetadata?.slug || ''

  return {
    id: p.pubkey,
    marketId: p.marketId,
    marketTitle: p.marketMetadata?.title || 'Unknown market',
    outcome: p.isYes ? 'yes' : 'no',
    amountUsdc: toDollars(p.totalCostUsd),
    valueUsd: toDollars(p.valueUsd),
    pnlUsd: toDollars(p.pnlUsd),
    payoutUsd: toDollars(p.payoutUsd),
    claimedUsd: toDollars(p.claimedUsd),
    odds: toDollars(p.avgPriceUsd),
    currentOdds: toDollars(p.markPriceUsd),
    status,
    placedAt: toIso(p.openedAt) || new Date().toISOString(),
    settledAt: isResolved ? toIso(p.settlementDate) : undefined,
    marketUrl: eventId ? `https://jup.ag/prediction/${eventId}` : 'https://jup.ag/prediction',
  }
}

export async function getBets(ownerPubkey: string): Promise<Bet[]> {
  try {
    const res = await fetch(
      // Jupiter caps the range at 100 items — end=200 gets a 400 back
      `${JUPITER_API}/positions?ownerPubkey=${encodeURIComponent(ownerPubkey)}&end=100`,
      { headers: getHeaders() }
    )
    if (!res.ok) {
      console.error('[Jupiter] Positions fetch failed:', res.status, await res.text())
      return []
    }
    const data = await res.json()
    const positions: JupiterPositionRaw[] = data.data || []
    return positions.map(toBet)
  } catch (e) {
    console.error('[Jupiter] Positions error:', e)
    return []
  }
}
