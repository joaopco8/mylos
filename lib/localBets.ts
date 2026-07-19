'use client'

import type { Bet } from './jupiterBets'

// Client-side cache of bets placed through this app, for instant feedback
// right after signing — Jupiter's /positions endpoint takes a moment to
// index a just-submitted order, so without this the "My Bets" page would
// show nothing for a freshly-placed bet until that catches up.
//
// Positions from Jupiter aggregate every order on the same market+side
// into one record (see lib/jupiterBets.ts), so once the real API reflects
// a market+outcome this app also has a local entry for, the local one is
// dropped rather than double-counted — matched by marketId+outcome, not
// a transaction hash, since Jupiter positions don't carry one.

const LOCAL_KEY = 'mylos_pending_bets'

export function saveBetLocally(bet: {
  marketId: string
  marketTitle: string
  outcome: 'yes' | 'no'
  amountUsdc: number
  odds: number
  txHash: string
  marketUrl: string
}): void {
  if (typeof window === 'undefined') return
  const existing = getLocalBets()
  const newBet: Bet = {
    id: bet.txHash,
    marketId: bet.marketId,
    marketTitle: bet.marketTitle,
    outcome: bet.outcome,
    amountUsdc: bet.amountUsdc,
    valueUsd: bet.amountUsdc,
    pnlUsd: 0,
    payoutUsd: 0,
    claimedUsd: 0,
    status: 'open',
    placedAt: new Date().toISOString(),
    marketUrl: bet.marketUrl,
  }
  try {
    localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify([newBet, ...existing].slice(0, 50))
    )
  } catch {
    // best-effort cache only
  }
}

export function getLocalBets(): Bet[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')
  } catch {
    return []
  }
}

// Local entries whose market+outcome Jupiter's own data already covers
// are dropped, so a synced bet is never shown twice.
export function mergeBets(remoteBets: Bet[], localBets: Bet[]): Bet[] {
  const remoteKeys = new Set(remoteBets.map(b => `${b.marketId}:${b.outcome}`))
  const unsyncedLocal = localBets.filter(b => !remoteKeys.has(`${b.marketId}:${b.outcome}`))
  return [...unsyncedLocal, ...remoteBets]
}
