import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import {
  UNLOCK_MESSAGE,
  clearSessionKey,
  deriveKeyBytes,
  hasStoredVault,
  loadVault,
  readSessionKey,
  saveVault,
  writeSessionKey,
} from '@/lib/crypto'
import { normalizeAddress, uid } from '@/lib/format'
import { EMPTY_VAULT, type Contact, type Group, type Tag, type Template, type TxRecord, type TxStatus, type Vault } from '@/lib/types'

export interface ContactInput {
  name: string
  address: string
  notes: string
  tags: Tag[]
}

type Status = 'locked' | 'unlocking' | 'ready'

interface VaultApi {
  status: Status
  error: string | null
  hasVault: boolean
  vault: Vault
  unlock: () => Promise<void>
  lock: () => void
  addContact: (input: ContactInput) => string | null
  updateContact: (id: string, input: ContactInput) => string | null
  deleteContact: (id: string) => void
  toggleFavorite: (id: string) => void
  importContacts: (list: Omit<Contact, 'id' | 'createdAt'>[]) => { added: number; skipped: number }
  saveGroup: (group: { id?: string; name: string; contactIds: string[] }) => void
  deleteGroup: (id: string) => void
  saveTemplate: (tpl: Omit<Template, 'id' | 'createdAt'>) => void
  deleteTemplate: (id: string) => void
  recordTx: (tx: TxRecord) => void
  setTxStatus: (hash: string, status: TxStatus, skipped?: string[]) => void
}

const Ctx = createContext<VaultApi | null>(null)

export function useVault(): VaultApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('useVault must be used inside VaultProvider')
  return v
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [status, setStatus] = useState<Status>('locked')
  const [error, setError] = useState<string | null>(null)
  const [vault, setVaultState] = useState<Vault>(EMPTY_VAULT)
  const [hasVault, setHasVault] = useState(false)
  const keyRef = useRef<Uint8Array | null>(null)
  const vaultRef = useRef<Vault>(EMPTY_VAULT)
  const loadedFor = useRef<string | null>(null)

  const setVault = useCallback((fn: (v: Vault) => Vault) => {
    const next = fn(vaultRef.current)
    vaultRef.current = next
    setVaultState(next)
  }, [])

  const open = useCallback(
    async (addr: string, key: Uint8Array) => {
      const loaded = await loadVault(addr, key)
      keyRef.current = key
      vaultRef.current = loaded
      loadedFor.current = addr.toLowerCase()
      setVaultState(loaded)
      setStatus('ready')
      setError(null)
    },
    [],
  )

  // Reset on wallet change, then try to resume from a key cached for this browser tab.
  useEffect(() => {
    keyRef.current = null
    loadedFor.current = null
    vaultRef.current = EMPTY_VAULT
    setVaultState(EMPTY_VAULT)
    setStatus('locked')
    setError(null)
    if (!address) {
      setHasVault(false)
      return
    }
    setHasVault(hasStoredVault(address))
    const cached = readSessionKey(address)
    if (cached) {
      open(address, cached).catch(() => clearSessionKey(address))
    }
  }, [address, open])

  // Persist every change, encrypted.
  useEffect(() => {
    if (status !== 'ready' || !address || !keyRef.current) return
    if (loadedFor.current !== address.toLowerCase()) return
    saveVault(address, keyRef.current, vault)
      .then(() => setHasVault(true))
      .catch(() => setError('Could not save to this device.'))
  }, [vault, status, address])

  const unlock = useCallback(async () => {
    if (!address) return
    setStatus('unlocking')
    setError(null)
    try {
      const signature = await signMessageAsync({ message: UNLOCK_MESSAGE })
      const key = await deriveKeyBytes(signature)
      await open(address, key)
      writeSessionKey(address, key)
    } catch (e) {
      setStatus('locked')
      const msg = (e as { message?: string })?.message?.toLowerCase() ?? ''
      setError(
        msg.includes('rejected') || msg.includes('denied')
          ? 'Signature cancelled. Sign the message to unlock your contacts.'
          : 'Could not unlock. This wallet may sign differently each time, so the saved data cannot be decrypted.',
      )
    }
  }, [address, open, signMessageAsync])

  const lock = useCallback(() => {
    if (address) clearSessionKey(address)
    keyRef.current = null
    setStatus('locked')
    setVaultState(EMPTY_VAULT)
    vaultRef.current = EMPTY_VAULT
  }, [address])

  const validate = (input: ContactInput, ignoreId?: string): string | null => {
    const name = input.name.trim()
    if (!name) return 'Enter a nickname.'
    const addr = normalizeAddress(input.address)
    if (!addr) return 'That is not a valid wallet address.'
    const dupe = vaultRef.current.contacts.find((c) => c.address.toLowerCase() === addr.toLowerCase() && c.id !== ignoreId)
    if (dupe) return `Already saved as "${dupe.name}".`
    return null
  }

  const addContact = useCallback((input: ContactInput) => {
    const err = validate(input)
    if (err) return err
    const contact: Contact = {
      id: uid(),
      name: input.name.trim(),
      address: normalizeAddress(input.address)!,
      notes: input.notes.trim(),
      tags: input.tags,
      favorite: false,
      createdAt: Date.now(),
    }
    setVault((v) => ({ ...v, contacts: [contact, ...v.contacts] }))
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setVault])

  const updateContact = useCallback((id: string, input: ContactInput) => {
    const err = validate(input, id)
    if (err) return err
    setVault((v) => ({
      ...v,
      contacts: v.contacts.map((c) =>
        c.id === id
          ? { ...c, name: input.name.trim(), address: normalizeAddress(input.address)!, notes: input.notes.trim(), tags: input.tags }
          : c,
      ),
    }))
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setVault])

  const deleteContact = useCallback(
    (id: string) =>
      setVault((v) => ({
        ...v,
        contacts: v.contacts.filter((c) => c.id !== id),
        groups: v.groups.map((g) => ({ ...g, contactIds: g.contactIds.filter((x) => x !== id) })),
        templates: v.templates.map((t) => ({ ...t, items: t.items.filter((i) => i.contactId !== id) })),
      })),
    [setVault],
  )

  const toggleFavorite = useCallback(
    (id: string) => setVault((v) => ({ ...v, contacts: v.contacts.map((c) => (c.id === id ? { ...c, favorite: !c.favorite } : c)) })),
    [setVault],
  )

  const importContacts = useCallback(
    (list: Omit<Contact, 'id' | 'createdAt'>[]) => {
      const seen = new Set(vaultRef.current.contacts.map((c) => c.address.toLowerCase()))
      const fresh: Contact[] = []
      let skipped = 0
      for (const item of list) {
        const key = item.address.toLowerCase()
        if (seen.has(key)) {
          skipped++
          continue
        }
        seen.add(key)
        fresh.push({ ...item, id: uid(), createdAt: Date.now() })
      }
      if (fresh.length) setVault((v) => ({ ...v, contacts: [...fresh, ...v.contacts] }))
      return { added: fresh.length, skipped }
    },
    [setVault],
  )

  const saveGroup = useCallback(
    (g: { id?: string; name: string; contactIds: string[] }) =>
      setVault((v) => {
        const group: Group = { id: g.id ?? uid(), name: g.name.trim(), contactIds: g.contactIds }
        return { ...v, groups: g.id ? v.groups.map((x) => (x.id === g.id ? group : x)) : [...v.groups, group] }
      }),
    [setVault],
  )

  const deleteGroup = useCallback((id: string) => setVault((v) => ({ ...v, groups: v.groups.filter((g) => g.id !== id) })), [setVault])

  const saveTemplate = useCallback(
    (t: Omit<Template, 'id' | 'createdAt'>) =>
      setVault((v) => ({ ...v, templates: [{ ...t, id: uid(), createdAt: Date.now() }, ...v.templates] })),
    [setVault],
  )

  const deleteTemplate = useCallback(
    (id: string) => setVault((v) => ({ ...v, templates: v.templates.filter((t) => t.id !== id) })),
    [setVault],
  )

  const recordTx = useCallback((tx: TxRecord) => setVault((v) => ({ ...v, history: [tx, ...v.history] })), [setVault])

  const setTxStatus = useCallback(
    (hash: string, s: TxStatus, skipped?: string[]) =>
      setVault((v) => ({
        ...v,
        history: v.history.map((t) => (t.hash.toLowerCase() === hash.toLowerCase() ? { ...t, status: s, ...(skipped ? { skipped } : {}) } : t)),
      })),
    [setVault],
  )

  const api = useMemo<VaultApi>(
    () => ({
      status,
      error,
      hasVault,
      vault,
      unlock,
      lock,
      addContact,
      updateContact,
      deleteContact,
      toggleFavorite,
      importContacts,
      saveGroup,
      deleteGroup,
      saveTemplate,
      deleteTemplate,
      recordTx,
      setTxStatus,
    }),
    [status, error, hasVault, vault, unlock, lock, addContact, updateContact, deleteContact, toggleFavorite, importContacts, saveGroup, deleteGroup, saveTemplate, deleteTemplate, recordTx, setTxStatus],
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
