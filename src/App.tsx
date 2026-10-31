import { useState } from 'react'
import { useAccount } from 'wagmi'
import { BookUser, History, Send, Users } from 'lucide-react'
import { VaultProvider, useVault } from '@/hooks/useVault'
import { usePendingWatcher } from '@/hooks/useTransfer'
import { NetworkProvider, useNetwork } from '@/hooks/useNetwork'
import { NetworkSwitch } from '@/components/NetworkSwitch'
import { BalanceCard } from '@/components/BalanceCard'
import { ContactsView } from '@/components/ContactsView'
import { Header } from '@/components/Header'
import { HistoryView } from '@/components/HistoryView'
import { MultiSendView } from '@/components/MultiSendView'
import { SendView } from '@/components/SendView'
import { ConnectPrompt, UnlockPrompt } from '@/components/UnlockGate'
import { ListSkeleton, Notice } from '@/components/ui'

type Tab = 'contacts' | 'send' | 'multi' | 'history'

const TABS: { id: Tab; label: string; Icon: typeof Send }[] = [
  { id: 'contacts', label: 'Contacts', Icon: BookUser },
  { id: 'send', label: 'Send', Icon: Send },
  { id: 'multi', label: 'Multi-send', Icon: Users },
  { id: 'history', label: 'History', Icon: History },
]

function Shell() {
  const { isConnected, isConnecting, isReconnecting } = useAccount()
  const { status } = useVault()
  const { key: networkKey, batchAddress, label } = useNetwork()
  const [tab, setTab] = useState<Tab>('contacts')
  const [presetId, setPresetId] = useState<string | null>(null)
  usePendingWatcher()

  return (
    <div className="min-h-dvh pb-24">
      <Header />
      <main className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-3">
        <NetworkSwitch />
        {isConnecting || isReconnecting ? (
          <section className="card">
            <ListSkeleton rows={3} />
          </section>
        ) : !isConnected ? (
          <ConnectPrompt />
        ) : (
          <>
            <BalanceCard />
            {status !== 'ready' ? (
              <UnlockPrompt />
            ) : (
              <>
                <nav className="card grid grid-cols-4 gap-1 p-1.5" aria-label="Sections">
                  {TABS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      onClick={() => {
                        if (id !== 'send') setPresetId(null)
                        setTab(id)
                      }}
                      aria-current={tab === id ? 'page' : undefined}
                      className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition-colors sm:flex-row sm:gap-2 sm:text-sm"
                      style={tab === id ? { background: 'var(--accent)', color: 'var(--accent-ink)' } : { color: 'var(--muted)' }}
                    >
                      <Icon className="size-4" /> {label}
                    </button>
                  ))}
                </nav>
                {!batchAddress && tab !== 'multi' && tab !== 'history' && tab !== 'contacts' && (
                  <Notice tone="info">Sending through the PayBook contract is not available on {label} yet. Direct sends work.</Notice>
                )}
                <div key={networkKey} className="space-y-4">
                {tab === 'contacts' && (
                  <ContactsView
                    onSend={(c) => {
                      setPresetId(c.id)
                      setTab('send')
                    }}
                  />
                )}
                {tab === 'send' && <SendView initialContactId={presetId} />}
                {tab === 'multi' && <MultiSendView />}
                {tab === 'history' && <HistoryView />}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <NetworkProvider>
      <VaultProvider>
        <Shell />
      </VaultProvider>
    </NetworkProvider>
  )
}
