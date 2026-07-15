import axios from 'axios'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8')
const getVar = (k) => env.match(new RegExp(`${k}=(.+)`))?.[1]?.trim()

const BASE = 'https://txline.txodds.com'
const JWT = getVar('TXLINE_JWT')
const TOKEN = getVar('TXLINE_API_TOKEN')

const headers = {
  'Authorization': `Bearer ${JWT}`,
  'X-Api-Token': TOKEN,
}

const knownId = 18209181 // France vs Morocco (ended)

console.log('Trying fixture IDs near:', knownId)

const toTest = []
for (let i = knownId - 20; i <= knownId + 20; i++) {
  toTest.push(i)
}

for (const id of toTest) {
  try {
    const res = await axios.get(
      `${BASE}/api/scores/snapshot/${id}`,
      { headers, timeout: 5000 }
    )
    const data = res.data
    if (Array.isArray(data) && data.length > 0) {
      const hasGoal = data.some(r => r.SuperStatType === 'goal')
      const hasClock = data.some(r => r.Clock?.Running)
      const gameState = data[0]?.GameState || 'unknown'
      console.log(`${id}: ${data.length} rows, state=${gameState}, live=${hasClock}, hasGoal=${hasGoal}`)
    }
  } catch (e) {
    // silent skip
  }
}
