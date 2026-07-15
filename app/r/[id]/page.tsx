import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { decodeShareToken } from '@/lib/shareToken'
import { getScore, getMockScore } from '@/lib/txline'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ moment?: string }>
}

async function getShareData(id: string) {
  return decodeShareToken(id)
}

async function getCurrentScore(fixtureId: number) {
  try {
    const score = await getScore(fixtureId)
    return score || getMockScore(fixtureId)
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const share = await getShareData(id)
  if (!share) return { title: 'Mylos' }

  return {
    title: `"${share.question}" — Mylos`,
    description: share.response.answer.substring(0, 150),
    openGraph: {
      title: 'Mylos · World Cup 2026',
      description: share.response.answer.substring(0, 150),
      siteName: 'Mylos',
    },
    twitter: {
      card: 'summary',
      title: 'Mylos · World Cup 2026',
      description: share.response.answer.substring(0, 150),
    },
  }
}

export default async function SharePage({ params, searchParams }: Props) {
  const { id } = await params
  const { moment } = await searchParams
  const share = await getShareData(id)
  if (!share) notFound()

  const { question, response, fixture } = share
  const isMoment = moment === 'true' && response.isPrediction
  const currentScore = isMoment && response.fixture?.fixtureId
    ? await getCurrentScore(response.fixture.fixtureId)
    : null

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-1">
            <span className="text-white font-bold text-lg">Mylos</span>
          </div>
          <p className="text-xs text-muted">World Cup 2026 · AI Analysis</p>
        </div>

        {/* Match badge */}
        {fixture && (
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-400 font-medium">
                {fixture.homeTeam} {fixture.homeScore ?? ''} ×{' '}
                {fixture.awayScore ?? ''} {fixture.awayTeam}
                {fixture.minute ? ` · ${fixture.minute}'` : ''}
              </span>
            </div>
          </div>
        )}

        {/* Question */}
        <div className="bg-teal-dim border border-teal/30 rounded-xl px-4 py-3 mb-4">
          <p className="text-sm text-teal font-medium">&quot;{question}&quot;</p>
        </div>

        {/* Moment variant: prediction made at a snapshot in time */}
        {isMoment && response.predictionSnapshot && (
          <div className="bg-card border border-border rounded-xl px-4 py-3 mb-4">
            <p className="text-xs text-muted">
              Asked this at the {response.predictionSnapshot.minute ?? '?'}&apos;
              {' '}with score {response.predictionSnapshot.homeScore}-
              {response.predictionSnapshot.awayScore}.
            </p>
            {currentScore ? (
              <p className="text-sm text-teal font-medium mt-1">
                Now: {currentScore.homeScore}-{currentScore.awayScore}
                {currentScore.status === 'live' && currentScore.minute
                  ? ` (${currentScore.minute}')`
                  : currentScore.status === 'finished'
                  ? ' (final)'
                  : ''}{' '}
                — check what happened next →
              </p>
            ) : (
              <p className="text-sm text-teal font-medium mt-1">
                Check what happened next →
              </p>
            )}
          </div>
        )}

        {/* Image generation answers aren't shareable via this link today —
            see lib/shareToken.ts for why — so just say so instead of
            silently dropping it. */}
        {share.hadImage && (
          <div className="rounded-xl border border-border bg-card/60 px-4 py-3 mb-4">
            <p className="text-xs text-muted">
              This answer included a generated image, which isn&apos;t shown on this shared link.
            </p>
          </div>
        )}

        {/* Answer */}
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-muted">Mylos AI</span>
          </div>
          <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
            {response.answer}
          </p>
        </div>

        {/* Cost */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-xs text-muted uppercase tracking-wider">
              Verifiable cost
            </span>
            <span className="text-teal text-sm font-bold">
              ${response.totalCost.toFixed(4)} USDC
            </span>
          </div>
          {response.costs.map((cost: { service: string; amount: number }, i: number) => (
            <div key={i} className="flex justify-between">
              <span className="text-xs text-muted">
                {cost.service}
              </span>
              <span className="text-xs text-muted font-mono">
                ${cost.amount.toFixed(4)}
              </span>
            </div>
          ))}
          <p className="text-[10px] text-muted mt-2 pt-2 border-t border-border">
            Verifiable on the Solana blockchain
          </p>
        </div>

        {/* CTA */}
        <div className="text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-teal text-bg font-bold px-6 py-3 rounded-xl hover:bg-teal-bright active:scale-95 transition-all text-sm"
          >
            Ask my own question
          </a>
          <p className="text-xs text-muted mt-3">
            mylos.xyz · Powered by TxLINE + Groq
          </p>
        </div>
      </div>
    </div>
  )
}
