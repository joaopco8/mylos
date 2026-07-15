import { validateApiKey, unauthorizedResponse } from '@/lib/apiAuth'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rateLimiter'
import { logger } from '@/lib/logger'
import { getFixtures } from '@/lib/txline'

export async function GET(request: Request) {
  const auth = validateApiKey(request)
  if (!auth.valid) return unauthorizedResponse(auth.error!)

  const rl = checkRateLimit(auth.key!)
  if (!rl.allowed) {
    return Response.json(
      { error: 'Rate limit exceeded. Max 100 req/min.' },
      { status: 429, headers: rateLimitHeaders(rl) }
    )
  }

  logger.info('api', 'GET /v1/fixtures', { key: auth.key })

  const fixtures = await getFixtures()
  return Response.json(
    {
      data: fixtures,
      total: fixtures.length,
      source: 'TxLINE mainnet',
      ts: new Date().toISOString(),
    },
    { headers: rateLimitHeaders(rl) }
  )
}
