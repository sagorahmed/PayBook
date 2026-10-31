import { getAddress, isAddress } from 'viem'
import type { Address } from './types'

export const shortAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

export const uid = () => crypto.randomUUID()

export function normalizeAddress(input: string): Address | null {
  const value = input.trim()
  if (!isAddress(value, { strict: false })) return null
  return getAddress(value)
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?'

/** Sanitises a typed amount to digits and at most one dot, limited to `decimals` fraction digits. */
export function cleanAmountInput(value: string, decimals: number): string {
  const v = value.replace(/[^0-9.]/g, '')
  const [whole, ...rest] = v.split('.')
  if (rest.length === 0) return whole
  return `${whole}.${rest.join('').slice(0, decimals)}`
}

export const formatDate = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export function downloadText(filename: string, text: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
