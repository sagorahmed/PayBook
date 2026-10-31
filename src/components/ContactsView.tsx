import { useMemo, useRef, useState } from 'react'
import { Download, Plus, Search, Upload, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useVault } from '@/hooks/useVault'
import { contactsToCsv, parseContactsCsv } from '@/lib/csv'
import { downloadText } from '@/lib/format'
import { TAGS, type Contact } from '@/lib/types'
import { ContactDetail } from './ContactDetail'
import { ContactForm } from './ContactForm'
import { GroupsSheet } from './GroupsSheet'
import { Avatar, EmptyState, FavStar } from './ui'

type Filter = 'all' | 'favorites' | (typeof TAGS)[number]

export function ContactsView({ onSend }: { onSend: (c: Contact) => void }) {
  const { vault, toggleFavorite, importContacts } = useVault()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [groupId, setGroupId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | undefined>()
  const [detail, setDetail] = useState<Contact | null>(null)
  const [groupsOpen, setGroupsOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const members = groupId ? new Set(vault.groups.find((g) => g.id === groupId)?.contactIds ?? []) : null
    return vault.contacts
      .filter((c) => {
        if (members && !members.has(c.id)) return false
        if (filter === 'favorites' && !c.favorite) return false
        if (filter !== 'all' && filter !== 'favorites' && !c.tags.includes(filter)) return false
        if (!q) return true
        return [c.name, c.address, c.notes, ...c.tags].some((f) => f.toLowerCase().includes(q))
      })
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name))
  }, [vault.contacts, vault.groups, query, filter, groupId])

  const openNew = () => {
    setEditing(undefined)
    setFormOpen(true)
  }

  const onImport = async (file: File) => {
    const { valid, errors } = parseContactsCsv(await file.text())
    if (valid.length === 0) {
      toast.error(errors[0] ?? 'No contacts found in that file.')
      return
    }
    const { added, skipped } = importContacts(valid)
    toast.success(`Imported ${added} contact${added === 1 ? '' : 's'}`, {
      description: [skipped && `${skipped} duplicate${skipped === 1 ? '' : 's'} skipped`, errors.length && `${errors.length} invalid row${errors.length === 1 ? '' : 's'} ignored`]
        .filter(Boolean)
        .join(', ') || undefined,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2" style={{ color: 'var(--subtle)' }} />
          <input className="field !pl-10" placeholder="Search name, address, notes" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search contacts" />
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus className="size-4" /> <span className="hidden sm:inline">Add</span>
        </button>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {(['all', 'favorites', ...TAGS] as Filter[]).map((f) => (
          <button key={f} className="chip shrink-0 capitalize" data-active={filter === f} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
        {vault.groups.map((g) => (
          <button key={g.id} className="chip shrink-0" data-active={groupId === g.id} onClick={() => setGroupId(groupId === g.id ? null : g.id)}>
            <Users className="size-3" /> {g.name}
          </button>
        ))}
        <button className="chip shrink-0" onClick={() => setGroupsOpen(true)}>
          Manage groups
        </button>
      </div>

      <section className="card overflow-hidden">
        {vault.contacts.length === 0 ? (
          <EmptyState
            icon={<UserPlus className="size-6" />}
            title="No contacts yet"
            body="Save a wallet address with a nickname so you never paste one again. You can also import a CSV."
            action={
              <button className="btn btn-primary" onClick={openNew}>
                <Plus className="size-4" /> Add your first contact
              </button>
            }
          />
        ) : list.length === 0 ? (
          <EmptyState icon={<Search className="size-6" />} title="No matches" body="Try a different search or clear the filters." />
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {list.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setDetail(c)}>
                  <Avatar name={c.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    <p className="mono truncate text-xs" style={{ color: 'var(--muted)' }}>
                      {c.address.slice(0, 10)}...{c.address.slice(-6)}
                    </p>
                    {c.tags.length > 0 && (
                      <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--subtle)' }}>{c.tags.join(' · ')}</p>
                    )}
                  </div>
                </button>
                <button className="flex size-11 items-center justify-center" onClick={() => toggleFavorite(c.id)} aria-label={c.favorite ? `Unfavorite ${c.name}` : `Favorite ${c.name}`}>
                  <FavStar active={c.favorite} />
                </button>
                <button className="btn btn-ghost !px-3.5" onClick={() => onSend(c)}>
                  Send
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: 'var(--muted)' }}>
        <span>{vault.contacts.length} saved · encrypted on this device</span>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onImport(f)
              e.target.value = ''
            }}
          />
          <button className="btn btn-ghost !min-h-[36px] !px-3 !text-xs" onClick={() => fileRef.current?.click()}>
            <Upload className="size-3.5" /> Import CSV
          </button>
          <button
            className="btn btn-ghost !min-h-[36px] !px-3 !text-xs"
            disabled={vault.contacts.length === 0}
            onClick={() => downloadText('paybook-contacts.csv', contactsToCsv(vault.contacts))}
          >
            <Download className="size-3.5" /> Export
          </button>
        </div>
      </div>

      <ContactForm open={formOpen} onClose={() => setFormOpen(false)} contact={editing} />
      <ContactDetail
        contact={detail}
        onClose={() => setDetail(null)}
        onEdit={(c) => {
          setDetail(null)
          setEditing(c)
          setFormOpen(true)
        }}
        onSend={(c) => {
          setDetail(null)
          onSend(c)
        }}
      />
      <GroupsSheet open={groupsOpen} onClose={() => setGroupsOpen(false)} />
    </div>
  )
}
