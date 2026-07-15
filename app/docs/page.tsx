'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import {
  getChatSessions,
  deleteChatSession,
  ChatSession,
} from '@/lib/chatStorage'

interface Fixture {
  fixtureId: number
  homeTeam: string
  awayTeam: string
  homeFlag?: string
  awayFlag?: string
  status: string
  minute?: number
}

interface Endpoint {
  method: string
  path: string
  desc: string[]
  when: string
  cost: string
  body?: string
  example: string
  curl: string
}

const ENDPOINTS: Endpoint[] = [
  {
    method: 'GET',
    path: '/v1/fixtures',
    desc: ['List all World Cup 2026 fixtures with live status.', 'Status is refreshed from TxLINE on every call — never a stale cached value.'],
    when: 'Poll this to build a live match list or dashboard.',
    cost: 'Free',
    curl: `curl https://fieldcall.vercel.app/api/v1/fixtures \\
  -H "x-api-key: YOUR_KEY"`,
    example: `{
  "data": [
    {
      "fixtureId": 18209181,
      "homeTeam": "France",
      "awayTeam": "Morocco",
      "homeFlag": "🇫🇷",
      "awayFlag": "🇲🇦",
      "status": "finished",
      "minute": 96
    }
  ],
  "total": 10,
  "source": "TxLINE mainnet",
  "ts": "2026-07-10T19:40:31.088Z"
}`,
  },
  {
    method: 'GET',
    path: '/v1/match/:fixtureId',
    desc: ['Live score + odds for a specific match.', 'Verified against TxLINE mainnet, with a mock fallback if the live feed is unavailable.'],
    when: 'Poll this for a specific match — e.g. a trading bot reacting to goals or odds movement.',
    cost: 'Free',
    curl: `curl https://fieldcall.vercel.app/api/v1/match/18209181 \\
  -H "x-api-key: YOUR_KEY"`,
    example: `{
  "data": {
    "score": {
      "fixtureId": 18209181,
      "homeTeam": "France",
      "awayTeam": "Morocco",
      "homeScore": 2,
      "awayScore": 0,
      "status": "finished",
      "minute": 96
    },
    "odds": {
      "homeWin": 2.1,
      "draw": 3.4,
      "awayWin": 3.2,
      "over25": 1.85,
      "under25": 1.95
    },
    "isLive": false,
    "source": "TxLINE (live)"
  },
  "ts": "2026-07-10T19:40:48.362Z"
}`,
  },
  {
    method: 'GET',
    path: '/v1/verify/:fixtureId',
    desc: [
      'Returns cryptographic proof that a stat is valid.',
      "Calls TxLINE's validateStat program via CPI (Cross-Program Invocation).",
      'dailyScoresPda is the Merkle root account on Solana mainnet — anyone can verify independently, no trust required.',
    ],
    when: 'Call this before acting on a stat in an automated system — confirms the number is backed by an on-chain proof, not just an API response.',
    cost: 'Free',
    curl: `curl https://fieldcall.vercel.app/api/v1/verify/18209181 \\
  -H "x-api-key: YOUR_KEY"`,
    example: `{
  "data": {
    "fixtureId": 18209181,
    "statKey": 1002,
    "isValid": true,
    "dailyScoresPda": "8LKJAbviArV1XRd5FdELmDwWdJtSuFdj2KDB97LQMUTj",
    "verifiedAt": "2026-07-09T21:28:08Z",
    "message": "Stat verified on-chain via TxLINE CPI"
  },
  "ts": "2026-07-09T21:28:08Z"
}`,
  },
  {
    method: 'POST',
    path: '/v1/analyze',
    desc: ['AI-powered match analysis in English, grounded in the same TxLINE data as /v1/match.'],
    when: 'Get a natural-language read on a match, or on the tournament as a whole (omit fixtureId).',
    cost: '~$0.017 per call (TxLINE data + Groq inference)',
    body: '{ question: string, fixtureId?: number }',
    curl: `curl -X POST https://fieldcall.vercel.app/api/v1/analyze \\
  -H "x-api-key: YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"question":"Who will win?","fixtureId":18209181}'`,
    example: `{
  "data": {
    "answer": "The score right now is France 2 x 0 Morocco...",
    "costs": [
      { "service": "TxLINE Score Data", "amount": 0.008 },
      { "service": "TxLINE Odds Data", "amount": 0.008 },
      { "service": "Groq Llama 3.3", "amount": 0.001 }
    ],
    "totalCost": 0.017,
    "fixture": { "fixtureId": 18209181, "homeTeam": "France", "awayTeam": "Morocco" }
  },
  "ts": "2026-07-10T21:41:09.071Z"
}`,
  },
  {
    method: 'POST',
    path: '/v1/webhooks',
    desc: ['Register a URL to receive real-time signals.', 'Events: score_change, odds_movement, match_start, match_end'],
    when: 'Register once, then get pushed events instead of polling — for systems that react to signals as they happen.',
    cost: 'Free',
    body: '{ url: string, fixtureIds?: number[], events?: string[] }',
    curl: `curl -X POST https://fieldcall.vercel.app/api/v1/webhooks \\
  -H "x-api-key: YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://your-system.com/hook","fixtureIds":[18209181]}'`,
    example: `{
  "data": {
    "id": "wh_1783633278008_xva85b",
    "url": "https://your-system.com/hook",
    "fixtureIds": [18209181],
    "events": [],
    "createdAt": "2026-07-09T21:41:18.008Z"
  }
}`,
  },
]

const HOW_IT_WORKS = [
  { title: 'Fetch live data', desc: 'Real score and odds pulled from TxLINE mainnet — not a cached or simulated feed.' },
  { title: 'AI analyzes it', desc: 'Groq Llama 3.3 turns the raw numbers into a grounded, natural-language read.' },
  { title: 'Verify on-chain', desc: "TxLINE's validateStat program is called via CPI, checking the stat against a Merkle root on Solana mainnet." },
]

const STATS = [
  'Live World Cup 2026 Data',
  'On-chain verified via TxLINE CPI',
  'Merkle proof on Solana mainnet',
]

function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={`text-[10px] font-bold tracking-wider px-2 py-1 rounded-md ${
        method === 'GET'
          ? 'text-teal border border-teal/30 bg-teal-dim'
          : 'text-[#b9c4c2] border border-border bg-card'
      }`}
    >
      {method}
    </span>
  )
}

export default function DocsPage() {
  const router = useRouter()
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    fetch('/api/fixtures')
      .then(r => r.json())
      .then(data => setFixtures(data.fixtures || []))
      .catch(console.error)
    setChatSessions(getChatSessions())
  }, [])

  const totalSpent = chatSessions.reduce(
    (sum, s) => sum + s.messages.reduce((s2, m) => s2 + (m.response?.totalCost || 0), 0),
    0
  )

  const handleDeleteChat = (id: string) => {
    deleteChatSession(id)
    setChatSessions(getChatSessions())
  }

  return (
    <div className="flex h-dvh bg-bg text-text overflow-hidden">
      <Sidebar
        fixtures={fixtures}
        selectedFixture={null}
        onSelectFixture={() => router.push('/')}
        chatSessions={chatSessions}
        currentChatId=""
        onNewChat={() => router.push('/')}
        onLoadChat={() => router.push('/')}
        onDeleteChat={handleDeleteChat}
        totalSpent={totalSpent}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(v => !v)}
      />

      <main className="flex-1 overflow-y-auto">
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
        </div>

        <div className="px-4 py-16 md:py-24">
      <div className="max-w-3xl mx-auto">
        <span className="text-[10px] font-bold tracking-[0.2em] text-teal">
          MYLOS API
        </span>
        <h1 className="mt-3 text-2xl md:text-4xl font-medium text-white leading-snug">
          Professional Access
        </h1>
        <p className="mt-4 text-sm md:text-base text-[#b9c4c2] leading-relaxed max-w-xl">
          Live World Cup 2026 data, AI analysis and on-chain verified stats —
          consumable by any trading system, dashboard, or bot.
        </p>

        {/* key stats */}
        <div className="mt-6 flex flex-wrap gap-2">
          {STATS.map(s => (
            <span
              key={s}
              className="text-[11px] font-medium text-teal border border-teal/30 bg-teal-dim rounded-full px-3 py-1"
            >
              {s}
            </span>
          ))}
        </div>

        {/* try it now badge */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
          <code className="text-xs text-white">fc_hackathon_judge_key</code>
          <span className="text-xs text-muted">— try it now, no signup</span>
        </div>

        {/* how it works */}
        <div className="mt-12 grid sm:grid-cols-3 gap-4">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.title} className="rounded-2xl border border-border bg-card p-5">
              <span className="text-[11px] font-bold text-teal">STEP {i + 1}</span>
              <h3 className="mt-1.5 text-sm font-medium text-white">{step.title}</h3>
              <p className="mt-1.5 text-[13px] text-[#b9c4c2] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* auth + base url */}
        <div className="mt-10 rounded-2xl border border-border bg-card p-6 space-y-4">
          <div>
            <p className="text-[11px] font-bold tracking-widest text-muted mb-1">
              AUTHENTICATION
            </p>
            <p className="text-sm text-[#b9c4c2] leading-relaxed">
              All requests require an <code className="text-teal">x-api-key</code> header.
              Contact us for a production key.
            </p>
            <p className="text-sm text-[#b9c4c2] mt-2">
              Demo key: <code className="text-white bg-black/30 px-1.5 py-0.5 rounded">fc_hackathon_judge_key</code>
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-widest text-muted mb-1">
              BASE URL
            </p>
            <code className="text-sm text-white">https://fieldcall.vercel.app/api/v1</code>
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-widest text-muted mb-1">
              RATE LIMITS
            </p>
            <p className="text-sm text-[#b9c4c2] leading-relaxed">
              100 requests per minute per API key. Check{' '}
              <code className="text-teal">X-RateLimit-Limit</code> and{' '}
              <code className="text-teal">X-RateLimit-Remaining</code> response headers.
            </p>
          </div>
        </div>

        {/* quick start */}
        <div className="mt-10">
          <p className="text-[11px] font-bold tracking-widest text-muted mb-3">
            QUICK START
          </p>
          <pre className="rounded-lg bg-black/40 border border-border p-4 overflow-x-auto text-[11.5px] leading-relaxed text-[#b9c4c2]">
            <code>{`# 1. Get live fixtures
curl https://fieldcall.vercel.app/api/v1/fixtures \\
  -H "x-api-key: fc_hackathon_judge_key"

# 2. Get match analysis
curl -X POST https://fieldcall.vercel.app/api/v1/analyze \\
  -H "x-api-key: fc_hackathon_judge_key" \\
  -H "Content-Type: application/json" \\
  -d '{"question":"Who will win?","fixtureId":18209181}'

# 3. Verify on-chain
curl https://fieldcall.vercel.app/api/v1/verify/18209181 \\
  -H "x-api-key: fc_hackathon_judge_key"`}</code>
          </pre>
        </div>

        {/* endpoints */}
        <div className="mt-10 space-y-5">
          <p className="text-[11px] font-bold tracking-widest text-muted">
            ENDPOINTS
          </p>
          {ENDPOINTS.map(ep => (
            <div key={ep.path} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 flex-wrap">
                <MethodBadge method={ep.method} />
                <code className="text-sm md:text-base text-white font-medium">{ep.path}</code>
                <span className="ml-auto text-[11px] text-muted font-mono">{ep.cost}</span>
              </div>
              <div className="mt-3 space-y-1">
                {ep.desc.map(line => (
                  <p key={line} className="text-sm text-[#b9c4c2] leading-relaxed">{line}</p>
                ))}
              </div>
              {ep.body && (
                <p className="mt-2 text-[11px] text-muted font-mono">
                  Body: <span className="text-[#b9c4c2]">{ep.body}</span>
                </p>
              )}
              <p className="mt-3 text-[11px] text-muted">
                <span className="font-bold tracking-wider">WHEN TO USE</span>{' '}
                <span className="text-[#b9c4c2]">{ep.when}</span>
              </p>

              <p className="mt-4 text-[10px] font-bold tracking-widest text-muted">REQUEST</p>
              <pre className="mt-1.5 rounded-lg bg-black/40 border border-border p-3 overflow-x-auto text-[11.5px] leading-relaxed text-[#b9c4c2]">
                <code>{ep.curl}</code>
              </pre>

              <p className="mt-3 text-[10px] font-bold tracking-widest text-muted">EXAMPLE RESPONSE</p>
              <pre className="mt-1.5 rounded-lg bg-black/40 border border-border p-3 overflow-x-auto text-[11.5px] leading-relaxed text-[#b9c4c2]">
                <code>{ep.example}</code>
              </pre>
            </div>
          ))}
        </div>

        {/* tech stack */}
        <div className="mt-10 rounded-2xl border border-border bg-card p-6">
          <p className="text-[11px] font-bold tracking-widest text-muted mb-4">
            TECH STACK
          </p>
          <div className="space-y-3">
            {[
              ['Data', 'TxLINE (TxODDS) — trusted by Flutter, Bet365, Entain, Caesars and other major sportsbooks'],
              ['AI', 'Groq Llama 3.3 70B'],
              ['On-chain', 'Solana mainnet via Anchor CPI'],
              ['Verification', "TxLINE's validateStat Merkle proof"],
              ['Billing', 'Metera x402 protocol'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start gap-3">
                <span className="w-24 flex-shrink-0 text-[11px] font-bold tracking-widest text-muted">
                  {label.toUpperCase()}
                </span>
                <span className="text-sm text-[#b9c4c2] leading-relaxed">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <a
          href="/docs/technical"
          className="mt-5 flex items-center justify-between rounded-2xl border border-border bg-card p-6 hover:border-teal/50 hover:bg-card-hover active:scale-[0.99] transition-all cursor-pointer group"
        >
          <div>
            <p className="text-sm font-medium text-white">Technical Architecture</p>
            <p className="mt-1 text-[13px] text-muted">
              Full system design — routing, on-chain verification, billing, and data flow.
            </p>
          </div>
          <span className="text-teal text-lg group-hover:translate-x-0.5 transition-transform">→</span>
        </a>

        <div className="mt-10 rounded-2xl border border-teal/20 bg-teal-dim p-5">
          <p className="text-sm text-[#b9c4c2] leading-relaxed">
            Mylos is built on{' '}
            <a href="https://metera.xyz" target="_blank" rel="noopener noreferrer" className="text-teal hover:underline">
              Metera
            </a>{' '}
            — billing infrastructure for AI agents on Solana. Any API can charge
            agents automatically in USDC via the x402 protocol.
          </p>
        </div>

        <p className="mt-12 text-xs text-muted">
          mylos.xyz · World Cup 2026 · Powered by TxLINE + Groq + Solana
        </p>
      </div>
        </div>
      </main>
    </div>
  )
}
