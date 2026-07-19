import { NextResponse } from 'next/server'
import { buildOrderTransaction } from '@/lib/jupiterPrediction'

export async function POST(request: Request) {
  try {
    const { marketId, isYes, amountUsdc, walletAddress } = await request.json()

    if (!marketId || typeof isYes !== 'boolean' || !amountUsdc || !walletAddress) {
      return NextResponse.json(
        { error: 'marketId, isYes, amountUsdc, and walletAddress are required' },
        { status: 400 }
      )
    }

    const result = await buildOrderTransaction({
      marketId,
      isYes,
      amountUsdc: Number(amountUsdc),
      ownerPubkey: walletAddress,
    })

    if (!result.transaction) {
      return NextResponse.json({ error: result.error || 'Failed to build order' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
