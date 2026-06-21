"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ShieldHalf, ArrowDownToLine, DoorOpen, Radio } from "lucide-react";
import { StatusPill } from "@/components/ui";
import { healthCheck } from "@/lib/api";

export type PanelKey = "profile" | "deposit" | "escape";

const NAV_ITEMS: { key: PanelKey; label: string; icon: typeof ShieldHalf }[] =
  [
    { key: "profile", label: "Profile", icon: ShieldHalf },
    { key: "deposit", label: "Deposit", icon: ArrowDownToLine },
    { key: "escape", label: "Escape Hatch", icon: DoorOpen },
  ];

export function AppShell({
  active,
  onNavigate,
  children,
}: {
  active: PanelKey;
  onNavigate: (key: PanelKey) => void;
  children: ReactNode;
}) {
  const [backendOnline, setBackendOnline] = useState<
    "pending" | "online" | "offline"
  >("pending");

  useEffect(() => {
    let cancelled = false;
    healthCheck()
    .then(() => !cancelled && setBackendOnline("online"))
    .catch(() => !cancelled && setBackendOnline("offline"));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="grid-fade pointer-events-none absolute inset-x-0 top-0 h-[480px]" />

      <div className="relative mx-auto flex max-w-6xl flex-col px-6 pb-24 pt-10 lg:px-10">
        {/* Top bar */}
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-accent-dim/40 bg-accent-soft">
              <Radio className="h-4 w-4 text-accent" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[14px] font-semibold leading-tight text-primary">
                StealthPay
              </p>
              <p className="text-[11px] leading-tight text-dim">
                Privacy Infrastructure for Solana
              </p>
            </div>
          </div>

          <StatusPill
            state={backendOnline}
            label={
              backendOnline === "online"
                ? "Backend Connected"
                : backendOnline === "offline"
                  ? "Backend Unreachable"
                  : "Checking Backend…"
            }
          />
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
          {/* Side nav */}
          <nav className="flex gap-2 lg:flex-col">
            {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
              const isActive = active === key;
              return (
                <button
                  key={key}
                  onClick={() => onNavigate(key)}
                  className={`flex flex-1 items-center gap-2.5 rounded-lg border px-3.5 py-3 text-left text-sm transition-colors lg:flex-none ${
                    isActive
                      ? "border-accent-dim/40 bg-accent-soft text-accent"
                      : "border-border bg-raised text-secondary hover:border-dim hover:text-primary"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                  <span className="hidden font-medium sm:inline">
                    {label}
                  </span>
                </button>
              );
            })}

            <div className="mt-2 hidden flex-col gap-3 rounded-lg border border-border-soft bg-raised/60 p-4 lg:flex">
              <p className="label-caps text-[10px] text-dim">
                How this works
              </p>
              <p className="text-[12px] leading-relaxed text-secondary">
                Funds move into a one-time stealth address, not your real
                wallet. The relayer pays gas on withdrawal so your clean
                wallet never signs a traceable funding transaction.
              </p>
            </div>
          </nav>

          {/* Main stage */}
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
