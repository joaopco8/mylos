import { Metadata } from 'next'
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

  // Not calling notFound() here even when the server-side store lookup
  // misses: sweepstakeStore.ts is an in-memory Map, which the API route
  // that created this entry and this page can land in different
  // module/function instances that don't share memory (confirmed with
  // /r/[id] earlier — same id, API found it, page didn't). Right after
  // creating your own group, the browser already has the full object in
  // hand from the create call — SweepstakeJoinGate rescues that from
  // sessionStorage when the server lookup comes up empty, so only a
  // genuinely-unknown id (or a different device) ends up as "not found".
  return <SweepstakeJoinGate initial={sweepstake} id={id} />
}
