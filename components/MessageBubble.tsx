'use client'
import { useState } from 'react'
import { ChatMessage } from '@/types'
import CostBreakdown from './CostBreakdown'

interface MessageBubbleProps {
  message: ChatMessage
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [momentCopied, setMomentCopied] = useState(false)
  const isUser = message.role === 'user'
  const res = message.response

  const shareMoment = () => {
    if (!res?.shareId || typeof window === 'undefined') return
    const url = `${window.location.origin}/r/${res.shareId}?moment=true`
    navigator.clipboard.writeText(url)
    setMomentCopied(true)
    setTimeout(() => setMomentCopied(false), 2000)
  }

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

        {res?.isPrediction && (
          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted border-t border-border pt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse flex-shrink-0" />
            <span>
              Prediction made at {res.predictionSnapshot?.minute ?? '?'}&apos; —{' '}
              {res.predictionSnapshot?.homeScore}-{res.predictionSnapshot?.awayScore}
            </span>
            {res.shareId && (
              <button
                onClick={shareMoment}
                className="ml-auto text-teal hover:underline cursor-pointer flex-shrink-0"
              >
                {momentCopied ? 'Copied!' : 'Share this moment →'}
              </button>
            )}
          </div>
        )}

        {res && (
          <CostBreakdown
            costs={res.costs}
            totalCost={res.totalCost}
            txHash={message.paymentTxHash || res.txHash}
            shareId={res.shareId}
            fixtureId={res.fixture?.fixtureId}
          />
        )}
      </div>
    </div>
  )
}
