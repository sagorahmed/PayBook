import { useMemo, useRef, useState } from 'react'
import { Bookmark, SplitSquareHorizontal, Trash2, Upload, UserPlus, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAccount } from 'wagmi'
import { useTokenBalance, type Plan } from '@/hooks/useTransfer'
import { useVault } from '@/hooks/useVault'
import { parsePaymentsCsv } from '@/lib/csv'
import { cleanAmountInput, shortAddress, uid } from '@/lib/format'
import { useNetwork } from '@/hooks/useNetwork'
import { MAX_BATCH, fmt, parseTokenAmount, type TokenInfo } from '@/lib/tokens'
import type { Contact, Payee, Template } from '@/lib/types'
import { Amount } from '@/onchain-money'
import { ConfirmSheet } from './ConfirmSheet'
import { ContactPicker } from './ContactPicker'
import { TemplatesSheet } from './TemplatesSheet'
import { Avatar, EmptyState, Notice, TokenSelect } from './ui'

const toPayee = (c: Contact, amount = ''): Payee => ({ key: uid(), contactId: c.id, name: c.name, address: c.address, amount })

export function MultiSendView() {
  const { vault } = useVault()
  const { tokens: TOKENS, batchAddress, label } = useNetwork()
  const { isConnected } = useAccount()
  const [token, setToken] = useState<TokenInfo>(TOKENS[0])
  const [payees, setPayees] = useState<Payee[]>([])
  const [skipFailures, setSkipFailures] = useState(false)
  const [splitTotal, setSplitTotal] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [tplOpen, setTplOpen] = useState(false)
  const [plan, setPlan] = useState<Plan | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { balance } = useTokenBalance(token)

  const parsedRows = useMemo(() => payees.map((p) => ({ p, amt: parseTokenAmount(p.amount, token) })), [payees, token])
  const total = parsedRows.reduce((s, r) => s + (r.amt?.raw ?? 0n), 0n)
  const missing = parsedRows.filter((r) => !r.amt).length
  const dupes = useMemo(() => {
    const seen = new Set<string>()
    const d = new Set<string>()
    payees.forEach((p) => {
      const k = p.address.toLowerCase()
      if (seen.has(k)) d.add(k)
      seen.add(k)
    })
    return d
  }, [payees])
  const over = balance !== undefined && total > balance
  const tooMany = payees.length > MAX_BATCH
  const ready = isConnected && !!batchAddress && payees.length > 0 && missing === 0 && dupes.size === 0 && !tooMany && !over

  const setAmount = (key: string, value: string) =>
    setPayees((cur) => cur.map((p) => (p.key === key ? { ...p, amount: cleanAmountInput(value, token.decimals) } : p)))

  const addContacts = (ids: string[]) => {
    setPayees((cur) => {
      const kept = cur.filter((p) => !p.contactId || ids.includes(p.contactId))
      const have = new Set(kept.map((p) => p.contactId).filter(Boolean))
      const added = ids
        .filter((id) => !have.has(id))
        .map((id) => vault.contacts.find((c) => c.id === id))
        .filter((c): c is Contact => !!c)
        .map((c) => toPayee(c))
      return [...kept, ...added]
    })
  }

  const addGroup = (groupId: string) => {
    const g = vault.groups.find((x) => x.id === groupId)
    if (!g) return
    const members = g.contactIds.map((id) => vault.contacts.find((c) => c.id === id)).filter((c): c is Contact => !!c)
    setPayees((cur) => {
      const have = new Set(cur.map((p) => p.address.toLowerCase()))
      return [...cur, ...members.filter((c) => !have.has(c.address.toLowerCase())).map((c) => toPayee(c))]
    })
    toast.success(`Added ${g.name}`)
  }

  const loadTemplate = (t: Template) => {
    const tk = TOKENS.find((x) => x.symbol === t.tokenSymbol)
    if (tk) setToken(tk)
    const rows = t.items
      .map((i) => ({ c: vault.contacts.find((c) => c.id === i.contactId), amount: i.amount }))
      .filter((r): r is { c: Contact; amount: string } => !!r.c)
      .map((r) => toPayee(r.c, r.amount))
    setPayees(rows)
    toast.success(`Loaded "${t.name}"`, { description: rows.length < t.items.length ? 'Some deleted contacts were skipped.' : undefined })
  }

  const split = () => {
    const t = parseTokenAmount(splitTotal, token)
    if (!t || payees.length === 0) return
    const { quotient, remainder } = t.divmod(BigInt(payees.length))
    if (quotient.isZero()) {
      toast.error('That total is too small to split between everyone.')
      return
    }
    // Any dust that does not divide evenly goes to the first recipients, one unit each.
    setPayees((cur) =>
      cur.map((p, i) => ({
        ...p,
        amount: Amount.fromRaw(quotient.raw + (BigInt(i) < remainder.raw ? 1n : 0n), token.decimals).toString(),
      })),
    )
  }

  const onCsv = async (file: File) => {
    const { rows, errors } = parsePaymentsCsv(await file.text())
    if (rows.length === 0) {
      toast.error(errors[0] ?? 'No payments found in that file.')
      return
    }
    setPayees((cur) => {
      const next = [...cur]
      for (const r of rows) {
        const idx = next.findIndex((p) => p.address.toLowerCase() === r.address.toLowerCase())
        if (idx >= 0) next[idx] = { ...next[idx], amount: r.amount }
        else {
          const c = vault.contacts.find((x) => x.address.toLowerCase() === r.address.toLowerCase())
          next.push(c ? toPayee(c, r.amount) : { key: uid(), name: r.name ?? shortAddress(r.address), address: r.address, amount: r.amount })
        }
      }
      return next
    })
    toast.success(`Loaded ${rows.length} payment${rows.length === 1 ? '' : 's'} from CSV`, {
      description: errors.length ? `${errors.length} row${errors.length === 1 ? '' : 's'} skipped: ${errors[0]}` : undefined,
    })
  }

  const review = () =>
    setPlan({
      token,
      skipFailures,
      rows: parsedRows.map(({ p, amt }) => ({ contactId: p.contactId, name: p.name, address: p.address, amount: amt!.raw, amountStr: amt!.toString() })),
    })

  return (
    <div className="space-y-4">
      {!batchAddress && (
        <Notice tone="warn">
          The batch contract is not set up on {label} yet, so multi-send is unavailable here. Direct sends still work.
        </Notice>
      )}
      <section className="card space-y-4 p-5">
        <div className="flex items-center justify-between">
          <span className="label !mb-0">Token</span>
          <TokenSelect
            value={token}
            onChange={(t) => {
              setToken(t)
              setPayees((cur) => cur.map((p) => ({ ...p, amount: '' })))
            }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary !min-h-[40px] !px-3.5" onClick={() => setPickerOpen(true)} disabled={vault.contacts.length === 0}>
            <UserPlus className="size-4" /> Contacts
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onCsv(f)
              e.target.value = ''
            }}
          />
          <button className="btn btn-ghost !min-h-[40px] !px-3.5" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> CSV
          </button>
          <button className="btn btn-ghost !min-h-[40px] !px-3.5" onClick={() => setTplOpen(true)}>
            <Bookmark className="size-4" /> Templates
          </button>
        </div>

        {vault.groups.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {vault.groups.map((g) => (
              <button key={g.id} className="chip" onClick={() => addGroup(g.id)}>
                <Users className="size-3" /> {g.name}
              </button>
            ))}
          </div>
        )}
        <p className="-mt-1 text-xs" style={{ color: 'var(--subtle)' }}>CSV columns: address, amount, name (optional).</p>
      </section>

      <section className="card overflow-hidden">
        {payees.length === 0 ? (
          <EmptyState
            icon={<Users className="size-6" />}
            title="No recipients yet"
            body="Pick contacts, tap a group, load a template, or upload a CSV. Everyone gets paid in one transaction."
          />
        ) : (
          <>
            <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {payees.map((p) => {
                const bad = parsedRows.find((r) => r.p.key === p.key)?.amt === null && p.amount !== ''
                const dupe = dupes.has(p.address.toLowerCase())
                return (
                  <li key={p.key} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                    <Avatar name={p.name} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <p className="mono text-[11px]" style={{ color: dupe ? 'var(--danger)' : 'var(--muted)' }}>
                        {dupe ? 'Duplicate address' : shortAddress(p.address)}
                      </p>
                    </div>
                    <input
                      inputMode="decimal"
                      value={p.amount}
                      onChange={(e) => setAmount(p.key, e.target.value)}
                      placeholder="0.00"
                      aria-label={`Amount for ${p.name}`}
                      className="field !w-28 text-right tabular-nums"
                      aria-invalid={bad}
                      style={bad ? { borderColor: 'var(--danger)' } : undefined}
                    />
                    <button className="flex size-9 shrink-0 items-center justify-center rounded-full" aria-label={`Remove ${p.name}`} onClick={() => setPayees((c) => c.filter((x) => x.key !== p.key))}>
                      <X className="size-4" style={{ color: 'var(--subtle)' }} />
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="space-y-3 p-4" style={{ borderTop: '1px solid var(--border)' }}>
              <label className="label !mb-0" htmlFor="split">Split equally</label>
              <div className="flex gap-2">
                <input id="split" inputMode="decimal" className="field tabular-nums" placeholder={`Total ${token.symbol}`} value={splitTotal} onChange={(e) => setSplitTotal(cleanAmountInput(e.target.value, token.decimals))} />
                <button className="btn btn-ghost shrink-0" onClick={split} disabled={!parseTokenAmount(splitTotal, token)}>
                  <SplitSquareHorizontal className="size-4" /> Split
                </button>
                <button className="btn btn-ghost shrink-0 !px-3" aria-label="Clear all recipients" onClick={() => setPayees([])}>
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {payees.length > 0 && (
        <section className="card space-y-3 p-5">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt style={{ color: 'var(--muted)' }}>Recipients</dt>
              <dd className="tabular-nums">{payees.length}</dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt style={{ color: 'var(--muted)' }}>Total</dt>
              <dd className="display text-2xl font-bold tabular-nums">
                {fmt(total, token)} <span className="text-sm font-medium" style={{ color: 'var(--subtle)' }}>{token.symbol}</span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt style={{ color: 'var(--muted)' }}>Your balance</dt>
              <dd className="tabular-nums">{balance !== undefined ? fmt(balance, token) : '--'}</dd>
            </div>
          </dl>

          <label className="inner flex min-h-[44px] cursor-pointer items-start gap-3 p-3 text-sm">
            <input type="checkbox" className="mt-0.5 size-4" checked={skipFailures} onChange={(e) => setSkipFailures(e.target.checked)} />
            <span>
              <span className="font-semibold">Skip failed recipients</span>
              <span className="block text-xs" style={{ color: 'var(--muted)' }}>
                If one address is blocked, still pay everyone else. Skipped amounts stay in your wallet.
              </span>
            </span>
          </label>

          {over && <Notice tone="error">Total is more than your {token.symbol} balance.</Notice>}
          {dupes.size > 0 && <Notice tone="error">Remove duplicate addresses before sending.</Notice>}
          {tooMany && <Notice tone="error">A batch holds at most {MAX_BATCH} recipients.</Notice>}

          <button className="btn btn-primary w-full" disabled={!ready} onClick={review}>
            {missing > 0 ? `Enter ${missing} missing amount${missing === 1 ? '' : 's'}` : 'Review batch'}
          </button>
        </section>
      )}

      <ContactPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        mode="multi"
        selectedIds={payees.map((p) => p.contactId).filter((x): x is string => !!x)}
        onPick={addContacts}
      />
      <TemplatesSheet open={tplOpen} onClose={() => setTplOpen(false)} payees={payees} token={token} onLoad={loadTemplate} />
      <ConfirmSheet plan={plan} onClose={() => setPlan(null)} onFinished={() => setPayees((c) => c.map((p) => ({ ...p, amount: '' })))} />
    </div>
  )
}
