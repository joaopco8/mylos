import { NextResponse } from 'next/server'
import { processQuestion } from '@/lib/agent'
import { encodeShareToken } from '@/lib/shareToken'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { question, fixtureId } = body

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      )
    }

    if (question.length > 500) {
      return NextResponse.json(
        { error: 'Question too long (max 500 chars)' },
        { status: 400 }
      )
    }

    console.log('[Chat] Question:', question, '| Fixture:', fixtureId)

    const response = await processQuestion({ question, fixtureId })

    if (response.shareId) {
      // Encode the whole card into the id itself — see lib/shareToken.ts
      // for why this replaced a server-side in-memory store.
      const { imageBase64, imageMimeType, ...responseWithoutImage } = response
      response.shareId = encodeShareToken({
        question,
        response: responseWithoutImage,
        createdAt: new Date().toISOString(),
        fixture: response.fixture
          ? {
              homeTeam: response.fixture.homeTeam,
              awayTeam: response.fixture.awayTeam,
              homeScore: response.fixture.homeScore,
              awayScore: response.fixture.awayScore,
              minute: response.fixture.minute,
              status: response.fixture.status,
            }
          : undefined,
        hadImage: !!imageBase64 || !!imageMimeType,
      })
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[Chat] Error:', error.message)
    return NextResponse.json(
      { error: 'Failed to process question', detail: error.message },
      { status: 500 }
    )
  }
}
