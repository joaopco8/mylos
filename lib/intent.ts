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
    q.includes('illustrate') ||
    q.includes('imagem') ||
    q.includes('foto') ||
    q.includes('gera') ||
    q.includes('cria uma') ||
    q.includes('desenha') ||
    q.includes('faz uma foto') ||
    q.includes('ilustra')
  ) return 'image'

  if (
    q.includes('score') ||
    q.includes('result') ||
    q.includes('goal') ||
    q.includes('winning') ||
    q.includes('who is') ||
    q.includes('live') ||
    q.includes('placar') ||
    q.includes('resultado') ||
    q.includes('tá ganhando') ||
    q.includes('está ganhando') ||
    q.includes('como tá') ||
    q.includes('como está') ||
    q.includes('gol') ||
    q.includes('marcou') ||
    q.includes('ao vivo') ||
    q.includes('agora') ||
    q.includes('minuto') ||
    q.includes('tempo') ||
    q.includes('como foi') ||
    q.includes('como foi o jogo') ||
    q.includes('resultado final') ||
    q.includes('terminou') ||
    q.includes('ganhou') ||
    q.includes('perdeu') ||
    q.includes('venceu') ||
    q.includes('quem ganhou') ||
    q.includes('quem venceu') ||
    q.includes('como terminou') ||
    q.includes('final score')
  ) return 'live_score'

  if (
    q.includes('odd') ||
    q.includes('probability') ||
    q.includes('chance') ||
    q.includes('favorite') ||
    q.includes('favourite') ||
    q.includes('betting') ||
    q.includes('bet') ||
    q.includes('probabilidade') ||
    q.includes('favorito') ||
    q.includes('apostas') ||
    q.includes('cotação') ||
    q.includes('paga quanto')
  ) return 'odds'

  if (
    q.includes('will win') ||
    q.includes('gonna win') ||
    q.includes('who wins') ||
    q.includes('prediction') ||
    q.includes('forecast') ||
    q.includes('analyze') ||
    q.includes('analysis') ||
    q.includes('vai ganhar') ||
    q.includes('vai vencer') ||
    q.includes('quem ganha') ||
    q.includes('quem vai') ||
    q.includes('chances') ||
    q.includes('previsão') ||
    q.includes('previsao') ||
    q.includes('acha que') ||
    q.includes('vai dar') ||
    q.includes('consegue') ||
    q.includes('passa') ||
    q.includes('elimina') ||
    q.includes('classificar')
  ) return 'prediction'

  if (
    q.includes('top scorer') ||
    q.includes('most goals') ||
    q.includes('golden boot') ||
    q.includes('artilheiro') ||
    q.includes('goleador') ||
    q.includes('mais gols') ||
    q.includes('quem fez mais') ||
    q.includes('quem marcou mais')
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
