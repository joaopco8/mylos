export const WORLD_CUP_TEAMS = [
  { name: 'Brazil', flag: '🇧🇷' },
  { name: 'France', flag: '🇫🇷' },
  { name: 'Morocco', flag: '🇲🇦' },
  { name: 'Norway', flag: '🇳🇴' },
  { name: 'Portugal', flag: '🇵🇹' },
  { name: 'Spain', flag: '🇪🇸' },
  { name: 'USA', flag: '🇺🇸' },
  { name: 'Belgium', flag: '🇧🇪' },
  { name: 'Argentina', flag: '🇦🇷' },
  { name: 'Egypt', flag: '🇪🇬' },
  { name: 'Switzerland', flag: '🇨🇭' },
  { name: 'Colombia', flag: '🇨🇴' },
  { name: 'Mexico', flag: '🇲🇽' },
  { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name: 'Canada', flag: '🇨🇦' },
  { name: 'Paraguay', flag: '🇵🇾' },
  { name: 'Germany', flag: '🇩🇪' },
  { name: 'Japan', flag: '🇯🇵' },
  { name: 'Netherlands', flag: '🇳🇱' },
  { name: 'Croatia', flag: '🇭🇷' },
  { name: 'Senegal', flag: '🇸🇳' },
  { name: 'Ghana', flag: '🇬🇭' },
  { name: 'Australia', flag: '🇦🇺' },
  { name: 'Saudi Arabia', flag: '🇸🇦' },
  { name: 'Uruguay', flag: '🇺🇾' },
  { name: 'Austria', flag: '🇦🇹' },
  { name: 'Cape Verde', flag: '🇨🇻' },
  { name: 'South Korea', flag: '🇰🇷' },
  { name: 'Tunisia', flag: '🇹🇳' },
  { name: 'Poland', flag: '🇵🇱' },
  { name: 'Iran', flag: '🇮🇷' },
  { name: 'New Zealand', flag: '🇳🇿' },
]

export interface Team {
  name: string
  flag: string
}

export interface SweepstakeParticipant {
  name: string
  team: Team
}

export interface Sweepstake {
  id: string
  name: string
  createdBy: string
  participants: SweepstakeParticipant[]
  createdAt: string
}

export interface FixtureResult {
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  status: 'upcoming' | 'live' | 'finished'
}

export interface Standing {
  name: string
  team: Team
  played: number
  wins: number
  draws: number
  losses: number
  points: number
}

// Picks `count` teams at random without repeats — used both for the
// initial draw and for handing a late joiner one of whatever's left.
export function pickRandomTeams(count: number, exclude: string[] = []): Team[] {
  const pool = WORLD_CUP_TEAMS.filter(t => !exclude.includes(t.name))
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export function assignTeams(participantNames: string[]): SweepstakeParticipant[] {
  const teams = pickRandomTeams(participantNames.length)
  return participantNames.map((name, i) => ({
    name,
    team: teams[i],
  }))
}

// Points: win = 3, draw = 1, loss = 0. Only finished fixtures count.
export function calculateStandings(
  participants: SweepstakeParticipant[],
  fixtures: FixtureResult[]
): Standing[] {
  const finished = fixtures.filter(f => f.status === 'finished')

  const standings: Standing[] = participants.map(p => {
    let wins = 0, draws = 0, losses = 0

    for (const f of finished) {
      const isHome = f.homeTeam === p.team.name
      const isAway = f.awayTeam === p.team.name
      if (!isHome && !isAway) continue

      const teamScore = isHome ? f.homeScore : f.awayScore
      const oppScore = isHome ? f.awayScore : f.homeScore

      if (teamScore > oppScore) wins++
      else if (teamScore === oppScore) draws++
      else losses++
    }

    const played = wins + draws + losses
    return {
      name: p.name,
      team: p.team,
      played,
      wins,
      draws,
      losses,
      points: wins * 3 + draws,
    }
  })

  return standings.sort((a, b) => b.points - a.points || b.wins - a.wins)
}

// Client-side cache of "sweepstakes I'm part of" — just id/name pointers
// for the landing page's list. The actual roster + standings live
// server-side (lib/sweepstakeStore.ts) via /api/sweepstake, since a
// sweepstake is shared between multiple people/devices by definition and
// localStorage alone can never let a friend on another phone see or join
// the same group.
export interface SweepstakePointer {
  id: string
  name: string
}

const LOCAL_KEY = 'mylos_sweepstakes'

export function rememberSweepstake(pointer: SweepstakePointer): void {
  if (typeof window === 'undefined') return
  const all = getRememberedSweepstakes().filter(p => p.id !== pointer.id)
  all.unshift(pointer)
  localStorage.setItem(LOCAL_KEY, JSON.stringify(all.slice(0, 10)))
}

export function getRememberedSweepstakes(): SweepstakePointer[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')
  } catch {
    return []
  }
}

// Which participant name (if any) "this browser" already is, per sweepstake —
// set on creation and on joining, checked by the join gate so a creator
// isn't asked to join their own group when they visit its share link.
export function rememberIdentity(sweepstakeId: string, name: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`mylos_sweepstake_identity_${sweepstakeId}`, name)
}

export function getRememberedIdentity(sweepstakeId: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(`mylos_sweepstake_identity_${sweepstakeId}`)
}
