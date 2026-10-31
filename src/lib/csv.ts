import { TAGS, type Address, type Contact, type Tag } from './types'
import { normalizeAddress, uid } from './format'

/** Minimal RFC-4180 style parser: quoted fields, escaped quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const src = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      cell = ''
      if (row.some((c) => c.trim() !== '')) rows.push(row)
      row = []
    } else cell += ch
  }
  row.push(cell)
  if (row.some((c) => c.trim() !== '')) rows.push(row)
  return rows
}

const esc = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

/** Guards spreadsheet formula injection when a user opens the exported file. */
const safe = (v: string) => (/^[=+\-@]/.test(v) ? `'${v}` : v)

export function contactsToCsv(contacts: Contact[]): string {
  const head = 'name,address,notes,tags,favorite'
  const lines = contacts.map((c) =>
    [c.name, c.address, c.notes, c.tags.join('|'), c.favorite ? 'yes' : 'no'].map((v) => esc(safe(v))).join(','),
  )
  return [head, ...lines].join('\n')
}

export interface ContactCsvResult {
  valid: Omit<Contact, 'id' | 'createdAt'>[]
  errors: string[]
}

export function parseContactsCsv(text: string): ContactCsvResult {
  const rows = parseCsv(text)
  const errors: string[] = []
  const valid: ContactCsvResult['valid'] = []
  if (rows.length === 0) return { valid, errors: ['The file is empty.'] }

  const header = rows[0].map((h) => h.trim().toLowerCase())
  const hasHeader = header.includes('address') || header.includes('name')
  const col = (name: string, fallback: number) => (hasHeader ? header.indexOf(name) : fallback)
  const iName = col('name', 0)
  const iAddr = col('address', 1)
  const iNotes = col('notes', 2)
  const iTags = col('tags', 3)
  const iFav = col('favorite', 4)
  if (iAddr < 0) return { valid, errors: ['No "address" column found.'] }

  rows.slice(hasHeader ? 1 : 0).forEach((r, idx) => {
    const line = idx + (hasHeader ? 2 : 1)
    const address = normalizeAddress(r[iAddr] ?? '')
    if (!address) {
      errors.push(`Line ${line}: invalid address`)
      return
    }
    const name = (iName >= 0 ? r[iName] : '')?.trim() || `${address.slice(0, 6)}...${address.slice(-4)}`
    const tags = ((iTags >= 0 ? r[iTags] : '') ?? '')
      .split(/[|;]/)
      .map((t) => t.trim())
      .filter((t): t is Tag => (TAGS as readonly string[]).includes(t))
    valid.push({
      name: name.replace(/^'/, ''),
      address,
      notes: ((iNotes >= 0 ? r[iNotes] : '') ?? '').trim().replace(/^'/, ''),
      tags,
      favorite: /^(yes|true|1)$/i.test(((iFav >= 0 ? r[iFav] : '') ?? '').trim()),
    })
  })
  return { valid, errors }
}

export interface PaymentCsvRow {
  address: Address
  amount: string
  name?: string
}

/** Payment CSV: address,amount[,name]. A header row is optional. */
export function parsePaymentsCsv(text: string): { rows: PaymentCsvRow[]; errors: string[] } {
  const parsed = parseCsv(text)
  const rows: PaymentCsvRow[] = []
  const errors: string[] = []
  const header = parsed[0]?.map((h) => h.trim().toLowerCase()) ?? []
  const hasHeader = header.includes('address') || header.includes('amount')
  const iAddr = hasHeader ? header.indexOf('address') : 0
  const iAmt = hasHeader ? header.indexOf('amount') : 1
  const iName = hasHeader ? header.indexOf('name') : 2
  if (iAddr < 0 || iAmt < 0) return { rows, errors: ['Needs "address" and "amount" columns.'] }

  parsed.slice(hasHeader ? 1 : 0).forEach((r, idx) => {
    const line = idx + (hasHeader ? 2 : 1)
    const address = normalizeAddress(r[iAddr] ?? '')
    const amount = (r[iAmt] ?? '').trim()
    if (!address) errors.push(`Line ${line}: invalid address`)
    else if (!/^\d*\.?\d+$/.test(amount) || Number(amount) <= 0) errors.push(`Line ${line}: invalid amount "${amount}"`)
    else rows.push({ address, amount, name: iName >= 0 ? r[iName]?.trim() || undefined : undefined })
  })
  return { rows, errors }
}

export const withIds = (c: ContactCsvResult['valid'][number]): Contact => ({ ...c, id: uid(), createdAt: Date.now() })
