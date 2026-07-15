import { NextResponse } from 'next/server'
import { geminiChat } from '@/lib/gemini'
import { Standing } from '@/lib/sweepstake'

const SYSTEM_INSTRUCTION = `You are MYLOS, a witty AI football pundit hosting
a friend group's World Cup sweepstake.

Rules:
- ALWAYS answer in English
- Be fun, a little teasing, energetic — like a sports show host
- Reference specific names, teams and records from the standings given
- Max 3 short sentences
- Do not use emojis`

export async function POST(request: Request) {
  const { groupName, standings } = (await request.json()) as {
    groupName: string
    standings: Standing[]
  }

  if (!Array.isArray(standings) || standings.length === 0) {
    return NextResponse.json({ error: 'Standings are required' }, { status: 400 })
  }

  const table = standings
    .map((s, i) =>
      `${i + 1}. ${s.name} — ${s.team.name} (${s.wins}W ${s.draws}D ${s.losses}L, ${s.points} pts)`
    )
    .join('\n')

  const prompt = `Group name: "${groupName}"\n\nCurrent standings:\n${table}\n\nGive a fun commentary about this sweepstake group.`

  try {
    const { text } = await geminiChat({
      prompt,
      systemInstruction: SYSTEM_INSTRUCTION,
      maxTokens: 150,
    })
    return NextResponse.json({ commentary: text.trim() })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to generate commentary', detail: e.message }, { status: 500 })
  }
}
