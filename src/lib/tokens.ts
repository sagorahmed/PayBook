import { parseAbi, type Address } from 'viem'
import { Amount } from '@/onchain-money'

export interface TokenInfo {
  symbol: 'USDC' | 'EURC'
  address: Address
  decimals: number
}

export const batchAbi = parseAbi([
  'function MAX_BATCH() view returns (uint256)',
  'function batchTransferERC20(address token, address[] recipients, uint256[] amounts)',
  'function batchTransferERC20BestEffort(address token, address[] recipients, uint256[] amounts)',
  'function batchTransferNative(address[] recipients, uint256[] amounts) payable',
  'event TransferFailed(address indexed sender, address indexed token, address indexed recipient, uint256 amount)',
])

export const MAX_BATCH = 200

export function parseTokenAmount(value: string, token: TokenInfo): Amount | null {
  if (!value || value === '.') return null
  try {
    const a = Amount.parse(value, token.decimals)
    return a.isPositive() ? a : null
  } catch {
    return null
  }
}

export const fmt = (raw: bigint, token: TokenInfo, digits = 2) => {
  const a = Amount.fromRaw(raw, token.decimals)
  const full = a.toString()
  const frac = full.split('.')[1]?.length ?? 0
  return frac > digits ? full : a.toFixed(digits)
}
