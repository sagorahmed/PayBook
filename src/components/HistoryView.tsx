import { useState } from 'react'
import { ChevronDown, ExternalLink, History } from 'lucide-react'
import { useVault } from '@/hooks/useVault'
import { formatDate, shortAddress } from '@/lib/format'
import { buildTxExplorerUrl } from '@/onchain-facts'
import { txChainId } from '@/lib/networks'
import { useNetwork } from '@/hooks/useNetwork'
import type { TxStatus } from '@/lib/types'
import { EmptyState, StatusBadge } from './ui'

const FILTERS: ('all' | TxStatus)[] = ['all', 'pending', 'success', 'failed']

export function HistoryView() {
  const { vault } = useVault()
  const { chainId, label } = useNetwork()
  const [filter, setFilter] = useState<'all' | TxStatus>('all')
  const [open, setOpen] = useState<string | null>(null)
  const onNetwork = vault.history.filter((t) => txChainId(t) === chainId)
  const list = onNetwork.filter((t) => filter === 'all' || t.status === filter)

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button key={f} className="chip capitalize" data-active={filter === f} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      <section className="card overflow-hidden">
        {onNetwork.length === 0 ? (
          <EmptyState icon={<History className="size-6" />} title="No payments yet" body={`Payments you send on ${label} show up here with their live status.`} />
        ) : list.length === 0 ? (
          <EmptyState icon={<History className="size-6" />} title="Nothing here" body={`No ${filter} payments.`} />
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {list.map((tx) => {
              const expanded = open === tx.hash
              return (
                <li key={tx.hash} style={{ borderColor: 'var(--border)' }}>
                  <button className="flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen(expanded ? null : tx.hash)} aria-expanded={expanded}>
                    <div className="min-w-0 flex-1">
                      <p className="display text-base font-semibold tabular-nums">
                        {tx.total} {tx.tokenSymbol}
                      </p>
                      <p className="truncate text-xs" style={{ color: 'var(--muted)' }}>
                        {tx.kind === 'batch' ? `Batch to ${tx.items.length}` : `To ${tx.items[0]?.name ?? 'contact'}`} · {formatDate(tx.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={tx.status} />
                    <ChevronDown className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} style={{ color: 'var(--subtle)' }} />
                  </button>
                  {expanded && (
                    <div className="space-y-2 px-4 pb-4">
                      <ul className="inner divide-y" style={{ borderColor: 'var(--border)' }}>
                        {tx.items.map((i, idx) => {
                          const skipped = tx.skipped?.some((s) => s.toLowerCase() === i.address.toLowerCase())
                          return (
                            <li key={`${i.address}-${idx}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }}>
                              <div className="min-w-0">
                                <p className="truncate font-medium">{i.name}</p>
                                <p className="mono text-[11px]" style={{ color: 'var(--muted)' }}>{shortAddress(i.address)}</p>
                              </div>
                              <div className="text-right">
                                <p className="tabular-nums">{i.amount}</p>
                                {skipped && <p className="text-[11px]" style={{ color: 'var(--warn)' }}>Skipped</p>}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                      <a href={buildTxExplorerUrl(txChainId(tx), tx.hash)} target="_blank" rel="noopener noreferrer" className="mono inline-flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--muted)' }}>
                        {shortAddress(tx.hash)} <ExternalLink className="size-3" /> View on Arc explorer
                      </a>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
