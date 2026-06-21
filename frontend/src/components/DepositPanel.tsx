"use client";

import { useState } from "react";
import { ArrowDownToLine, CheckCircle2, Loader2 } from "lucide-react";
import { Panel, PanelHeader, Field, Input, Button, Callout } from "@/components/ui";
import { sendDeposit, ApiError, type SendDepositResponse } from "@/lib/api";
import { parsePrivacyHandle, truncateKey } from "@/lib/utils";
import { useSession } from "@/lib/session";

export function DepositPanel() {
  const { keys } = useSession();

  const [recipientHandle, setRecipientHandle] = useState("");
  const [amount, setAmount] = useState("0.5");
  const [senderPrivateKey, setSenderPrivateKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SendDepositResponse | null>(null);

  function useOwnHandleAsRecipient() {
    if (!keys) return;
    setRecipientHandle(`${keys.view_public}.${keys.spend_public}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const parsed = parsePrivacyHandle(recipientHandle);
    if (!parsed) {
      setError(
        "That doesn't look like a valid Privacy Handle. Expected format: <view_public>.<spend_public>",
      );
      return;
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Enter a positive amount of SOL to deposit.");
      return;
    }

    if (!senderPrivateKey.trim()) {
      setError("A sender private key is required to simulate this deposit.");
      return;
    }

    setLoading(true);
    try {
      const res = await sendDeposit({
        view_public_bs58: parsed.viewPublic,
        spend_public_bs58: parsed.spendPublic,
        amount_sol: amountNum,
        sender_private_key_bs58: senderPrivateKey.trim(),
      });
      setResult(res);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Unexpected error sending deposit.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel>
        <PanelHeader
          eyebrow="02 — Simulate Inbound"
          title="Deposit"
          description="Simulates a sender depositing into a stealth address derived from a recipient's Privacy Handle. Each deposit lands at a fresh address — even repeat senders can't be linked to the same recipient just by watching the chain."
        />

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
          <Field
            label="Recipient Privacy Handle"
            hint={
              keys ? (
                <button
                  type="button"
                  onClick={useOwnHandleAsRecipient}
                  className="text-accent hover:underline"
                >
                  use my own handle
                </button>
              ) : undefined
            }
          >
            <Input
              value={recipientHandle}
              onChange={(e) => setRecipientHandle(e.target.value)}
              placeholder="viewPublicBs58.spendPublicBs58"
              autoComplete="off"
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Amount (SOL)">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.50"
              />
            </Field>

            <Field label="Sender Private Key (bs58)">
              <Input
                type="password"
                value={senderPrivateKey}
                onChange={(e) => setSenderPrivateKey(e.target.value)}
                placeholder="Test wallet secret key"
                autoComplete="off"
              />
            </Field>
          </div>

          <Callout tone="neutral">
            This form is for local testing against your Rust backend&apos;s
            faucet-style sender. In production this step is replaced by the
            sender&apos;s own wallet adapter — they&apos;d never hand a private key
            to a frontend.
          </Callout>

          {error && <Callout tone="danger">{error}</Callout>}

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowDownToLine className="h-3.5 w-3.5" />
              )}
              {loading ? "Depositing…" : "Send Deposit"}
            </Button>
          </div>
        </form>
      </Panel>

      {result && (
        <Panel className="border-accent-dim/30 bg-accent-soft">
          <div className="flex items-start gap-3 p-6">
            <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-primary">
                Deposit confirmed
              </p>
              <dl className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                  <dt className="label-caps text-[10px] text-dim">
                    Stealth Address
                  </dt>
                  <dd className="data-mono mt-0.5 text-[13px] text-primary">
                    {truncateKey(result.stealth_address, 10, 10)}
                  </dd>
                </div>
                <div>
                  <dt className="label-caps text-[10px] text-dim">
                    Signature
                  </dt>
                  <dd className="data-mono mt-0.5 text-[13px] text-primary">
                    {truncateKey(result.signature, 10, 10)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
