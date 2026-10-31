import { ConnectKitButton } from 'connectkit'
import { BookUser, KeyRound, Send, ShieldCheck, Users, Wallet } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useVault } from '@/hooks/useVault'
import { Notice, Spinner } from './ui'

export function ConnectPrompt() {
  return (
    <section className="card flex flex-col items-center gap-4 px-6 py-12 text-center">
      <div className="inner flex size-16 items-center justify-center">
        <Wallet className="size-7" />
      </div>
      <div>
        <h1 className="display text-balance text-2xl font-bold">Your payment address book</h1>
        <p className="mx-auto mt-2 max-w-sm text-pretty text-sm" style={{ color: 'var(--muted)' }}>
          Save the people you pay, send USDC to one contact, or pay a whole team in a single transaction on Arc.
        </p>
      </div>
      <ConnectKitButton.Custom>
        {({ show }) => (
          <button className="btn btn-primary" onClick={show}>
            Connect wallet
          </button>
        )}
      </ConnectKitButton.Custom>
      <ul className="mt-4 grid w-full gap-3 text-left sm:grid-cols-3">
        {[
          { Icon: BookUser, title: 'Save contacts', body: 'Nicknames, tags, notes and groups, encrypted on your device.' },
          { Icon: Send, title: 'Send in seconds', body: 'Pick a contact, review the fee, pay in USDC on Arc.' },
          { Icon: Users, title: 'Pay many at once', body: 'Different amounts per person, or split equally, in one transaction.' },
        ].map(({ Icon, title, body }) => (
          <li key={title} className="inner p-4">
            <Icon className="size-5" />
            <p className="display mt-2 text-sm font-semibold">{title}</p>
            <p className="mt-1 text-pretty text-xs" style={{ color: 'var(--muted)' }}>{body}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function UnlockPrompt() {
  const { address } = useAccount()
  const { unlock, status, error, hasVault } = useVault()
  const busy = status === 'unlocking'
  return (
    <section className="card flex flex-col items-center gap-4 px-6 py-10 text-center">
      <div className="inner flex size-16 items-center justify-center">
        <KeyRound className="size-7" />
      </div>
      <div>
        <h2 className="display text-xl font-bold">{hasVault ? 'Unlock your contacts' : 'Set up your address book'}</h2>
        <p className="mx-auto mt-2 max-w-sm text-pretty text-sm" style={{ color: 'var(--muted)' }}>
          Contacts are encrypted on this device and only your wallet can open them. Sign a free message to continue. No transaction, no gas.
        </p>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <button className="btn btn-primary w-full max-w-xs" onClick={() => void unlock()} disabled={busy || !address}>
        {busy ? (
          <>
            <Spinner /> Waiting for signature...
          </>
        ) : (
          <>
            <ShieldCheck className="size-4" /> {hasVault ? 'Sign to unlock' : 'Sign to start'}
          </>
        )}
      </button>
    </section>
  )
}
