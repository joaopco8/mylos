import { NextResponse } from 'next/server'
import { getWorldCupMarkets } from '@/lib/jupiterPrediction'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const homeTeam = searchParams.get('homeTeam')
  const awayTeam = searchParams.get('awayTeam')

  if (!homeTeam || !awayTeam) {
    return NextResponse.json({ error: 'homeTeam and awayTeam are required' }, { status: 400 })
  }

  const markets = await getWorldCupMarkets(homeTeam, awayTeam)
  return NextResponse.json({ markets })
}
