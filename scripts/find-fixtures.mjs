import axios from 'axios'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8')
const getVar = (key) => env.match(new RegExp(`${key}=(.+)`))?.[1]?.trim()

const BASE = 'https://txline.txodds.com'
const JWT = getVar('TXLINE_JWT')
const TOKEN = getVar('TXLINE_API_TOKEN')

const headers = {
  'Authorization': `Bearer ${JWT}`,
  'X-Api-Token': TOKEN,
}

const endpoints = [
  '/api/fixtures',
  '/api/worldcup/fixtures',
  '/api/competitions/fixtures',
  '/api/events',
  '/api/worldcup/events',
  '/api/matches',
  '/api/worldcup/matches',
  '/api/competitions/500001/fixtures',
  '/api/football/fixtures',
  '/api/sport/football/fixtures',
]

for (const ep of endpoints) {
  try {
    const res = await axios.get(`${BASE}${ep}`, {
      headers, timeout: 5000
    })
    console.log(`✓ ${ep} → ${res.status}`)
    console.log(JSON.stringify(res.data).substring(0, 200))
    console.log('')
  } catch (e) {
    console.log(`✗ ${ep} → ${e.response?.status || 'error'}: ${e.response?.data?.message || e.message}`)
  }
}
