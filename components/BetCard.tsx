'use client'

import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { VersionedTransaction } from '@solana/web3.js'
import { PredictionMarket } from '@/lib/jupiterPrediction'

interface Props {
  market: PredictionMarket
}

const MIN_ORDER_USDC = 5

export default function BetCard({ market }: Props) {
  const { connected, publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const [amount, setAmount] = useState(String(MIN_ORDER_USDC))
  const [betting, setBetting] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [error, setError] = useState('')

  // Jupiter's API only builds the order — it returns an UNSIGNED
  // transaction that has to be signed by the bettor's own wallet and
  // submitted from here, the same sign -> send -> confirm sequence as
  // payPerQuestion() in lib/payment.ts. There is no server-side "place
  // this bet for me" call; the API key alone can't move anyone's funds.
  const handleBet = async (isYes: boolean) => {
    if (!connected || !publicKey || !signTransaction) {
      setError('Connect your wallet first')
      return
    }
    const amountUsdc = Number(amount)
    if (!amountUsdc || amountUsdc < MIN_ORDER_USDC) {
      setError(`Minimum order is $${MIN_ORDER_USDC}`)
      return
    }

    setBetting(true)
    setError('')
    setTxHash('')
    try {
      const res = await fetch('/api/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId: market.id,
          isYes,
          amountUsdc,
          walletAddress: publicKey.toBase58(),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.transaction) {
        throw new Error(data.error || 'Failed to build order')
      }

      const tx = VersionedTransaction.deserialize(
        Buffer.from(data.transaction, 'base64')
      )
      const signed = await signTransaction(tx)
      const signature = await connection.sendRawTransaction(signed.serialize())
      await connection.confirmTransaction(signature, 'confirmed')
      setTxHash(signature)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBetting(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 mt-2">
      <div className="text-[10px] text-teal uppercase tracking-widest mb-2">
        Jupiter Prediction Market
      </div>

      <div className="text-sm text-text font-medium mb-3 leading-snug">
        {market.teamName ? `Will ${market.teamName} win?` : market.title}
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => handleBet(true)}
          disabled={betting}
          className="flex-1 py-2 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          YES {(market.yesPrice * 100).toFixed(0)}¢
        </button>
        <button
          onClick={() => handleBet(false)}
          disabled={betting}
          className="flex-1 py-2 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          NO {(market.noPrice * 100).toFixed(0)}¢
        </button>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] text-muted">Amount:</span>
        <input
          value={amount}
          onChange={e => setAmount(e.target.value)}
          disabled={betting}
          className="w-16 bg-bg border border-border rounded px-2 py-1 text-xs text-text text-center focus:outline-none focus:border-teal/50"
        />
        <span className="text-[11px] text-muted">USDC (min ${MIN_ORDER_USDC})</span>
      </div>

      {betting && (
        <div className="text-xs text-teal animate-pulse">
          Approve in Phantom, then confirming on-chain...
        </div>
      )}

      {error && (
        <div className="text-xs text-red-400">{error}</div>
      )}

      {txHash && (
        <a
          href={`https://solscan.io/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[11px] text-teal hover:underline"
        >
          ✓ Bet placed — View on Solscan →
        </a>
      )}

      <a
        href={market.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-[10px] text-muted hover:text-text mt-2 transition-colors"
      >
        View on Jupiter →
      </a>
    </div>
  )
}
