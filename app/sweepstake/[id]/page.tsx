import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Sweepstake } from '@/lib/sweepstake'
import SweepstakeJoinGate from '@/components/SweepstakeJoinGate'

interface Props {
  params: Promise<{ id: string }>
}

async function getSweepstakeData(id: string): Promise<Sweepstake | null> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const res = await fetch(`${base}/api/sweepstake/${id}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
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
