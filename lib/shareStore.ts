import { AgentResponse } from '@/types'

interface ShareEntry {
  id: string
  question: string
  response: AgentResponse
  createdAt: string
  fixture?: {
    homeTeam: string
    awayTeam: string
    homeFlag?: string
    awayFlag?: string
    homeScore?: number
    awayScore?: number
    minute?: number
    status?: string
  }
}

const store = new Map<string, ShareEntry>()

export function saveShare(entry: ShareEntry): void {
  store.set(entry.id, entry)
  if (store.size > 100) {
    const firstKey = store.keys().next().value
    if (firstKey) store.delete(firstKey)
  }
}

export function getShare(id: string): ShareEntry | null {
  return store.get(id) || null
}
