import nacl from 'tweetnacl'
import axios from 'axios'
import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token'
import {
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'
import fs from 'fs'
import path from 'path'

const NETWORK = 'devnet'
const CONFIG = {
  devnet: {
    rpcUrl: 'https://api.devnet.solana.com',
    apiOrigin: 'https://txline-dev.txodds.com',
    programId: new PublicKey('6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J'),
    txlTokenMint: new PublicKey('4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG'),
  },
}

const { rpcUrl, apiOrigin, programId, txlTokenMint } = CONFIG[NETWORK]
const apiBaseUrl = `${apiOrigin}/api`
const connection = new Connection(rpcUrl, 'confirmed')

async function main() {
  console.log('=== TxLINE Activation for FieldCall ===\n')

  // Step 1: Load existing project keypair or generate a new one
  const keypairPath = path.join(
    process.cwd(), 'scripts', 'txline-wallet.json'
  )
  let keypair
  if (fs.existsSync(keypairPath)) {
    keypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(keypairPath, 'utf-8')))
    )
    console.log('Existing wallet loaded:')
    console.log('  Public key:', keypair.publicKey.toBase58())
  } else {
    keypair = Keypair.generate()
    console.log('New wallet created:')
    console.log('  Public key:', keypair.publicKey.toBase58())
    console.log('  Secret key (save this!):',
      JSON.stringify(Array.from(keypair.secretKey)))
    fs.writeFileSync(
      keypairPath,
      JSON.stringify(Array.from(keypair.secretKey))
    )
    console.log('Keypair saved to scripts/txline-wallet.json')
  }
  console.log('')

  // Step 2: Request airdrop for fees (skip if already funded)
  const existingBalance = await connection.getBalance(keypair.publicKey)
  console.log('Current balance:', existingBalance / 1e9, 'SOL')
  if (existingBalance >= 0.01 * 1e9) {
    console.log('Wallet already funded, skipping airdrop')
  } else {
  console.log('\nRequesting SOL airdrop for fees...')
  try {
    const airdropSig = await connection.requestAirdrop(
      keypair.publicKey,
      0.1 * 1e9
    )
    await connection.confirmTransaction(airdropSig)
    console.log('Airdrop confirmed:', airdropSig)
  } catch (e) {
    console.log('Airdrop failed, trying again...')
    try {
      const airdropSig2 = await connection.requestAirdrop(
        keypair.publicKey,
        0.05 * 1e9
      )
      await connection.confirmTransaction(airdropSig2)
      console.log('Second airdrop confirmed:', airdropSig2)
    } catch (e2) {
      console.error('Could not get airdrop:', e2.message)
      console.log('Continuing anyway...')
    }
  }
  }

  // Step 3: Get guest JWT
  console.log('\nGetting guest JWT...')
  const authRes = await axios.post(`${apiOrigin}/auth/guest/start`)
  const jwt = authRes.data.token
  console.log('JWT obtained:', jwt.substring(0, 50) + '...')

  // Step 4: Subscribe on-chain (free tier)
  console.log('\nSubscribing to TxLINE free tier...')

  const wallet = new anchor.Wallet(keypair)
  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
    { commitment: 'confirmed' }
  )
  anchor.setProvider(provider)

  // Fetch IDL from on-chain
  let idl
  try {
    idl = await anchor.Program.fetchIdl(programId, { connection })
    if (!idl) throw new Error('IDL is null')
    console.log('IDL fetched from on-chain')
  } catch (e) {
    console.error('Could not fetch IDL:', e.message)
    throw new Error('IDL fetch failed — program may not be deployed')
  }

  const program = new anchor.Program(idl, provider)

  const SERVICE_LEVEL_ID = 1
  const DURATION_WEEKS = 4
  const SELECTED_LEAGUES = []

  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('token_treasury_v2')],
    programId
  )

  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    txlTokenMint,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('pricing_matrix')],
    programId
  )

  const userTokenAccount = getAssociatedTokenAddressSync(
    txlTokenMint,
    keypair.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  // Ensure the user's TxL token account exists (program requires it
  // to be initialized even when the tier price is zero)
  const ataIx = createAssociatedTokenAccountIdempotentInstruction(
    keypair.publicKey,
    userTokenAccount,
    keypair.publicKey,
    txlTokenMint,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  )
  const ataSig = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(ataIx),
    [keypair]
  )
  console.log('User token account ready:', userTokenAccount.toBase58())
  console.log('  ATA tx:', ataSig)

  let txSig
  try {
    txSig = await program.methods
      .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
      .accounts({
        user: keypair.publicKey,
        pricingMatrix: pricingMatrixPda,
        tokenMint: txlTokenMint,
        userTokenAccount,
        tokenTreasuryVault,
        tokenTreasuryPda,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([keypair])
      .rpc()

    console.log('Subscription tx:', txSig)
    console.log('Explorer:', `https://explorer.solana.com/tx/${txSig}?cluster=devnet`)
  } catch (e) {
    console.error('Subscription error:', e.message)
    if (e.message?.includes('already subscribed')) {
      txSig = e.signature || 'already_subscribed'
      console.log('Already subscribed, using existing subscription')
    } else {
      throw e
    }
  }

  // Step 5: Activate API token
  console.log('\nActivating API token...')
  const messageString = `${txSig}:${SELECTED_LEAGUES.join(',')}:${jwt}`
  const message = new TextEncoder().encode(messageString)
  const signatureBytes = nacl.sign.detached(message, keypair.secretKey)
  const walletSignature = Buffer.from(signatureBytes).toString('base64')

  const activationRes = await axios.post(
    `${apiBaseUrl}/token/activate`,
    { txSig, walletSignature, leagues: SELECTED_LEAGUES },
    { headers: { Authorization: `Bearer ${jwt}` } }
  )

  const apiToken = activationRes.data.token || activationRes.data
  const apiTokenStr = typeof apiToken === 'string'
    ? apiToken
    : JSON.stringify(apiToken)

  console.log('\n=== SUCCESS ===')
  console.log('API Token:', apiTokenStr)
  console.log('JWT:', jwt)

  // Step 6: Save to .env.local
  const envPath = path.join(process.cwd(), '.env.local')
  let envContent = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, 'utf-8')
    : ''

  const vars = {
    TXLINE_API_TOKEN: apiTokenStr,
    TXLINE_JWT: jwt,
    TXLINE_BASE: 'https://txline-dev.txodds.com',
  }

  for (const [key, value] of Object.entries(vars)) {
    if (envContent.includes(`${key}=`)) {
      envContent = envContent.replace(
        new RegExp(`${key}=.*`),
        `${key}=${value}`
      )
    } else {
      envContent += `\n${key}=${value}`
    }
  }

  fs.writeFileSync(envPath, envContent)
  console.log('\nSaved to .env.local:')
  console.log('  TXLINE_API_TOKEN ✓')
  console.log('  TXLINE_JWT ✓')
  console.log('  TXLINE_BASE ✓')

  // Step 7: Test the token
  console.log('\nTesting API token...')
  try {
    const testRes = await axios.get(
      `${apiBaseUrl}/scores/snapshot/1001`,
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          'X-Api-Token': apiTokenStr,
        }
      }
    )
    console.log('API test: SUCCESS')
    console.log('Response:', JSON.stringify(testRes.data).substring(0, 200))
  } catch (e) {
    console.log('API test status:', e.response?.status)
    console.log('Note: 403 "metadata missing" is OK — means auth works')
    console.log('      401 means token is invalid')
  }

  console.log('\n=== DONE ===')
  console.log('Add these to fieldcall/.env.local (already done):')
  console.log(`TXLINE_API_TOKEN=${apiTokenStr}`)
  console.log(`TXLINE_JWT=${jwt}`)
  console.log('TXLINE_BASE=https://txline-dev.txodds.com')
}

main().catch(e => {
  console.error('Activation failed:', e.message)
  if (e.logs) console.error('Logs:', e.logs)
  process.exit(1)
})
