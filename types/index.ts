export interface CostItem {
  service: string
  amount: number
}

export interface AgentResponse {
  answer: string
  costs: CostItem[]
  totalCost: number
  txHash?: string
  isReal: boolean
  sources: string[]
  fixture?: {
    fixtureId: number
    homeTeam: string
    awayTeam: string
    homeScore: number
    awayScore: number
    status: string
    minute?: number
  }
  imageBase64?: string
  imageMimeType?: string
  shareId?: string
  isPrediction?: boolean
  predictionSnapshot?: {
    homeScore: number
    awayScore: number
    minute?: number
  }
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  response?: AgentResponse
  paymentTxHash?: string
  timestamp: Date
}
