export function truncateKey(
  key?: string,
  lead = 6,
  trail = 6,
): string {
  if (!key) return "";

  if (key.length <= lead + trail + 3) {
    return key;
  }

  return `${key.slice(0, lead)}…${key.slice(-trail)}`;
}
export function buildPrivacyHandle(
  viewPublic: string,
  spendPublic: string,
): string {
  return `${viewPublic}.${spendPublic}`;
}

export function parsePrivacyHandle(
  handle: string,
): { viewPublic: string; spendPublic: string } | null {
  const parts = handle.trim().split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { viewPublic: parts[0], spendPublic: parts[1] };
}

export async function copyToClipboard(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function formatSol(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}
