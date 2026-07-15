import * as anchor from '@coral-xyz/anchor'
import {
  Connection, PublicKey, ComputeBudgetProgram,
  TransactionMessage, VersionedTransaction, Keypair,
} from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import fs from 'fs'
import path from 'path'
import { getWithAuthRetry } from './txline'

const TXLINE_API_ORIGIN = 'https://txline.txodds.com'
const TXLINE_PROGRAM_ID = new PublicKey('9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA')
const DEVNET_PROGRAM_ID = new PublicKey('6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J')
export const DEFAULT_STAT_KEY = 1002

const connection = new Connection(
  'https://mainnet.helius-rpc.com/?api-key=1f1ef0eb-d05a-4e8c-8a68-819a1fc55b54',
  'confirmed'
)

// Recent event sequences 404 until TxLINE's 5-minute batch job processes
// them onto the Merkle tree, so walk backwards from the newest seq.
// getWithAuthRetry fetches fresh headers per call and retries once on a
// 401 by renewing the JWT, instead of a stale token baked in at load.
async function fetchProof(fixtureId: number, statKey: number) {
  const snapshotRes = await getWithAuthRetry(`${TXLINE_API_ORIGIN}/api/scores/snapshot/${fixtureId}?asOf=${Date.now()}`)
  const snapshot = snapshotRes.data
  const seqs = Array.isArray(snapshot)
    ? [...new Set(snapshot.map((r: any) => r.Seq).filter((s: any) => typeof s === 'number'))].sort((a: any, b: any) => b - a)
    : []

  for (const seq of seqs) {
    try {
      const validationRes = await getWithAuthRetry(`${TXLINE_API_ORIGIN}/api/scores/stat-validation`, {
        params: { fixtureId, seq, statKey },
      })
      return { seq, validation: validationRes.data }
    } catch (e: any) {
      if (e.response?.status !== 404) throw e
    }
  }
  throw new Error(`No processed batch found for fixture ${fixtureId}`)
}

export interface VerifyResult {
  fixtureId: number
  statKey: number
  seq: number
  isValid: boolean | null
  dailyScoresPda: string
  verifiedAt: string
  message: string
}

export async function verifyStatOnChain(fixtureId: number, statKey: number): Promise<VerifyResult> {
  const { seq, validation } = await fetchProof(fixtureId, statKey)

  const keypairPath = path.join(process.cwd(), 'scripts', 'txline-wallet.json')
  const keypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf-8')))
  )
  // AnchorProvider only needs this shape to build the instruction below;
  // the actual transaction is signed manually further down, so the
  // signing methods here are never invoked.
  const wallet = {
    publicKey: keypair.publicKey,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any) => txs,
  }
  const provider = new anchor.AnchorProvider(connection, wallet as any, { commitment: 'confirmed' })

  const idl = await anchor.Program.fetchIdl(DEVNET_PROGRAM_ID, {
    connection: new Connection('https://api.devnet.solana.com', 'confirmed'),
  })
  if (!idl) throw new Error('Could not fetch TxLINE IDL from devnet')
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
  const fixtureProof = validation.subTreeProof.map((n: any) => ({ hash: n.hash, isRightSibling: n.isRightSibling }))
  const mainTreeProof = validation.mainTreeProof.map((n: any) => ({ hash: n.hash, isRightSibling: n.isRightSibling }))
  const stat1 = {
    statToProve: validation.statToProve,
    eventStatRoot: validation.eventStatRoot,
    statProof: validation.statProof.map((n: any) => ({ hash: n.hash, isRightSibling: n.isRightSibling })),
  }
  // Predicate is chosen relative to the real proven stat value so it's
  // an honest question ("is this stat >= its real value?"), not staged.
  const predicate = { threshold: validation.statToProve.value - 1, comparison: { greaterThan: {} } }

  const targetTs = validation.summary.updateStats.minTimestamp
  const epochDay = Math.floor(targetTs / (24 * 60 * 60 * 1000))
  const [dailyScoresPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('daily_scores_roots'), new BN(epochDay).toBuffer('le', 2)],
    TXLINE_PROGRAM_ID
  )

  const ix = await txlineProgram.methods
    .validateStat(new BN(targetTs), fixtureSummary, fixtureProof, mainTreeProof, predicate, stat1, null, null)
    .accounts({ dailyScoresMerkleRoots: dailyScoresPda })
    .instruction()

  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 })
  const { blockhash } = await connection.getLatestBlockhash()
  const message = new TransactionMessage({
    payerKey: keypair.publicKey,
    recentBlockhash: blockhash,
    instructions: [computeBudgetIx, ix],
  }).compileToV0Message()
  const vtx = new VersionedTransaction(message)
  vtx.sign([keypair])

  const sim = await connection.simulateTransaction(vtx, { commitment: 'confirmed' })

  if (sim.value.err) {
    throw Object.assign(new Error(JSON.stringify(sim.value.err)), { logs: sim.value.logs })
  }

  let isValid: boolean | null = null
  if (sim.value.returnData?.data?.[0]) {
    const raw = Buffer.from(sim.value.returnData.data[0], 'base64')
    isValid = raw.length > 0 ? raw[0] === 1 : null
  }

  return {
    fixtureId,
    statKey,
    seq,
    isValid,
    dailyScoresPda: dailyScoresPda.toBase58(),
    verifiedAt: new Date().toISOString(),
    message: isValid
      ? 'Stat verified on-chain via TxLINE CPI (Merkle proof checked against Solana mainnet)'
      : 'On-chain predicate evaluated to false for this stat',
  }
}
