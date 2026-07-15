import { validateApiKey, unauthorizedResponse } from '@/lib/apiAuth'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rateLimiter'
import { logger } from '@/lib/logger'
import { verifyStatOnChain, DEFAULT_STAT_KEY } from '@/lib/txlineVerify'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = validateApiKey(request)
  if (!auth.valid) return unauthorizedResponse(auth.error!)

  const rl = checkRateLimit(auth.key!)
  if (!rl.allowed) {
    return Response.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: rateLimitHeaders(rl) }
    )
  }

  const { id } = await params
  const fixtureId = parseInt(id, 10)
  const { searchParams } = new URL(request.url)
  const statKey = parseInt(searchParams.get('statKey') || '', 10) || DEFAULT_STAT_KEY

  logger.info('api', 'GET /v1/verify/:id', { fixtureId, key: auth.key })

  try {
    const result = await verifyStatOnChain(fixtureId, statKey)
    return Response.json(
      { data: result, ts: new Date().toISOString() },
      { headers: rateLimitHeaders(rl) }
    )
  } catch (e: any) {
    logger.error('api', 'Verify failed', { fixtureId, error: e.message })
    return Response.json(
      { error: e.response?.data?.message || e.message },
      { status: 500, headers: rateLimitHeaders(rl) }
    )
  }
}
