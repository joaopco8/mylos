'use client'

import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useEffect, useState } from 'react'
import { PublicKey } from '@solana/web3.js'

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
      console.log('[Balance] Wallet:', publicKey!.toBase58())
      try {
        // Querying a single hardcoded ATA under-counts wallets that hold
        // USDC across more than one token account for the same mint (e.g.
        // an extra non-ATA account created by an exchange withdrawal or an
        // older dApp) — Phantom's own balance sums all of them, so this
        // needs to as well instead of assuming exactly one account exists.
        const accounts = await connection.getParsedTokenAccountsByOwner(
          publicKey!,
          { mint: USDC_MINT }
        )
        console.log('[Balance] Token accounts found:', accounts.value.length)
        const total = accounts.value.reduce((sum, { account }) => {
          const amount = account.data.parsed?.info?.tokenAmount?.uiAmount || 0
          return sum + amount
        }, 0)
        console.log('[Balance] Total USDC:', total)
        if (!cancelled) setBalance(total)
      } catch (e: any) {
        console.error('[Balance] Error:', e.message)
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
