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

  const fromAta = await getAssociatedTokenAddress(
    USDC_MINT, fromWallet
  )
  const toAta = await getAssociatedTokenAddress(
    USDC_MINT, providerWallet
  )

  // A wallet's USDC can be split across more than the canonical ATA (e.g.
  // an extra non-ATA account from an exchange withdrawal or an older
  // dApp) — Phantom's displayed balance sums all of them, so checking
  // (and later transferring from) only fromAta could wrongly reject a
  // payment the wallet can actually afford. Canonical ATA sorted first so
  // the common case — one account, enough funds — needs only one
  // transfer instruction, same as before.
  const accounts = await connection.getParsedTokenAccountsByOwner(
    fromWallet, { mint: USDC_MINT }
  )
  if (accounts.value.length === 0) {
    throw new Error('No USDC balance found in wallet')
  }
  const sourceAccounts = [...accounts.value].sort((a, b) => {
    if (a.pubkey.equals(fromAta)) return -1
    if (b.pubkey.equals(fromAta)) return 1
    return 0
  })

  const totalAvailable = sourceAccounts.reduce(
    (sum, { account }) => sum + (account.data.parsed?.info?.tokenAmount?.uiAmount || 0),
    0
  )
  if (totalAvailable < amountUsdc) {
    throw new Error(
      `Insufficient USDC balance: $${totalAvailable.toFixed(4)} available, $${amountUsdc} needed`
    )
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

  // Pull from as many of the payer's own USDC accounts as needed to cover
  // the amount — one transfer instruction per source account, all in this
  // same transaction. A single wallet signature authorizes all of them
  // since they share the same owner. Usually just the canonical ATA.
  let remaining = amountLamports
  for (const { pubkey, account } of sourceAccounts) {
    if (remaining <= 0) break
    const rawAmount = Number(account.data.parsed?.info?.tokenAmount?.amount || 0)
    if (rawAmount <= 0) continue
    const take = Math.min(rawAmount, remaining)
    tx.add(createTransferInstruction(pubkey, toAta, fromWallet, take, [], TOKEN_PROGRAM_ID))
    remaining -= take
  }

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
