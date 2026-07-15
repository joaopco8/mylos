import { NextResponse } from 'next/server'

let started = false

export async function GET() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({
      status: 'No TELEGRAM_BOT_TOKEN set'
    })
  }

  if (!started) {
    const { startBot } = await import('@/lib/telegramBot')
    startBot()
    started = true
  }

  return NextResponse.json({ status: 'MYLOS Bot running' })
}
