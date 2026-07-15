import axios from 'axios'
import Groq from 'groq-sdk'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
})

export async function geminiChat(params: {
  prompt: string
  systemInstruction?: string
  maxTokens?: number
}): Promise<{ text: string }> {
  const messages: Groq.Chat.ChatCompletionMessageParam[] = []

  if (params.systemInstruction) {
    messages.push({
      role: 'system',
      content: params.systemInstruction,
    })
  }

  messages.push({
    role: 'user',
    content: params.prompt,
  })

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    max_tokens: params.maxTokens || 800,
    temperature: 0.7,
  })

  const text = completion.choices[0]?.message?.content || ''
  return { text }
}

export async function geminiGenerateImage(params: {
  prompt: string
}): Promise<{ imageBase64: string; mimeType: string } | null> {
  try {
    const res = await axios.post(
      `${GEMINI_BASE}/models/gemini-3.1-flash-image:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{ text: params.prompt }]
        }],
        generationConfig: {
          responseModalities: ['image', 'text'],
        }
      }
    )

    const candidates = res.data.candidates || []
    for (const candidate of candidates) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData) {
          return {
            imageBase64: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png',
          }
        }
      }
    }
    return null
  } catch (e: any) {
    console.error('[Gemini] Image generation failed:', e.response?.data)
    return null
  }
}
