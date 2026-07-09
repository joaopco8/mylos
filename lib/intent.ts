export type Intent =
  | 'live_score'
  | 'prediction'
  | 'odds'
  | 'top_scorers'
  | 'history'
  | 'player'
  | 'image'
  | 'general'

export function detectIntent(question: string): Intent {
  const q = question.toLowerCase()

  if (
    q.includes('meme') ||
    q.includes('image') ||
    q.includes('photo') ||
    q.includes('generate') ||
    q.includes('create a') ||
    q.includes('draw') ||
    q.includes('illustrate')
  ) return 'image'

  if (
    q.includes('score') ||
    q.includes('result') ||
    q.includes('goal') ||
    q.includes('winning') ||
    q.includes('who is') ||
    q.includes('live')
  ) return 'live_score'

  if (
    q.includes('odd') ||
    q.includes('probability') ||
    q.includes('chance') ||
    q.includes('favorite') ||
    q.includes('favourite') ||
    q.includes('betting') ||
    q.includes('bet')
  ) return 'odds'

  if (
    q.includes('will win') ||
    q.includes('gonna win') ||
    q.includes('who wins') ||
    q.includes('prediction') ||
    q.includes('forecast') ||
    q.includes('analyze') ||
    q.includes('analysis')
  ) return 'prediction'

  if (
    q.includes('top scorer') ||
    q.includes('most goals') ||
    q.includes('golden boot')
  ) return 'top_scorers'

  if (
    q.includes('player') ||
    q.includes('who plays') ||
    q.includes('lineup') ||
    q.includes('starting eleven')
  ) return 'player'

  if (
    q.includes('history') ||
    q.includes('head to head') ||
    q.includes('matchup') ||
    q.includes('times that')
  ) return 'history'

  return 'general'
}

export function requiresFixture(intent: Intent): boolean {
  return ['live_score', 'prediction', 'odds'].includes(intent)
}
