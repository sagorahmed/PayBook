/**
 * wagmi configuration
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { NETWORKS, toViemChain } from './lib/networks'
import { registerChain } from './tracing'

const arcMainnet = toViemChain(NETWORKS.mainnet.chain)
const arcTestnet = toViemChain(NETWORKS.testnet.chain)

// Pre-register chain RPC URLs so trace events show correct chain names immediately
registerChain(arcMainnet.id, arcMainnet.rpcUrls.default.http[0])
registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0])

export const config = createConfig({
  chains: [arcMainnet, arcTestnet, mainnet], // Ethereum mainnet is needed for ENS resolution
  connectors: [injected()],
  transports: {
    [arcMainnet.id]: http(arcMainnet.rpcUrls.default.http[0]),
    [arcTestnet.id]: http(arcTestnet.rpcUrls.default.http[0]),
    [mainnet.id]: http(), // ENS resolution uses mainnet
  },
})
