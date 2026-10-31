import { useMemo, useState } from 'react'
import { ChevronRight, UserRound } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useTokenBalance, type Plan } from '@/hooks/useTransfer'
import { useVault } from '@/hooks/useVault'
import { cleanAmountInput } from '@/lib/format'
import { Amount } from '@/onchain-money'
import { useNetwork } from '@/hooks/useNetwork'
import { fmt, parseTokenAmount, type TokenInfo } from '@/lib/tokens'
import { ConfirmSheet } from './ConfirmSheet'
import { ContactPicker } from './ContactPicker'
import { AddressLink, Avatar, EmptyState, Notice, TokenSelect } from './ui'

const FEE_RESERVE = 50_000n // 0.05 USDC kept back by "Max" for network fees

export function SendView({ initialContactId }: { initialContactId: string | null }) {
  const { vault } = useVault()
  const { tokens: TOKENS, batchAddress: BATCH_ADDRESS } = useNetwork()
  const { isConnected } = useAccount()
  const [contactId, setContactId] = useState<string | null>(initialContactId)
  const [token, setToken] = useState<TokenInfo>(TOKENS[0])
  const [amount, setAmount] = useState('')
  const [viaContract, setViaContract] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [plan, setPlan] = useState<Plan | null>(null)
  const { balance } = useTokenBalance(token)

  const contact = useMemo(() => vault.contacts.find((c) => c.id === contactId) ?? null, [vault.contacts, contactId])
  const parsed = parseTokenAmount(amount, token)
  const over = parsed && balance !== undefined && parsed.raw > balance

  const setMax = () => {
    if (balance === undefined) return
    const reserve = token.symbol === 'USDC' ? FEE_RESERVE : 0n
    const max = balance > reserve ? balance - reserve : 0n
    setAmount(Amount.fromRaw(max, token.decimals).toString())
  }

  const review = () => {
    if (!contact || !parsed) return
    setPlan({
      token,
      skipFailures: false,
      viaContract: viaContract && !!BATCH_ADDRESS,
      rows: [{ contactId: contact.id, name: contact.name, address: contact.address, amount: parsed.raw, amountStr: parsed.toString() }],
    })
  }

  if (vault.contacts.length === 0) {
    return (
      <section className="card">
        <EmptyState icon={<UserRound className="size-6" />} title="Save a contact first" body="Sends go to people in your address book. Add one in the Contacts tab." />
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <section className="card space-y-4 p-5">
        <div>
          <span className="label">To</span>
          <button className="inner flex min-h-[64px] w-full items-center gap-3 p-3 text-left" onClick={() => setPickerOpen(true)}>
            {contact ? (
              <>
                <Avatar name={contact.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{contact.name}</p>
                  <AddressLink address={contact.address} />
                </div>
              </>
            ) : (
              <span className="flex-1 text-sm" style={{ color: 'var(--muted)' }}>Choose a saved contact</span>
            )}
            <ChevronRight className="size-4" style={{ color: 'var(--subtle)' }} />
          </button>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label !mb-0">Amount</span>
            <TokenSelect
              value={token}
              onChange={(t) => {
                setToken(t)
                setAmount('')
              }}
            />
          </div>
          <div className="inner p-4">
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(cleanAmountInput(e.target.value, token.decimals))}
              placeholder="0.00"
              aria-label="Amount"
              className="display w-full bg-transparent text-4xl font-bold tabular-nums outline-none placeholder:opacity-30"
            />
            <div className="mt-2 flex items-center justify-between text-xs">
              <span style={{ color: 'var(--subtle)' }}>{token.symbol}</span>
              <button className="font-semibold disabled:opacity-40" style={{ color: 'var(--accent-hover)' }} disabled={balance === undefined} onClick={setMax}>
                {balance !== undefined ? `Balance ${fmt(balance, token)} · Max` : 'Balance unavailable'}
              </button>
            </div>
          </div>
          {token.symbol === 'USDC' && (
            <p className="mt-1.5 text-xs" style={{ color: 'var(--subtle)' }}>Max keeps 0.05 USDC aside for network fees.</p>
          )}
        </div>

        {BATCH_ADDRESS && (
          <label className="inner flex min-h-[44px] cursor-pointer items-start gap-3 p-3 text-sm">
            <input type="checkbox" className="mt-0.5 size-4" checked={viaContract} onChange={(e) => setViaContract(e.target.checked)} />
            <span>
              <span className="font-semibold">Send through the PayBook contract</span>
              <span className="block text-xs" style={{ color: 'var(--muted)' }}>
                Uses the same contract as batches. Needs a one-time approval for this amount and slightly more fee.
              </span>
            </span>
          </label>
        )}

        {over && <Notice tone="error">That is more than your {token.symbol} balance.</Notice>}

        <button className="btn btn-primary w-full" disabled={!isConnected || !contact || !parsed || !!over} onClick={review}>
          {!contact ? 'Choose a contact' : !parsed ? 'Enter an amount' : 'Review'}
        </button>
      </section>

      <ContactPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        mode="single"
        onPick={(ids) => {
          setContactId(ids[0] ?? null)
          setPickerOpen(false)
        }}
      />
      <ConfirmSheet plan={plan} onClose={() => setPlan(null)} onFinished={() => setAmount('')} />
    </div>
  )
}
