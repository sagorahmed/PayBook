import { useState } from 'react'
import { Pencil, Plus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useVault } from '@/hooks/useVault'
import type { Group } from '@/lib/types'
import { Avatar, EmptyState, Sheet } from './ui'

export function GroupsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { vault, saveGroup, deleteGroup } = useVault()
  const [editing, setEditing] = useState<Group | 'new' | null>(null)
  const [name, setName] = useState('')
  const [ids, setIds] = useState<string[]>([])

  const start = (g: Group | 'new') => {
    setEditing(g)
    setName(g === 'new' ? '' : g.name)
    setIds(g === 'new' ? [] : g.contactIds)
  }
  const close = () => {
    setEditing(null)
    onClose()
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || ids.length === 0) return
    saveGroup({ id: editing && editing !== 'new' ? editing.id : undefined, name, contactIds: ids })
    toast.success('Group saved')
    setEditing(null)
  }

  return (
    <Sheet open={open} onClose={close} title={editing ? (editing === 'new' ? 'New group' : 'Edit group') : 'Groups'}>
      {editing ? (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="g-name">Group name</label>
            <input id="g-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Team" maxLength={30} autoFocus />
          </div>
          <div>
            <span className="label">Members ({ids.length})</span>
            {vault.contacts.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Save some contacts first.</p>
            ) : (
              <ul className="max-h-64 space-y-1 overflow-y-auto">
                {vault.contacts.map((c) => (
                  <li key={c.id}>
                    <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-[var(--surface-muted)]">
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={ids.includes(c.id)}
                        onChange={() => setIds((cur) => (cur.includes(c.id) ? cur.filter((x) => x !== c.id) : [...cur, c.id]))}
                      />
                      <Avatar name={c.name} size={32} />
                      <span className="text-sm font-medium">{c.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost flex-1" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={!name.trim() || ids.length === 0}>Save group</button>
          </div>
        </form>
      ) : vault.groups.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" />}
          title="No groups yet"
          body="Group contacts like your team, then pay all of them in one tap from Multi-send."
          action={
            <button className="btn btn-primary" onClick={() => start('new')} disabled={vault.contacts.length === 0}>
              <Plus className="size-4" /> Create group
            </button>
          }
        />
      ) : (
        <div className="space-y-2">
          {vault.groups.map((g) => (
            <div key={g.id} className="inner flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{g.name}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{g.contactIds.length} members</p>
              </div>
              <button className="btn btn-ghost !px-3" aria-label={`Edit ${g.name}`} onClick={() => start(g)}>
                <Pencil className="size-4" />
              </button>
              <button
                className="btn btn-danger !px-3"
                aria-label={`Delete ${g.name}`}
                onClick={() => {
                  deleteGroup(g.id)
                  toast.success('Group deleted')
                }}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <button className="btn btn-ghost w-full" onClick={() => start('new')}>
            <Plus className="size-4" /> New group
          </button>
        </div>
      )}
    </Sheet>
  )
}
