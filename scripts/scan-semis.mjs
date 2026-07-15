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

console.log('Scanning 18209182 to 18220000 step 10...')

for (let id = 18209182; id <= 18220000; id += 10) {
  try {
    const res = await axios.get(
      `${BASE}/api/scores/snapshot/${id}`,
      { headers, timeout: 2000 }
    )
    if (Array.isArray(res.data) && res.data.length > 0) {
      console.log(`FOUND ${id}: ${res.data.length} rows`)
    }
  } catch {}
  await new Promise(r => setTimeout(r, 50))
}

console.log('Done.')
