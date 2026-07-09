import axios from 'axios'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'

export async function geminiChat(params: {
  prompt: string
  systemInstruction?: string
  maxTokens?: number
}): Promise<{ text: string }> {
  const body: any = {
    contents: [{
      parts: [{ text: params.prompt }]
    }],
    generationConfig: {
      maxOutputTokens: params.maxTokens || 800,
      temperature: 0.7,
    }
  }

  if (params.systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: params.systemInstruction }]
    }
  }

  const res = await axios.post(
    `${GEMINI_BASE}/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    body
  )

  const text = res.data.candidates?.[0]?.content?.parts?.[0]?.text || ''
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
