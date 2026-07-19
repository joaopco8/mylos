'use client'

import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Bet } from '@/lib/jupiterBets'
import { getLocalBets, mergeBets } from '@/lib/localBets'
import AppShell from '@/components/AppShell'

type Tab = 'open' | 'won' | 'lost'

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export default function BetsPage() {
  const { publicKey } = useWallet()
  const [bets, setBets] = useState<Bet[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('open')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const local = getLocalBets()

      if (!publicKey) {
        if (!cancelled) {
          setBets(local)
          setLoading(false)
        }
        return
      }

      try {
        const res = await fetch(`/api/bets?ownerPubkey=${publicKey.toBase58()}`)
        const data = await res.json()
        const remote: Bet[] = data.bets || []
        if (!cancelled) setBets(mergeBets(remote, local))
      } catch (e) {
        console.error('[Bets] Fetch failed:', e)
        if (!cancelled) setBets(local)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [publicKey])

  const openBets = bets.filter(b => b.status === 'open')
  const wonBets = bets.filter(b => b.status === 'won')
  const lostBets = bets.filter(b => b.status === 'lost')
  const shownBets = tab === 'open' ? openBets : tab === 'won' ? wonBets : lostBets

  const totalBet = bets.reduce((sum, b) => sum + b.amountUsdc, 0)
  const totalWon = wonBets.reduce((sum, b) => sum + b.payoutUsd, 0)
  const pnl = bets.reduce((sum, b) => sum + b.pnlUsd, 0)

  return (
    <AppShell>
      <div className="min-h-full p-4 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-text mb-1">My Bets</h1>
          <p className="text-xs text-muted">
            Prediction markets via Jupiter · Solana mainnet
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total bet', value: `$${totalBet.toFixed(2)}` },
            { label: 'Total won', value: `$${totalWon.toFixed(2)}` },
            {
              label: 'P&L',
              value: `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`,
              color: pnl >= 0 ? 'text-emerald-400' : 'text-red-400',
            },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <div className={`text-lg font-bold ${s.color || 'text-text'}`}>{s.value}</div>
              <div className="text-[10px] text-muted mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          {[
            { key: 'open' as const, label: `Open (${openBets.length})` },
            { key: 'won' as const, label: `Won (${wonBets.length})` },
            { key: 'lost' as const, label: `Lost (${lostBets.length})` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                tab === t.key
                  ? 'bg-teal text-bg'
                  : 'bg-card text-muted border border-border hover:text-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-muted text-sm py-8">Loading bets...</div>
        ) : (
          <div className="space-y-3">
            {shownBets.map(bet => (
              <div key={bet.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="text-sm font-medium text-text leading-snug flex-1">
                    {bet.marketTitle}
                  </div>
                  <span
                    className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      bet.status === 'open'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : bet.status === 'won'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {bet.status === 'open' ? '● Live' : bet.status === 'won' ? '✓ Won' : '✗ Lost'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <span className="text-muted">Bet </span>
                    <span className="text-text font-medium uppercase">{bet.outcome}</span>
                  </div>
                  <div>
                    <span className="text-muted">Amount </span>
                    <span className="text-text font-medium">${bet.amountUsdc.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted">
                      {bet.status === 'won' ? 'Payout ' : bet.status === 'lost' ? 'Result ' : 'Value now '}
                    </span>
                    <span className={`font-medium ${bet.status === 'won' ? 'text-emerald-400' : bet.status === 'lost' ? 'text-red-400' : 'text-text'}`}>
                      ${(bet.status === 'won' ? bet.payoutUsd : bet.status === 'lost' ? 0 : bet.valueUsd).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted">Placed </span>
                    <span className="text-text">{formatDate(bet.placedAt)}</span>
                  </div>
                </div>

                <a
                  href={bet.marketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-muted hover:text-teal transition-colors"
                >
                  View on Jupiter →
                </a>
              </div>
            ))}

            {shownBets.length === 0 && (
              <div className="text-center text-muted text-sm py-8">
                {tab === 'open' ? 'No open bets. Place a bet on any match!' : `No ${tab} bets yet.`}
              </div>
            )}
          </div>
        )}

        {!publicKey && (
          <div className="mt-4 p-3 bg-card border border-border rounded-xl text-center">
            <p className="text-xs text-muted">Connect your wallet to sync bets from Jupiter</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
