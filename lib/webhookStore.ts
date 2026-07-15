import { logger } from './logger'

interface WebhookSubscription {
  id: string
  url: string
  apiKey: string
  fixtureIds: number[]
  events: string[]
  createdAt: string
}

interface Signal {
  fixtureId: number
  type: 'score_change' | 'odds_movement' | 'match_start' | 'match_end'
  data: Record<string, any>
  verifiedOnChain: boolean
  proof?: string
  ts: string
}

const subscriptions = new Map<string, WebhookSubscription>()

export function registerWebhook(params: Omit<WebhookSubscription, 'id' | 'createdAt'>): WebhookSubscription {
  const id = `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const sub: WebhookSubscription = {
    ...params,
    id,
    createdAt: new Date().toISOString(),
  }
  subscriptions.set(id, sub)
  return sub
}

export function getWebhooks(apiKey: string): WebhookSubscription[] {
  return Array.from(subscriptions.values())
    .filter(s => s.apiKey === apiKey)
}

export function deleteWebhook(id: string, apiKey: string): boolean {
  const sub = subscriptions.get(id)
  if (!sub || sub.apiKey !== apiKey) return false
  subscriptions.delete(id)
  return true
}

export async function dispatchSignal(signal: Signal): Promise<void> {
  const subs = Array.from(subscriptions.values()).filter(
    s => s.fixtureIds.includes(signal.fixtureId) ||
         s.fixtureIds.length === 0
  )

  for (const sub of subs) {
    if (!sub.events.includes(signal.type) && sub.events.length > 0) continue
    try {
      await fetch(sub.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FieldCall-Signature': sub.id,
        },
        body: JSON.stringify({ webhook_id: sub.id, signal }),
      })
      logger.info('webhook', 'Signal dispatched', {
        webhookId: sub.id, signalType: signal.type
      })
    } catch (e: any) {
      logger.error('webhook', 'Dispatch failed', {
        webhookId: sub.id, error: e.message
      })
    }
  }
}
