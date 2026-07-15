'use client'
import { useState } from 'react'
import { CostItem } from '@/types'

function IconExternalLink() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6.5 3.5H3.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3M9.5 2.5h4v4M13 3 7 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconShieldCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 1.5 13.5 3.5V7.5C13.5 11 11 13 8 14.5C5 13 2.5 11 2.5 7.5V3.5L8 1.5Z" strokeLinejoin="round" />
      <path d="M5.7 8 7.3 9.6 10.5 6.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconShieldAlert() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 1.5 13.5 3.5V7.5C13.5 11 11 13 8 14.5C5 13 2.5 11 2.5 7.5V3.5L8 1.5Z" strokeLinejoin="round" />
      <path d="M8 5.5v3.2M8 10.8h.01" strokeLinecap="round" />
    </svg>
  )
}

function IconSpinner() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="animate-spin">
      <path d="M8 2.5a5.5 5.5 0 1 0 5.5 5.5" strokeLinecap="round" />
    </svg>
  )
}

function IconLink() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6.5 9.5 9.5 6.5M6 4.5 7.2 3.3a2.5 2.5 0 0 1 3.5 3.5L9.5 8M10 11.5l-1.2 1.2a2.5 2.5 0 0 1-3.5-3.5L6.5 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
      <path d="M9.3 6.8 14.6 1h-1.3l-4.6 5-3.7-5H1l5.6 7.7L1 15h1.3l4.9-5.3L11.1 15H15L9.3 6.8Z" />
    </svg>
  )
}

function IconWhatsApp() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M8 1.5a6.5 6.5 0 0 0-5.6 9.8L1.5 14.5l3.3-.9A6.5 6.5 0 1 0 8 1.5Z" strokeLinejoin="round" />
      <path d="M5.5 5.3c.2-.5.4-.5.6-.5h.4c.2 0 .4 0 .5.4.2.4.6 1.3.6 1.4.1.1.1.3 0 .4-.1.2-.1.2-.3.4-.1.2-.3.3-.4.4-.1.1-.3.3-.1.6.2.3.7 1.1 1.5 1.7.9.7 1.1.8 1.3.7.2-.1.4-.4.6-.6.1-.2.3-.2.5-.1l1.2.6c.2.1.3.1.4.3 0 .2 0 .8-.3 1.1-.2.4-1 .8-1.5.8-.4 0-1.5-.2-2.7-1-1.5-1-2.4-2.4-2.6-2.7-.1-.2-.9-1.2-.9-2.3 0-1 .6-1.5.7-1.7Z" />
    </svg>
  )
}

interface CostBreakdownProps {
  costs: CostItem[]
  totalCost: number
  txHash?: string
  shareId?: string
  fixtureId?: number
}

export default function CostBreakdown({
  costs,
  totalCost,
  txHash,
  shareId,
  fixtureId,
}: CostBreakdownProps) {
  const [copied, setCopied] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState<boolean | null>(null)

  const verifyOnChain = async () => {
    if (!fixtureId) return
    setVerifying(true)
    try {
      const res = await fetch(`/api/verify/${fixtureId}`)
      const data = await res.json()
      setVerified(data.isValid)
    } catch {
      setVerified(false)
    } finally {
      setVerifying(false)
    }
  }

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
      `Asked Mylos about the World Cup 2026\n\nCost $${totalCost.toFixed(4)} USDC, verifiable on Solana.\n\n${shareUrl}`
    )
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank')
  }

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(
      `Check out this AI World Cup analysis!\n${shareUrl}`
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
              {cost.service}
            </span>
            <span className="text-[11px] text-muted font-mono">
              ${cost.amount.toFixed(4)}
            </span>
          </div>
        ))}
      </div>

      {(explorerUrl || shareId || fixtureId) && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border flex-wrap">
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted border border-border bg-card px-2.5 py-1.5 rounded-lg hover:text-teal hover:border-teal/50 active:scale-95 transition-all cursor-pointer"
            >
              <IconExternalLink />
              Explorer
            </a>
          )}
          {fixtureId && (
            <button
              onClick={verifyOnChain}
              disabled={verifying}
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium border px-2.5 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed
                ${verified === true
                  ? 'text-teal border-teal/50 bg-teal-dim'
                  : verified === false
                  ? 'text-red-400 border-red-500/40 bg-red-500/10'
                  : 'text-muted border-border bg-card hover:text-teal hover:border-teal/50'}
              `}
            >
              {verifying ? <IconSpinner /> : verified === true ? <IconShieldCheck /> : verified === false ? <IconShieldAlert /> : <IconShieldCheck />}
              {verifying
                ? 'Verifying...'
                : verified === true
                ? 'Verified on-chain'
                : verified === false
                ? 'Verification failed'
                : 'Verify on-chain'}
            </button>
          )}
          {shareId && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={copyLink}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted border border-border bg-card px-2.5 py-1.5 rounded-lg hover:text-teal hover:border-teal/50 active:scale-95 transition-all cursor-pointer"
              >
                <IconLink />
                {copied ? 'Copied!' : 'Link'}
              </button>
              <button
                onClick={shareOnX}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted border border-border bg-card px-2.5 py-1.5 rounded-lg hover:text-white hover:border-white/40 active:scale-95 transition-all cursor-pointer"
              >
                <IconX />
                Twitter
              </button>
              <button
                onClick={shareOnWhatsApp}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted border border-border bg-card px-2.5 py-1.5 rounded-lg hover:text-green-400 hover:border-green-500/40 active:scale-95 transition-all cursor-pointer"
              >
                <IconWhatsApp />
                WhatsApp
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
