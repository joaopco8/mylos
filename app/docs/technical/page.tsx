interface Section {
  id: string
  eyebrow: string
  title: string
}

const FLOW = `User question
    ↓
Intent Detection (lib/intent.ts)
    ↓
TxLINE API (live score + odds)
    ↓
Groq Llama 3.3 (analysis in English)
    ↓
Merkle Proof validation via CPI
    ↓
Response + cost breakdown`

const CAPABILITIES = [
  {
    title: 'Routing',
    desc: 'Detects 8 intent types: live_score, prediction, odds, top_scorers, image, player, history, general.',
  },
  {
    title: 'Execution',
    desc: 'Calls TxLINE mainnet API with JWT auto-renewal, Groq Llama 3.3 70B for analysis, Gemini for image generation.',
  },
  {
    title: 'Validation',
    desc: "Calls TxLINE's validateStat via Anchor CPI, verifies the Merkle proof on-chain before trusting a stat.",
  },
]

const TXLINE_ENDPOINTS = [
  'GET /api/scores/snapshot/{fixtureId}',
  'GET /api/odds/snapshot/{fixtureId}',
  'GET /api/scores/stat-validation',
]

const COSTS = [
  ['TxLINE Score', '$0.008 USDC'],
  ['TxLINE Odds', '$0.008 USDC'],
  ['Groq Llama 3.3', '$0.001 USDC'],
  ['Total', '~$0.017 USDC per analysis'],
  ['Image generation', '+$0.10 USDC'],
]

const API_ENDPOINTS = [
  ['GET', '/v1/fixtures', 'list all World Cup fixtures'],
  ['GET', '/v1/match/:id', 'live score + odds'],
  ['GET', '/v1/verify/:id', 'on-chain Merkle proof'],
  ['POST', '/v1/analyze', 'AI analysis'],
  ['POST', '/v1/webhooks', 'register signal webhook'],
]

const TECH_STACK = [
  ['Frontend', 'Next.js 16, Tailwind v4, TypeScript'],
  ['AI', 'Groq Llama 3.3 70B (chat), Gemini (images)'],
  ['Sports Data', 'TxLINE mainnet (TxODDS)'],
  ['On-chain', 'Solana mainnet, Anchor CPI'],
  ['Wallet', 'Phantom/Solflare via Wallet Standard'],
  ['Verification', "TxLINE's validateStat Merkle proof"],
  ['Billing partner', 'Metera — agent billing infrastructure on Solana'],
  ['Deploy', 'Vercel'],
]

const SECTIONS: Section[] = [
  { id: 'overview', eyebrow: '01', title: 'Overview' },
  { id: 'flow', eyebrow: '02', title: 'How It Works' },
  { id: 'components', eyebrow: '03', title: 'Components' },
  { id: 'data', eyebrow: '04', title: 'Data Sources' },
  { id: 'ai', eyebrow: '05', title: 'AI Engine' },
  { id: 'onchain', eyebrow: '06', title: 'On-Chain Verification' },
  { id: 'billing', eyebrow: '07', title: 'Billing' },
  { id: 'api', eyebrow: '08', title: 'Professional API' },
  { id: 'stack', eyebrow: '09', title: 'Tech Stack' },
  { id: 'repo', eyebrow: '10', title: 'Repository' },
]

function SectionCard({
  id, eyebrow, title, children,
}: {
  id: string
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-8 rounded-2xl border border-border bg-card p-6 md:p-8">
      <div className="flex items-baseline gap-3 mb-5">
        <span className="text-[11px] font-bold tracking-widest text-teal">{eyebrow}</span>
        <h2 className="text-lg md:text-xl font-medium text-white">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Code({ children }: { children: string }) {
  return (
    <pre className="rounded-lg bg-black/40 border border-border p-3 md:p-4 overflow-x-auto text-[11.5px] leading-relaxed text-[#b9c4c2]">
      <code>{children}</code>
    </pre>
  )
}

export default function TechnicalDocsPage() {
  return (
    <div className="min-h-screen bg-bg text-text px-4 py-16 md:py-24 overflow-x-hidden">
      <div className="max-w-3xl mx-auto">
        <a href="/docs" className="text-[11px] text-muted hover:text-teal transition-colors">
          ← API Docs
        </a>

        <span className="mt-6 block text-[10px] font-bold tracking-[0.2em] text-teal">
          MYLOS — TECHNICAL ARCHITECTURE
        </span>
        <h1 className="mt-3 text-2xl md:text-4xl font-medium text-white leading-snug">
          Mylos — Technical Architecture
        </h1>
        <p className="mt-2 text-sm md:text-base text-[#b9c4c2]">
          AI-powered World Cup analysis with on-chain verified data
        </p>

        {/* table of contents */}
        <div className="mt-8 flex flex-wrap gap-1.5">
          {SECTIONS.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="text-[11px] text-muted hover:text-teal border border-border rounded-full px-2.5 py-1 transition-colors"
            >
              {s.eyebrow} {s.title}
            </a>
          ))}
        </div>

        <div className="mt-10 space-y-5">
          <SectionCard id="overview" eyebrow={SECTIONS[0].eyebrow} title={SECTIONS[0].title}>
            <p className="text-sm text-[#b9c4c2] leading-relaxed">
              Mylos combines live sports data from TxLINE (TxODDS), AI analysis from
              Groq Llama 3.3 70B, and cryptographic verification via Solana CPI to
              deliver trustless World Cup intelligence — every number an answer cites
              can be independently checked against an on-chain Merkle root, not just
              taken on faith from an API response.
            </p>
          </SectionCard>

          <SectionCard id="flow" eyebrow={SECTIONS[1].eyebrow} title={SECTIONS[1].title}>
            <Code>{FLOW}</Code>
          </SectionCard>

          <SectionCard id="components" eyebrow={SECTIONS[2].eyebrow} title={SECTIONS[2].title}>
            <p className="text-[11px] font-bold tracking-widest text-muted mb-1">MYLOS</p>
            <p className="text-sm text-[#b9c4c2] leading-relaxed">
              Mylos is the routing and execution engine at the heart of the app. It
              detects the intent of each question, fetches the right data from
              TxLINE, routes to Groq for analysis, and validates stats on-chain via
              CPI.
            </p>
            <div className="mt-5 space-y-4">
              {CAPABILITIES.map(c => (
                <div key={c.title}>
                  <p className="text-[11px] font-bold tracking-widest text-muted mb-1">
                    {c.title.toUpperCase()}
                  </p>
                  <p className="text-sm text-[#b9c4c2] leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard id="data" eyebrow={SECTIONS[3].eyebrow} title={SECTIONS[3].title}>
            <p className="text-[11px] font-bold tracking-widest text-muted mb-1">
              TXLINE (TXODDS)
            </p>
            <ul className="text-sm text-[#b9c4c2] leading-relaxed space-y-1 list-disc list-inside">
              <li>Sports data infrastructure trusted by Flutter, Bet365, Entain, Caesars and other major sportsbooks</li>
              <li>Mainnet subscription: Service Level 1 (free tier)</li>
              <li>
                Subscription tx:{' '}
                <a
                  href="https://explorer.solana.com/tx/4wpq6ZvJUEpXXYWqqquv88nXwvUUPRBtBMkjZ4Y6ZwB2cuWGmmYew1PuBDsHEBfbwasXEnj6r5WorQrW6PLnXa5Y"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal hover:underline break-all"
                >
                  4wpq6ZvJ...PLnXa5Y
                </a>
              </li>
              <li>Data delay: ~60 seconds on the free tier</li>
              <li>Auth: JWT (auto-renewed) + permanent API token</li>
            </ul>
            <p className="text-[11px] font-bold tracking-widest text-muted mt-4 mb-1">
              ENDPOINTS USED
            </p>
            <Code>{TXLINE_ENDPOINTS.join('\n')}</Code>
          </SectionCard>

          <SectionCard id="ai" eyebrow={SECTIONS[4].eyebrow} title={SECTIONS[4].title}>
            <p className="text-[11px] font-bold tracking-widest text-muted mb-1">
              GROQ LLAMA 3.3 70B
            </p>
            <ul className="text-sm text-[#b9c4c2] leading-relaxed space-y-1 list-disc list-inside mb-5">
              <li>Used for natural-language analysis in English</li>
              <li>System prompt: direct commentator tone, no emojis, uses only the exact numbers provided in context</li>
              <li>Average latency: ~1.8 seconds</li>
              <li>Cost per call: $0.001 USDC</li>
            </ul>
            <p className="text-[11px] font-bold tracking-widest text-muted mb-1">
              GEMINI 3.1 FLASH IMAGE
            </p>
            <ul className="text-sm text-[#b9c4c2] leading-relaxed space-y-1 list-disc list-inside">
              <li>Used for image and meme generation</li>
              <li>Requires Google Cloud billing to be enabled</li>
              <li>Cost per image: $0.10 USDC</li>
            </ul>
          </SectionCard>

          <SectionCard id="onchain" eyebrow={SECTIONS[5].eyebrow} title={SECTIONS[5].title}>
            <p className="text-[11px] font-bold tracking-widest text-muted mb-1">
              TXLINE VALIDATESTAT CPI
            </p>
            <ul className="text-sm text-[#b9c4c2] leading-relaxed space-y-1 list-disc list-inside mb-5">
              <li>Program: 9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA</li>
              <li>Calls validateStat via Anchor CPI (Cross-Program Invocation)</li>
              <li>Input: Merkle proof from /api/scores/stat-validation</li>
              <li>Output: isValid (true/false) + dailyScoresPda</li>
              <li>Anyone can independently verify the PDA on Solana Explorer</li>
            </ul>
            <p className="text-[11px] font-bold tracking-widest text-muted mb-1">
              LIVE EXAMPLE
            </p>
            <Code>{`GET /api/v1/verify/18209181

{
  "fixtureId": 18209181,
  "statKey": 1002,
  "isValid": true,
  "dailyScoresPda": "8LKJAbviArV1XRd5FdELmDwWdJtSuFdj2KDB97LQMUTj",
  "verifiedAt": "2026-07-09T21:28:08Z"
}`}</Code>
          </SectionCard>

          <SectionCard id="billing" eyebrow={SECTIONS[6].eyebrow} title={SECTIONS[6].title}>
            <p className="text-sm text-[#b9c4c2] leading-relaxed mb-4">
              Per-question billing via a connected wallet: the user connects
              Phantom or Solflare, and each question is paid for in USDC on
              Solana mainnet before it's processed — the payment is a direct,
              user-signed SPL token transfer, not a proxied or custodial charge.
              A cost breakdown is shown after every answer. Billing only
              activates once a wallet is connected; without one, chat runs free.
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              {COSTS.map(([label, value], i) => (
                <div
                  key={label}
                  className={`flex items-center justify-between px-3 py-2 text-sm ${i < COSTS.length - 1 ? 'border-b border-border' : ''} ${label === 'Total' ? 'bg-teal-dim' : ''}`}
                >
                  <span className={label === 'Total' ? 'text-white font-medium' : 'text-[#b9c4c2]'}>{label}</span>
                  <span className={label === 'Total' ? 'text-teal font-bold font-mono' : 'text-muted font-mono'}>{value}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard id="api" eyebrow={SECTIONS[7].eyebrow} title={SECTIONS[7].title}>
            <div className="text-sm text-[#b9c4c2] space-y-1 mb-5">
              <p>Base URL: <code className="text-teal">https://myloswc.vercel.app/api/v1</code></p>
              <p>Auth: <code className="text-teal">x-api-key</code> header</p>
              <p>Rate limit: 100 req/min</p>
            </div>
            <div className="rounded-lg border border-border overflow-hidden mb-5">
              {API_ENDPOINTS.map(([method, path, desc], i) => (
                <div
                  key={path}
                  className={`flex items-center gap-3 px-3 py-2 text-sm ${i < API_ENDPOINTS.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded ${method === 'GET' ? 'text-teal border border-teal/30 bg-teal-dim' : 'text-[#b9c4c2] border border-border bg-bg'}`}>
                    {method}
                  </span>
                  <code className="text-white text-xs">{path}</code>
                  <span className="text-muted text-xs ml-auto text-right">{desc}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-[#b9c4c2] mb-2">
              Demo key: <code className="text-white bg-black/30 px-1.5 py-0.5 rounded">fc_hackathon_judge_key</code>
            </p>
            <p className="text-[11px] font-bold tracking-widest text-muted mb-1 mt-4">
              QUICK START
            </p>
            <Code>{`# Get live fixtures
curl https://myloswc.vercel.app/api/v1/fixtures \\
  -H "x-api-key: fc_hackathon_judge_key"

# Verify on-chain
curl https://myloswc.vercel.app/api/v1/verify/18209181 \\
  -H "x-api-key: fc_hackathon_judge_key"

# AI analysis
curl -X POST https://myloswc.vercel.app/api/v1/analyze \\
  -H "x-api-key: fc_hackathon_judge_key" \\
  -H "Content-Type: application/json" \\
  -d '{"question":"Who will win?","fixtureId":18209181}'`}</Code>
          </SectionCard>

          <SectionCard id="stack" eyebrow={SECTIONS[8].eyebrow} title={SECTIONS[8].title}>
            <div className="space-y-3">
              {TECH_STACK.map(([label, value]) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="w-28 flex-shrink-0 text-[11px] font-bold tracking-widest text-muted">
                    {label.toUpperCase()}
                  </span>
                  <span className="text-sm text-[#b9c4c2] leading-relaxed">{value}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard id="repo" eyebrow={SECTIONS[9].eyebrow} title={SECTIONS[9].title}>
            <div className="text-sm space-y-1.5">
              <p>
                <span className="text-muted">GitHub: </span>
                <a href="https://github.com/joaopco8/mylos" target="_blank" rel="noopener noreferrer" className="text-teal hover:underline">
                  github.com/joaopco8/mylos
                </a>
              </p>
              <p>
                <span className="text-muted">Live demo: </span>
                <a href="https://myloswc.vercel.app" target="_blank" rel="noopener noreferrer" className="text-teal hover:underline">
                  myloswc.vercel.app
                </a>
              </p>
            </div>
          </SectionCard>
        </div>

        <p className="mt-12 text-xs text-muted">
          myloswc.vercel.app · World Cup 2026 · Powered by TxLINE + Groq + Solana
        </p>
      </div>
    </div>
  )
}
