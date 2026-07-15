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

console.log('Scanning for semi-final IDs...')
let found = []

for (let id = 18209182; id <= 18230000; id++) {
  try {
    const res = await axios.get(
      `${BASE}/api/scores/snapshot/${id}`,
      { headers, timeout: 2000 }
    )
    if (Array.isArray(res.data) && res.data.length > 0) {
      console.log(`FOUND: ${id} - ${res.data.length} rows`)
      found.push(id)
    }
  } catch {}

  if (id % 1000 === 0) {
    console.log(`Scanned up to ${id}...`)
  }

  await new Promise(r => setTimeout(r, 30))
}

console.log('\nAll found IDs:', found)
