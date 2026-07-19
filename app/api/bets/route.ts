import { NextResponse } from 'next/server'
import { getBets } from '@/lib/jupiterBets'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ownerPubkey = searchParams.get('ownerPubkey')

  if (!ownerPubkey) {
    return NextResponse.json({ error: 'ownerPubkey is required' }, { status: 400 })
  }

  const bets = await getBets(ownerPubkey)
  return NextResponse.json({ bets })
}
