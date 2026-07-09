import axios from 'axios'

const TXLINE_BASE = process.env.TXLINE_BASE ||
  'https://txline-dev.txodds.com'
const JWT = process.env.TXLINE_JWT || ''
const API_TOKEN = process.env.TXLINE_API_TOKEN || ''

const headers = {
  'Authorization': `Bearer ${JWT}`,
  'X-Api-Token': API_TOKEN,
  'Content-Type': 'application/json',
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
      const res = await axios.get(
        `${TXLINE_BASE}${endpoint}`,
        { headers, timeout: 10000 }
      )
      const data = res.data
      const fixtures = Array.isArray(data)
        ? data
        : data.fixtures || data.data || data.items || []

      if (fixtures.length > 0) {
        console.log(`[TxLINE] Fixtures found at ${endpoint}`)
        return fixtures
      }
    } catch (e: any) {
      console.log(`[TxLINE] ${endpoint} →`, e.response?.status || 'error')
    }
  }

  // Fallback: mock fixtures with real World Cup 2026 teams
  console.log('[TxLINE] Using mock fixtures (devnet empty)')
  return getMockFixtures()
}

// Get live score for a specific fixture
export async function getScore(
  fixtureId: number
): Promise<Score | null> {
  try {
    const res = await axios.get(
      `${TXLINE_BASE}/api/scores/snapshot/${fixtureId}`,
      { headers, timeout: 10000 }
    )
    return res.data
  } catch (e: any) {
    console.log(`[TxLINE] Score error for ${fixtureId}:`,
      e.response?.status, e.response?.data?.message)
    return null
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
      const res = await axios.get(
        `${TXLINE_BASE}${endpoint}`,
        { headers, timeout: 10000 }
      )
      return res.data
    } catch (e: any) {
      console.log(`[TxLINE] Odds error:`, e.response?.status)
    }
  }
  return null
}

// Get live matches (status = live)
export async function getLiveMatches(): Promise<Fixture[]> {
  const fixtures = await getFixtures()
  return fixtures.filter(f => f.status === 'live')
}

// Mock fixtures for development when TxLINE devnet is empty
function getMockFixtures(): Fixture[] {
  return [
    {
      fixtureId: 1001,
      homeTeam: 'Brazil',
      awayTeam: 'France',
      homeFlag: '🇧🇷',
      awayFlag: '🇫🇷',
      status: 'live',
      minute: 67,
    },
    {
      fixtureId: 1002,
      homeTeam: 'Argentina',
      awayTeam: 'Germany',
      homeFlag: '🇦🇷',
      awayFlag: '🇩🇪',
      status: 'live',
      minute: 34,
    },
    {
      fixtureId: 1003,
      homeTeam: 'Portugal',
      awayTeam: 'Spain',
      homeFlag: '🇵🇹',
      awayFlag: '🇪🇸',
      status: 'upcoming',
    },
    {
      fixtureId: 1004,
      homeTeam: 'England',
      awayTeam: 'Netherlands',
      homeFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      awayFlag: '🇳🇱',
      status: 'upcoming',
    },
    {
      fixtureId: 1005,
      homeTeam: 'Morocco',
      awayTeam: 'Japan',
      homeFlag: '🇲🇦',
      awayFlag: '🇯🇵',
      status: 'finished',
    },
  ]
}

// Mock score for development
export function getMockScore(fixtureId: number): Score {
  const mockScores: Record<number, Score> = {
    1001: {
      fixtureId: 1001,
      homeTeam: 'Brazil',
      awayTeam: 'France',
      homeScore: 1,
      awayScore: 0,
      halfTimeHomeScore: 0,
      halfTimeAwayScore: 0,
      status: 'live',
      minute: 67,
    },
    1002: {
      fixtureId: 1002,
      homeTeam: 'Argentina',
      awayTeam: 'Germany',
      homeScore: 2,
      awayScore: 1,
      halfTimeHomeScore: 1,
      halfTimeAwayScore: 1,
      status: 'live',
      minute: 34,
    },
  }
  return mockScores[fixtureId] || {
    fixtureId,
    homeTeam: 'Home',
    awayTeam: 'Away',
    homeScore: 0,
    awayScore: 0,
    status: 'upcoming',
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
