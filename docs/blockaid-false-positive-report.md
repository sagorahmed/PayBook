# Blockaid false-positive report text for PayBook

Submit at https://report.blockaid.io. Replace the two items in [BRACKETS] before sending.

---

## Domain

https://paybooks.netlify.app

## What MetaMask shows

When connecting a wallet, MetaMask shows "Continue at your own risk: This site shows signs of phishing or wallet-draining activity. It may request transactions designed to steal your funds."

## Why this is a false positive

PayBook is an address book and batch-payment app for USDC on Arc (Circle's L1). Users save contacts, send USDC to one person, or pay many people in one transaction. It is a small open-source project built for the Arc Microgrants hackathon on DoraHacks. I believe the flag comes from domain reputation (a new *.netlify.app address that asks for a wallet connection and token approvals), not from any behavior of the app.

- Source code (public): [GITHUB REPO URL]
- Network: Arc Mainnet (chain ID 5042). A Testnet option (chain ID 5042002) is also in the app.
- Batch contract on Arc Mainnet: 0xFFD21361D1F35657904032EA0a24CE2dB3893A4b
  https://explorer.arc.io/address/0xFFD21361D1F35657904032EA0a24CE2dB3893A4b
- Token: USDC at 0x3600000000000000000000000000000000000000 (Circle's native USDC on Arc).

## The contract cannot take user funds

- No owner, no admin role, no upgrade path, no fees, no pause, no receive or fallback function.
- It never holds user funds. For ERC-20 batches it moves tokens straight from the sender to each recipient with transferFrom, in one transaction, up to 200 recipients.
- It uses reentrancy protection, array-length checks, and rejects zero addresses and zero amounts.
- The only way it moves a user's tokens is when that user calls it and has approved it for that exact amount.

## Every wallet request the site makes

1. Connect account (standard eth_requestAccounts).
2. Switch to, or add, Arc Mainnet or Arc Testnet, using the official RPC from Arc's docs (https://rpc.mainnet.arc.io).
3. One plain-text signature, "Unlock PayBook", used only to derive a key that encrypts the user's saved contacts on their own device. It is not a transaction and not a typed-data or permit signature.
4. ERC-20 approve(batchContract, exactTotal) for the exact total of the payment being made. Never unlimited, never maxUint256.
5. A payment: a direct USDC transfer, or the batch contract's batchTransferERC20 / batchTransferERC20BestEffort.

The app does not request setApprovalForAll, permit signatures, eth_sign, or any transfer to an address other than the recipients the user chose and sees on the review screen. Every payment has a review screen showing recipients, amounts, and the network fee before the wallet is asked to sign.

## Request

Please review https://paybooks.netlify.app and remove the phishing / wallet-drainer classification. I'm happy to provide anything else you need, including the full source.

Contact: [YOUR EMAIL OR X / GITHUB HANDLE]
