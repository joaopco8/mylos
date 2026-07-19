// Server-only — talks to Jupiter's real Prediction Market API
// (https://developers.jup.ag/docs/prediction/events-and-markets),
// verified live against the real endpoint before writing this:
// - auth is `x-api-key`, not `Authorization: Bearer`
// - listing is `GET /events/search`, not `/markets`
// - an event's `markets` array is only populated with `includeMarkets=true`
// - each market's pricing is in micro-USD (1,000,000 units = $1.00)
// - placing a trade is `POST /orders` (plural), which returns an
//   UNSIGNED transaction for the user's own wallet to sign — the API key
//   alone cannot place a trade on someone's behalf. Never NEXT_PUBLIC:
//   this key is server-only, same as every other provider key in lib/.

const JUPITER_API = 'https://api.jup.ag/prediction/v1'
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
export const MIN_ORDER_USDC = 5

function getHeaders() {
  const key = process.env.JUPITER_API_KEY
  if (!key) throw new Error('JUPITER_API_KEY is not set')
  return { 'x-api-key': key }
}

export interface PredictionMarket {
  id: string
  eventId: string
  title: string
  teamName: string | null
  yesPrice: number
  noPrice: number
  volume: number
  url: string
}

interface JupiterPricing {
  buyYesPriceUsd?: number
  buyNoPriceUsd?: number
  volume?: number
}

interface JupiterMarketRaw {
  marketId: string
  title: string
  status: string
  pricing?: JupiterPricing
  team?: { name: string } | null
}

interface JupiterEventRaw {
  eventId: string
  metadata?: { slug?: string; title?: string }
  markets?: JupiterMarketRaw[]
}

function toMicroDollars(raw: number | undefined, fallback: number): number {
  return (raw ?? fallback) / 1_000_000
}

function toPredictionMarket(event: JupiterEventRaw, m: JupiterMarketRaw): PredictionMarket {
  return {
    id: m.marketId,
    eventId: event.eventId,
    title: m.title,
    teamName: m.team?.name ?? null,
    yesPrice: toMicroDollars(m.pricing?.buyYesPriceUsd, 500_000),
    noPrice: toMicroDollars(m.pricing?.buyNoPriceUsd, 500_000),
    volume: toMicroDollars(m.pricing?.volume, 0),
    // Verified live: jup.ag/prediction/{eventId} renders the real event
    // page; both /prediction/event/{slug} and /prediction/{slug} render
    // Jupiter's own "No event found" — the slug isn't a valid path segment
    // on their frontend at all, only the raw eventId is.
    url: `https://jup.ag/prediction/${event.eventId}`,
  }
}

// Searches Jupiter's real sports events for the given match, e.g.
// "France" + "Morocco" -> the "France vs. Morocco" moneyline event, and
// flattens its per-team markets (each team's "will they win" Yes/No
// market, plus Draw) into a flat list capped at 3.
// `/events/search` is documented but was consistently slow/timing out
// when this was tested live — `/events?subcategory=fifwc` (the World
// Cup subcategory) returns the same data fast and reliably, so listing
// + filtering client-side (here, server-side) beats the flaky search
// endpoint. Paginated across two pages since the World Cup alone has
// 60+ non-moneyline events (props, awards, H2H goal bets, ...) ahead of
// the actual match events in the default ordering.
// Jupiter's beta API has been observed hanging 15-20s+ under load — cap
// each request so a slow upstream degrades to "no markets shown" instead
// of hanging the chat UI's effect indefinitely.
const FETCH_TIMEOUT_MS = 8000

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { headers: getHeaders(), signal: controller.signal })
  } catch (e) {
    console.error('[Jupiter] Request timed out or failed:', url, e)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchWorldCupEvents(): Promise<JupiterEventRaw[]> {
  const pages = await Promise.all(
    [0, 50].map(async start => {
      const res = await fetchWithTimeout(
        `${JUPITER_API}/events?category=sports&subcategory=fifwc&limit=50&start=${start}&includeMarkets=true`
      )
      if (!res || !res.ok) return { data: [] }
      return res.json()
    })
  )
  return pages.flatMap(p => p.data || [])
}

export async function getWorldCupMarkets(
  homeTeam: string,
  awayTeam: string
): Promise<PredictionMarket[]> {
  try {
    const events = await fetchWorldCupEvents()

    // A loose "title mentions both team names" match also catches prop
    // markets like "What will the announcers say during Argentina vs
    // Spain World Cup Match?" — require the real moneyline event's exact
    // "Team A vs. Team B" title shape instead.
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const home = escapeRegex(homeTeam)
    const away = escapeRegex(awayTeam)
    const moneylinePattern = new RegExp(
      `^(${home}\\s+vs\\.?\\s+${away}|${away}\\s+vs\\.?\\s+${home})$`,
      'i'
    )
    const match = events.find(e =>
      moneylinePattern.test((e.metadata?.title || '').trim())
    )
    if (!match) return []

    return (match.markets || [])
      .filter(m => m.status === 'open')
      .slice(0, 3)
      .map(m => toPredictionMarket(match, m))
  } catch (e) {
    console.error('[Jupiter] Error:', e)
    return []
  }
}

export interface OrderTransaction {
  transaction: string | null
  txMeta: { blockhash: string; lastValidBlockHeight: number } | null
  error?: string
}

// Builds (but does not sign or submit) a buy order — Jupiter returns a
// base64 unsigned transaction that the caller's own wallet must sign.
export async function buildOrderTransaction(params: {
  marketId: string
  isYes: boolean
  amountUsdc: number
  ownerPubkey: string
}): Promise<OrderTransaction> {
  if (params.amountUsdc < MIN_ORDER_USDC) {
    return { transaction: null, txMeta: null, error: `Minimum order is $${MIN_ORDER_USDC}` }
  }

  const res = await fetch(`${JUPITER_API}/orders`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ownerPubkey: params.ownerPubkey,
      marketId: params.marketId,
      isYes: params.isYes,
      isBuy: true,
      depositAmount: String(Math.round(params.amountUsdc * 1_000_000)),
      depositMint: USDC_MINT,
    }),
  })

  const data = await res.json()
  if (!res.ok || !data.transaction) {
    return { transaction: null, txMeta: null, error: data.message || 'Failed to build order' }
  }

  return { transaction: data.transaction, txMeta: data.txMeta }
}
