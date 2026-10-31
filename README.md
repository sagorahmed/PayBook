# PayBook

An address book and batch-payment app for Arc Testnet. Save contacts, send USDC to one person, or pay many people in a single transaction.

Built with [Arc Studio](https://studio.arc.io)

## Features

- Connect a wallet and see your USDC balance. Switch between Arc Mainnet (default) and Arc Testnet; each keeps its own payment history.
- Contacts with nicknames, notes, tags (Family, Work, Friends), favorites, search, edit and delete. Invalid and duplicate addresses are blocked.
- Contact groups for one-tap team payments.
- Send to one contact with a review screen, fee estimate, and a link to the Arc explorer.
- Multi-send to many contacts with a different amount for each, or split a total equally. Optionally skip recipients that cannot receive instead of failing the whole batch.
- Saved multi-send templates for recurring payments.
- CSV import and export of contacts, and CSV upload for bulk payments (`address,amount,name`).
- Payment history per contact and overall, with pending, success and failed status.
- Light and dark mode.
- Contacts are encrypted on your device and unlocked by signing a free message with your wallet.

## Tech stack

React, Vite, TypeScript, Tailwind CSS, wagmi, viem, ConnectKit. Solidity (Foundry) for the batch transfer contract in `contracts/BatchTransfer.sol`.

## Development

Prerequisites: [Bun](https://bun.sh) and, for contract work, [Foundry](https://getfoundry.sh).

```bash
bun install
bun run dev
```

### Environment variables

- `VITE_BATCH_TRANSFER_ADDRESS_MAINNET`: address of your deployed `BatchTransfer` contract on Arc Mainnet. Multi-send is unavailable on mainnet until set. See `docs/mainnet-deploy.md`.
- `VITE_BATCH_TRANSFER_ADDRESS_TESTNET`: address of the deployed `BatchTransfer` contract on Arc Testnet.
- `VITE_EURC_ADDRESS_MAINNET`, `VITE_EURC_ADDRESS_TESTNET`: optional EURC token addresses. EURC is hidden on a network when unset.

### Contracts

```bash
bun run contracts:build
bun run contracts:test
```
