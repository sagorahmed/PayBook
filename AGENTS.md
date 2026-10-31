# PayBook

> Built with Arc Studio - money-powered apps in minutes

## What This App Does

Address book plus batch-transfer dApp on Arc Testnet. Contacts are stored per wallet, AES-GCM encrypted in localStorage (key derived from a wallet signature, cached per tab in sessionStorage). Single sends are direct ERC-20 transfers; multi-send uses the BatchTransfer contract (approve exact total, then one batch call).

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS, framer-motion, sonner
- Web3: wagmi v2, viem v2, ConnectKit (injected wallets)
- Contracts: Solidity + Foundry. `contracts/BatchTransfer.sol`
- Chains: Arc Mainnet (5042, default selection) and Arc Testnet (5042002), switched with the network switch at the top of the app. Per-network config lives in `src/lib/networks.ts`; contract addresses come from `VITE_BATCH_TRANSFER_ADDRESS_MAINNET/_TESTNET`. Gas token is USDC, so payments and fees come from one pool. History records carry a chainId (older ones are testnet).
- Tokens: USDC from `@/onchain-facts`; EURC from `VITE_EURC_ADDRESS_*`

## Deployed Contracts

- BatchTransfer (Arc Testnet): 0x2597321298d6414d3e6d97feef3a72c548605b4e (`VITE_BATCH_TRANSFER_ADDRESS_TESTNET`).
- BatchTransfer (Arc Mainnet): 0xFFD21361D1F35657904032EA0a24CE2dB3893A4b, deployed by the owner from their own wallet (`VITE_BATCH_TRANSFER_ADDRESS_MAINNET`). See `docs/mainnet-deploy.md`.
  - batchTransferERC20 / batchTransferERC20BestEffort / batchTransferNative; max 200 recipients; no owner, no custody.
  - Security review: no open findings. The native skip-failures variant was removed after a gas-griefing finding. Slither's arbitrary-send-eth on batchTransferNative is by design (recipients are caller-supplied, funds come from msg.value).

## Key Files

- `src/App.tsx` - tabs and gating (connect, unlock)
- `src/hooks/useVault.tsx` - encrypted contacts, groups, templates, history
- `src/hooks/useTransfer.ts` - fee estimate, approve + send flow, pending watcher
- `src/lib/` - crypto, csv, tokens/ABI, errors, formatting
- `src/components/` - views and sheets

## To Run

```bash
bun install
bun run dev
```
