import { ChatMessage } from '@/types'

const STORAGE_KEY = 'fieldcall_chats'
const MAX_CHATS = 50

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  fixtureId?: number
  createdAt: string
  updatedAt: string
}

export function saveChatSession(session: ChatSession): void {
  try {
    const existing = getChatSessions()
    const idx = existing.findIndex(s => s.id === session.id)
    if (idx >= 0) {
      existing[idx] = session
    } else {
      existing.unshift(session)
    }
    const trimmed = existing.slice(0, MAX_CHATS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch (e) {
    console.error('[Storage] Save failed:', e)
  }
}

export function getChatSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getChatSession(id: string): ChatSession | null {
  return getChatSessions().find(s => s.id === id) || null
}

export function deleteChatSession(id: string): void {
  const sessions = getChatSessions().filter(s => s.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

export function generateChatTitle(firstMessage: string): string {
  return firstMessage.length > 40
    ? firstMessage.substring(0, 40) + '...'
    : firstMessage
}
