import { useState } from 'react'
import { ExternalLink, Pencil, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useVault } from '@/hooks/useVault'
import { formatDate } from '@/lib/format'
import { buildTxExplorerUrl } from '@/onchain-facts'
import { txChainId } from '@/lib/networks'
import { useNetwork } from '@/hooks/useNetwork'
import type { Contact } from '@/lib/types'
import { AddressLink, Avatar, FavStar, Sheet, StatusBadge } from './ui'

interface Props {
  contact: Contact | null
  onClose: () => void
  onEdit: (c: Contact) => void
  onSend: (c: Contact) => void
}

export function ContactDetail({ contact, onClose, onEdit, onSend }: Props) {
  const { vault, deleteContact, toggleFavorite } = useVault()
  const { chainId, label } = useNetwork()
  const [confirming, setConfirming] = useState(false)
  // Read the live record so favorite toggles reflect immediately.
  const live = contact ? vault.contacts.find((c) => c.id === contact.id) ?? null : null

  const history = live
    ? vault.history
        .filter((tx) => txChainId(tx) === chainId)
        .map((tx) => ({ tx, item: tx.items.find((i) => i.contactId === live.id || i.address.toLowerCase() === live.address.toLowerCase()) }))
        .filter((x) => x.item)
    : []

  const close = () => {
    setConfirming(false)
    onClose()
  }

  return (
    <Sheet open={!!live} onClose={close} title="Contact">
      {live && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Avatar name={live.name} size={52} />
            <div className="min-w-0 flex-1">
              <p className="display truncate text-lg font-semibold">{live.name}</p>
              <AddressLink address={live.address} />
            </div>
            <button className="btn btn-ghost !px-3" onClick={() => toggleFavorite(live.id)} aria-label={live.favorite ? 'Remove favorite' : 'Add favorite'}>
              <FavStar active={live.favorite} />
            </button>
          </div>

          {(live.tags.length > 0 || live.notes) && (
            <div className="inner space-y-2 p-3">
              {live.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {live.tags.map((t) => (
                    <span key={t} className="chip !min-h-[24px]">{t}</span>
                  ))}
                </div>
              )}
              {live.notes && <p className="text-pretty text-sm" style={{ color: 'var(--ink-2)' }}>{live.notes}</p>}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button className="btn btn-primary" onClick={() => onSend(live)}>
              <Send className="size-4" /> Send
            </button>
            <button className="btn btn-ghost" onClick={() => onEdit(live)}>
              <Pencil className="size-4" /> Edit
            </button>
            <button className="btn btn-danger" onClick={() => setConfirming(true)}>
              <Trash2 className="size-4" /> Delete
            </button>
          </div>

          {confirming && (
            <div className="inner space-y-2 p-3">
              <p className="text-sm">Delete {live.name}? Past transactions stay in your history.</p>
              <div className="flex gap-2">
                <button className="btn btn-ghost flex-1" onClick={() => setConfirming(false)}>Keep</button>
                <button
                  className="btn flex-1 !bg-[var(--danger)] !text-white"
                  onClick={() => {
                    deleteContact(live.id)
                    toast.success('Contact deleted')
                    close()
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          <div>
            <p className="label">History</p>
            {history.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No payments to {live.name} on {label} yet.</p>
            ) : (
              <ul className="space-y-2">
                {history.map(({ tx, item }) => (
                  <li key={tx.hash} className="inner flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="display text-sm font-semibold tabular-nums">
                        {item!.amount} {tx.tokenSymbol}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        {formatDate(tx.createdAt)} · {tx.kind === 'batch' ? 'Batch' : 'Direct'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={tx.status} />
                      <a href={buildTxExplorerUrl(txChainId(tx), tx.hash)} target="_blank" rel="noopener noreferrer" aria-label="View on explorer" style={{ color: 'var(--muted)' }}>
                        <ExternalLink className="size-4" />
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Sheet>
  )
}
