'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sweepstake,
  SweepstakePointer,
  getRememberedSweepstakes,
  rememberSweepstake,
  rememberIdentity,
} from '@/lib/sweepstake'
import AppShell from '@/components/AppShell'
import { sessionKeyFor } from '@/components/SweepstakeJoinGate'

type View = 'landing' | 'create' | 'result'

export default function SweepstakePage() {
  const router = useRouter()
  const [view, setView] = useState<View>('landing')
  const [remembered, setRemembered] = useState<SweepstakePointer[]>([])

  const [groupName, setGroupName] = useState('')
  const [yourName, setYourName] = useState('')
  const [participantInput, setParticipantInput] = useState('')
  const [participants, setParticipants] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<Sweepstake | null>(null)

  useEffect(() => {
    setRemembered(getRememberedSweepstakes())
  }, [])

  const addParticipant = () => {
    const name = participantInput.trim()
    if (!name || participants.includes(name) || participants.length >= 16) return
    setParticipants(prev => [...prev, name])
    setParticipantInput('')
  }

  const removeParticipant = (name: string) => {
    setParticipants(prev => prev.filter(p => p !== name))
  }

  const drawTeams = async () => {
    if (!groupName.trim() || !yourName.trim()) {
      setError('Group name and your name are required')
      return
    }
    const allNames = [yourName.trim(), ...participants]
    if (allNames.length < 2) {
      setError('Add at least 1 more participant (2 total)')
      return
    }

    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/sweepstake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName.trim(),
          createdBy: yourName.trim(),
          participants: allNames,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create sweepstake')

      rememberSweepstake({ id: data.id, name: data.name })
      rememberIdentity(data.id, yourName.trim())
      // Rescue seed for /sweepstake/[id]'s server-side lookup, which can
      // land on a different instance than this request and miss — see
      // SweepstakeJoinGate.tsx.
      try {
        sessionStorage.setItem(sessionKeyFor(data.id), JSON.stringify(data))
      } catch {
        // sessionStorage unavailable — worst case the share page falls
        // back to its own "not found" state, same as before this fix
      }
      setCreated(data)
      setView('result')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <AppShell>
    <div className="min-h-full flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text mb-2">Mylos Sweepstake</h1>
          <p className="text-sm text-muted">
            Each friend gets a random World Cup team. Who will win the group?
          </p>
        </div>

        {view === 'landing' && (
          <div className="space-y-4">
            <button
              onClick={() => setView('create')}
              className="w-full bg-teal text-bg font-bold py-3 rounded-xl hover:bg-teal-bright active:scale-95 transition-all cursor-pointer"
            >
              Create Sweepstake
            </button>

            {remembered.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-3">
                <span className="text-[10px] text-muted uppercase tracking-wider font-medium block mb-2">
                  Your sweepstakes
                </span>
                <div className="space-y-1">
                  {remembered.map(p => (
                    <button
                      key={p.id}
                      onClick={() => router.push(`/sweepstake/${p.id}`)}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-text hover:bg-card-hover active:scale-[0.99] transition-all cursor-pointer"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'create' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted mb-1.5 block">Group name</label>
              <input
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="Friends Copa 2026"
                className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-teal/50"
              />
            </div>

            <div>
              <label className="text-xs text-muted mb-1.5 block">Your name</label>
              <input
                value={yourName}
                onChange={e => setYourName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-teal/50"
              />
            </div>

            <div>
              <label className="text-xs text-muted mb-1.5 block">
                Add participants ({participants.length}/16)
              </label>
              <div className="flex gap-2">
                <input
                  value={participantInput}
                  onChange={e => setParticipantInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
                  placeholder="Friend's name"
                  className="flex-1 bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-teal/50"
                />
                <button
                  onClick={addParticipant}
                  className="px-4 rounded-xl border border-border bg-card text-sm text-text hover:border-teal/50 active:scale-95 transition-all cursor-pointer"
                >
                  Add
                </button>
              </div>
              {participants.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {participants.map(p => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border text-xs text-text"
                    >
                      {p}
                      <button
                        onClick={() => removeParticipant(p)}
                        className="text-muted hover:text-red-400 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              onClick={drawTeams}
              disabled={creating}
              className="w-full bg-teal text-bg font-bold py-3 rounded-xl hover:bg-teal-bright active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Drawing...' : 'Draw Teams!'}
            </button>
          </div>
        )}

        {view === 'result' && created && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
              {created.participants.map(p => (
                <div key={p.name} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-text">{p.name}</span>
                  <span className="text-sm text-muted">
                    {p.team.flag} {p.team.name}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => router.push(`/sweepstake/${created.id}`)}
              className="w-full bg-teal text-bg font-bold py-3 rounded-xl hover:bg-teal-bright active:scale-95 transition-all cursor-pointer"
            >
              View standings & share →
            </button>
          </div>
        )}

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
