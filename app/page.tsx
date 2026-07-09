'use client'

import { useState, useEffect, useRef } from 'react'
import { ChatMessage, AgentResponse } from '@/types'
import Sidebar from '@/components/Sidebar'
import ChatInput from '@/components/ChatInput'
import MessageBubble from '@/components/MessageBubble'
import ThinkingIndicator from '@/components/ThinkingIndicator'
import { DitheringBackground } from '@/components/ui/hero-dithering-card'

const SUGGESTIONS = [
  'Will Brazil win?',
  'What is the score now?',
  'Analyze the odds for me',
  'Who is the top scorer?',
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/fixtures')
      .then(r => r.json())
      .then(data => {
        const list: Fixture[] = data.fixtures || []
        setFixtures(list)
        const live = list.find(f => f.status === 'live')
        if (live) setSelectedFixture(live)
        else if (list.length > 0) setSelectedFixture(list[0])
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text?: string) => {
    const question = text || input.trim()
    if (!question || loading) return

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

      const data: AgentResponse = await res.json()

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        response: data,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Error processing your question. Try again! ⚽',
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
  const chatTitle =
    messages.find(m => m.role === 'user')?.content.slice(0, 28) || null

  const hasChat = messages.length > 0

  return (
    <div className="flex h-dvh bg-bg text-text overflow-hidden">
      <Sidebar
        fixtures={fixtures}
        selectedFixture={selectedFixture}
        onSelectFixture={setSelectedFixture}
        chatTitle={chatTitle}
        onNewChat={() => {
          setMessages([])
          setSidebarOpen(false)
        }}
        totalSpent={totalSpent}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* mobile top bar */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-border">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md text-muted hover:text-text hover:bg-card transition-colors"
            aria-label="Open menu"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
            </svg>
          </button>
          <span className="text-[13px] font-medium">FieldCall</span>
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
                    {SUGGESTIONS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(s)}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-full border border-white/10 bg-black/30 backdrop-blur text-[12px] text-[#b9c4c2] hover:border-teal/60 hover:text-white transition-colors disabled:opacity-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* big tagline */}
              <div className="py-16 md:py-24 px-4">
                <p className="text-2xl md:text-[40px] font-medium text-center max-w-4xl mx-auto leading-snug tracking-tight">
                  <span className="text-white">
                    All premium World Cup data for AIs.{' '}
                  </span>
                  <span className="text-muted">
                    FieldCall knows which source to use, and when.{' '}
                  </span>
                  <span className="text-white">
                    Every answer has a verifiable cost.
                  </span>
                </p>
              </div>

              {/* feature section */}
              <div className="pb-16 md:pb-24 px-4">
                <p className="text-xl md:text-[28px] font-medium max-w-3xl mx-auto leading-snug tracking-tight mb-8">
                  <span className="text-white">Data reliability system. </span>
                  <span className="text-muted">
                    You only pay for answers above 80% confidence.{' '}
                  </span>
                  <span className="text-white">
                    We handle sourcing, execution and validation.
                  </span>
                </p>

                <div className="max-w-6xl mx-auto rounded-2xl border border-border bg-card p-6 md:p-8 flex flex-col md:flex-row gap-8">
                  {/* dotted grid + triangle graphic */}
                  <div
                    className="relative w-full md:w-[380px] aspect-square rounded-xl overflow-hidden bg-[#050c0b] border border-border flex-shrink-0"
                    style={{
                      backgroundImage:
                        'radial-gradient(var(--color-teal) 1px, transparent 1px)',
                      backgroundSize: '14px 14px',
                    }}
                  >
                    <div className="absolute inset-0 bg-[#050c0b]/70" />
                    <svg
                      viewBox="0 0 100 100"
                      className="absolute inset-0 w-full h-full"
                    >
                      <polygon
                        points="20,25 78,45 28,80"
                        fill="none"
                        stroke="var(--color-teal-bright)"
                        strokeWidth="1"
                      />
                    </svg>
                    <div className="absolute left-[14%] top-[16%] w-[22%] h-[22%] bg-teal-dim" />
                    <div className="absolute right-[16%] top-[34%] w-[26%] h-[26%] bg-teal-dim" />
                  </div>

                  {/* copy */}
                  <div className="flex-1 flex flex-col justify-center gap-6">
                    <span className="flex items-center gap-2">
                      <span className="text-[11px] font-bold tracking-[0.18em] text-muted">
                        FIELDCALL
                      </span>
                      <span className="text-[10px] font-bold bg-white text-black rounded-[3px] px-1.5 leading-[16px]">
                        F1
                      </span>
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
                          FieldCall picks the right source for each
                          question, and knows when to use it.
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold tracking-widest text-muted mb-1">
                          EXECUTION
                        </p>
                        <p className="text-sm text-[#b9c4c2] leading-relaxed">
                          We call TxLINE and Gemini, handling auth,
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

                    <button className="self-start text-[11px] font-bold tracking-widest text-text border border-border rounded-md px-3 py-2 hover:border-teal hover:text-teal transition-colors">
                      LEARN MORE
                    </button>
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
                {loading && <ThinkingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="flex-shrink-0 px-4 pb-4 pt-1">
              <div className="max-w-2xl mx-auto">
                {selectedFixture && (
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-[11px] text-muted">
                      Selected match:
                    </span>
                    <span className="text-[11px] text-teal font-medium">
                      {selectedFixture.homeFlag} {selectedFixture.homeTeam} ×{' '}
                      {selectedFixture.awayTeam} {selectedFixture.awayFlag}
                    </span>
                  </div>
                )}
                <ChatInput
                  value={input}
                  onChange={setInput}
                  onSend={() => sendMessage()}
                  disabled={loading}
                  placeholder="Ask about the match..."
                />
                <p className="text-[10px] text-muted mt-2 text-center">
                  Every answer has a verifiable cost on Solana · Powered by
                  TxLINE + Gemini
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
