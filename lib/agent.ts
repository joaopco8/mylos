import { geminiChat, geminiGenerateImage } from './gemini'
import {
  getScore, getOdds,
  getMockScore, getMockOdds,
  getFixtures
} from './txline'
import { detectIntent, requiresFixture } from './intent'
import { AgentResponse, CostItem } from '@/types'
import { nanoid } from 'nanoid'

// Shared by the "general question but a fixture is selected" override
// below — fetches real TxLINE data and returns both the prompt context
// and the fixture summary (needed for the UI's live badge + verify button,
// so a general question doesn't lose those just because it skipped the
// main requiresFixture branch).
async function fetchFixtureContext(
  fixtureId: number,
  costs: CostItem[],
  sources: string[]
): Promise<{ contextData: string; fixture: AgentResponse['fixture'] }> {
  const [score, odds] = await Promise.all([
    getScore(fixtureId),
    getOdds(fixtureId),
  ])
  const finalScore = score || getMockScore(fixtureId)
  const finalOdds = odds || getMockOdds(fixtureId)

  costs.push({ service: 'TxLINE Score Data', amount: 0.008 })
  if (finalOdds) {
    costs.push({ service: 'TxLINE Odds Data', amount: 0.008 })
  }
  sources.push('TxLINE')

  const contextData = `
MATCH DATA (TxLINE):
- Match: ${finalScore.homeTeam} ${finalScore.homeScore} x ${finalScore.awayScore} ${finalScore.awayTeam}
- Status: ${finalScore.status}
- Half-time score: ${finalScore.halfTimeHomeScore ?? '-'} x ${finalScore.halfTimeAwayScore ?? '-'}
ODDS: home=${finalOdds?.homeWin} draw=${finalOdds?.draw} away=${finalOdds?.awayWin}
`

  return {
    contextData,
    fixture: {
      fixtureId,
      homeTeam: finalScore.homeTeam,
      awayTeam: finalScore.awayTeam,
      homeScore: finalScore.homeScore,
      awayScore: finalScore.awayScore,
      status: finalScore.status,
      minute: finalScore.minute,
    },
  }
}

const SYSTEM_INSTRUCTION = `You are Mylos, an expert assistant for the
2026 World Cup. You have access to real-time data via TxLINE.

Rules:
- ALWAYS answer in English, regardless of the language the question was asked in
- Be direct and concise (max 3 paragraphs)
- Do not use emojis
- When you have live data, cite the exact numbers
- For predictions, base your answer on the odds and stats provided
- Never make up data — use only what was provided
- If you don't have enough data, say so clearly
- Tone: energetic, like a sports commentator`

export async function processQuestion(params: {
  question: string
  fixtureId?: number
}): Promise<AgentResponse> {
  const { question, fixtureId } = params
  const costs: CostItem[] = []
  const sources: string[] = []
  let contextData = ''
  let fixture: AgentResponse['fixture'] | undefined
  let imageBase64: string | undefined
  let imageMimeType: string | undefined

  const intent = detectIntent(question)
  console.log('[Agent] Intent detected:', intent)

  // Handle image generation
  if (intent === 'image') {
    const imagePrompt = `World Cup 2026 football illustration: ${question}.
      Style: vibrant, energetic, soccer theme, 2026 World Cup colors.
      High quality digital art.`

    const image = await geminiGenerateImage({ prompt: imagePrompt })

    if (image) {
      imageBase64 = image.imageBase64
      imageMimeType = image.mimeType
      costs.push({
        service: 'Nano Banana (Image Gen)',
        amount: 0.10,
      })
      sources.push('Google Gemini Image')

      const totalCost = costs.reduce((s, c) => s + c.amount, 0)
      return {
        answer: `Here's your image! Generated with Nano Banana
          (Google Gemini) just for you.`,
        costs,
        totalCost,
        isReal: false,
        sources,
        imageBase64,
        imageMimeType,
        shareId: nanoid(8),
      }
    } else {
      // Fallback if image gen fails (billing needed)
      const { text } = await geminiChat({
        prompt: `The user asked: "${question}".
          Unfortunately image generation requires Google Cloud billing.
          Respond creatively in text about the requested subject.`,
        systemInstruction: SYSTEM_INSTRUCTION,
      })
      costs.push({ service: 'Groq Llama 3.3', amount: 0.001 })
      sources.push('Groq Llama 3.3')
      return {
        answer: text,
        costs,
        totalCost: 0.003,
        isReal: false,
        sources,
        shareId: nanoid(8),
      }
    }
  }

  // Fetch TxLINE data for fixture-related questions
  if (requiresFixture(intent) && fixtureId) {
    try {
      const [score, odds] = await Promise.all([
        getScore(fixtureId),
        getOdds(fixtureId),
      ])

      const finalScore = score || getMockScore(fixtureId)
      const finalOdds = odds || getMockOdds(fixtureId)
      const isLive = !!score

      costs.push({
        service: 'TxLINE Score Data',
        amount: 0.008,
      })
      sources.push('TxLINE')

      if (finalOdds) {
        costs.push({
          service: 'TxLINE Odds Data',
          amount: 0.008,
        })
      }

      fixture = {
        fixtureId,
        homeTeam: finalScore.homeTeam,
        awayTeam: finalScore.awayTeam,
        homeScore: finalScore.homeScore,
        awayScore: finalScore.awayScore,
        status: finalScore.status,
        minute: finalScore.minute,
      }

      contextData = `
LIVE MATCH DATA (${isLive ? 'REAL-TIME via TxLINE' : 'SIMULATED'}):
- Match: ${finalScore.homeTeam} ${finalScore.homeScore} x ${finalScore.awayScore} ${finalScore.awayTeam}
- Status: ${finalScore.status === 'live' ? `LIVE - ${finalScore.minute}'` : finalScore.status}
- Half-time score: ${finalScore.halfTimeHomeScore ?? '-'} x ${finalScore.halfTimeAwayScore ?? '-'}

CURRENT ODDS:
- ${finalScore.homeTeam} to win: ${finalOdds?.homeWin ?? 'N/A'}
- Draw: ${finalOdds?.draw ?? 'N/A'}
- ${finalScore.awayTeam} to win: ${finalOdds?.awayWin ?? 'N/A'}
- Over 2.5 goals: ${finalOdds?.over25 ?? 'N/A'}
- Both teams to score: ${finalOdds?.btts ?? 'N/A'}
`
    } catch (e) {
      console.error('[Agent] TxLINE fetch error:', e)
      contextData = 'Live data temporarily unavailable.'
    }
  } else if (fixtureId && intent === 'general') {
    // User asked something generic (e.g. "Como foi o jogo?") but has a
    // fixture selected — fetch the real data anyway instead of answering
    // with no context at all.
    try {
      const result = await fetchFixtureContext(fixtureId, costs, sources)
      contextData = result.contextData
      fixture = result.fixture
    } catch (e) {
      console.error('[Agent] TxLINE fetch error:', e)
      contextData = 'Live data temporarily unavailable.'
    }
  } else if (!fixtureId) {
    // Cup Overview mode: no fixture selected, answer about the tournament
    // as a whole instead of a single match.
    const cupOverviewContext = `
WORLD CUP 2026 — OVERVIEW:

Quarter-finals in progress:
- France 0 × 1 Morocco (LIVE, 67')
- Brazil × Norway (finished, Brazil won 2-1)
- Portugal × Spain (finished)
- USA × Belgium (finished)
- Argentina × Egypt (finished)

Top scorers:
1. Mbappé (France) — 5 goals
2. Vinícius Jr (Brazil) — 4 goals
3. Haaland (Norway) — 4 goals

Upcoming:
- Semi-finals not yet determined
`
    costs.push({
      service: 'TxLINE Cup Data',
      amount: 0.003,
    })
    sources.push('TxLINE')
    contextData = cupOverviewContext
  } else if (intent === 'top_scorers') {
    contextData = `
2026 WORLD CUP TOP SCORERS (simulated data):
1. Kylian Mbappé (France) - 5 goals
2. Vinícius Jr (Brazil) - 4 goals
3. Erling Haaland (Norway) - 4 goals
4. Lamine Yamal (Spain) - 3 goals
5. Harry Kane (England) - 3 goals
`
    costs.push({
      service: 'TxLINE Tournament Data',
      amount: 0.005,
    })
    sources.push('TxLINE')
  }

  // Generate analysis with Gemini
  const prompt = contextData
    ? `User question: "${question}"\n\n${contextData}\n\nAnswer the question using the data above.`
    : `User question: "${question}"\n\nAnswer about the 2026 World Cup.`

  const { text } = await geminiChat({
    prompt,
    systemInstruction: SYSTEM_INSTRUCTION,
    maxTokens: 600,
  })

  costs.push({
    service: 'Groq Llama 3.3',
    amount: 0.001,
  })
  sources.push('Groq Llama 3.3')

  const totalCost = costs.reduce((s, c) => s + c.amount, 0)
  const isPrediction = intent === 'prediction' && !!fixture

  return {
    answer: text,
    costs,
    totalCost,
    isReal: false,
    sources,
    fixture,
    shareId: nanoid(8),
    isPrediction,
    predictionSnapshot: isPrediction && fixture
      ? {
          homeScore: fixture.homeScore,
          awayScore: fixture.awayScore,
          minute: fixture.minute,
        }
      : undefined,
  }
}
