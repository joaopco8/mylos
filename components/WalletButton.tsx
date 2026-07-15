'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useState } from 'react'
import { useWalletBalance } from '@/hooks/useWalletBalance'

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

export default function WalletButton() {
  const { publicKey, connected, disconnect } = useWallet()
  const { setVisible } = useWalletModal()
  const { balance } = useWalletBalance()
  const [showMenu, setShowMenu] = useState(false)

  if (!connected || !publicKey) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-teal text-bg font-bold text-sm hover:bg-teal-bright active:bg-teal active:scale-95 transition-all cursor-pointer"
      >
        Connect Wallet
      </button>
    )
  }

  return (
    <div className="relative w-full">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card hover:border-teal/50 hover:bg-card-hover active:scale-95 transition-all text-sm cursor-pointer"
      >
        <span className="w-2 h-2 rounded-full bg-green-400" />
        <span className="text-text font-mono text-xs">
          {shortenAddress(publicKey.toBase58())}
        </span>
        <span className="ml-auto text-teal font-bold text-xs">
          ${balance.toFixed(2)}
        </span>
      </button>

      {showMenu && (
        <div className="absolute right-0 bottom-full mb-2 bg-card border border-border rounded-xl p-2 w-48 z-50 shadow-xl">
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="text-[10px] text-muted">USDC Balance</p>
            <p className="text-teal font-bold">${balance.toFixed(4)}</p>
          </div>
          <button
            onClick={() => {
              setShowMenu(false)
              disconnect()
            }}
            className="w-full text-left px-3 py-2 text-xs text-muted hover:text-red-400 hover:bg-card-hover active:scale-[0.98] transition-all rounded-lg cursor-pointer"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
