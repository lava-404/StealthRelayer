"use client";

import { useState } from "react";
import { AppShell, type PanelKey } from "@/components/AppShell";
import { SessionProvider } from "@/lib/session";
import { ProfilePanel } from "@/components/ProfilePanel";
import { DepositPanel } from "@/components/DepositPanel";
import { EscapeHatchPanel } from "@/components/EscapeHatchPanel";

export default function Home() {
  const [active, setActive] = useState<PanelKey>("profile");

  return (
    <SessionProvider>
      <AppShell active={active} onNavigate={setActive}>
        {active === "profile" && <ProfilePanel />}
        {active === "deposit" && <DepositPanel />}
        {active === "escape" && <EscapeHatchPanel />}
      </AppShell>
    </SessionProvider>
  );
}
