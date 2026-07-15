import { Connection, Keypair } from '@solana/web3.js'
import fs from 'fs'
import path from 'path'

const keypairPath = path.join(process.cwd(), 'scripts', 'txline-wallet.json')

let keypair
if (fs.existsSync(keypairPath)) {
  keypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf-8')))
  )
} else {
  keypair = Keypair.generate()
  fs.writeFileSync(
    keypairPath,
    JSON.stringify(Array.from(keypair.secretKey))
  )
  console.log('No existing keypair found — generated a new one and saved it to scripts/txline-wallet.json')
}

const connection = new Connection(
  'https://api.mainnet-beta.solana.com',
  'confirmed'
)

const balance = await connection.getBalance(keypair.publicKey)
console.log('Wallet:', keypair.publicKey.toBase58())
console.log('Balance:', balance / 1e9, 'SOL')

if (balance < 0.005 * 1e9) {
  console.log('\nNOT ENOUGH SOL.')
  console.log('Send at least 0.01 SOL to this address from Phantom:')
  console.log(keypair.publicKey.toBase58())
} else {
  console.log('\nBalance OK. Ready to subscribe.')
}
