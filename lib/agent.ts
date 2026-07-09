import { geminiChat, geminiGenerateImage } from './gemini'
import {
  getScore, getOdds,
  getMockScore, getMockOdds,
  getFixtures
} from './txline'
import { detectIntent, requiresFixture } from './intent'
import { AgentResponse, CostItem } from '@/types'
import { nanoid } from 'nanoid'

const SYSTEM_INSTRUCTION = `You are FieldCall, an expert assistant for the
2026 World Cup. You have access to real-time data via TxLINE.

Rules:
- ALWAYS answer in English
- Be direct and concise (max 3 paragraphs)
- Use relevant emojis (⚽🏆📊)
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
        emoji: '🎨'
      })
      sources.push('Google Gemini Image')

      const totalCost = costs.reduce((s, c) => s + c.amount, 0)
      return {
        answer: `Here's your image! 🎨 Generated with Nano Banana
          (Google Gemini) just for you. ⚽🏆`,
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
      costs.push({ service: 'Gemini 2.5 Flash', amount: 0.003, emoji: '🤖' })
      sources.push('Gemini 2.5 Flash')
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
        emoji: '⚽'
      })
      sources.push('TxLINE')

      if (finalOdds) {
        costs.push({
          service: 'TxLINE Odds Data',
          amount: 0.008,
          emoji: '📊'
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
      emoji: '🏆'
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
    service: 'Gemini 2.5 Flash',
    amount: 0.003,
    emoji: '🤖'
  })
  sources.push('Gemini 2.5 Flash')

  const totalCost = costs.reduce((s, c) => s + c.amount, 0)

  return {
    answer: text,
    costs,
    totalCost,
    isReal: false,
    sources,
    fixture,
    shareId: nanoid(8),
  }
}
