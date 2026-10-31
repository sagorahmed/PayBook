import { useState } from 'react'
import { toast } from 'sonner'
import { useVault } from '@/hooks/useVault'
import { TAGS, type Contact, type Tag } from '@/lib/types'
import { Notice, Sheet } from './ui'

interface Props {
  open: boolean
  onClose: () => void
  contact?: Contact
}

export function ContactForm({ open, onClose, contact }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={contact ? 'Edit contact' : 'New contact'}>
      {/* Mounted only while the sheet is open, so fields start fresh each time. */}
      <FormBody contact={contact} onClose={onClose} />
    </Sheet>
  )
}

function FormBody({ contact, onClose }: { contact?: Contact; onClose: () => void }) {
  const { addContact, updateContact } = useVault()
  const [name, setName] = useState(contact?.name ?? '')
  const [address, setAddress] = useState(contact?.address ?? '')
  const [notes, setNotes] = useState(contact?.notes ?? '')
  const [tags, setTags] = useState<Tag[]>(contact?.tags ?? [])
  const [error, setError] = useState<string | null>(null)

  const toggleTag = (t: Tag) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const input = { name, address, notes, tags }
    const err = contact ? updateContact(contact.id, input) : addContact(input)
    if (err) return setError(err)
    toast.success(contact ? 'Contact updated' : 'Contact saved')
    onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="c-name">Nickname</label>
        <input id="c-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alice" maxLength={40} autoFocus />
      </div>
      <div>
        <label className="label" htmlFor="c-addr">Wallet address</label>
        <input
          id="c-addr"
          className="field mono"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value)
            setError(null)
          }}
          placeholder="0x..."
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>
      <div>
        <label className="label" htmlFor="c-notes">Notes</label>
        <textarea id="c-notes" className="field min-h-[80px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Rent, invoice 114, birthday..." maxLength={300} />
      </div>
      <div>
        <span className="label">Tags</span>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((t) => (
            <button key={t} type="button" className="chip" data-active={tags.includes(t)} onClick={() => toggleTag(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <button type="submit" className="btn btn-primary w-full">
        {contact ? 'Save changes' : 'Save contact'}
      </button>
    </form>
  )
}
