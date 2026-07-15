'use client'

import {
  Connection,
  PublicKey,
  Transaction,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'

const USDC_MINT = new PublicKey(
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
)

// Real provider wallet — verified as a valid, on-curve Solana address
// before wiring in. Kept as a plain string (not parsed into a PublicKey
// at module scope) so a bad value here can never crash the app on import;
// payPerQuestion() validates and fails loudly instead.
const PROVIDER_WALLET_ADDRESS = 'J7zXkTS6aFCxfKy2CC5ut8P5AwGeZ2XLa9AtTXb6v1F5'

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC ||
  'https://api.mainnet-beta.solana.com'

export interface PaymentResult {
  txHash: string
  amountUsdc: number
  paid: boolean
}

function getProviderWallet(): PublicKey {
  try {
    return new PublicKey(PROVIDER_WALLET_ADDRESS)
  } catch {
    throw new Error(
      'Billing is not configured yet: PROVIDER_WALLET_ADDRESS in lib/payment.ts is still a placeholder, not a real Solana address.'
    )
  }
}

export async function payPerQuestion(params: {
  fromWallet: PublicKey
  signTransaction: (tx: Transaction) => Promise<Transaction>
  amountUsdc: number
}): Promise<PaymentResult> {
  const { fromWallet, signTransaction, amountUsdc } = params
  const providerWallet = getProviderWallet()
  const connection = new Connection(RPC_URL, 'confirmed')

  // Amount in USDC lamports (6 decimals)
  const amountLamports = Math.floor(amountUsdc * 1_000_000)

  // Get ATAs
  const fromAta = await getAssociatedTokenAddress(
    USDC_MINT, fromWallet
  )
  const toAta = await getAssociatedTokenAddress(
    USDC_MINT, providerWallet
  )

  // Check balance
  try {
    const balance = await connection.getTokenAccountBalance(fromAta)
    const uiAmount = balance.value.uiAmount || 0
    if (uiAmount < amountUsdc) {
      throw new Error(
        `Insufficient USDC balance: $${uiAmount.toFixed(4)} available, $${amountUsdc} needed`
      )
    }
  } catch (e: any) {
    if (e.message?.includes('Insufficient')) throw e
    throw new Error('No USDC balance found in wallet')
  }

  const tx = new Transaction()

  // The provider's USDC account may not exist yet — SPL transfers fail
  // on-chain (after already paying the network fee) if the destination
  // ATA isn't initialized, so create it first if needed. The user pays
  // the small one-time rent, same as any first-time transfer to an
  // address that has never held this token before. Idempotent variant:
  // if another concurrent first-ever payment creates it first, this
  // instruction becomes a no-op instead of failing the whole transaction.
  const toAtaInfo = await connection.getAccountInfo(toAta)
  if (!toAtaInfo) {
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        fromWallet,
        toAta,
        providerWallet,
        USDC_MINT,
        TOKEN_PROGRAM_ID
      )
    )
  }

  // Build transaction
  const transferIx = createTransferInstruction(
    fromAta,
    toAta,
    fromWallet,
    amountLamports,
    [],
    TOKEN_PROGRAM_ID
  )
  tx.add(transferIx)

  const { blockhash } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.feePayer = fromWallet

  // Sign with Phantom
  const signed = await signTransaction(tx)

  // Send and confirm
  const txHash = await connection.sendRawTransaction(
    signed.serialize()
  )
  await connection.confirmTransaction(txHash, 'confirmed')

  return { txHash, amountUsdc, paid: true }
}

export async function getUsdcBalance(
  walletAddress: PublicKey
): Promise<number> {
  const connection = new Connection(RPC_URL, 'confirmed')
  try {
    const ata = await getAssociatedTokenAddress(
      USDC_MINT, walletAddress
    )
    const balance = await connection.getTokenAccountBalance(ata)
    return balance.value.uiAmount || 0
  } catch {
    return 0
  }
}
