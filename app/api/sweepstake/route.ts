import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { assignTeams, Sweepstake } from '@/lib/sweepstake'
import { saveSweepstakeEntry } from '@/lib/sweepstakeStore'

export async function POST(request: Request) {
  const body = await request.json()
  const { name, createdBy, participants } = body

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
  }
  if (!createdBy || typeof createdBy !== 'string') {
    return NextResponse.json({ error: 'Your name is required' }, { status: 400 })
  }
  if (!Array.isArray(participants) || participants.length < 2 || participants.length > 16) {
    return NextResponse.json(
      { error: 'Between 2 and 16 participants are required' },
      { status: 400 }
    )
  }

  const sweepstake: Sweepstake = {
    id: nanoid(8),
    name,
    createdBy,
    participants: assignTeams(participants),
    createdAt: new Date().toISOString(),
  }

  saveSweepstakeEntry(sweepstake)

  return NextResponse.json(sweepstake)
}
