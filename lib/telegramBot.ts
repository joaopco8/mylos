import { Telegraf } from 'telegraf'
import { getScore, getOdds, getMockScore, getMockOdds } from './txline'
import { geminiChat } from './gemini'

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!)

const subscribedChats = new Map<number, {
  fixtureId: number
  lastGoalCount: number
  lastOdds: { home?: number; away?: number }
  lastMinute: number
  interval?: ReturnType<typeof setInterval>
}>()

async function generateCommentary(
  event: 'goal' | 'odds_shift' | 'final_whistle' | 'kickoff',
  context: {
    homeTeam: string
    awayTeam: string
    homeScore: number
    awayScore: number
    minute?: number
    homeOdds?: number
    awayOdds?: number
  }
): Promise<string> {
  const prompts: Record<string, string> = {
    goal: `You are MYLOS, an AI football pundit. A GOAL was just scored!
Match: ${context.homeTeam} ${context.homeScore}-${context.awayScore} ${context.awayTeam}
Minute: ${context.minute}'
Odds: ${context.homeTeam} ${context.homeOdds} | ${context.awayTeam} ${context.awayOdds}
Write ONE punchy dramatic sentence. Include the score. Be excited.`,

    odds_shift: `You are MYLOS, a sharp football analyst.
Match: ${context.homeTeam} ${context.homeScore}-${context.awayScore} ${context.awayTeam}
Minute: ${context.minute}'
Odds shifted: ${context.homeTeam} ${context.homeOdds} | ${context.awayTeam} ${context.awayOdds}
Write ONE insightful sentence about what this movement means.`,

    final_whistle: `You are MYLOS, a football commentator.
Final: ${context.homeTeam} ${context.homeScore}-${context.awayScore} ${context.awayTeam}
Write TWO dramatic sentences summing up the match.`,

    kickoff: `You are MYLOS, an excited football host.
Match: ${context.homeTeam} vs ${context.awayTeam}
Write ONE hype sentence to kick off coverage.`,
  }

  try {
    const { text } = await geminiChat({
      prompt: prompts[event],
      maxTokens: 80,
    })
    return text.trim()
  } catch {
    const fallbacks: Record<string, string> = {
      goal: `GOAL! ${context.homeTeam} ${context.homeScore}-${context.awayScore} ${context.awayTeam} at ${context.minute}'!`,
      odds_shift: `Odds shifting — the market senses something at ${context.minute}'.`,
      final_whistle: `Full time! ${context.homeTeam} ${context.homeScore}-${context.awayScore} ${context.awayTeam}. What a match.`,
      kickoff: `It's time! ${context.homeTeam} vs ${context.awayTeam} kicks off now!`,
    }
    return fallbacks[event]
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')
}

async function sendMatchUpdate(
  chatId: number,
  emoji: string,
  headline: string,
  commentary: string,
  score: string,
  minute: string
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
    'https://fieldcall.vercel.app'

  const msg = `${emoji} *${escapeMarkdown(headline)}*\n\n` +
    `${escapeMarkdown(commentary)}\n\n` +
    `⚽ ${escapeMarkdown(score)} \\| ⏱ ${escapeMarkdown(minute)}\\'\n\n` +
    `[Ask MYLOS about this →](${appUrl})`

  await bot.telegram.sendMessage(chatId, msg, {
    parse_mode: 'MarkdownV2',
    link_preview_options: { is_disabled: true },
  })
}

async function monitorFixture(
  chatId: number,
  fixtureId: number
): Promise<void> {
  const sub = subscribedChats.get(chatId)
  if (!sub) return

  try {
    const [scoreData, oddsData] = await Promise.all([
      getScore(fixtureId),
      getOdds(fixtureId),
    ])

    const score = scoreData || getMockScore(fixtureId)
    const odds = oddsData || getMockOdds(fixtureId)

    const currentGoals =
      (score.homeScore || 0) + (score.awayScore || 0)
    const scoreStr =
      `${score.homeTeam} ${score.homeScore}-${score.awayScore} ${score.awayTeam}`
    const minuteStr = score.minute?.toString() || '?'

    // GOAL DETECTED
    if (currentGoals > sub.lastGoalCount) {
      const commentary = await generateCommentary('goal', {
        homeTeam: score.homeTeam,
        awayTeam: score.awayTeam,
        homeScore: score.homeScore,
        awayScore: score.awayScore,
        minute: score.minute,
        homeOdds: odds?.homeWin,
        awayOdds: odds?.awayWin,
      })
      await sendMatchUpdate(
        chatId, '⚽', 'GOAL!',
        commentary, scoreStr, minuteStr
      )
      subscribedChats.set(chatId, {
        ...sub, lastGoalCount: currentGoals
      })
    }

    // ODDS SHIFT (more than 0.3 change)
    if (odds?.homeWin && sub.lastOdds.home) {
      const shift = Math.abs(odds.homeWin - sub.lastOdds.home)
      if (shift > 0.3) {
        const commentary = await generateCommentary('odds_shift', {
          homeTeam: score.homeTeam,
          awayTeam: score.awayTeam,
          homeScore: score.homeScore,
          awayScore: score.awayScore,
          minute: score.minute,
          homeOdds: odds.homeWin,
          awayOdds: odds.awayWin,
        })
        await sendMatchUpdate(
          chatId, '📊', 'Odds Movement',
          commentary, scoreStr, minuteStr
        )
      }
    }

    // MATCH ENDED
    if (score.status === 'finished' && sub.lastMinute < 90) {
      const commentary = await generateCommentary('final_whistle', {
        homeTeam: score.homeTeam,
        awayTeam: score.awayTeam,
        homeScore: score.homeScore,
        awayScore: score.awayScore,
      })
      await sendMatchUpdate(
        chatId, '🏁', 'Full Time!',
        commentary, scoreStr, '90'
      )
      if (sub.interval) clearInterval(sub.interval)
      subscribedChats.delete(chatId)
      return
    }

    // Update state
    subscribedChats.set(chatId, {
      ...sub,
      lastGoalCount: currentGoals,
      lastOdds: {
        home: odds?.homeWin,
        away: odds?.awayWin
      },
      lastMinute: score.minute || sub.lastMinute,
    })

  } catch (e: any) {
    console.error('[MYLOS Bot] Monitor error:', e.message)
  }
}

// COMMANDS

bot.command('start', async (ctx) => {
  await ctx.reply(
    '⚡ MYLOS — AI Football Intelligence\n\n' +
    'Live World Cup 2026 updates powered by TxLINE.\n\n' +
    'Commands:\n' +
    '/watch — Start watching the match\n' +
    '/stop — Stop updates\n' +
    '/score — Get current score & odds\n' +
    '/ask [question] — Ask MYLOS anything\n\n' +
    'Add me to any group to share the action!'
  )
})

bot.command('watch', async (ctx) => {
  const chatId = ctx.chat.id
  const fixtureId = 18209181

  if (subscribedChats.has(chatId)) {
    await ctx.reply('Already watching! Use /stop to stop.')
    return
  }

  const score = await getScore(fixtureId) ||
    getMockScore(fixtureId)

  const commentary = await generateCommentary('kickoff', {
    homeTeam: score.homeTeam,
    awayTeam: score.awayTeam,
    homeScore: score.homeScore,
    awayScore: score.awayScore,
  })

  await ctx.reply(
    `⚡ MYLOS is watching: ${score.homeTeam} × ${score.awayTeam}\n\n` +
    `${commentary}\n\n` +
    `Current: ${score.homeScore}-${score.awayScore}\n\n` +
    `You'll get updates on:\n` +
    `⚽ Goals\n📊 Odds movements\n🏁 Full time`
  )

  const interval = setInterval(() => {
    monitorFixture(chatId, fixtureId)
  }, 60000)

  subscribedChats.set(chatId, {
    fixtureId,
    lastGoalCount:
      (score.homeScore || 0) + (score.awayScore || 0),
    lastOdds: {},
    lastMinute: score.minute || 0,
    interval,
  })
})

bot.command('stop', async (ctx) => {
  const sub = subscribedChats.get(ctx.chat.id)
  if (sub?.interval) clearInterval(sub.interval)
  subscribedChats.delete(ctx.chat.id)
  await ctx.reply('✓ Stopped. Come back for the next match!')
})

bot.command('score', async (ctx) => {
  const sub = subscribedChats.get(ctx.chat.id)
  const fixtureId = sub?.fixtureId || 18209181

  const [score, odds] = await Promise.all([
    getScore(fixtureId).then(s => s || getMockScore(fixtureId)),
    getOdds(fixtureId).then(o => o || getMockOdds(fixtureId)),
  ])

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
    'https://fieldcall.vercel.app'

  await ctx.reply(
    `⚽ ${score.homeTeam} ${score.homeScore}-${score.awayScore} ${score.awayTeam}\n` +
    `⏱ ${score.minute || '?'} | ${score.status}\n\n` +
    `📊 Odds:\n` +
    `${score.homeTeam}: ${odds?.homeWin}\n` +
    `Draw: ${odds?.draw}\n` +
    `${score.awayTeam}: ${odds?.awayWin}\n\n` +
    `Ask more at: ${appUrl}`
  )
})

bot.command('ask', async (ctx) => {
  // Strips both "/ask" (DMs) and "/ask@myloswc_bot" (how group clients
  // send it) — a plain .replace('/ask', '') misses the @mention suffix
  // and would leave "@myloswc_bot ..." glued to the question in groups.
  const question = ctx.message.text.replace(/^\/ask(@\S+)?\s*/, '').trim()
  if (!question) {
    await ctx.reply('Usage: /ask Will France score again?')
    return
  }

  await ctx.reply('Analyzing...')

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
      'https://fieldcall.vercel.app'

    const res = await fetch(`${appUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        fixtureId: 18209181,
      }),
    })

    const data = await res.json()
    const cost = data.totalCost
      ? ` (Cost: $${data.totalCost.toFixed(4)} USDC)`
      : ''

    await ctx.reply(
      `${data.answer}\n\n` +
      `⚡ MYLOS${cost}\n` +
      `Full chat: ${appUrl}`
    )
  } catch (e: any) {
    await ctx.reply('Error analyzing. Try again!')
  }
})

// bot.launch() opens a persistent long-poll connection to Telegram, so the
// module must only ever start it once per process. A plain module-scope
// boolean isn't enough here: Next.js dev-mode hot reload can re-evaluate
// this file while the old module instance (and its already-running poll)
// is still alive, which would open a second connection and make Telegram
// return 409 Conflict / deliver each message to both instances. Stashing
// the flag on `globalThis` survives that reload the same way the Prisma
// client singleton pattern does.
const globalForBot = globalThis as unknown as { mylosBotLaunched?: boolean }

export function startBot(): void {
  if (globalForBot.mylosBotLaunched) return
  globalForBot.mylosBotLaunched = true

  // bot.launch() rejecting (network hiccup, invalid token, ...) would
  // otherwise be an unhandled promise rejection — fatal to the whole
  // Node process on versions that crash on those by default.
  bot.launch({
    allowedUpdates: ['message', 'callback_query'],
  }).catch(e => console.error('[MYLOS Bot] launch() failed:', e.message))
  console.log('[MYLOS Bot] Started @myloswc_bot')

  // Telegraf's stop() throws synchronously ("Bot is not running!") if
  // called before launch() has actually finished connecting, or if it's
  // already stopped — and an exception thrown inside a signal handler
  // is uncaught, crashing the process outright. Swallow it: on shutdown
  // we don't care whether the poll connection was cleanly closed.
  const safeStop = (signal: string) => {
    try {
      bot.stop(signal)
    } catch (e: any) {
      console.error('[MYLOS Bot] stop() failed:', e.message)
    }
  }
  process.once('SIGINT', () => safeStop('SIGINT'))
  process.once('SIGTERM', () => safeStop('SIGTERM'))
}

export { bot }
