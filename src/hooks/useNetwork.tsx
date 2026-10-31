import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { buildAddressExplorerUrl, buildTxExplorerUrl } from '@/onchain-facts'
import { DEFAULT_NETWORK, NETWORKS, type NetworkConfig, type NetworkKey } from '@/lib/networks'

interface NetworkApi extends NetworkConfig {
  setNetwork: (key: NetworkKey) => void
  txUrl: (hash: string) => string
  addressUrl: (address: string) => string
}

const STORAGE_KEY = 'paybook:network'
const Ctx = createContext<NetworkApi | null>(null)

function initialKey(): NetworkKey {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'mainnet' || saved === 'testnet') return saved
  } catch {
    // Storage can be unavailable in embedded frames; fall back to the default.
  }
  return DEFAULT_NETWORK
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState<NetworkKey>(initialKey)

  const setNetwork = useCallback((next: NetworkKey) => {
    setKey(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Ignore: the choice just will not persist.
    }
  }, [])

  const api = useMemo<NetworkApi>(() => {
    const n = NETWORKS[key]
    return {
      ...n,
      setNetwork,
      txUrl: (hash) => buildTxExplorerUrl(n.chainId, hash),
      addressUrl: (address) => buildAddressExplorerUrl(n.chainId, address),
    }
  }, [key, setNetwork])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useNetwork(): NetworkApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('useNetwork must be used inside NetworkProvider')
  return v
}
