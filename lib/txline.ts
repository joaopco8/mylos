import axios from 'axios'

const TXLINE_BASE = process.env.TXLINE_BASE ||
  'https://txline-dev.txodds.com'
const API_TOKEN = process.env.TXLINE_API_TOKEN || ''

// The API token is permanent, but the guest JWT expires (~29 days,
// verified against the current token's exp claim) and needs renewal.
// Seed the cache from .env.local so a fresh server start doesn't request
// a brand new guest session when the existing one is still good.
let cachedJwt: string | null = process.env.TXLINE_JWT || null
let jwtExpiresAt: number = cachedJwt ? Date.now() + 60 * 60 * 1000 : 0

async function getValidJwt(): Promise<string> {
  const now = Date.now()
  // Renew if expired, expiring in the next 5 minutes, or never set
  if (!cachedJwt || now > jwtExpiresAt - 5 * 60 * 1000) {
    const res = await axios.post(`${TXLINE_BASE}/auth/guest/start`)
    cachedJwt = res.data.token
    // Guest JWTs run for weeks; refresh every 12h regardless to be safe
    jwtExpiresAt = now + 12 * 60 * 60 * 1000
    console.log('[TxLINE] JWT renewed')
  }
  return cachedJwt!
}

export async function getHeaders() {
  const jwt = await getValidJwt()
  return {
    'Authorization': `Bearer ${jwt}`,
    'X-Api-Token': API_TOKEN,
    'Content-Type': 'application/json',
  }
}

// Centralized 401 handling: every TxLINE GET goes through here so the
// retry-after-renewing-JWT logic lives in one place instead of being
// duplicated at each call site.
export async function getWithAuthRetry(
  url: string,
  config: { timeout?: number; params?: Record<string, any> } = {}
) {
  const { timeout = 10000, params } = config
  try {
    return await axios.get(url, { headers: await getHeaders(), timeout, params })
  } catch (e: any) {
    if (e.response?.status === 401) {
      console.log('[TxLINE] 401 received, renewing JWT and retrying:', url)
      cachedJwt = null
      jwtExpiresAt = 0
      return await axios.get(url, { headers: await getHeaders(), timeout, params })
    }
    throw e
  }
}

export interface Fixture {
  fixtureId: number
  homeTeam: string
  awayTeam: string
  homeFlag?: string
  awayFlag?: string
  status: 'upcoming' | 'live' | 'finished'
  minute?: number
  startTime?: string
}

export interface Score {
  fixtureId: number
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  halfTimeHomeScore?: number
  halfTimeAwayScore?: number
  status: 'upcoming' | 'live' | 'finished'
  minute?: number
}

export interface Odds {
  fixtureId: number
  homeWin?: number
  draw?: number
  awayWin?: number
  over25?: number
  under25?: number
  btts?: number
}

// The fixture catalog (names/IDs) has no real "list all fixtures" endpoint
// (every guessed path 404s), so it always falls back to a static list. But
// each fixture's live status DOES have a real per-fixture endpoint
// (getScore), so refresh status/minute from there instead of trusting
// whatever frozen value the catalog has — otherwise a fixture marked
// "live" once stays "live" forever, even a day after it actually ended.
async function withLiveStatus(fixtures: Fixture[]): Promise<Fixture[]> {
  return Promise.all(fixtures.map(async (f) => {
    try {
      const score = await getScore(f.fixtureId)
      if (score) {
        return { ...f, status: score.status, minute: score.minute }
      }
    } catch (e) {
      console.log(`[TxLINE] Live status refresh failed for ${f.fixtureId}:`, e)
    }
    return f
  }))
}

// Get live and upcoming World Cup fixtures
export async function getFixtures(): Promise<Fixture[]> {
  const endpoints = [
    '/api/worldcup/fixtures',
    '/api/fixtures/worldcup',
    '/api/fixtures',
    '/api/competitions/worldcup/fixtures',
  ]

  for (const endpoint of endpoints) {
    try {
      const res = await getWithAuthRetry(`${TXLINE_BASE}${endpoint}`)
      const data = res.data
      const fixtures = Array.isArray(data)
        ? data
        : data.fixtures || data.data || data.items || []

      if (fixtures.length > 0) {
        console.log(`[TxLINE] Fixtures found at ${endpoint}`)
        return sortFixtures(await withLiveStatus(fixtures))
      }
    } catch (e: any) {
      console.log(`[TxLINE] ${endpoint} →`, e.response?.status || 'error')
    }
  }

  // Fallback: mock fixtures with real World Cup 2026 teams, but with
  // real-time status/minute pulled from the live per-fixture endpoint
  console.log('[TxLINE] Using mock fixtures (devnet empty)')
  return sortFixtures(await withLiveStatus(getMockFixtures()))
}

// The real snapshot endpoint returns one row per event-type (goal, corner,
// var_end, kickoff, weather, ...), not one row per point-in-time — e.g.
// a "corner" row's Score only carries Corners, a "goal" row's only carries
// Goals. So goals must be read as the max seen for that participant across
// every row (goals only go up), not read off a single "latest" row.
interface RawScoreSnapshotRow {
  GameState?: string
  Participant1Id?: number
  Participant2Id?: number
  Ts?: number
  Clock?: { Running?: boolean; Seconds?: number } | null
  Score?: {
    Participant1?: { H1?: { Goals?: number }; H2?: { Goals?: number }; Total?: { Goals?: number } }
    Participant2?: { H1?: { Goals?: number }; H2?: { Goals?: number }; Total?: { Goals?: number } }
  } | null
}

function maxGoals(rows: RawScoreSnapshotRow[], participant: 'Participant1' | 'Participant2', period: 'H1' | 'H2' | 'Total') {
  let max: number | undefined
  for (const row of rows) {
    const val = row.Score?.[participant]?.[period]?.Goals
    if (typeof val === 'number' && (max === undefined || val > max)) max = val
  }
  return max
}

function parseRealScore(fixtureId: number, rows: RawScoreSnapshotRow[]): Score | null {
  if (rows.length === 0) return null

  const homeScore = maxGoals(rows, 'Participant1', 'Total')
    ?? maxGoals(rows, 'Participant1', 'H2')
    ?? maxGoals(rows, 'Participant1', 'H1')
    ?? 0
  const awayScore = maxGoals(rows, 'Participant2', 'Total')
    ?? maxGoals(rows, 'Participant2', 'H2')
    ?? maxGoals(rows, 'Participant2', 'H1')
    ?? 0
  const halfTimeHomeScore = maxGoals(rows, 'Participant1', 'H1') ?? 0
  const halfTimeAwayScore = maxGoals(rows, 'Participant2', 'H1') ?? 0

  let maxSeconds: number | undefined
  let anyRunning = false
  for (const row of rows) {
    if (row.Clock?.Running) anyRunning = true
    if (typeof row.Clock?.Seconds === 'number' && (maxSeconds === undefined || row.Clock.Seconds > maxSeconds)) {
      maxSeconds = row.Clock.Seconds
    }
  }

  const gameState = (rows[0]?.GameState || '').toLowerCase()
  let status: 'upcoming' | 'live' | 'finished' = 'upcoming'
  if (gameState.includes('finished') || gameState.includes('ended') || gameState.includes('ft')) {
    status = 'finished'
  } else if (anyRunning || gameState.includes('inprogress') || gameState.includes('live')) {
    status = 'live'
  }

  // This feed's GameState/Clock.Running never actually flip to a terminal
  // state (observed: stuck on "scheduled" + Running:true indefinitely), so
  // a match with no new events in hours is treated as finished regardless
  // of what those fields claim — otherwise a match from yesterday still
  // reads as "live" forever.
  const STALE_THRESHOLD_MS = 3 * 60 * 60 * 1000 // 3 hours
  const maxTs = rows.reduce((max, r) => typeof r.Ts === 'number' && r.Ts > max ? r.Ts : max, 0)
  if (status === 'live' && maxTs > 0 && Date.now() - maxTs > STALE_THRESHOLD_MS) {
    status = 'finished'
  }

  const fixture = getMockFixtures().find(f => f.fixtureId === fixtureId)
  const participant1Id = rows.find(r => r.Participant1Id)?.Participant1Id
  const participant2Id = rows.find(r => r.Participant2Id)?.Participant2Id

  return {
    fixtureId,
    homeTeam: fixture?.homeTeam || `Team ${participant1Id ?? '?'}`,
    awayTeam: fixture?.awayTeam || `Team ${participant2Id ?? '?'}`,
    homeScore,
    awayScore,
    halfTimeHomeScore,
    halfTimeAwayScore,
    status,
    minute: maxSeconds !== undefined ? Math.floor(maxSeconds / 60) : undefined,
  }
}

// Get live score for a specific fixture
export async function getScore(
  fixtureId: number
): Promise<Score | null> {
  try {
    const res = await getWithAuthRetry(`${TXLINE_BASE}/api/scores/snapshot/${fixtureId}`)
    const d = res.data
    console.log('[TxLINE] Raw score response is', Array.isArray(d) ? `array(${d.length})` : typeof d)
    console.log('[TxLINE] Sample GameState:', Array.isArray(d) ? d[0]?.GameState : d?.GameState)
    console.log('[TxLINE] Sample Score:', JSON.stringify(Array.isArray(d) ? d.find((r: any) => r.Score)?.Score : d?.Score))

    const rows: RawScoreSnapshotRow[] = Array.isArray(d) ? d : (d ? [d] : [])
    const parsed = parseRealScore(fixtureId, rows)
    if (parsed) return parsed

    console.log('[TxLINE] Unknown score format:', JSON.stringify(d).substring(0, 200))
    return null
  } catch (e: any) {
    console.log(`[TxLINE] Score error for ${fixtureId}:`,
      e.response?.status, e.response?.data?.message)
    return null
  }
}

interface RawOddsRow {
  Ts?: number
  SuperOddsType?: string
  MarketParameters?: string | null
  PriceNames?: string[]
  Prices?: number[]
}

// Prices are decimal odds x1000 (verified: Prices[0]=1670 with
// Pct[0]="59.880" → 1/1.670 = 0.599, i.e. Prices/1000 = decimal odds)
function decodePrice(raw: number | undefined) {
  return typeof raw === 'number' ? raw / 1000 : undefined
}

function priceFor(row: RawOddsRow, name: string) {
  const idx = row.PriceNames?.indexOf(name) ?? -1
  return idx >= 0 ? decodePrice(row.Prices?.[idx]) : undefined
}

// Same per-event-type-row shape as the score snapshot: one row per market,
// picking the latest (by Ts) row for each market we care about.
function latestRowByType(rows: RawOddsRow[], superOddsType: string, marketParameters?: string) {
  return rows
    .filter(r => r.SuperOddsType === superOddsType && (marketParameters === undefined || r.MarketParameters === marketParameters))
    .sort((a, b) => (b.Ts ?? 0) - (a.Ts ?? 0))[0]
}

function parseRealOdds(fixtureId: number, rows: RawOddsRow[]): Odds | null {
  const matchWinner = latestRowByType(rows, '1X2_PARTICIPANT_RESULT')
  const overUnder25 = latestRowByType(rows, 'OVERUNDER_PARTICIPANT_GOALS', 'line=2.5')
  if (!matchWinner && !overUnder25) return null

  return {
    fixtureId,
    homeWin: matchWinner ? priceFor(matchWinner, 'part1') : undefined,
    draw: matchWinner ? priceFor(matchWinner, 'draw') : undefined,
    awayWin: matchWinner ? priceFor(matchWinner, 'part2') : undefined,
    over25: overUnder25 ? priceFor(overUnder25, 'over') : undefined,
    under25: overUnder25 ? priceFor(overUnder25, 'under') : undefined,
    // No BTTS market observed in the real feed — left undefined rather
    // than guessing a placeholder among otherwise-real prices.
    btts: undefined,
  }
}

// Get odds for a specific fixture
export async function getOdds(
  fixtureId: number
): Promise<Odds | null> {
  const endpoints = [
    `/api/odds/snapshot/${fixtureId}`,
    `/api/odds/${fixtureId}`,
  ]

  for (const endpoint of endpoints) {
    try {
      const res = await getWithAuthRetry(`${TXLINE_BASE}${endpoint}`)
      const d = res.data
      const rows: RawOddsRow[] = Array.isArray(d) ? d : (d ? [d] : [])
      const parsed = parseRealOdds(fixtureId, rows)
      if (parsed) return parsed
      console.log('[TxLINE] Unknown odds format:', JSON.stringify(d).substring(0, 200))
    } catch (e: any) {
      console.log(`[TxLINE] Odds ${endpoint}:`, e.response?.status)
    }
  }
  return null
}

// Get live matches (status = live)
export async function getLiveMatches(): Promise<Fixture[]> {
  const fixtures = await getFixtures()
  return fixtures.filter(f => f.status === 'live')
}

// Mock fixtures for development when TxLINE devnet is empty.
// Fixture IDs below are real, verified mainnet TxLINE fixture IDs
// (confirmed via /api/scores/snapshot/:id returning live 200 data).
function getMockFixtures(): Fixture[] {
  return [
    {
      fixtureId: 18209181,
      homeTeam: 'France',
      awayTeam: 'Morocco',
      homeFlag: '🇫🇷',
      awayFlag: '🇲🇦',
      status: 'live',
      minute: 67,
      startTime: '2026-07-09T20:00:00Z',
    },
    {
      fixtureId: 18187298,
      homeTeam: 'Brazil',
      awayTeam: 'Norway',
      homeFlag: '🇧🇷',
      awayFlag: '🇳🇴',
      status: 'finished',
      startTime: '2026-07-05T20:00:00Z',
    },
    {
      fixtureId: 18198205,
      homeTeam: 'Portugal',
      awayTeam: 'Spain',
      homeFlag: '🇵🇹',
      awayFlag: '🇪🇸',
      status: 'finished',
      startTime: '2026-07-06T19:00:00Z',
    },
    {
      fixtureId: 18193785,
      homeTeam: 'USA',
      awayTeam: 'Belgium',
      homeFlag: '🇺🇸',
      awayFlag: '🇧🇪',
      status: 'finished',
      startTime: '2026-07-07T00:00:00Z',
    },
    {
      fixtureId: 18202701,
      homeTeam: 'Argentina',
      awayTeam: 'Egypt',
      homeFlag: '🇦🇷',
      awayFlag: '🇪🇬',
      status: 'finished',
      startTime: '2026-07-07T16:00:00Z',
    },
    {
      fixtureId: 18202783,
      homeTeam: 'Switzerland',
      awayTeam: 'Colombia',
      homeFlag: '🇨🇭',
      awayFlag: '🇨🇴',
      status: 'finished',
      startTime: '2026-07-07T20:00:00Z',
    },
    {
      fixtureId: 18192996,
      homeTeam: 'Mexico',
      awayTeam: 'England',
      homeFlag: '🇲🇽',
      awayFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      status: 'finished',
      startTime: '2026-07-06T00:00:00Z',
    },
    {
      fixtureId: 18185036,
      homeTeam: 'Canada',
      awayTeam: 'Morocco',
      homeFlag: '🇨🇦',
      awayFlag: '🇲🇦',
      status: 'finished',
      startTime: '2026-07-04T17:00:00Z',
    },
    {
      fixtureId: 18188721,
      homeTeam: 'Paraguay',
      awayTeam: 'France',
      homeFlag: '🇵🇾',
      awayFlag: '🇫🇷',
      status: 'finished',
      startTime: '2026-07-04T21:03:00Z',
    },
    {
      fixtureId: 18175983,
      homeTeam: 'Germany',
      awayTeam: 'Paraguay',
      homeFlag: '🇩🇪',
      awayFlag: '🇵🇾',
      status: 'finished',
      startTime: '2026-06-29T20:30:00Z',
    },
    // Quarter-finals confirmed via the official TxLINE schedule docs.
    {
      fixtureId: 18218149,
      homeTeam: 'Spain',
      awayTeam: 'Belgium',
      homeFlag: '🇪🇸',
      awayFlag: '🇧🇪',
      status: 'finished',
      startTime: '2026-07-10T19:00:00Z',
    },
    {
      fixtureId: 18213979,
      homeTeam: 'Norway',
      awayTeam: 'England',
      homeFlag: '🇳🇴',
      awayFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      status: 'finished',
      startTime: '2026-07-11T21:00:00Z',
    },
    {
      fixtureId: 18222446,
      homeTeam: 'Argentina',
      awayTeam: 'Switzerland',
      homeFlag: '🇦🇷',
      awayFlag: '🇨🇭',
      status: 'finished',
      startTime: '2026-07-12T01:00:00Z',
    },
    // Semi-finals.
    {
      fixtureId: 18237038,
      homeTeam: 'France',
      awayTeam: 'Spain',
      homeFlag: '🇫🇷',
      awayFlag: '🇪🇸',
      status: 'upcoming',
      startTime: '2026-07-14T19:00:00Z',
    },
    {
      fixtureId: 18241006,
      homeTeam: 'England',
      awayTeam: 'Argentina',
      homeFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      awayFlag: '🇦🇷',
      status: 'upcoming',
      startTime: '2026-07-15T19:00:00Z',
    },
  ]
}

// Live matches always first, then most-recently-happened first (finished
// matches sorted by kickoff time descending), with anything not yet
// played pushed to the end (soonest-upcoming first) since it hasn't
// "happened" yet and so has no place in a recency ordering.
function sortFixtures(fixtures: Fixture[]): Fixture[] {
  const rank = (f: Fixture) => (f.status === 'live' ? 0 : f.status === 'finished' ? 1 : 2)
  return [...fixtures].sort((a, b) => {
    const rankDiff = rank(a) - rank(b)
    if (rankDiff !== 0) return rankDiff
    const ta = a.startTime ? new Date(a.startTime).getTime() : 0
    const tb = b.startTime ? new Date(b.startTime).getTime() : 0
    return rank(a) === 2 ? ta - tb : tb - ta
  })
}

// Mock score for development
export function getMockScore(fixtureId: number): Score {
  const mockScores: Record<number, Score> = {
    18209181: {
      fixtureId: 18209181,
      homeTeam: 'France',
      awayTeam: 'Morocco',
      homeScore: 1,
      awayScore: 0,
      halfTimeHomeScore: 0,
      halfTimeAwayScore: 0,
      status: 'live',
      minute: 67,
    },
    18187298: {
      fixtureId: 18187298,
      homeTeam: 'Brazil',
      awayTeam: 'Norway',
      homeScore: 2,
      awayScore: 1,
      status: 'finished',
    },
    18218149: {
      fixtureId: 18218149,
      homeTeam: 'Spain',
      awayTeam: 'Belgium',
      homeScore: 2,
      awayScore: 1,
      status: 'finished',
    },
    18213979: {
      fixtureId: 18213979,
      homeTeam: 'Norway',
      awayTeam: 'England',
      homeScore: 1,
      awayScore: 2,
      status: 'finished',
    },
    18222446: {
      fixtureId: 18222446,
      homeTeam: 'Argentina',
      awayTeam: 'Switzerland',
      homeScore: 3,
      awayScore: 1,
      status: 'finished',
    },
    18237038: {
      fixtureId: 18237038,
      homeTeam: 'France',
      awayTeam: 'Spain',
      homeScore: 0,
      awayScore: 0,
      status: 'upcoming',
    },
    18241006: {
      fixtureId: 18241006,
      homeTeam: 'England',
      awayTeam: 'Argentina',
      homeScore: 0,
      awayScore: 0,
      status: 'upcoming',
    },
  }
  if (mockScores[fixtureId]) return mockScores[fixtureId]

  const fixture = getMockFixtures().find(f => f.fixtureId === fixtureId)
  return {
    fixtureId,
    homeTeam: fixture?.homeTeam || 'Home',
    awayTeam: fixture?.awayTeam || 'Away',
    homeScore: fixture ? 1 : 0,
    awayScore: 0,
    status: fixture ? 'finished' : 'upcoming',
  }
}

// Mock odds for development
export function getMockOdds(fixtureId: number): Odds {
  return {
    fixtureId,
    homeWin: 2.10,
    draw: 3.40,
    awayWin: 3.20,
    over25: 1.85,
    under25: 1.95,
    btts: 1.90,
  }
}
