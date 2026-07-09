'use client'
import { ChatMessage } from '@/types'
import CostBreakdown from './CostBreakdown'

interface MessageBubbleProps {
  message: ChatMessage
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const res = message.response

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-card border border-border px-4 py-2.5 text-sm text-text">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3">
      <span className="w-7 h-7 rounded-lg bg-teal-dim border border-teal flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-teal" />
      </span>
      <div className="flex-1 max-w-[90%] min-w-0">
        {res?.fixture && res.fixture.status === 'live' && (
          <div className="inline-flex items-center gap-2 mb-2 bg-red-500/10 border border-red-500/30 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-xs font-bold">
              {res.fixture.homeTeam} {res.fixture.homeScore} ×{' '}
              {res.fixture.awayScore} {res.fixture.awayTeam} ·{' '}
              {res.fixture.minute}&apos;
            </span>
          </div>
        )}

        {res?.imageBase64 ? (
          <div className="rounded-xl overflow-hidden border border-border mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:${res.imageMimeType};base64,${res.imageBase64}`}
              alt="Generated image"
              className="w-full max-w-sm"
            />
          </div>
        ) : null}

        <div className="text-sm text-text leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>

        {res && (
          <CostBreakdown
            costs={res.costs}
            totalCost={res.totalCost}
            txHash={res.txHash}
            shareId={res.shareId}
          />
        )}
      </div>
    </div>
  )
}
