"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { MetaAddressKeys } from "@/lib/api";

interface SessionState {
  keys: MetaAddressKeys | null;
  setKeys: (keys: MetaAddressKeys | null) => void;
  cleanWallet: string;
  setCleanWallet: (value: string) => void;
  relayerPublicKey: string;
  setRelayerPublicKey: (value: string) => void;
}

const SessionContext = createContext<SessionState | null>(null);

/**
 * Holds everything generated client-side for this test session: the
 * meta-address keypair returned by /meta-address/create, plus two values
 * the user supplies manually for the demo since there's no wallet adapter
 * wired up — the "clean" destination wallet and the relayer's pubkey.
 *
 * This is intentionally NOT persisted to localStorage. Private keys only
 * ever live in memory for the lifetime of the tab, per the brief's
 * "store for testing" instruction.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [keys, setKeys] = useState<MetaAddressKeys | null>(null);
  const [cleanWallet, setCleanWallet] = useState("");
  const [relayerPublicKey, setRelayerPublicKey] = useState("");

  return (
    <SessionContext.Provider
      value={{
        keys,
        setKeys,
        cleanWallet,
        setCleanWallet,
        relayerPublicKey,
        setRelayerPublicKey,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}
