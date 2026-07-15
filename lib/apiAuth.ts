const VALID_API_KEYS = new Set([
  process.env.FIELDCALL_API_KEY || 'fc_live_demo_key_2026',
  'fc_hackathon_judge_key',
])

export interface ApiKeyResult {
  valid: boolean
  key?: string
  error?: string
}

export function validateApiKey(request: Request): ApiKeyResult {
  const apiKey =
    request.headers.get('x-api-key') ||
    request.headers.get('authorization')?.replace('Bearer ', '')

  if (!apiKey) {
    return { valid: false, error: 'Missing API key. Pass x-api-key header.' }
  }

  if (!VALID_API_KEYS.has(apiKey)) {
    return { valid: false, error: 'Invalid API key.' }
  }

  return { valid: true, key: apiKey }
}

export function unauthorizedResponse(error: string) {
  return Response.json(
    { error, docs: 'https://fieldcall.vercel.app/docs' },
    { status: 401 }
  )
}
