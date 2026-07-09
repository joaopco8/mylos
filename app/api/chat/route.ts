import { NextResponse } from 'next/server'
import { processQuestion } from '@/lib/agent'
import { saveShare } from '@/lib/shareStore'

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
      saveShare({
        id: response.shareId,
        question,
        response,
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
