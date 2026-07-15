import { validateApiKey, unauthorizedResponse } from '@/lib/apiAuth'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rateLimiter'
import { logger } from '@/lib/logger'
import { processQuestion } from '@/lib/agent'

export async function POST(request: Request) {
  const auth = validateApiKey(request)
  if (!auth.valid) return unauthorizedResponse(auth.error!)

  const rl = checkRateLimit(auth.key!)
  if (!rl.allowed) {
    return Response.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rl) }
    )
  }

  const body = await request.json()
  const { question, fixtureId } = body

  if (!question) {
    return Response.json({ error: 'question is required' }, { status: 400 })
  }

  logger.info('api', 'POST /v1/analyze', { fixtureId, key: auth.key })

  const response = await processQuestion({ question, fixtureId })

  return Response.json(
    { data: response, ts: new Date().toISOString() },
    { headers: rateLimitHeaders(rl) }
  )
}
