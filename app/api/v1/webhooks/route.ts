import { validateApiKey, unauthorizedResponse } from '@/lib/apiAuth'
import {
  registerWebhook, getWebhooks, deleteWebhook
} from '@/lib/webhookStore'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  const auth = validateApiKey(request)
  if (!auth.valid) return unauthorizedResponse(auth.error!)
  return Response.json({ data: getWebhooks(auth.key!) })
}

export async function POST(request: Request) {
  const auth = validateApiKey(request)
  if (!auth.valid) return unauthorizedResponse(auth.error!)

  const body = await request.json()
  const { url, fixtureIds = [], events = [] } = body

  if (!url) {
    return Response.json({ error: 'url is required' }, { status: 400 })
  }

  const webhook = registerWebhook({
    url,
    apiKey: auth.key!,
    fixtureIds,
    events,
  })

  logger.info('webhook', 'Registered', { id: webhook.id, url })

  return Response.json({ data: webhook }, { status: 201 })
}

export async function DELETE(request: Request) {
  const auth = validateApiKey(request)
  if (!auth.valid) return unauthorizedResponse(auth.error!)

  const { id } = await request.json()
  const deleted = deleteWebhook(id, auth.key!)

  return Response.json({ deleted })
}
