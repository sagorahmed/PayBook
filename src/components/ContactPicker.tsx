import { useEffect, useMemo, useState } from 'react'
import { Check, Search, UserPlus, Users } from 'lucide-react'
import { useVault } from '@/hooks/useVault'
import { Avatar, EmptyState, FavStar, Sheet } from './ui'

interface Props {
  open: boolean
  onClose: () => void
  mode: 'single' | 'multi'
  /** Contacts already chosen (multi mode). */
  selectedIds?: string[]
  onPick: (ids: string[]) => void
  title?: string
}

export function ContactPicker({ open, onClose, mode, selectedIds = [], onPick, title }: Props) {
  const { vault } = useVault()
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<string[]>(selectedIds)

  useEffect(() => {
    if (open) {
      setPicked(selectedIds)
      setQuery('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return vault.contacts
      .filter((c) => !q || [c.name, c.address, ...c.tags].some((f) => f.toLowerCase().includes(q)))
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name))
  }, [vault.contacts, query])

  const toggle = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  const addGroup = (ids: string[]) => setPicked((cur) => Array.from(new Set([...cur, ...ids])))

  return (
    <Sheet open={open} onClose={onClose} title={title ?? (mode === 'single' ? 'Choose a contact' : 'Choose recipients')}>
      {vault.contacts.length === 0 ? (
        <EmptyState icon={<UserPlus className="size-6" />} title="No contacts yet" body="Add contacts in the Contacts tab, then come back to pick who to pay." />
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2" style={{ color: 'var(--subtle)' }} />
            <input className="field !pl-10" placeholder="Search contacts" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search contacts" />
          </div>

          {mode === 'multi' && vault.groups.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {vault.groups.map((g) => (
                <button key={g.id} className="chip" onClick={() => addGroup(g.contactIds)}>
                  <Users className="size-3" /> Add {g.name} ({g.contactIds.length})
                </button>
              ))}
            </div>
          )}

          <ul className="max-h-[48dvh] space-y-1 overflow-y-auto">
            {list.map((c) => {
              const on = picked.includes(c.id)
              return (
                <li key={c.id}>
                  <button
                    className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-2 py-1.5 text-left transition-colors hover:bg-[var(--surface-muted)]"
                    onClick={() => (mode === 'single' ? onPick([c.id]) : toggle(c.id))}
                    aria-pressed={mode === 'multi' ? on : undefined}
                  >
                    <Avatar name={c.name} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{c.name}</p>
                      <p className="mono truncate text-[11px]" style={{ color: 'var(--muted)' }}>
                        {c.address.slice(0, 8)}...{c.address.slice(-6)}
                      </p>
                    </div>
                    {c.favorite && <FavStar active />}
                    {mode === 'multi' && (
                      <span
                        className="flex size-6 items-center justify-center rounded-full"
                        style={{ background: on ? 'var(--accent)' : 'transparent', border: '1px solid var(--border-strong)', color: 'var(--accent-ink)' }}
                      >
                        {on && <Check className="size-3.5" />}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
            {list.length === 0 && <li className="py-6 text-center text-sm" style={{ color: 'var(--muted)' }}>No matches.</li>}
          </ul>

          {mode === 'multi' && (
            <button
              className="btn btn-primary w-full"
              onClick={() => {
                onPick(picked)
                onClose()
              }}
            >
              {picked.length === 0 ? 'Clear selection' : `Use ${picked.length} recipient${picked.length === 1 ? '' : 's'}`}
            </button>
          )}
        </div>
      )}
    </Sheet>
  )
}
