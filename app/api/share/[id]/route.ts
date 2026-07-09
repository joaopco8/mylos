import { NextResponse } from 'next/server'
import { getShare } from '@/lib/shareStore'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const share = getShare(id)

  if (!share) {
    return NextResponse.json(
      { error: 'Share not found' },
      { status: 404 }
    )
  }

  return NextResponse.json(share)
}
