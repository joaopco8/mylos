import { NextResponse } from 'next/server'
import {
  getScore, getOdds,
  getMockScore, getMockOdds
} from '@/lib/txline'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const fixtureId = parseInt(id)

  const [score, odds] = await Promise.all([
    getScore(fixtureId),
    getOdds(fixtureId),
  ])

  // Use mock data if TxLINE devnet returns nothing
  const finalScore = score || getMockScore(fixtureId)
  const finalOdds = odds || getMockOdds(fixtureId)

  return NextResponse.json({
    fixtureId,
    score: finalScore,
    odds: finalOdds,
    isLive: finalScore.status === 'live',
    source: score ? 'TxLINE (live)' : 'TxLINE (mock)',
    timestamp: new Date().toISOString(),
  })
}
