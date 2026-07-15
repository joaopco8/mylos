import { NextResponse } from 'next/server'
import { getFixtures, getLiveMatches } from '@/lib/txline'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const live = searchParams.get('live') === 'true'

  const fixtures = live
    ? await getLiveMatches()
    : await getFixtures()

  return NextResponse.json(
    {
      fixtures,
      total: fixtures.length,
      source: 'TxLINE',
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  )
}
