"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff, RefreshCcw, ShieldHalf } from "lucide-react";
import { Panel, PanelHeader, Button, Callout } from "@/components/ui";
import { createMetaAddress, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { buildPrivacyHandle, copyToClipboard, truncateKey } from "@/lib/utils";

export function ProfilePanel() {
  const { keys, setKeys } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const result = await createMetaAddress();
      setKeys(result);
      setRevealed(false);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Unexpected error generating meta-address.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(value: string, field: string) {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(field);
      setTimeout(() => setCopied(null), 1500);
    }
  }

  const handle = keys ? buildPrivacyHandle(keys.view_public, keys.spend_public) : null;

  return (
    <div className="flex flex-col gap-6">
      <Panel>
        <PanelHeader
          eyebrow="01 — Identity"
          title="Privacy Handle"
          description="A meta-address generated from a view key and a spend key. Share this handle freely — senders derive a fresh, one-time stealth address from it for every deposit, so no two payments to you ever look related on-chain."
          right={
            <Button onClick={handleGenerate} disabled={loading}>
              <RefreshCcw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
              {keys ? "Regenerate" : "Generate Handle"}
            </Button>
          }
        />

        <div className="p-6">
          {!keys && !error && (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-soft py-14 text-center">
              <ShieldHalf className="h-6 w-6 text-dim" />
              <p className="text-sm text-secondary">
                No privacy handle yet. Generate one to get a view key and a
                spend key from the relayer backend.
              </p>
            </div>
          )}

          {error && (
            <Callout tone="danger">
              <span className="font-medium">Generation failed.</span>{" "}
              {error}
            </Callout>
          )}

          {keys && handle && (
            <div className="flex flex-col gap-5">
              {/* Signature element: the handle rendered as a masked,
                  actively-scanning value — provably yours, unreadable
                  to a passive observer until you choose to reveal it. */}
              <div className="relative overflow-hidden rounded-lg border border-accent-dim/30 bg-accent-soft px-5 py-5">
                <div className="scan-sweep absolute inset-0" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="label-caps mb-2 text-[10px] text-accent">
                      Your Privacy Handle
                    </p>
                    <p className="data-mono truncate text-[15px] text-primary">
                      {revealed ? handle : maskHandle(handle)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      onClick={() => setRevealed((r) => !r)}
                      className="rounded-md border border-border p-2 text-secondary hover:border-dim hover:text-primary"
                      aria-label={revealed ? "Mask handle" : "Reveal handle"}
                    >
                      {revealed ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleCopy(handle, "handle")}
                      className="rounded-md border border-border p-2 text-secondary hover:border-dim hover:text-primary"
                      aria-label="Copy handle"
                    >
                      {copied === "handle" ? (
                        <Check className="h-3.5 w-3.5 text-accent" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Public key breakdown */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <KeyRow
                  label="View Public"
                  value={keys.view_public}
                  onCopy={() => handleCopy(keys.view_public, "view_public")}
                  copied={copied === "view_public"}
                />
                <KeyRow
                  label="Spend Public"
                  value={keys.spend_public}
                  onCopy={() => handleCopy(keys.spend_public, "spend_public")}
                  copied={copied === "spend_public"}
                />
              </div>

              <Callout tone="warn">
                <span className="font-medium">Private keys are in memory only.</span>{" "}
                This session holds your view-private and spend-private keys
                in browser state for testing the Escape Hatch flow below.
                They are never persisted or sent anywhere except when you
                explicitly sign a withdrawal. Closing this tab discards them.
              </Callout>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

function KeyRow({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-raised-2 px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="label-caps text-[10px] text-dim">{label}</p>
        <button
          onClick={onCopy}
          className="text-dim hover:text-primary"
          aria-label={`Copy ${label}`}
        >
          {copied ? (
            <Check className="h-3 w-3 text-accent" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
      </div>
      <p className="data-mono text-[13px] text-primary">
        {truncateKey(value, 8, 8)}
      </p>
    </div>
  );
}

function maskHandle(handle: string): string {
  const [a, b] = handle.split(".");
  const mask = (s: string) => `${s.slice(0, 4)}${"•".repeat(8)}${s.slice(-4)}`;
  return `${mask(a)}.${mask(b)}`;
}
