import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Sweepstake } from '@/lib/sweepstake'
import { getSweepstakeEntry } from '@/lib/sweepstakeStore'
import SweepstakeJoinGate from '@/components/SweepstakeJoinGate'

interface Props {
  params: Promise<{ id: string }>
}

// Reads the in-memory store directly instead of fetching this same app's
// own /api/sweepstake/[id] over HTTP — a self-fetch needs a real base URL
// (NEXT_PUBLIC_APP_URL), and defaulting to localhost:3000 when that's
// unset silently 404s the whole page in any environment where nothing
// is listening on localhost (e.g. every serverless deployment).
async function getSweepstakeData(id: string): Promise<Sweepstake | null> {
  return getSweepstakeEntry(id)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const sweepstake = await getSweepstakeData(id)
  if (!sweepstake) return { title: 'Mylos Sweepstake' }

  return {
    title: 'Join our World Cup Sweepstake!',
    description: 'Each friend gets a random team. Who will win? Join now.',
    openGraph: {
      title: 'Join our World Cup Sweepstake!',
      description: 'Each friend gets a random team. Who will win? Join now.',
      siteName: 'Mylos',
    },
    twitter: {
      card: 'summary',
      title: 'Join our World Cup Sweepstake!',
      description: 'Each friend gets a random team. Who will win? Join now.',
    },
  }
}

export default async function SweepstakePage({ params }: Props) {
  const { id } = await params
  const sweepstake = await getSweepstakeData(id)
  if (!sweepstake) notFound()

  return <SweepstakeJoinGate initial={sweepstake} />
}
