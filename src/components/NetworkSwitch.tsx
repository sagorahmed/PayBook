import { useNetwork } from '@/hooks/useNetwork'
import { NETWORKS, type NetworkKey } from '@/lib/networks'

const ORDER: NetworkKey[] = ['mainnet', 'testnet']

export function NetworkSwitch() {
  const { key, setNetwork } = useNetwork()
  return (
    <div className="card mx-auto grid w-full max-w-xs grid-cols-2 gap-1 p-1" role="group" aria-label="Network">
      {ORDER.map((k) => (
        <button
          key={k}
          onClick={() => setNetwork(k)}
          aria-pressed={key === k}
          className="flex min-h-[40px] items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-colors"
          style={key === k ? { background: 'var(--accent)', color: 'var(--accent-ink)' } : { color: 'var(--muted)' }}
        >
          <span className="size-2 rounded-full" style={{ background: k === 'mainnet' ? 'var(--success)' : 'var(--warn)' }} />
          {NETWORKS[k].isMainnet ? 'Mainnet' : 'Testnet'}
        </button>
      ))}
    </div>
  )
}
