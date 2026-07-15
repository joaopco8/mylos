import { validateApiKey, unauthorizedResponse } from '@/lib/apiAuth'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rateLimiter'
import { logger } from '@/lib/logger'
import { getScore, getOdds, getMockScore, getMockOdds } from '@/lib/txline'

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
  const fixtureId = parseInt(id)

  logger.info('api', 'GET /v1/match/:id', { fixtureId, key: auth.key })

  const [score, odds] = await Promise.all([
    getScore(fixtureId),
    getOdds(fixtureId),
  ])

  const finalScore = score || getMockScore(fixtureId)
  const finalOdds = odds || getMockOdds(fixtureId)

  return Response.json(
    {
      data: {
        score: finalScore,
        odds: finalOdds,
        isLive: finalScore.status === 'live',
        source: score ? 'TxLINE (live)' : 'TxLINE (fallback)',
      },
      ts: new Date().toISOString(),
    },
    { headers: rateLimitHeaders(rl) }
  )
}
