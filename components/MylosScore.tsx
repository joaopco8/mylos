'use client'

import { MylosScoreResult } from '@/lib/mylosScore'

interface Props {
  mylos: MylosScoreResult
  homeTeam: string
  awayTeam: string
}

export default function MylosScore({ mylos, homeTeam, awayTeam }: Props) {
  const color =
    mylos.score >= 8
      ? '#ff4444'
      : mylos.score >= 6
      ? '#ff8800'
      : mylos.score >= 4
      ? '#07C5BE'
      : '#4a6572'

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-card border border-border rounded-xl mb-2">
      <div className="flex flex-col items-center">
        <div className="text-2xl font-bold tabular-nums" style={{ color }}>
          {mylos.score.toFixed(1)}
        </div>
        <div
          className="text-[10px] uppercase tracking-wider"
          style={{ color }}
        >
          {mylos.label}
        </div>
      </div>
      <div className="w-px h-8 bg-border" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-muted uppercase tracking-wider mb-1">
          Mylos Score
        </div>
        <div className="text-xs text-text truncate">
          {homeTeam} × {awayTeam}
        </div>
      </div>
      <div className="w-24 h-1.5 bg-border rounded-full overflow-hidden flex-shrink-0">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${mylos.score * 10}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  )
}
