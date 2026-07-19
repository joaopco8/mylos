'use client'

import { useState, useEffect } from 'react'
import WalletButton from './WalletButton'
import { useWalletBalance } from '@/hooks/useWalletBalance'
import { ChatSession } from '@/lib/chatStorage'
import { getLocalBets } from '@/lib/localBets'

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
  chatSessions: ChatSession[]
  currentChatId: string
  onNewChat: () => void
  onLoadChat: (session: ChatSession) => void
  onDeleteChat: (id: string) => void
  totalSpent: number
  open: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 3v10M3 8h10" strokeLinecap="round" />
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

function IconDocs() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 2.5h5.5L12 5v8.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
      <path d="M5.5 6h5M5.5 8.5h5M5.5 11h3" strokeLinecap="round" />
    </svg>
  )
}

function IconGitHub() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

function IconTelegram() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.8 13.6l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.959z" />
    </svg>
  )
}

function IconTarget() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="3" />
      <circle cx="8" cy="8" r="0.5" fill="currentColor" />
    </svg>
  )
}

function IconTrophy() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4.5 2h7v3.5a3.5 3.5 0 0 1-7 0V2Z" strokeLinejoin="round" />
      <path d="M4.5 3H2.5a1 1 0 0 0-1 1v.5a2.5 2.5 0 0 0 2.5 2.5M11.5 3h2a1 1 0 0 1 1 1v.5a2.5 2.5 0 0 1-2.5 2.5" strokeLinecap="round" />
      <path d="M8 9v2M5.5 14h5M6 11.5h4v1a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-1Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconMatches() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 2v2.2M8 11.8V14M2 8h2.2M11.8 8H14" strokeLinecap="round" />
    </svg>
  )
}

function IconChatBubble() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 3.5h12v7.5a1 1 0 0 1-1 1H6l-3 3v-3H3a1 1 0 0 1-1-1V3.5Z" strokeLinejoin="round" />
    </svg>
  )
}

function IconWallet() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1.5" y="4" width="13" height="9" rx="1.5" />
      <path d="M1.5 6.5h13M10.5 9.5h2" strokeLinecap="round" />
    </svg>
  )
}

function IconCoin() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.5v7M10 6.1c0-.9-.9-1.6-2-1.6s-2 .7-2 1.6.9 1.4 2 1.6c1.1.2 2 .7 2 1.6s-.9 1.6-2 1.6-2-.7-2-1.6" strokeLinecap="round" />
    </svg>
  )
}

function RailButton({
  onClick, label, children, href, target,
}: {
  onClick?: () => void
  label: string
  children: React.ReactNode
  href?: string
  target?: string
}) {
  const className = "relative flex items-center justify-center w-9 h-9 rounded-lg text-muted hover:text-teal hover:bg-card active:scale-90 transition-all cursor-pointer"
  if (href) {
    return (
      <a href={href} target={target} rel={target ? 'noopener noreferrer' : undefined} title={label} className={className}>
        {children}
      </a>
    )
  }
  return (
    <button onClick={onClick} title={label} aria-label={label} className={className}>
      {children}
    </button>
  )
}

function scrollToBetSection() {
  setTimeout(() => {
    document.getElementById('bet-section')?.scrollIntoView({ behavior: 'smooth' })
  }, 300)
}

export default function Sidebar({
  fixtures,
  selectedFixture,
  onSelectFixture,
  chatSessions,
  currentChatId,
  onNewChat,
  onLoadChat,
  onDeleteChat,
  totalSpent,
  open,
  onClose,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const liveCount = fixtures.filter(f => f.status === 'live').length
  const { balance: usdcBalance, connected: walletConnected } = useWalletBalance()
  const [showAllFixtures, setShowAllFixtures] = useState(false)
  const FIXTURES_PREVIEW_COUNT = 3
  const visibleFixtures = showAllFixtures ? fixtures : fixtures.slice(0, FIXTURES_PREVIEW_COUNT)
  const hasMoreFixtures = fixtures.length > FIXTURES_PREVIEW_COUNT

  const [openBetsCount, setOpenBetsCount] = useState(0)
  useEffect(() => {
    setOpenBetsCount(getLocalBets().filter(b => b.status === 'open').length)
  }, [])

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
          fixed md:static z-40 h-full flex-shrink-0
          bg-sidebar border-r border-border
          overflow-hidden
          transition-all duration-200
          w-60 ${collapsed ? 'md:w-14' : 'md:w-60'}
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
      {/* Collapsed rail (desktop only) */}
      <div className={`hidden ${collapsed ? 'md:flex' : ''} w-14 h-full flex-col items-center py-3 gap-1 flex-shrink-0`}>
        <RailButton onClick={onToggleCollapse} label="Expand">
          <IconPanel />
        </RailButton>
        <div className="w-6 border-t border-border my-1.5" />
        <RailButton onClick={onNewChat} label="New chat">
          <IconPlus />
        </RailButton>
        <div className="relative">
          <RailButton onClick={onToggleCollapse} label={liveCount > 0 ? 'Live matches' : 'Matches'}>
            <IconMatches />
          </RailButton>
          {liveCount > 0 && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          )}
        </div>
        <RailButton onClick={onToggleCollapse} label="Chats">
          <IconChatBubble />
        </RailButton>
        <div className="flex-1" />
        <div className="relative">
          <RailButton href="/bets" label="My Bets">
            <IconTarget />
          </RailButton>
          {openBetsCount > 0 && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-teal" />
          )}
        </div>
        <RailButton href="/sweepstake" label="Sweepstake">
          <IconTrophy />
        </RailButton>
        <RailButton href="/docs" label="API Docs">
          <IconDocs />
        </RailButton>
        <RailButton href="https://github.com/joaopco8/mylos" target="_blank" label="GitHub">
          <IconGitHub />
        </RailButton>
        <RailButton href="https://t.me/myloswc_bot" target="_blank" label="MYLOS Bot">
          <IconTelegram />
        </RailButton>
        <RailButton onClick={onToggleCollapse} label="Wallet">
          <IconWallet />
        </RailButton>
      </div>

      {/* Full content */}
      <div className={`${collapsed ? 'md:hidden' : ''} w-60 h-full flex flex-col flex-shrink-0`}>
        {/* Workspace header */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          <button className="flex items-center gap-2 flex-1 px-1 py-1.5 cursor-pointer">
            <span className="text-lg font-bold text-text">Mylos</span>
            <span className="ml-auto text-muted">
              <IconChevrons />
            </span>
          </button>
          <button
            onClick={() => {
              onClose()
              onToggleCollapse()
            }}
            className="text-muted hover:text-text p-1.5 rounded-md hover:bg-card active:scale-90 transition-all cursor-pointer"
            aria-label="Collapse sidebar"
          >
            <IconPanel />
          </button>
        </div>

        {/* Nav */}
        <nav className="px-2 pt-2 space-y-0.5">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-card border border-teal/40 text-[13px] text-text hover:bg-card-hover active:scale-[0.98] transition-all cursor-pointer"
          >
            <IconPlus />
            New chat
          </button>
        </nav>

        {/* Matches */}
        <div className="px-2 mt-5">
          <div className="flex items-center justify-between px-2.5 mb-1">
            <span className="text-[11px] font-medium text-muted">
              {liveCount > 0 ? 'Live matches' : 'Matches'}
            </span>
            {liveCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {liveCount} live
              </span>
            )}
          </div>
          <div className="relative">
            <div className="space-y-0.5">
              {visibleFixtures.map(f => {
                const selected = selectedFixture?.fixtureId === f.fixtureId
                const isLive = f.status === 'live'
                return (
                  <div key={f.fixtureId} className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        onSelectFixture(f)
                        onClose()
                      }}
                      className={`
                        flex-1 min-w-0 flex items-center gap-2 px-2.5 py-1.5 rounded-lg
                        text-[12px] transition-all text-left cursor-pointer active:scale-[0.98]
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
                    {isLive && (
                      <button
                        onClick={() => {
                          onSelectFixture(f)
                          onClose()
                          scrollToBetSection()
                        }}
                        title="Bet on this match"
                        className="w-6 h-6 flex-shrink-0 rounded flex items-center justify-center text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 active:scale-95 transition-all cursor-pointer"
                      >
                        $
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            {!showAllFixtures && hasMoreFixtures && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-sidebar to-transparent" />
            )}
          </div>
          {hasMoreFixtures && (
            <button
              onClick={() => setShowAllFixtures(v => !v)}
              className="w-full mt-1 px-2.5 py-1 text-[11px] text-muted hover:text-teal transition-colors cursor-pointer"
            >
              {showAllFixtures ? 'Show less' : `Show all (${fixtures.length})`}
            </button>
          )}
        </div>

        {/* Chats */}
        <div className="px-2 mt-5 flex-1 overflow-y-auto scrollbar-hide">
          <div className="flex items-center justify-between px-2.5 mb-1">
            <span className="text-[11px] font-medium text-muted">Chats</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
              <path d="M2 4l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {chatSessions.length > 0 ? (
            <div className="space-y-0.5">
              {chatSessions.map(session => (
                <div
                  key={session.id}
                  onClick={() => onLoadChat(session)}
                  className={`
                    group flex items-center justify-between gap-1
                    px-2.5 py-1.5 rounded-lg cursor-pointer
                    text-[12px] transition-colors
                    ${session.id === currentChatId
                      ? 'bg-teal-dim text-text'
                      : 'text-muted hover:text-text hover:bg-card'
                    }
                  `}
                >
                  <span className="truncate flex-1">{session.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteChat(session.id)
                    }}
                    aria-label="Delete chat"
                    className="opacity-0 group-hover:opacity-100
                      text-muted hover:text-red-400 active:scale-90 transition-all
                      ml-1 flex-shrink-0 cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-2.5 py-1.5 text-[12px] text-muted/60">
              No conversations yet
            </div>
          )}
        </div>

        {/* Links */}
        <div className="px-2 pt-2 pb-1 border-t border-border">
          <span className="px-3 py-1 text-[10px] text-muted uppercase tracking-wider font-medium block">
            Resources
          </span>
          <a
            href="/bets"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted hover:text-text hover:bg-card transition-colors cursor-pointer"
          >
            <IconTarget />
            My Bets
            {openBetsCount > 0 && (
              <span className="ml-auto text-[10px] font-bold bg-teal text-bg px-1.5 py-0.5 rounded-full">
                {openBetsCount}
              </span>
            )}
          </a>
          <a
            href="/sweepstake"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted hover:text-text hover:bg-card transition-colors cursor-pointer"
          >
            <IconTrophy />
            Sweepstake
          </a>
          <a
            href="/docs"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted hover:text-text hover:bg-card transition-colors cursor-pointer"
          >
            <IconDocs />
            API Docs
          </a>
          <a
            href="https://github.com/joaopco8/mylos"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted hover:text-text hover:bg-card transition-colors cursor-pointer"
          >
            <IconGitHub />
            GitHub
          </a>
          <a
            href="https://t.me/myloswc_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted hover:text-text hover:bg-card transition-colors cursor-pointer"
          >
            <IconTelegram />
            MYLOS Bot
          </a>
        </div>

        {/* Wallet card */}
        <div className="p-2.5 space-y-2">
          <WalletButton />
          {walletConnected && (
            <div className="flex items-center justify-between px-2.5 py-2 rounded-lg border border-border bg-card">
              <span className="flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-muted uppercase">
                <IconWallet />
                USDC balance
              </span>
              <span className="text-[13px] font-mono font-bold text-teal">
                ${usdcBalance.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between px-2.5 py-2 rounded-lg border border-border bg-card">
            <span className="flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-muted uppercase">
              <IconCoin />
              Session spent
            </span>
            <span className="text-[13px] font-mono font-bold text-teal">
              ${totalSpent.toFixed(4)}
            </span>
          </div>
        </div>
      </div>
      </aside>
    </>
  )
}
