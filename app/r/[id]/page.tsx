import { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

async function getShareData(id: string) {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const res = await fetch(`${base}/api/share/${id}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const share = await getShareData(id)
  if (!share) return { title: 'FieldCall' }

  return {
    title: `"${share.question}" — FieldCall`,
    description: share.response.answer.substring(0, 150),
    openGraph: {
      title: 'FieldCall · World Cup 2026',
      description: share.response.answer.substring(0, 150),
      siteName: 'FieldCall',
    },
    twitter: {
      card: 'summary',
      title: 'FieldCall · World Cup 2026',
      description: share.response.answer.substring(0, 150),
    },
  }
}

export default async function SharePage({ params }: Props) {
  const { id } = await params
  const share = await getShareData(id)
  if (!share) notFound()

  const { question, response, fixture } = share

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-teal-dim border border-teal flex items-center justify-center font-bold text-teal">
              ⚡
            </div>
            <span className="text-white font-bold text-lg">FieldCall</span>
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

        {/* Image */}
        {response.imageBase64 && (
          <div className="rounded-xl overflow-hidden border border-border mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:${response.imageMimeType};base64,${response.imageBase64}`}
              alt="Generated image"
              className="w-full"
            />
          </div>
        )}

        {/* Answer */}
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-teal-dim border border-teal flex items-center justify-center text-xs">
              ⚡
            </div>
            <span className="text-xs text-muted">FieldCall AI</span>
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
          {response.costs.map((cost: { emoji: string; service: string; amount: number }, i: number) => (
            <div key={i} className="flex justify-between">
              <span className="text-xs text-muted">
                {cost.emoji} {cost.service}
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
            className="inline-flex items-center gap-2 bg-teal text-bg font-bold px-6 py-3 rounded-xl hover:bg-teal-bright transition-colors text-sm"
          >
            ⚡ Ask my own question
          </a>
          <p className="text-xs text-muted mt-3">
            fieldcall.xyz · Powered by TxLINE + Gemini
          </p>
        </div>
      </div>
    </div>
  )
}
