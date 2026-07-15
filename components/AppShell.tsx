'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { getChatSessions, deleteChatSession, ChatSession } from '@/lib/chatStorage'

interface Fixture {
  fixtureId: number
  homeTeam: string
  awayTeam: string
  homeFlag?: string
  awayFlag?: string
  status: string
  minute?: number
}

// Persistent Sidebar + mobile top bar wrapper for pages outside the main
// chat (docs, sweepstake, ...). Fixture/chat clicks just navigate home,
// since those pages don't have their own chat context — same pattern
// already used by app/docs/page.tsx.
export default function AppShell({ children }: { children: React.ReactNode }) {
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

        {children}
      </main>
    </div>
  )
}
