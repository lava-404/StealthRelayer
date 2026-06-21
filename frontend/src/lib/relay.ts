/**
 * relay.ts
 * -----------------------------------------------------------------------
 * Builds the gas-abstracted withdrawal transaction for the "Escape Hatch".
 *
 * THE CORE IDEA
 * --------------
 * The whole point of a stealth relay is that the wallet which *receives*
 * funds (the stealth address) never has to hold SOL to pay gas, and the
 * wallet that *pays* gas (the relayer) never has to be the one moving the
 * user's money. If the user had to fund their own stealth address with SOL
 * just to pay a withdrawal fee, that funding transaction itself would be a
 * linkable on-chain breadcrumb a copy-bot could follow straight back to
 * their clean wallet. So instead:
 *
 *   1. The frontend builds ONE transaction with TWO instructions:
 *        a) move the deposited funds from the stealth address -> clean wallet
 *        b) pay the relayer's fee from the stealth address -> relayer's account
 *   2. The stealth address signs it (it's the only account being debited).
 *   3. The fee payer slot is left UNSIGNED — that's the relayer's job.
 *   4. We serialize the partially-signed tx to base64 and POST it to
 *      /relay. The Rust backend recognizes its own pubkey in the fee payer
 *      slot, signs it server-side, and submits it. The relayer pays the
 *      network fee in SOL; it gets reimbursed via instruction (b).
 *
 * Both instructions land in the SAME transaction, so they're atomic —
 * either both happen or neither does. There's no intermediate on-chain
 * state where "funds moved but fee didn't," which is what would otherwise
 * give an observer a timing window to correlate the two transfers.
 * -----------------------------------------------------------------------
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";

/** Lamports per SOL, used for human-readable amount -> on-chain amount conversion. */
const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * The relayer's fee in SOL, charged per withdrawal. The brief frames this as
 * "1 USDC (or SOL equivalent)" — for the hackathon demo we settle the fee in
 * SOL via a second SystemProgram.transfer so everything stays on the native
 * System Program and doesn't require a pre-existing SPL token account for
 * every stealth address. Swapping this for an SPL transfer instruction later
 * is a drop-in change (see the comment at the bottom of buildRelayTransaction).
 */
export const RELAYER_FEE_SOL = 1;

export interface BuildRelayTxParams {
  /** RPC connection, used only to fetch a recent blockhash. */
  connection: Connection;
  /** Base58-encoded private key of the derived stealth address (the signer). */
  stealthPrivateKeyBs58: string;
  /** The user's normal, "clean" wallet — where withdrawn funds end up. */
  cleanWalletAddress: string;
  /** The relayer's public key — both the fee payer AND the fee recipient. */
  relayerPublicKey: string;
  /** Total balance currently sitting in the stealth address, in SOL. */
  stealthBalanceSol: number;
}

export interface BuildRelayTxResult {
  /** Base64-encoded, partially-signed transaction ready for POST /relay. */
  transactionBase64: string;
  /** Amount that will actually reach the clean wallet after the relayer fee. */
  netAmountSol: number;
}

/**
 * Builds and signs the two-instruction stealth withdrawal transaction.
 *
 * Signing model:
 *  - feePayer = relayer's pubkey (so the relayer covers network gas)
 *  - the stealth Keypair signs because it's the source account being
 *    debited by both instructions — Solana requires a signature from
 *    every account marked `isSigner` / that authorizes a debit
 *  - the relayer's own signature slot is left empty here; it gets filled
 *    in server-side once the backend receives this payload over /relay
 */
export async function buildRelayTransaction({
  connection,
  stealthPrivateKeyBs58,
  cleanWalletAddress,
  relayerPublicKey,
  stealthBalanceSol,
}: BuildRelayTxParams): Promise<BuildRelayTxResult> {
  const stealthKeypair = Keypair.fromSecretKey(
    bs58.decode(stealthPrivateKeyBs58),
  );
  const cleanWallet = new PublicKey(cleanWalletAddress);
  const relayer = new PublicKey(relayerPublicKey);

  const netAmountSol = stealthBalanceSol - RELAYER_FEE_SOL;
  if (netAmountSol <= 0) {
    throw new Error(
      `Stealth balance (${stealthBalanceSol} SOL) does not cover the relayer fee (${RELAYER_FEE_SOL} SOL).`,
    );
  }

  // Instruction (a): the withdrawal itself — stealth address -> clean wallet.
  const withdrawIx = SystemProgram.transfer({
    fromPubkey: stealthKeypair.publicKey,
    toPubkey: cleanWallet,
    lamports: Math.round(netAmountSol * LAMPORTS_PER_SOL),
  });

  // Instruction (b): the relayer's fee — stealth address -> relayer.
  // This is what makes gas abstraction sustainable: the relayer is
  // reimbursed in the same atomic transaction it's paying gas for.
  const feeIx = SystemProgram.transfer({
    fromPubkey: stealthKeypair.publicKey,
    toPubkey: relayer,
    lamports: Math.round(RELAYER_FEE_SOL * LAMPORTS_PER_SOL),
  });

  const { blockhash } = await connection.getLatestBlockhash("confirmed");

  // payerKey = relayer: this is the account that goes in the fee-payer
  // slot of the compiled message and therefore the account the network
  // charges gas to. The stealth address pays nobody for gas — only for
  // the two transfers above.
  const message = new TransactionMessage({
    payerKey: relayer,
    recentBlockhash: blockhash,
    instructions: [withdrawIx, feeIx],
  }).compileToV0Message();

  const transaction = new VersionedTransaction(message);

  // Partial signature: only the stealth Keypair signs here. The relayer
  // pubkey occupies signer slot 0 but has no signature attached yet —
  // VersionedTransaction.serialize() will still produce valid bytes with
  // an empty 64-byte placeholder for that slot, which the backend fills in.
  transaction.sign([stealthKeypair]);

  const transactionBase64 = Buffer.from(transaction.serialize()).toString(
    "base64",
  );

  return { transactionBase64, netAmountSol };

  /**
   * SWAPPING TO AN SPL / USDC FEE INSTEAD OF NATIVE SOL
   * ----------------------------------------------------
   * Replace `feeIx` above with `createTransferInstruction(...)` from
   * @solana/spl-token, pointed at the stealth address's USDC associated
   * token account (source) and the relayer's USDC ATA (destination).
   * Everything else — message compilation, partial signing, base64
   * serialization, and the /relay contract — stays identical, because
   * the relayer's job is still just "be the fee payer, then forward the
   * signed bytes to the network."
   */
}
