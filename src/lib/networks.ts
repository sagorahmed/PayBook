import { defineChain, isAddress, type Address } from 'viem'
import { ONCHAIN_CHAINS, getUsdc, type OnchainChain } from '@/onchain-facts'
import type { TokenInfo } from './tokens'
import type { TxRecord } from './types'

export type NetworkKey = 'mainnet' | 'testnet'

export interface NetworkConfig {
  key: NetworkKey
  label: string
  chainId: number
  chain: OnchainChain
  isMainnet: boolean
  tokens: TokenInfo[]
  /** Deployed BatchTransfer contract on this network, if one has been configured. */
  batchAddress: Address | undefined
}

/** Mainnet is the default selection. */
export const DEFAULT_NETWORK: NetworkKey = 'mainnet'

const arcFacts = (isTestnet: boolean): OnchainChain => {
  const c = ONCHAIN_CHAINS.find((x) => x.family === 'arc' && x.isTestnet === isTestnet)
  if (!c) throw new Error(`Arc ${isTestnet ? 'testnet' : 'mainnet'} is missing from onchain facts`)
  return c
}

const envAddress = (value: unknown): Address | undefined =>
  typeof value === 'string' && value && isAddress(value, { strict: false }) ? (value) : undefined

function build(key: NetworkKey, chain: OnchainChain, batch: unknown, eurc: unknown): NetworkConfig {
  const usdc = getUsdc(chain.chainId)
  const eurcAddress = envAddress(eurc)
  return {
    key,
    label: key === 'mainnet' ? 'Arc Mainnet' : 'Arc Testnet',
    chainId: chain.chainId,
    chain,
    isMainnet: !chain.isTestnet,
    tokens: [
      ...(usdc ? [{ symbol: 'USDC' as const, address: usdc.address as Address, decimals: usdc.decimals }] : []),
      // EURC is not in the generated facts module, so its address comes from .env. It has 6 decimals.
      ...(eurcAddress ? [{ symbol: 'EURC' as const, address: eurcAddress, decimals: 6 }] : []),
    ],
    batchAddress: envAddress(batch),
  }
}

const env = import.meta.env

export const NETWORKS: Record<NetworkKey, NetworkConfig> = {
  mainnet: build('mainnet', arcFacts(false), env.VITE_BATCH_TRANSFER_ADDRESS_MAINNET, env.VITE_EURC_ADDRESS_MAINNET),
  testnet: build('testnet', arcFacts(true), env.VITE_BATCH_TRANSFER_ADDRESS_TESTNET, env.VITE_EURC_ADDRESS_TESTNET),
}

/** wagmi / viem chain definition built from the same facts, with the RPC passed explicitly. */
export const toViemChain = (c: OnchainChain) =>
  defineChain({
    id: c.chainId,
    name: c.name === 'Arc' ? 'Arc Mainnet' : c.name,
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: c.nativeCurrency.decimals },
    rpcUrls: { default: { http: c.rpcUrls } },
    blockExplorers: { default: { name: 'Arc Explorer', url: c.explorerBase } },
    testnet: c.isTestnet,
  })

/** Records saved before network selection existed were all made on testnet. */
export const txChainId = (tx: Pick<TxRecord, 'chainId'>) => tx.chainId ?? NETWORKS.testnet.chainId

export const networkOf = (chainId: number): NetworkConfig =>
  chainId === NETWORKS.mainnet.chainId ? NETWORKS.mainnet : NETWORKS.testnet
