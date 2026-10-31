/** Turns wallet / RPC / contract errors into short, actionable copy. Returns null for a user rejection. */
export function parseOnchainError(error: unknown): string | null {
  const e = error as { code?: number; shortMessage?: string; message?: string; cause?: { code?: number } } | undefined
  const raw = `${e?.shortMessage ?? ''} ${e?.message ?? ''}`.toLowerCase()

  if (e?.code === 4001 || e?.cause?.code === 4001 || raw.includes('user rejected') || raw.includes('user denied')) {
    return null
  }
  if (raw.includes('insufficient funds') || raw.includes('exceeds balance') || raw.includes('transfer amount exceeds')) {
    return 'Insufficient balance for this payment plus network fee.'
  }
  if (raw.includes('insufficient allowance') || raw.includes('allowance')) {
    return 'Token spending approval is missing or too low. Approve the exact total and try again.'
  }
  if (raw.includes('lengthmismatch')) return 'Recipient and amount lists do not match.'
  if (raw.includes('batchtoolarge')) return 'Too many recipients in one batch (max 200).'
  if (raw.includes('zeroaddress')) return 'A recipient address is empty or invalid.'
  if (raw.includes('zeroamount')) return 'Every recipient needs an amount greater than zero.'
  if (raw.includes('blacklist') || raw.includes('blocklist')) {
    return 'A recipient address is blocked by the token issuer. Remove it or enable "skip failed recipients".'
  }
  if (raw.includes('reverted')) return 'The transaction was rejected by the network. Check recipients and amounts, then retry.'
  if (raw.includes('network') || raw.includes('timeout') || raw.includes('fetch')) {
    return 'Network issue. Check your connection and retry.'
  }
  return 'Something went wrong. Please try again.'
}
