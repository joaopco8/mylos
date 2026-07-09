'use client'

import WalletButton from './WalletButton'

interface Fixture {
  fixtureId: number
  homeTeam: string
  awayTeam: string
  homeFlag?: string
  awayFlag?: string
  status: string
  minute?: number
}

interface SidebarProps {
  fixtures: Fixture[]
  selectedFixture: Fixture | null
  onSelectFixture: (f: Fixture) => void
  chatTitle: string | null
  onNewChat: () => void
  totalSpent: number
  open: boolean
  onClose: () => void
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 3v10M3 8h10" strokeLinecap="round" />
    </svg>
  )
}

function IconRuns() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 4h9M5 8h9M5 12h9" strokeLinecap="round" />
      <path d="M2 4h.01M2 8h.01M2 12h.01" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function IconConnect() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2v4M10 2v4M4 6h8v2a4 4 0 0 1-8 0V6ZM8 12v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconTools() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9.5 3.5a3 3 0 0 0-4 4l-3 3a1.4 1.4 0 0 0 2 2l3-3a3 3 0 0 0 4-4l-2 2-2-2 2-2Z" strokeLinejoin="round" />
    </svg>
  )
}

function IconPanel() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" />
      <path d="M6 2.5v11" />
    </svg>
  )
}

function IconChevrons() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 6l3-3 3 3M2 10l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconGear() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4" strokeLinecap="round" />
    </svg>
  )
}

export default function Sidebar({
  fixtures,
  selectedFixture,
  onSelectFixture,
  chatTitle,
  onNewChat,
  totalSpent,
  open,
  onClose,
}: SidebarProps) {
  const liveCount = fixtures.filter(f => f.status === 'live').length

  return (
    <>
      {/* mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed md:static z-40 h-full w-60 flex-shrink-0
          bg-sidebar border-r border-border
          flex flex-col
          transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Workspace header */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          <button className="flex items-center gap-2 flex-1 rounded-lg border border-border bg-card px-2.5 py-1.5 hover:bg-card-hover transition-colors">
            <span className="text-[13px] font-medium text-text">FieldCall</span>
            <span className="ml-auto text-muted">
              <IconChevrons />
            </span>
          </button>
          <button
            onClick={onClose}
            className="text-muted hover:text-text p-1.5 rounded-md hover:bg-card transition-colors"
            aria-label="Close panel"
          >
            <IconPanel />
          </button>
        </div>

        {/* Nav */}
        <nav className="px-2 pt-2 space-y-0.5">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-card border border-border text-[13px] text-text hover:bg-card-hover transition-colors"
          >
            <IconPlus />
            New chat
          </button>
          <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-muted hover:text-teal hover:bg-card transition-colors">
            <IconRuns />
            Runs
          </button>
          <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-muted hover:text-teal hover:bg-card transition-colors">
            <IconConnect />
            Connect
          </button>
          <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-muted hover:text-teal hover:bg-card transition-colors">
            <IconTools />
            Tools
          </button>
        </nav>

        {/* Matches */}
        <div className="px-2 mt-5">
          <div className="flex items-center justify-between px-2.5 mb-1">
            <span className="text-[11px] font-medium text-muted">Matches</span>
            {liveCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {liveCount} live
              </span>
            )}
          </div>
          <div className="space-y-0.5">
            {fixtures.map(f => {
              const selected = selectedFixture?.fixtureId === f.fixtureId
              const isLive = f.status === 'live'
              return (
                <button
                  key={f.fixtureId}
                  onClick={() => {
                    onSelectFixture(f)
                    onClose()
                  }}
                  className={`
                    w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg
                    text-[12px] transition-colors text-left
                    ${selected
                      ? 'bg-teal-dim text-text'
                      : 'text-muted hover:text-teal hover:bg-card'}
                  `}
                >
                  <span className="truncate flex-1">
                    {f.homeTeam} × {f.awayTeam}
                  </span>
                  {isLive ? (
                    <span className="text-[10px] font-bold text-red-400">
                      {f.minute ? `${f.minute}'` : 'LIVE'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted/60">
                      {f.status === 'finished' ? 'ended' : 'soon'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Chats */}
        <div className="px-2 mt-5 flex-1 overflow-y-auto scrollbar-hide">
          <div className="flex items-center justify-between px-2.5 mb-1">
            <span className="text-[11px] font-medium text-muted">Chats</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
              <path d="M2 4l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {chatTitle ? (
            <div className="px-2.5 py-1.5 rounded-lg bg-card text-[12px] text-text truncate">
              {chatTitle}
            </div>
          ) : (
            <div className="px-2.5 py-1.5 text-[12px] text-muted/60">
              No conversations yet
            </div>
          )}
        </div>

        {/* Wallet card */}
        <div className="p-2.5 space-y-2">
          <WalletButton />
          <div className="inline-flex items-center gap-1 rounded border border-border bg-bg px-1.5 py-px">
            <span className="text-[9px] font-mono font-bold text-teal">
              ${totalSpent.toFixed(4)}
            </span>
            <span className="text-[8px] tracking-wider text-muted">
              SESSION SPENT
            </span>
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="flex items-center gap-1.5 text-[9px] tracking-widest text-muted">
              <span className="w-5 h-3 rounded-full bg-card border border-border relative">
                <span className="absolute left-0.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-muted" />
              </span>
              AGENTS
            </span>
            <span className="text-muted">
              <IconGear />
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}
