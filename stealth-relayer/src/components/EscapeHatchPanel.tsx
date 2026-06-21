"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  DoorOpen,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Connection } from "@solana/web3.js";
import {
  Panel,
  PanelHeader,
  Field,
  Input,
  Button,
  Callout,
} from "@/components/ui";
import { relayWithdrawal, ApiError, type RelayResponse } from "@/lib/api";
import { buildRelayTransaction, RELAYER_FEE_SOL } from "@/lib/relay";
import { useSession } from "@/lib/session";
import { truncateKey, formatSol } from "@/lib/utils";

const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

type Step = "idle" | "building" | "signing" | "relaying" | "done" | "error";

export function EscapeHatchPanel() {
  const { keys, cleanWallet, setCleanWallet, relayerPublicKey, setRelayerPublicKey } =
    useSession();

  const [stealthBalance, setStealthBalance] = useState("2.5");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RelayResponse | null>(null);

  const hasKeys = Boolean(keys);
  const balanceNum = Number(stealthBalance) || 0;
  const netAmount = balanceNum - RELAYER_FEE_SOL;

  async function handleWithdraw() {
    setError(null);
    setResult(null);

    if (!keys) {
      setError("Generate a Privacy Handle in the Profile panel first.");
      return;
    }
    if (!cleanWallet.trim()) {
      setError("Enter the clean wallet address that should receive funds.");
      return;
    }
    if (!relayerPublicKey.trim()) {
      setError("Enter the relayer's public key.");
      return;
    }
    if (netAmount <= 0) {
      setError(
        `Stealth balance must exceed the ${RELAYER_FEE_SOL} SOL relayer fee.`,
      );
      return;
    }

    try {
      setStep("building");
      const connection = new Connection(RPC_ENDPOINT, "confirmed");

      // Build + partially sign the two-instruction VersionedTransaction.
      // See lib/relay.ts for the full breakdown of why this is one atomic
      // transaction instead of two sequential ones.
      setStep("signing");
      const { transactionBase64 } = await buildRelayTransaction({
        connection,
        stealthPrivateKeyBs58: keys.spend_private,
        cleanWalletAddress: cleanWallet.trim(),
        relayerPublicKey: relayerPublicKey.trim(),
        stealthBalanceSol: balanceNum,
      });

      // Hand the partially-signed bytes to the relayer. It adds its own
      // fee-payer signature, submits to the network, and pays the gas.
      setStep("relaying");
      const res = await relayWithdrawal({
        transaction_base64: transactionBase64,
      });

      setResult(res);
      setStep("done");
    } catch (e) {
      setStep("error");
      setError(
        e instanceof ApiError || e instanceof Error
          ? e.message
          : "Unexpected error during withdrawal.",
      );
    }
  }

  const isBusy = step === "building" || step === "signing" || step === "relaying";

  return (
    <div className="flex flex-col gap-6">
      <Panel>
        <PanelHeader
          eyebrow="03 — Gas-Abstracted Withdrawal"
          title="Escape Hatch"
          description="Moves funds out of your stealth address and into your clean wallet without your clean wallet ever signing — or paying gas for — the transfer. That's what keeps a copy-bot from stitching your deposit and withdrawal into one identity."
        />

        <div className="flex flex-col gap-6 p-6">
          {!hasKeys && (
            <Callout tone="warn">
              No stealth keys loaded. Go to <span className="font-medium">Profile</span> and
              generate a Privacy Handle before triggering a withdrawal.
            </Callout>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Clean Wallet Address" hint="destination">
              <Input
                value={cleanWallet}
                onChange={(e) => setCleanWallet(e.target.value)}
                placeholder="Your real, non-stealth wallet"
                autoComplete="off"
              />
            </Field>

            <Field label="Relayer Public Key" hint="fee payer">
              <Input
                value={relayerPublicKey}
                onChange={(e) => setRelayerPublicKey(e.target.value)}
                placeholder="Relayer's pubkey"
                autoComplete="off"
              />
            </Field>
          </div>

          <Field
            label="Stealth Address Balance (SOL)"
            hint="for this demo, enter the known deposited amount"
          >
            <Input
              type="number"
              step="0.01"
              min="0"
              value={stealthBalance}
              onChange={(e) => setStealthBalance(e.target.value)}
              className="max-w-[220px]"
            />
          </Field>

          {/* Transaction ledger — the literal two-instruction bundle.
              This is the actual mechanism, surfaced rather than hidden
              behind a single "Withdraw" button. */}
          <div>
            <p className="label-caps mb-3 text-[11px] text-dim">
              Atomic Transaction Preview
            </p>
            <div className="overflow-hidden rounded-lg border border-border">
              <LedgerRow
                index="ix 0"
                title="Withdraw to clean wallet"
                from="Stealth Address"
                to={cleanWallet ? truncateKey(cleanWallet, 5, 5) : "Clean Wallet"}
                amount={`${formatSol(Math.max(netAmount, 0))} SOL`}
                accent
              />
              <LedgerRow
                index="ix 1"
                title="Relayer fee"
                from="Stealth Address"
                to={
                  relayerPublicKey
                    ? truncateKey(relayerPublicKey, 5, 5)
                    : "Relayer"
                }
                amount={`${formatSol(RELAYER_FEE_SOL)} SOL`}
              />
              <div className="flex items-center gap-2 border-t border-border-soft bg-raised-2 px-4 py-2.5">
                <KeyRound className="h-3 w-3 text-dim" />
                <p className="text-[11px] text-dim">
                  Fee payer slot: <span className="text-secondary">relayer</span> — gas
                  is never charged to the stealth address or your clean wallet.
                </p>
              </div>
            </div>
          </div>

          {error && <Callout tone="danger">{error}</Callout>}

          <div className="flex items-center justify-between">
            <StepTracker step={step} />
            <Button
              variant="danger"
              onClick={handleWithdraw}
              disabled={isBusy || !hasKeys}
            >
              {isBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <DoorOpen className="h-3.5 w-3.5" />
              )}
              {isBusy ? "Processing…" : "Trigger Escape Hatch"}
            </Button>
          </div>
        </div>
      </Panel>

      {result && (
        <Panel className="border-accent-dim/30 bg-accent-soft">
          <div className="flex items-start gap-3 p-6">
            <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-accent" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">
                Withdrawal relayed
              </p>
              <p className="mt-1 text-[13px] text-secondary">
                Funds are on their way to your clean wallet. No transaction
                in this flow was signed or paid for by that wallet.
              </p>
              <div className="mt-3">
                <p className="label-caps text-[10px] text-dim">Signature</p>
                <p className="data-mono mt-0.5 text-[13px] text-primary">
                  {truncateKey(result.signature, 10, 10)}
                </p>
              </div>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}

function LedgerRow({
  index,
  title,
  from,
  to,
  amount,
  accent = false,
}: {
  index: string;
  title: string;
  from: string;
  to: string;
  amount: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-border-soft bg-raised px-4 py-3.5 last:border-b-0">
      <span
        className={`label-caps shrink-0 text-[10px] ${
          accent ? "text-accent" : "text-dim"
        }`}
      >
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-primary">
          {title}
        </p>
        <div className="data-mono mt-0.5 flex items-center gap-1.5 text-[11px] text-dim">
          <span>{from}</span>
          <ArrowRight className="h-2.5 w-2.5" />
          <span>{to}</span>
        </div>
      </div>
      <span
        className={`data-mono shrink-0 text-[13px] ${
          accent ? "text-accent" : "text-secondary"
        }`}
      >
        {amount}
      </span>
    </div>
  );
}

function StepTracker({ step }: { step: Step }) {
  if (step === "idle") {
    return (
      <p className="flex items-center gap-1.5 text-[12px] text-dim">
        <ShieldCheck className="h-3.5 w-3.5" />
        Awaiting trigger
      </p>
    );
  }
  if (step === "done") {
    return (
      <p className="flex items-center gap-1.5 text-[12px] text-accent">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Relayed successfully
      </p>
    );
  }
  if (step === "error") {
    return <p className="text-[12px] text-danger">Withdrawal failed</p>;
  }

  const labels: Record<string, string> = {
    building: "Building transaction…",
    signing: "Signing with stealth key…",
    relaying: "Submitting to relayer…",
  };

  return (
    <p className="flex items-center gap-1.5 text-[12px] text-secondary">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      {labels[step]}
    </p>
  );
}
