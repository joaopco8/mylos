'use client'

import { useState, useEffect, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { ChatMessage, AgentResponse } from '@/types'
import Sidebar from '@/components/Sidebar'
import ChatInput from '@/components/ChatInput'
import MessageBubble from '@/components/MessageBubble'
import ThinkingIndicator from '@/components/ThinkingIndicator'
import { DitheringBackground } from '@/components/ui/hero-dithering-card'
import {
  saveChatSession,
  getChatSessions,
  deleteChatSession,
  generateChatTitle,
  ChatSession,
} from '@/lib/chatStorage'
import { payPerQuestion } from '@/lib/payment'
import { calculateMylosScore, MylosScoreResult } from '@/lib/mylosScore'
import MylosScore from '@/components/MylosScore'
import { nanoid } from 'nanoid'

// Off by default until PROVIDER_WALLET_ADDRESS in lib/payment.ts is a real
// address — otherwise connecting a wallet would make every question fail
// with a payment error instead of just chatting for free like today.
const BILLING_ENABLED = process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true'
const ESTIMATED_COST_USDC = 0.017

const SUGGESTIONS = [
  'What is the score now?',
  'Will France win?',
  'Analyze the odds for me',
  'What changed in the 2nd half?',
  'Is the draw worth betting on?',
  'How is the match going?',
]

const SUGGESTIONS_GENERAL = [
  'Who is the top scorer of the Cup?',
  'What was the best match so far?',
  'Does Brazil have a chance to win the Cup?',
  'Give me a summary of the Cup so far',
  'Who are the favorites for the title?',
  "What were today's results?",
]

interface Fixture {
  fixtureId: number
  homeTeam: string
  awayTeam: string
  homeFlag?: string
  awayFlag?: string
  status: string
  minute?: number
  homeScore?: number
  awayScore?: number
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string>('')
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [paying, setPaying] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [mylosScore, setMylosScore] = useState<MylosScoreResult | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sessionRestored = useRef(false)
  const { connected, publicKey, signTransaction } = useWallet()

  useEffect(() => {
    let isFirstLoad = true

    const fetchFixtures = async () => {
      try {
        const res = await fetch('/api/fixtures')
        const data = await res.json()
        const list: Fixture[] = data.fixtures || []
        setFixtures(list)

        if (isFirstLoad) {
          isFirstLoad = false
          const live = list.find(f => f.status === 'live')
          if (live) setSelectedFixture(live)
          else if (list.length > 0) setSelectedFixture(list[0])
        } else {
          // Refresh the selected fixture's data in place — never
          // auto-(re)select one, so a deliberate "Copa Geral" deselection
          // (selectedFixture === null) survives across polls.
          setSelectedFixture(prev => {
            if (!prev) return prev
            const updated = list.find(f => f.fixtureId === prev.fixtureId)
            return updated || prev
          })
        }
      } catch (e) {
        console.error('[Fixtures] Poll failed:', e)
      }
    }

    fetchFixtures()
    const interval = setInterval(fetchFixtures, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!selectedFixture || selectedFixture.status !== 'live') {
      setMylosScore(null)
      return
    }

    const pollScore = async () => {
      try {
        const res = await fetch(`/api/match/${selectedFixture.fixtureId}`)
        const data = await res.json()
        if (data.score) {
          setSelectedFixture(prev => prev ? {
            ...prev,
            homeScore: data.score.homeScore,
            awayScore: data.score.awayScore,
            minute: data.score.minute,
            status: data.score.status,
          } : prev)
          setMylosScore(calculateMylosScore(data.score, data.odds))
        }
      } catch (e) {
        console.error('[Poll] Score update failed:', e)
      }
    }

    pollScore()
    const interval = setInterval(pollScore, 60000)
    return () => clearInterval(interval)
  }, [selectedFixture?.fixtureId, selectedFixture?.status])

  // Restores the last saved chat session (and the fixture it was about) on
  // initial load only. This depends on `fixtures` because the fixture list
  // is still empty on the very first render (it loads async), so the
  // fixture lookup below needs at least one more pass once it arrives —
  // but `sessionRestored` locks it after that so it never fires again.
  // Without the lock, every 30s fixtures poll re-ran this and silently
  // snapped `selectedFixture` (and the whole chat) back to the last saved
  // session, undoing whatever fixture the user had just clicked in the
  // sidebar.
  useEffect(() => {
    if (sessionRestored.current) return

    const sessions = getChatSessions()
    setChatSessions(sessions)

    if (sessions.length === 0) {
      setCurrentChatId(nanoid())
      sessionRestored.current = true
      return
    }

    setCurrentChatId(sessions[0].id)
    setMessages(sessions[0].messages.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp),
    })))
    if (sessions[0].fixtureId && fixtures.length > 0) {
      const fixture = fixtures.find(f => f.fixtureId === sessions[0].fixtureId)
      if (fixture) setSelectedFixture(fixture)
    }

    if (!sessions[0].fixtureId || fixtures.length > 0) {
      sessionRestored.current = true
    }
  }, [fixtures])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text?: string) => {
    const question = text || input.trim()
    if (!question || loading || paying) return

    let paymentTxHash: string | undefined

    // Pay before sending the question — only when billing is actually
    // turned on and a wallet is connected; otherwise chat stays free,
    // same as before this feature existed.
    if (BILLING_ENABLED && connected && publicKey && signTransaction) {
      setPaying(true)
      setPaymentError(null)
      try {
        const payment = await payPerQuestion({
          fromWallet: publicKey,
          signTransaction,
          amountUsdc: ESTIMATED_COST_USDC,
        })
        paymentTxHash = payment.txHash
        console.log('[Payment] Success:', payment.txHash)
      } catch (e: any) {
        setPaymentError(e.message)
        setPaying(false)
        return // Don't proceed if payment fails
      }
      setPaying(false)
    }

    setInput('')

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          fixtureId: selectedFixture?.fixtureId,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.answer) {
        throw new Error(data.error || 'Failed to process question')
      }

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        response: data as AgentResponse,
        paymentTxHash,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMsg])

      const updatedMessages = [...messages, userMsg, assistantMsg]
      const session: ChatSession = {
        id: currentChatId,
        title: generateChatTitle(question),
        messages: updatedMessages,
        fixtureId: selectedFixture?.fixtureId,
        createdAt: chatSessions.find(s => s.id === currentChatId)?.createdAt
          || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      saveChatSession(session)
      setChatSessions(getChatSessions())
    } catch (e: any) {
      console.error('[Chat] Failed:', e.message)
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Error processing your question. Try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const totalSpent = messages.reduce(
    (sum, m) => sum + (m.response?.totalCost || 0),
    0
  )

  const hasChat = messages.length > 0
  const suggestions = selectedFixture ? SUGGESTIONS : SUGGESTIONS_GENERAL

  const handleNewChat = () => {
    setCurrentChatId(nanoid())
    setMessages([])
    setInput('')
    setSidebarOpen(false)
  }

  const handleLoadChat = (session: ChatSession) => {
    setCurrentChatId(session.id)
    setMessages(session.messages.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp),
    })))
    if (session.fixtureId) {
      const fixture = fixtures.find(f => f.fixtureId === session.fixtureId)
      if (fixture) setSelectedFixture(fixture)
    }
    setSidebarOpen(false)
  }

  const handleDeleteChat = (id: string) => {
    deleteChatSession(id)
    setChatSessions(getChatSessions())
    if (id === currentChatId) {
      handleNewChat()
    }
  }

  return (
    <div className="flex h-dvh bg-bg text-text overflow-hidden">
      <Sidebar
        fixtures={fixtures}
        selectedFixture={selectedFixture}
        onSelectFixture={setSelectedFixture}
        chatSessions={chatSessions}
        currentChatId={currentChatId}
        onNewChat={handleNewChat}
        onLoadChat={handleLoadChat}
        onDeleteChat={handleDeleteChat}
        totalSpent={totalSpent}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(v => !v)}
      />

      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* mobile top bar */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-border">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md text-muted hover:text-text hover:bg-card active:scale-90 transition-all cursor-pointer"
            aria-label="Open menu"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
            </svg>
          </button>
          <span className="text-[13px] font-medium">Mylos</span>
          {selectedFixture && (
            <span className="ml-auto text-[11px] text-muted truncate">
              {selectedFixture.homeFlag} {selectedFixture.homeTeam} ×{' '}
              {selectedFixture.awayTeam}
            </span>
          )}
        </div>

        {!hasChat ? (
          /* ===== Empty state: hero ===== */
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 md:p-6 md:pr-8">
              <div
                className="relative rounded-lg overflow-hidden bg-[#050c0b] min-h-[520px] md:min-h-[610px] flex items-center justify-center"
              >
                <DitheringBackground colorFront="#928900" />
                <div className="absolute inset-0 bg-black/40" />

                {/* center content */}
                <div className="relative z-10 w-full max-w-2xl px-4 py-16 flex flex-col items-center">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-[10px] tracking-[0.18em] uppercase text-muted">
                      Supported by
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo-tx.png" alt="TxLINE" className="h-10 w-auto opacity-90" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/sp-brazil-logo.png" alt="Superteam Brazil" className="h-7 w-auto opacity-90" />
                  </div>
                  <h1 className="text-2xl md:text-[40px] font-medium text-white text-center leading-tight">
                    Any question about the match.
                    <br />
                    <span className="text-muted">Answered in real time.</span>
                  </h1>
                  <p className="mt-3 text-sm md:text-[15px] text-[#b9c4c2] text-center max-w-md leading-relaxed">
                    Live World Cup data from TxLINE.
                    <br />
                    Analyzed by AI. Cost verified on Solana.
                  </p>

                  <div className="w-full max-w-xl mt-8">
                    <ChatInput
                      value={input}
                      onChange={setInput}
                      onSend={() => sendMessage()}
                      disabled={loading}
                    />
                  </div>

                  <div className="flex flex-wrap justify-center gap-2 mt-5">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(s)}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-full border border-white/10 bg-black/30 backdrop-blur text-[12px] text-[#b9c4c2] hover:border-teal/60 hover:text-white active:scale-95 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* feature section */}
              <div className="pt-16 pb-16 md:pt-24 md:pb-24 px-4">
                <div className="max-w-6xl mx-auto rounded-2xl border border-border bg-card p-6 md:p-8 flex flex-col md:flex-row gap-8">
                  {/* ball graphic */}
                  <div className="relative w-full md:w-[380px] aspect-square rounded-xl overflow-hidden bg-[#050c0b] border border-border flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/ball.png"
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>

                  {/* copy */}
                  <div className="flex-1 flex flex-col justify-center gap-6">
                    <span className="text-[11px] font-bold tracking-[0.18em] text-muted">
                      MYLOS
                    </span>

                    <h3 className="text-xl md:text-2xl font-medium text-white leading-snug">
                      The engine that fetches, verifies and prices
                      every answer.
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <p className="text-[11px] font-bold tracking-widest text-muted mb-1">
                          ROUTING
                        </p>
                        <p className="text-sm text-[#b9c4c2] leading-relaxed">
                          Mylos picks the right source for each
                          question, and knows when to use it.
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold tracking-widest text-muted mb-1">
                          EXECUTION
                        </p>
                        <p className="text-sm text-[#b9c4c2] leading-relaxed">
                          We call TxLINE and Groq, handling auth,
                          retries and rate limits for you.
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold tracking-widest text-muted mb-1">
                          VALIDATION
                        </p>
                        <p className="text-sm text-[#b9c4c2] leading-relaxed">
                          Every answer is cost-rated and settled on
                          Solana, so nothing is invented.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* deep tech section: on-chain CPI + production readiness */}
              <div className="pb-16 md:pb-24 px-4">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-5">
                  {/* CPI verification card */}
                  <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-7 md:p-8">
                    <div
                      className="pointer-events-none absolute -right-16 -top-16 w-56 h-56 rounded-full opacity-20 blur-3xl"
                      style={{ background: 'var(--color-teal-bright)' }}
                    />
                    <span className="text-[10px] font-bold tracking-[0.2em] text-teal">
                      TRADING TOOLS TRACK
                    </span>
                    <h3 className="mt-3 text-xl md:text-2xl font-medium text-white leading-snug">
                      Stats aren&apos;t just fetched.
                      <br />
                      They&apos;re proven on-chain.
                    </h3>
                    <p className="mt-4 text-sm text-[#b9c4c2] leading-relaxed">
                      Mylos calls TxLINE&apos;s program directly via{' '}
                      <span className="text-white font-medium">
                        Cross-Program Invocation (CPI)
                      </span>{' '}
                      to validate every stat against its on-chain Merkle
                      root before it reaches the model. Not an API claim —
                      a cryptographic proof, settled on Solana.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      {['RUST', 'ANCHOR', 'CPI', 'SOLANA'].map(tag => (
                        <span
                          key={tag}
                          className="text-[10px] font-bold tracking-wider text-teal border border-teal/30 bg-teal-dim rounded-md px-2 py-1"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* production readiness card */}
                  <div className="rounded-2xl border border-border bg-card p-7 md:p-8">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-muted">
                      BUILT TO INTEGRATE
                    </span>
                    <h3 className="mt-3 text-xl md:text-2xl font-medium text-white leading-snug">
                      Production-ready for
                      <br />
                      professional operators.
                    </h3>
                    <div className="mt-5 space-y-3.5">
                      {[
                        ['Documented API', 'Any system can consume it — no guesswork.'],
                        ['Webhooks', 'Fired the moment a signal is detected.'],
                        ['API key authentication', 'Every request is scoped and traceable.'],
                        ['Rate limiting', 'Predictable behavior under load.'],
                        ['Structured logs', 'Every call is observable end to end.'],
                      ].map(([title, desc]) => (
                        <div key={title} className="flex items-start gap-3">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal flex-shrink-0" />
                          <p className="text-sm leading-relaxed">
                            <span className="text-white font-medium">{title}</span>
                            <span className="text-[#b9c4c2]"> — {desc}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ===== Chat view ===== */
          <>
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="max-w-2xl mx-auto space-y-5">
                {messages.map(msg => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {loading && <ThinkingIndicator isGeneral={!selectedFixture} />}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="flex-shrink-0 px-4 pb-4 pt-1">
              <div className="max-w-2xl mx-auto">
                {mylosScore && selectedFixture?.status === 'live' && (
                  <MylosScore
                    mylos={mylosScore}
                    homeTeam={selectedFixture.homeTeam}
                    awayTeam={selectedFixture.awayTeam}
                  />
                )}
                {selectedFixture ? (
                  <div className="flex items-center gap-2 mb-2 px-1 flex-wrap">
                    <span className="text-[11px] text-muted">Analyzing:</span>
                    <button
                      onClick={() => setSelectedFixture(null)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-xs text-red-400 hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      {selectedFixture.homeFlag} {selectedFixture.homeTeam} ×{' '}
                      {selectedFixture.awayTeam} {selectedFixture.awayFlag}
                      <span className="ml-1 opacity-60">×</span>
                    </button>
                    <span className="text-[10px] text-muted">
                      (click to deselect)
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-2 px-1 flex-wrap">
                    <span className="text-[11px] text-muted">Mode:</span>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-teal/10 border border-teal/30 text-xs text-teal">
                      Cup Overview
                    </div>
                    <span className="text-[10px] text-muted">
                      (select a match in the sidebar for match-specific analysis)
                    </span>
                  </div>
                )}
                {BILLING_ENABLED && paying && (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-teal">
                    <span className="animate-pulse">⟳</span>
                    Approve payment in Phantom...
                  </div>
                )}
                {BILLING_ENABLED && paymentError && (
                  <div className="px-3 py-2 text-xs text-red-400">
                    Payment failed: {paymentError}
                  </div>
                )}
                {BILLING_ENABLED && !connected && (
                  <div className="text-[10px] text-muted text-center mb-1">
                    Connect wallet to enable on-chain billing
                  </div>
                )}
                <ChatInput
                  value={input}
                  onChange={setInput}
                  onSend={() => sendMessage()}
                  disabled={loading || paying}
                  placeholder="Ask about the match..."
                />
                <p className="text-[10px] text-muted mt-2 text-center">
                  Every answer has a verifiable cost on Solana · Powered by
                  TxLINE + Groq
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
