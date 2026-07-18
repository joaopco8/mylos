'use client'

import { useEffect, useState } from 'react'
import { Sweepstake, FixtureResult, Standing, calculateStandings } from '@/lib/sweepstake'

interface Props {
  sweepstake: Sweepstake
}

async function fetchFixtureResults(): Promise<FixtureResult[]> {
  const listRes = await fetch('/api/fixtures')
  const listData = await listRes.json()
  const fixtures: { fixtureId: number }[] = listData.fixtures || []

  const results = await Promise.all(
    fixtures.map(async f => {
      try {
        const res = await fetch(`/api/match/${f.fixtureId}`)
        const data = await res.json()
        return data.score as FixtureResult
      } catch {
        return null
      }
    })
  )

  return results.filter((r): r is FixtureResult => !!r)
}

export default function SweepstakeView({ sweepstake }: Props) {
  const [standings, setStandings] = useState<Standing[] | null>(null)
  const [commentary, setCommentary] = useState<string | null>(null)
  const [commentaryLoading, setCommentaryLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const fixtures = await fetchFixtureResults()
      if (cancelled) return
      setStandings(calculateStandings(sweepstake.participants, fixtures))
    }

    load()
    const interval = setInterval(load, 60000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [sweepstake.id])

  useEffect(() => {
    if (!standings || standings.length === 0) return
    let cancelled = false

    async function loadCommentary() {
      setCommentaryLoading(true)
      try {
        const res = await fetch('/api/sweepstake/commentary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupName: sweepstake.name, standings }),
        })
        const data = await res.json()
        if (!cancelled) setCommentary(data.commentary || null)
      } catch {
        if (!cancelled) setCommentary(null)
      } finally {
        if (!cancelled) setCommentaryLoading(false)
      }
    }

    loadCommentary()
    return () => {
      cancelled = true
    }
    // Only re-run when the standings actually change materially (points
    // shift), not on every 60s poll that comes back identical.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standings?.map(s => `${s.name}:${s.points}`).join(',')])

  const copyShareLink = () => {
    const url = `${window.location.origin}/sweepstake/${sweepstake.id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-text">{sweepstake.name}</h1>
          <p className="text-xs text-muted">
            Created by {sweepstake.createdBy} · {sweepstake.participants.length} participants
          </p>
        </div>
        <button
          onClick={copyShareLink}
          className="text-xs font-medium text-teal border border-teal/30 bg-teal-dim px-3 py-1.5 rounded-lg hover:border-teal/60 active:scale-95 transition-all cursor-pointer"
        >
          {copied ? 'Copied!' : 'Share this sweepstake →'}
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-muted uppercase tracking-wider border-b border-border">
              <th className="text-left px-3 py-2 font-medium">#</th>
              <th className="text-left px-3 py-2 font-medium">Name</th>
              <th className="text-left px-3 py-2 font-medium">Team</th>
              <th className="hidden sm:table-cell text-center px-2 py-2 font-medium">P</th>
              <th className="hidden sm:table-cell text-center px-2 py-2 font-medium">W</th>
              <th className="hidden sm:table-cell text-center px-2 py-2 font-medium">D</th>
              <th className="hidden sm:table-cell text-center px-2 py-2 font-medium">L</th>
              <th className="text-right px-3 py-2 font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            {(standings || calculateStandings(sweepstake.participants, [])).map((s, i) => (
              <tr key={s.name} className="border-b border-border last:border-0">
                <td className="px-3 py-2 text-muted">{i + 1}</td>
                <td className="px-3 py-2 text-text font-medium">{s.name}</td>
                <td className="px-3 py-2 text-muted whitespace-nowrap">
                  {s.team.flag} {s.team.name}
                </td>
                <td className="hidden sm:table-cell px-2 py-2 text-center text-muted">{s.played}</td>
                <td className="hidden sm:table-cell px-2 py-2 text-center text-muted">{s.wins}</td>
                <td className="hidden sm:table-cell px-2 py-2 text-center text-muted">{s.draws}</td>
                <td className="hidden sm:table-cell px-2 py-2 text-center text-muted">{s.losses}</td>
                <td className="px-3 py-2 text-right text-teal font-bold">{s.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!standings && (
          <div className="px-3 py-2 text-xs text-muted text-center">
            Loading live results from TxLINE...
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card/60 p-4">
        <span className="text-[10px] text-muted uppercase tracking-[0.14em] font-medium block mb-2">
          MYLOS Commentary
        </span>
        {commentaryLoading && !commentary ? (
          <p className="text-sm text-muted">Thinking of something to say...</p>
        ) : (
          <p className="text-sm text-text leading-relaxed">
            {commentary || 'Commentary will appear once results are in.'}
          </p>
        )}
      </div>
    </div>
  )
}
