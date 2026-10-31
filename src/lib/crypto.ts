import type { Vault } from './types'
import { EMPTY_VAULT } from './types'

/**
 * The vault is encrypted at rest with AES-GCM. The key is derived from a wallet
 * signature over a fixed message, so only the wallet owner can unlock it.
 */
export const UNLOCK_MESSAGE =
  'Unlock PayBook\n\nSign to decrypt your saved contacts on this device. This does not send a transaction or cost gas.'

const storageKey = (address: string) => `paybook:vault:v1:${address.toLowerCase()}`
const sessionKeyName = (address: string) => `paybook:session-key:${address.toLowerCase()}`

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const fromB64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

export async function deriveKeyBytes(signature: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(signature))
  return new Uint8Array(digest)
}

const importKey = (bytes: Uint8Array) =>
  crypto.subtle.importKey('raw', bytes as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt'])

export function hasStoredVault(address: string): boolean {
  return localStorage.getItem(storageKey(address)) !== null
}

export function readSessionKey(address: string): Uint8Array | null {
  const raw = sessionStorage.getItem(sessionKeyName(address))
  return raw ? fromB64(raw) : null
}

export function writeSessionKey(address: string, bytes: Uint8Array) {
  sessionStorage.setItem(sessionKeyName(address), toB64(bytes))
}

export function clearSessionKey(address: string) {
  sessionStorage.removeItem(sessionKeyName(address))
}

export async function saveVault(address: string, keyBytes: Uint8Array, vault: Vault): Promise<void> {
  const key = await importKey(keyBytes)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(vault))),
  )
  localStorage.setItem(storageKey(address), JSON.stringify({ iv: toB64(iv), data: toB64(data) }))
}

/** Returns an empty vault when nothing is stored. Throws when the key cannot decrypt the stored data. */
export async function loadVault(address: string, keyBytes: Uint8Array): Promise<Vault> {
  const stored = localStorage.getItem(storageKey(address))
  if (!stored) return EMPTY_VAULT
  const { iv, data } = JSON.parse(stored) as { iv: string; data: string }
  const key = await importKey(keyBytes)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) as BufferSource }, key, fromB64(data))
  const parsed = JSON.parse(new TextDecoder().decode(plain)) as Partial<Vault>
  return {
    version: 1,
    contacts: parsed.contacts ?? [],
    groups: parsed.groups ?? [],
    templates: parsed.templates ?? [],
    history: parsed.history ?? [],
  }
}
