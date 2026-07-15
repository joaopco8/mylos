import { NextResponse } from 'next/server'
import { verifyStatOnChain, DEFAULT_STAT_KEY } from '@/lib/txlineVerify'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fixtureId: string }> }
) {
  const { fixtureId: fixtureIdParam } = await params
  const fixtureId = parseInt(fixtureIdParam, 10)
  const { searchParams } = new URL(request.url)
  const statKey = parseInt(searchParams.get('statKey') || '', 10) || DEFAULT_STAT_KEY

  try {
    const result = await verifyStatOnChain(fixtureId, statKey)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({
      fixtureId,
      isValid: false,
      error: e.response?.data?.message || e.message,
    }, { status: 500 })
  }
}
