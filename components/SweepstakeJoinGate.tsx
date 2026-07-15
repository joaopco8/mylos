'use client'

import { useEffect, useState } from 'react'
import {
  Sweepstake,
  rememberSweepstake,
  rememberIdentity,
  getRememberedIdentity,
} from '@/lib/sweepstake'
import SweepstakeView from './SweepstakeView'
import AppShell from './AppShell'

interface Props {
  initial: Sweepstake
}

export default function SweepstakeJoinGate({ initial }: Props) {
  const [sweepstake, setSweepstake] = useState(initial)
  const [identity, setIdentity] = useState<string | null>(null)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    rememberSweepstake({ id: sweepstake.id, name: sweepstake.name })
    setIdentity(getRememberedIdentity(sweepstake.id))
  }, [sweepstake.id, sweepstake.name])

  const join = async () => {
    const name = nameInput.trim()
    if (!name) return
    setJoining(true)
    setError(null)
    try {
      const res = await fetch(`/api/sweepstake/${sweepstake.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to join')

      rememberIdentity(sweepstake.id, name)
      setIdentity(name)
      setSweepstake(data)
      setShowJoinForm(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setJoining(false)
    }
  }

  const isParticipant = identity && sweepstake.participants.some(p => p.name === identity)

  return (
    <AppShell>
    <div className="min-h-full flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {!isParticipant && !showJoinForm && (
          <div className="max-w-lg mx-auto mb-6 rounded-xl border border-teal/30 bg-teal-dim p-4 text-center">
            <p className="text-sm text-teal font-medium mb-3">
              Join &quot;{sweepstake.name}&quot; and get a random team!
            </p>
            <button
              onClick={() => setShowJoinForm(true)}
              className="bg-teal text-bg font-bold text-sm px-5 py-2 rounded-xl hover:bg-teal-bright active:scale-95 transition-all cursor-pointer"
            >
              Join this sweepstake
            </button>
          </div>
        )}

        {!isParticipant && showJoinForm && (
          <div className="max-w-lg mx-auto mb-6 rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted mb-2">Enter your name to get a random team:</p>
            <div className="flex gap-2">
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && join()}
                placeholder="Your name"
                className="flex-1 bg-bg border border-border rounded-xl px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-teal/50"
              />
              <button
                onClick={join}
                disabled={joining}
                className="px-4 rounded-xl bg-teal text-bg font-bold text-sm hover:bg-teal-bright active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {joining ? '...' : 'Join'}
              </button>
            </div>
            {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
            <button
              onClick={() => setShowJoinForm(false)}
              className="text-xs text-muted hover:text-text mt-2 cursor-pointer"
            >
              Just show me the standings
            </button>
          </div>
        )}

        <SweepstakeView sweepstake={sweepstake} />

        <div className="text-center mt-6">
          <a href="/" className="text-xs text-muted hover:text-text transition-colors">
            ← Back to Mylos
          </a>
        </div>
      </div>
    </div>
    </AppShell>
  )
}
