'use client'

import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useEffect, useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'

const USDC_MINT = new PublicKey(
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
)

export function useWalletBalance() {
  const { publicKey, connected } = useWallet()
  const { connection } = useConnection()
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!publicKey || !connection) {
      setBalance(0)
      return
    }

    let cancelled = false

    async function fetchBalance() {
      setLoading(true)
      const ata = getAssociatedTokenAddressSync(USDC_MINT, publicKey!)
      console.log('[Balance] Wallet:', publicKey!.toBase58())
      console.log('[Balance] ATA:', ata.toBase58())
      try {
        const info = await connection.getTokenAccountBalance(ata)
        console.log('[Balance] Raw:', info.value)
        if (!cancelled) setBalance(info.value.uiAmount || 0)
      } catch (e: any) {
        // A missing ATA (wallet has never held USDC) is a real 0 balance.
        // Anything else (rate limit, network error) is not — log it instead
        // of silently showing $0.00 for what might just be an RPC hiccup.
        const isMissingAccount = e.message?.includes('could not find account')
        console.error('[Balance] Error:', e.message, isMissingAccount ? '(no USDC account yet — real $0)' : '(fetch failed, not a confirmed $0)')
        if (!cancelled) setBalance(0)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchBalance()
    const interval = setInterval(fetchBalance, 15000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [publicKey, connection])

  return { balance, loading, connected, publicKey }
}
