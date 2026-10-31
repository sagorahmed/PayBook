export type Address = `0x${string}`

export const TAGS = ['Family', 'Work', 'Friends'] as const
export type Tag = (typeof TAGS)[number]

export interface Contact {
  id: string
  name: string
  address: Address
  notes: string
  tags: Tag[]
  favorite: boolean
  createdAt: number
}

export interface Group {
  id: string
  name: string
  contactIds: string[]
}

export interface TemplateItem {
  contactId: string
  /** Decimal string in the token's own units, e.g. "12.5". */
  amount: string
}

export interface Template {
  id: string
  name: string
  tokenSymbol: string
  items: TemplateItem[]
  createdAt: number
}

export type TxStatus = 'pending' | 'success' | 'failed'

export interface TxItem {
  contactId?: string
  name: string
  address: Address
  /** Decimal string in the token's own units. */
  amount: string
}

export interface TxRecord {
  hash: Address
  kind: 'send' | 'batch'
  /** Chain the payment was made on. Missing on older records, which were all testnet. */
  chainId?: number
  tokenSymbol: string
  createdAt: number
  status: TxStatus
  /** Addresses the contract skipped in a best-effort batch (funds stayed with the sender). */
  skipped?: string[]
  items: TxItem[]
  total: string
}

export interface Vault {
  version: 1
  contacts: Contact[]
  groups: Group[]
  templates: Template[]
  history: TxRecord[]
}

export const EMPTY_VAULT: Vault = { version: 1, contacts: [], groups: [], templates: [], history: [] }

/** A payee in the multi-send builder. A contactId is absent for CSV-only recipients. */
export interface Payee {
  key: string
  contactId?: string
  name: string
  address: Address
  amount: string
}
