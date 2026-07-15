import { NextResponse } from 'next/server'
import { pickRandomTeams } from '@/lib/sweepstake'
import { getSweepstakeEntry, saveSweepstakeEntry } from '@/lib/sweepstakeStore'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sweepstake = getSweepstakeEntry(id)
  if (!sweepstake) {
    return NextResponse.json({ error: 'Sweepstake not found' }, { status: 404 })
  }
  return NextResponse.json(sweepstake)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sweepstake = getSweepstakeEntry(id)
  if (!sweepstake) {
    return NextResponse.json({ error: 'Sweepstake not found' }, { status: 404 })
  }

  const { name } = await request.json()
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Your name is required' }, { status: 400 })
  }
  if (sweepstake.participants.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: 'That name is already in this sweepstake' }, { status: 409 })
  }
  if (sweepstake.participants.length >= 32) {
    return NextResponse.json({ error: 'This sweepstake is full' }, { status: 409 })
  }

  const takenTeams = sweepstake.participants.map(p => p.team.name)
  const [team] = pickRandomTeams(1, takenTeams)
  if (!team) {
    return NextResponse.json({ error: 'No teams left to assign' }, { status: 409 })
  }

  sweepstake.participants.push({ name, team })
  saveSweepstakeEntry(sweepstake)

  return NextResponse.json(sweepstake)
}
