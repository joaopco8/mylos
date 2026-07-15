import { Score, Odds } from './txline'

export interface MylosScoreResult {
  score: number
  label: string
  factors: {
    goals: number
    oddsMovement: number
    matchStatus: number
    time: number
  }
}

export function calculateMylosScore(
  score: Score,
  odds: Odds | null | undefined
): MylosScoreResult {
  let total = 0

  // Goals factor (0-4 points)
  const totalGoals = (score?.homeScore || 0) + (score?.awayScore || 0)
  const goalScore = Math.min(totalGoals * 1.5, 4)
  total += goalScore

  // Odds movement factor (0-3 points) — tight odds mean a closer, more exciting game
  const homeWin = odds?.homeWin ?? 2.0
  const awayWin = odds?.awayWin ?? 2.0
  const oddsSpread = Math.abs(homeWin - awayWin)
  const oddsScore =
    oddsSpread < 0.5 ? 3 : oddsSpread < 1.0 ? 2 : oddsSpread < 2.0 ? 1 : 0
  total += oddsScore

  // Match status factor (0-2 points)
  const minute = score?.minute || 0
  const isLive = score?.status === 'live'
  const statusScore = !isLive
    ? 0
    : minute > 80
    ? 2
    : minute > 60
    ? 1.5
    : minute > 45
    ? 1
    : 0.5
  total += statusScore

  // Time pressure factor (0-1 point)
  const timeScore = isLive && minute > 85 ? 1 : 0
  total += timeScore

  const normalized = Math.min(Math.round(total * 10) / 10, 10)

  const label =
    normalized >= 8.5
      ? 'Explosive'
      : normalized >= 7
      ? 'Intense'
      : normalized >= 5
      ? 'Exciting'
      : normalized >= 3
      ? 'Steady'
      : 'Calm'

  return {
    score: normalized,
    label,
    factors: {
      goals: goalScore,
      oddsMovement: oddsScore,
      matchStatus: statusScore,
      time: timeScore,
    },
  }
}
