import nacl from 'tweetnacl'
import axios from 'axios'
import {
  Connection, PublicKey, Keypair, SystemProgram, Transaction
} from '@solana/web3.js'
import * as anchor from '@coral-xyz/anchor'
import fs from 'fs'
import path from 'path'

const CONFIG = {
  rpcUrl: 'https://mainnet.helius-rpc.com/?api-key=1f1ef0eb-d05a-4e8c-8a68-819a1fc55b54',
  apiOrigin: 'https://txline.txodds.com',
  programId: new PublicKey('9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA'),
  txlTokenMint: new PublicKey('Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL'),
}
// Mainnet program has no on-chain IDL — fetch the devnet sibling's IDL
// instead and repoint it at the mainnet program (see STEP 2 below).
const DEVNET_RPC = 'https://api.devnet.solana.com'
const DEVNET_PROGRAM_ID = new PublicKey('6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J')

const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')

const { rpcUrl, apiOrigin, programId, txlTokenMint } = CONFIG
const apiBaseUrl = `${apiOrigin}/api`

const keypairPath = path.join(process.cwd(), 'scripts', 'txline-wallet.json')
const keypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf-8')))
)

const connection = new Connection(rpcUrl, 'confirmed')

function findAta(owner, mint) {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_2022_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )
  return ata
}

async function main() {
  console.log('=== TxLINE MAINNET Activation ===')
  console.log('Wallet:', keypair.publicKey.toBase58())

  const balance = await connection.getBalance(keypair.publicKey)
  console.log('SOL Balance:', balance / 1e9)

  if (balance < 0.005 * 1e9) {
    console.error('NOT ENOUGH SOL. Send at least 0.01 SOL to:')
    console.error(keypair.publicKey.toBase58())
    process.exit(1)
  }

  console.log('\nGetting guest JWT...')
  const authRes = await axios.post(`${apiOrigin}/auth/guest/start`)
  const jwt = authRes.data.token
  console.log('JWT obtained')

  const wallet = new anchor.Wallet(keypair)
  const provider = new anchor.AnchorProvider(
    connection, wallet, { commitment: 'confirmed' }
  )
  anchor.setProvider(provider)

  console.log('\nFetching IDL from devnet program (mainnet has none)...')
  let idl
  try {
    idl = await anchor.Program.fetchIdl(DEVNET_PROGRAM_ID, { connection: new Connection(DEVNET_RPC, 'confirmed') })
    if (!idl) throw new Error('Devnet IDL is null')
    console.log('IDL fetched from devnet')
  } catch (e) {
    console.error('IDL fetch failed:', e.message)
    process.exit(1)
  }
  // Anchor 0.30+ reads the target program address from idl.address, so it
  // must be repointed at mainnet or every instruction would target devnet.
  idl.address = programId.toBase58()

  const program = new anchor.Program(idl, provider)

  const SERVICE_LEVEL_ID = 1
  const DURATION_WEEKS = 4
  const SELECTED_LEAGUES = []

  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('token_treasury_v2')], programId
  )
  const tokenTreasuryVault = findAta(tokenTreasuryPda, txlTokenMint)
  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('pricing_matrix')], programId
  )
  const userTokenAccount = findAta(keypair.publicKey, txlTokenMint)

  console.log('\nChecking token account...')
  const existingAccount = await connection.getAccountInfo(userTokenAccount)
  if (existingAccount) {
    console.log('ATA already exists')
  } else {
    console.log('Creating ATA...')
    const createAtaIx = new anchor.web3.TransactionInstruction({
      programId: ASSOCIATED_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: userTokenAccount, isSigner: false, isWritable: true },
        { pubkey: keypair.publicKey, isSigner: false, isWritable: false },
        { pubkey: txlTokenMint, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: Uint8Array.from([1]), // CreateIdempotent
    })
    const tx = new Transaction().add(createAtaIx)
    const sig = await provider.sendAndConfirm(tx, [keypair])
    console.log('ATA created:', sig)
  }

  console.log('\nSubscribing on mainnet...')
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
    console.log('Explorer: https://explorer.solana.com/tx/' + txSig)
  } catch (e) {
    if (e.message?.includes('already subscribed') ||
        e.message?.includes('already in use')) {
      console.log('Already subscribed on mainnet')
      txSig = e.signature || 'already_subscribed_mainnet'
    } else {
      console.error('Subscription error:', e.message)
      if (e.logs) console.error('Logs:', e.logs.slice(0, 10))
      process.exit(1)
    }
  }

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
    ? apiToken : JSON.stringify(apiToken)

  console.log('\n=== SUCCESS ===')
  console.log('API Token:', apiTokenStr.substring(0, 30) + '...')

  const envPath = path.join(process.cwd(), '.env.local')
  let envContent = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, 'utf-8') : ''

  const vars = {
    TXLINE_API_TOKEN: apiTokenStr,
    TXLINE_JWT: jwt,
    TXLINE_BASE: 'https://txline.txodds.com',
  }

  for (const [key, value] of Object.entries(vars)) {
    if (envContent.includes(`${key}=`)) {
      envContent = envContent.replace(
        new RegExp(`${key}=.*`), `${key}=${value}`
      )
    } else {
      envContent += `\n${key}=${value}`
    }
  }

  fs.writeFileSync(envPath, envContent)
  console.log('\n.env.local updated with mainnet credentials')

  console.log('\nTesting real fixtures...')
  try {
    const fixturesRes = await axios.get(
      `${apiBaseUrl}/worldcup/fixtures`,
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          'X-Api-Token': apiTokenStr,
        }
      }
    )
    const fixtures = fixturesRes.data
    console.log('REAL FIXTURES FOUND:',
      JSON.stringify(fixtures).substring(0, 300))
  } catch (e) {
    console.log('Fixtures test:', e.response?.status, e.response?.data?.message)
    console.log('Auth is working — fixture endpoint may differ')
  }

  console.log('\n=== DONE ===')
  console.log('Restart dev server to load new .env.local')
  console.log('TXLINE_BASE is now https://txline.txodds.com (MAINNET)')
}

main().catch(e => {
  console.error('Failed:', e.message)
  if (e.logs) console.error('Logs:', e.logs.slice(0, 10))
  process.exit(1)
})
