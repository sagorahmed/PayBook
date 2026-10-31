import { useState } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { Check, Copy, Lock } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import { useTokenBalance } from '@/hooks/useTransfer'
import { useVault } from '@/hooks/useVault'
import { shortAddress } from '@/lib/format'
import { fmt } from '@/lib/tokens'
import { useNetwork } from '@/hooks/useNetwork'
import { Notice } from './ui'

export function BalanceCard() {
  const { address, chainId } = useAccount()
  const { switchChain, isPending } = useSwitchChain()
  const { lock, status } = useVault()
  const { tokens: TOKENS, chainId: CHAIN_ID, label, isMainnet } = useNetwork()
  const usdc = useTokenBalance(TOKENS[0])
  const eurc = useTokenBalance(TOKENS[1])
  const [copied, setCopied] = useState(false)

  if (!address) return null

  const copy = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <button onClick={() => void copy()} className="mono inline-flex min-h-[32px] items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
          {shortAddress(address)} {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
        <div className="flex items-center gap-2">
          <span className="chip">{label}</span>
          {status === 'ready' && (
            <button className="btn btn-ghost !min-h-[32px] !rounded-full !px-3 !text-xs" onClick={lock}>
              <Lock className="size-3" /> Lock
            </button>
          )}
        </div>
      </div>

      <p className="label mt-4">Wallet balance</p>
      <div className="flex items-baseline gap-2">
        {usdc.isLoading ? (
          <div className="skeleton h-10 w-40" />
        ) : (
          <span className="display text-4xl font-bold tabular-nums">{usdc.balance !== undefined ? fmt(usdc.balance, TOKENS[0]) : '--'}</span>
        )}
        <span className="inline-flex items-center gap-1 text-lg font-medium" style={{ color: 'var(--subtle)' }}>
          <TokenUSDC variant="branded" size={20} /> USDC
        </span>
      </div>
      <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
        USDC is also your network fee token on Arc, so this one balance covers payments and fees.
        {eurc.balance !== undefined && TOKENS[1] ? ` EURC: ${fmt(eurc.balance, TOKENS[1])}` : ''}
      </p>

      {isMainnet && (
        <p className="mt-3 text-xs font-medium" style={{ color: 'var(--warn)' }}>
          Mainnet uses real USDC. Payments cannot be reversed, so double-check every address.
        </p>
      )}

      {chainId !== CHAIN_ID && (
        <div className="mt-4 space-y-2">
          <Notice tone="warn">Your wallet is on a different network. Switch to {label} to continue.</Notice>
          <button className="btn btn-primary w-full" disabled={isPending} onClick={() => switchChain({ chainId: CHAIN_ID })}>
            {isPending ? 'Switching...' : `Switch to ${label}`}
          </button>
        </div>
      )}
    </section>
  )
}
