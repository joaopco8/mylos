'use client'
import { useState } from 'react'
import { CostItem } from '@/types'

interface CostBreakdownProps {
  costs: CostItem[]
  totalCost: number
  txHash?: string
  shareId?: string
}

export default function CostBreakdown({
  costs,
  totalCost,
  txHash,
  shareId,
}: CostBreakdownProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl =
    typeof window !== 'undefined' && shareId
      ? `${window.location.origin}/r/${shareId}`
      : ''

  const copyLink = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareOnX = () => {
    const text = encodeURIComponent(
      `Asked FieldCall about the World Cup 2026 ⚽🏆\n\nCost $${totalCost.toFixed(4)} USDC, verifiable on Solana.\n\n${shareUrl}`
    )
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank')
  }

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(
      `Check out this AI World Cup analysis! ⚽\n${shareUrl}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const explorerUrl =
    txHash && !txHash.startsWith('failed')
      ? `https://solscan.io/tx/${txHash}`
      : null

  return (
    <div className="mt-3 rounded-xl border border-border bg-card/60 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-muted uppercase tracking-[0.14em] font-medium">
          Cost of this analysis
        </span>
        <span className="text-teal text-xs font-bold font-mono">
          ${totalCost.toFixed(4)} USDC
        </span>
      </div>

      <div className="space-y-1">
        {costs.map((cost, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-[11px] text-muted">
              {cost.emoji} {cost.service}
            </span>
            <span className="text-[11px] text-muted font-mono">
              ${cost.amount.toFixed(4)}
            </span>
          </div>
        ))}
      </div>

      {(explorerUrl || shareId) && (
        <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border flex-wrap">
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-teal hover:underline"
            >
              🔗 Explorer
            </a>
          )}
          {shareId && (
            <div className="flex items-center gap-3 ml-auto">
              <button
                onClick={copyLink}
                className="text-[11px] text-muted hover:text-teal transition-colors"
              >
                {copied ? '✓ Copied!' : '📋 Link'}
              </button>
              <button
                onClick={shareOnX}
                className="text-[11px] text-muted hover:text-white transition-colors"
              >
                𝕏 Twitter
              </button>
              <button
                onClick={shareOnWhatsApp}
                className="text-[11px] text-muted hover:text-green-400 transition-colors"
              >
                📱 WhatsApp
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
