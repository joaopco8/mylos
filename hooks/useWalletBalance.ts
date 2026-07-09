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
      try {
        const ata = getAssociatedTokenAddressSync(USDC_MINT, publicKey!)
        const info = await connection.getTokenAccountBalance(ata)
        if (!cancelled) setBalance(info.value.uiAmount || 0)
      } catch {
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
