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

const ranges = [
  [18209182, 18215000],
  [18215000, 18225000],
]

console.log('Scanning for Belgium vs Spain...\n')

for (const [start, end] of ranges) {
  for (let id = start; id <= end; id += 50) {
    try {
      const res = await axios.get(
        `${BASE}/api/scores/snapshot/${id}`,
        { headers, timeout: 3000 }
      )
      if (Array.isArray(res.data) && res.data.length > 0) {
        const hasClock = res.data.some(r => r.Clock?.Running)
        const gameState = res.data[0]?.GameState
        console.log(`FOUND ${id}: ${res.data.length} rows, running=${hasClock}, state=${gameState}`)

        if (hasClock) {
          console.log('  -> LIVE MATCH FOUND! Scanning nearby...')
          for (let nearby = id - 10; nearby <= id + 10; nearby++) {
            try {
              const r2 = await axios.get(
                `${BASE}/api/scores/snapshot/${nearby}`,
                { headers, timeout: 3000 }
              )
              if (Array.isArray(r2.data) && r2.data.length > 0) {
                const live = r2.data.some(r => r.Clock?.Running)
                console.log(`    ${nearby}: ${r2.data.length} rows, live=${live}`)
              }
            } catch {}
          }
        }
      }
    } catch (e) {
      if (e.response?.status !== 403 && e.response?.status !== 404) {
        console.log(`  ${id}: ${e.response?.status || 'error'}`)
      }
    }

    await new Promise(r => setTimeout(r, 100))
  }
}

console.log('\nDone.')
