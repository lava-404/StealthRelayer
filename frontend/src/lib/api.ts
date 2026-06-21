/**
 * api.ts
 * -----------------------------------------------------------------------
 * Thin fetch wrapper around the Stealth Relayer Rust backend.
 * Every function here maps 1:1 to an endpoint in the API contract.
 * No business logic lives here — transaction construction for /relay
 * happens in lib/relay.ts, which calls relayWithdrawal() below once
 * it has a signed, base64-encoded VersionedTransaction in hand.
 * -----------------------------------------------------------------------
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_RELAYER_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function healthCheck() {
  const response = await fetch(`${BASE_URL}/health`);

  if (!response.ok) {
    throw new Error("Backend unavailable");
  }

  return response.json();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new ApiError(
      `Could not reach relayer backend at ${BASE_URL}. Is the Rust server running?`,
      0,
    );
  }

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};

  if (!res.ok) {
    throw new ApiError(
      json?.message ?? `Request to ${path} failed (${res.status})`,
      res.status,
    );
  }

  return json as T;
}

/* ---------------------------------------------------------------------- */
/* 1. POST /meta-address/create                                           */
/* ---------------------------------------------------------------------- */

export interface MetaAddressKeys {
  view_public: string;
  spend_public: string;
  view_private: string;
  spend_private: string;
}

export function createMetaAddress(): Promise<MetaAddressKeys> {
  return request<MetaAddressKeys>("/meta-address/create", {
    method: "POST",
  });
}

/* ---------------------------------------------------------------------- */
/* 2. POST /send                                                          */
/* ---------------------------------------------------------------------- */

export interface SendDepositPayload {
  view_public_bs58: string;
  spend_public_bs58: string;
  amount_sol: number;
  sender_private_key_bs58: string;
}

export interface SendDepositResponse {
  status: "success" | string;
  signature: string;
  stealth_address: string;
}

export function sendDeposit(
  payload: SendDepositPayload,
): Promise<SendDepositResponse> {
  return request<SendDepositResponse>("/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* ---------------------------------------------------------------------- */
/* 3. POST /relay                                                         */
/* ---------------------------------------------------------------------- */

export interface RelayPayload {
  transaction_base64: string;
}

export interface RelayResponse {
  status: "success" | string;
  signature: string;
}

export function relayWithdrawal(
  payload: RelayPayload,
): Promise<RelayResponse> {
  return request<RelayResponse>("/relay", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* ---------------------------------------------------------------------- */
/* 4. GET /payments                                                       */
/* ---------------------------------------------------------------------- */

export interface PaymentsScanResponse {
  status: "success" | string;
  message: string;
}

export function getPaymentsStatus(): Promise<PaymentsScanResponse> {
  return request<PaymentsScanResponse>("/payments", {
    method: "GET",
  });
}
