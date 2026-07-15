import { AgentResponse } from '@/types'

// Share cards (/r/[id]) are read-only after creation, so instead of
// storing them server-side (an in-memory Map doesn't reliably survive
// across the separate serverless functions/module instances that the API
// route and the page end up in — confirmed: same shareId, /api/share
// found it, the page's own direct import of the same store did not), the
// whole payload is encoded straight into the id itself. No storage, no
// cross-instance problem possible.
//
// imageBase64/imageMimeType are dropped: a generated image can be
// hundreds of KB to MBs, which would blow past practical URL length
// limits (browsers/CDNs commonly cap in the 8–16KB range). Image
// generation answers still work in-chat; they just can't be shared via
// this link today.
export interface ShareData {
  question: string
  response: Omit<AgentResponse, 'imageBase64' | 'imageMimeType'>
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
  hadImage?: boolean
}

export function encodeShareToken(data: ShareData): string {
  return Buffer.from(JSON.stringify(data), 'utf-8').toString('base64url')
}

export function decodeShareToken(token: string): ShareData | null {
  try {
    return JSON.parse(Buffer.from(token, 'base64url').toString('utf-8'))
  } catch {
    return null
  }
}
