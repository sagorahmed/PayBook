import { useState } from 'react'
import { BookmarkPlus, Play, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useVault } from '@/hooks/useVault'
import { useNetwork } from '@/hooks/useNetwork'
import type { TokenInfo } from '@/lib/tokens'
import type { Payee, Template } from '@/lib/types'
import { EmptyState, Sheet } from './ui'

interface Props {
  open: boolean
  onClose: () => void
  payees: Payee[]
  token: TokenInfo
  onLoad: (tpl: Template) => void
}

export function TemplatesSheet({ open, onClose, payees, token, onLoad }: Props) {
  const { vault, saveTemplate, deleteTemplate } = useVault()
  const { tokens: TOKENS } = useNetwork()
  const [name, setName] = useState('')
  const saveable = payees.filter((p) => p.contactId && p.amount)
  const skippedCount = payees.length - saveable.length

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || saveable.length === 0) return
    saveTemplate({
      name: name.trim(),
      tokenSymbol: token.symbol,
      items: saveable.map((p) => ({ contactId: p.contactId!, amount: p.amount })),
    })
    toast.success('Template saved')
    setName('')
  }

  return (
    <Sheet open={open} onClose={onClose} title="Templates">
      <div className="space-y-5">
        <form onSubmit={save} className="space-y-2">
          <label className="label" htmlFor="tpl-name">Save current payments as a template</label>
          <div className="flex gap-2">
            <input id="tpl-name" className="field" placeholder="Monthly payroll" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
            <button className="btn btn-primary shrink-0" disabled={!name.trim() || saveable.length === 0}>
              <BookmarkPlus className="size-4" /> Save
            </button>
          </div>
          {saveable.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Add recipients with amounts to save a template.</p>
          ) : skippedCount > 0 ? (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {skippedCount} recipient{skippedCount === 1 ? '' : 's'} without a saved contact or amount will not be included.
            </p>
          ) : null}
        </form>

        {vault.templates.length === 0 ? (
          <EmptyState icon={<BookmarkPlus className="size-6" />} title="No templates yet" body="Save a recurring payment once, then run it again with one tap." />
        ) : (
          <ul className="space-y-2">
            {vault.templates.map((t) => (
              <li key={t.id} className="inner flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{t.name}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {t.items.length} recipient{t.items.length === 1 ? '' : 's'} · {t.tokenSymbol}
                  </p>
                </div>
                <button
                  className="btn btn-ghost !px-3"
                  disabled={!TOKENS.some((x) => x.symbol === t.tokenSymbol)}
                  onClick={() => {
                    onLoad(t)
                    onClose()
                  }}
                >
                  <Play className="size-4" /> Load
                </button>
                <button className="btn btn-danger !px-3" aria-label={`Delete ${t.name}`} onClick={() => deleteTemplate(t.id)}>
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  )
}
