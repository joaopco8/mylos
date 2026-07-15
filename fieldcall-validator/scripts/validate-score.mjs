import * as anchor from '@coral-xyz/anchor'
import {
  Connection, PublicKey, ComputeBudgetProgram,
  TransactionMessage, VersionedTransaction, Keypair,
} from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const envPath = path.join(__dirname, '../../.env.local')
const env = fs.readFileSync(envPath, 'utf-8')
const getVar = (key) => env.match(new RegExp(`${key}=(.+)`))?.[1]?.trim()

const JWT = getVar('TXLINE_JWT')
const API_TOKEN = getVar('TXLINE_API_TOKEN')
const TXLINE_BASE = 'https://txline.txodds.com'

const TXLINE_PROGRAM_ID = new PublicKey('9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA')

const connection = new Connection(
  'https://mainnet.helius-rpc.com/?api-key=1f1ef0eb-d05a-4e8c-8a68-819a1fc55b54',
  'confirmed'
)

const httpClient = axios.create({
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${JWT}`,
    'X-Api-Token': API_TOKEN,
  },
  baseURL: TXLINE_BASE,
})

// Fetch a stat-validation proof for the given fixture, trying the most
// recent event sequence first and walking backwards. Recent seqs 404
// with "could not be found" until TxLINE's 5-minute batch job processes
// them onto the Merkle tree, so the newest seq is often not queryable yet.
async function fetchProof(fixtureId, statKey) {
  const snapshotRes = await httpClient.get(`/api/scores/snapshot/${fixtureId}?asOf=${Date.now()}`)
  const snapshot = snapshotRes.data
  const seqs = Array.isArray(snapshot)
    ? [...new Set(snapshot.map(r => r.Seq).filter(s => typeof s === 'number'))].sort((a, b) => b - a)
    : []
  console.log('Snapshot rows:', Array.isArray(snapshot) ? snapshot.length : 'N/A')
  console.log('Candidate seqs (newest first):', seqs.slice(0, 10), '...')

  for (const seq of seqs) {
    try {
      const validationRes = await httpClient.get('/api/scores/stat-validation', {
        params: { fixtureId, seq, statKey },
      })
      console.log(`Using seq ${seq} (found processed batch)`)
      return { seq, validation: validationRes.data }
    } catch (e) {
      if (e.response?.status !== 404) throw e
      // not processed yet — try the next older seq
    }
  }
  throw new Error(`No processed batch found for fixture ${fixtureId} across ${seqs.length} candidate seqs`)
}

async function validateScore(fixtureId, statKey = 1002) {
  console.log(`\nValidating score for fixture ${fixtureId}...`)

  console.log('Fetching snapshot + Merkle proof...')
  const { seq, validation } = await fetchProof(fixtureId, statKey)
  console.log('Proof obtained:', JSON.stringify(validation).substring(0, 200))

  // Use the project's real (funded, existing-on-chain) wallet as the
  // simulated fee payer — a fresh throwaway keypair doesn't exist on
  // mainnet yet and simulateTransaction rejects it with AccountNotFound.
  const keypairPath = path.join(__dirname, '../../scripts/txline-wallet.json')
  const keypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf-8')))
  )
  const wallet = new anchor.Wallet(keypair)
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  anchor.setProvider(provider)

  console.log('\nFetching IDL from devnet program (mainnet has none)...')
  const devnetConnection = new Connection('https://api.devnet.solana.com', 'confirmed')
  const devnetProgramId = new PublicKey('6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J')
  const idl = await anchor.Program.fetchIdl(devnetProgramId, { connection: devnetConnection })
  if (!idl) throw new Error('Could not fetch TxLINE IDL')
  idl.address = TXLINE_PROGRAM_ID.toBase58()

  const txlineProgram = new anchor.Program(idl, provider)

  const fixtureSummary = {
    fixtureId: new BN(validation.summary.fixtureId),
    updateStats: {
      updateCount: validation.summary.updateStats.updateCount,
      minTimestamp: new BN(validation.summary.updateStats.minTimestamp),
      maxTimestamp: new BN(validation.summary.updateStats.maxTimestamp),
    },
    eventsSubTreeRoot: validation.summary.eventStatsSubTreeRoot,
  }

  const fixtureProof = validation.subTreeProof.map(node => ({
    hash: node.hash,
    isRightSibling: node.isRightSibling,
  }))

  const mainTreeProof = validation.mainTreeProof.map(node => ({
    hash: node.hash,
    isRightSibling: node.isRightSibling,
  }))

  const stat1 = {
    statToProve: validation.statToProve,
    eventStatRoot: validation.eventStatRoot,
    statProof: validation.statProof.map(node => ({
      hash: node.hash,
      isRightSibling: node.isRightSibling,
    })),
  }

  // threshold/comparison chosen relative to the real proven stat value
  // (statToProve.value) so the predicate is honestly true, not fabricated
  const predicate = {
    threshold: validation.statToProve.value - 1,
    comparison: { greaterThan: {} },
  }

  const targetTs = validation.summary.updateStats.minTimestamp
  const epochDay = Math.floor(targetTs / (24 * 60 * 60 * 1000))

  const [dailyScoresPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('daily_scores_roots'), new BN(epochDay).toBuffer('le', 2)],
    TXLINE_PROGRAM_ID
  )

  console.log('\nCalling validateStat on-chain (simulation)...')
  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })

  // Anchor's .view() needs idl.instructions[].returns to decode the result,
  // but the on-chain IDL doesn't carry that metadata for validate_stat — so
  // build the instruction ourselves and read the simulation's raw
  // returnData instead (validate_stat returns a bool: 1 Borsh-encoded byte).
  const ix = await txlineProgram.methods
    .validateStat(new BN(targetTs), fixtureSummary, fixtureProof, mainTreeProof, predicate, stat1, null, null)
    .accounts({ dailyScoresMerkleRoots: dailyScoresPda })
    .instruction()

  const { blockhash } = await connection.getLatestBlockhash()
  const message = new TransactionMessage({
    payerKey: keypair.publicKey,
    recentBlockhash: blockhash,
    instructions: [computeBudgetIx, ix],
  }).compileToV0Message()
  const vtx = new VersionedTransaction(message)
  vtx.sign([keypair])

  try {
    const sim = await connection.simulateTransaction(vtx, { commitment: 'confirmed' })

    if (sim.value.err) {
      console.error('\n=== RESULT ===')
      console.error('Simulation error:', JSON.stringify(sim.value.err))
      console.error('Logs:', sim.value.logs?.slice(-15))
      return { isValid: false, error: sim.value.err, logs: sim.value.logs, fixtureId, statKey, seq }
    }

    let isValid = null
    if (sim.value.returnData?.data?.[0]) {
      const raw = Buffer.from(sim.value.returnData.data[0], 'base64')
      isValid = raw.length > 0 ? raw[0] === 1 : null
    }

    console.log('\n=== RESULT ===')
    console.log('On-chain validation:', isValid === null ? 'UNKNOWN (no returnData)' : (isValid ? 'PASSED' : 'FAILED'))
    console.log('Fixture:', fixtureId)
    console.log('Stat key:', statKey)
    console.log('Seq used:', seq)
    console.log('DailyScoresPDA:', dailyScoresPda.toBase58())
    console.log('Logs:', sim.value.logs?.slice(-15))

    return { isValid, fixtureId, statKey, seq, dailyScoresPda: dailyScoresPda.toBase58(), logs: sim.value.logs }
  } catch (err) {
    console.error('Validation error:', err.message)
    if (err.logs) console.error('Program logs:', err.logs.slice(0, 10))
    throw err
  }
}

validateScore(18209181, 1002)
  .then(result => {
    console.log('\nDone:', JSON.stringify(result, null, 2))
    process.exit(0)
  })
  .catch(err => {
    console.error('Failed:', err.message)
    process.exit(1)
  })
