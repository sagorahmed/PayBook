# Deploying BatchTransfer to Arc Mainnet

Mainnet uses real USDC and transactions cannot be reversed. You deploy and operate this yourself, from your own wallet. Review the contract, test on testnet first, and consider an independent audit.

The contract takes no constructor arguments and has no owner.

## Steps

1. Get the code onto your machine (download it from the Code panel, or push to GitHub and clone).
2. Install: `bun install` and install Foundry (https://getfoundry.sh).
3. Fund a deployer wallet with a little USDC on Arc Mainnet (USDC is also the gas token).
4. Import the deployer key into a Foundry keystore (never put the key on the command line):

   ```bash
   cast wallet import paybook-deployer --interactive
   ```

5. Confirm the RPC URL and chain ID (5042) in the official Arc docs, then deploy:

   ```bash
   forge create contracts/BatchTransfer.sol:BatchTransfer \
     --rpc-url https://rpc.mainnet.arc.io \
     --account paybook-deployer \
     --broadcast
   ```

6. Copy the "Deployed to" address into `.env`:

   ```
   VITE_BATCH_TRANSFER_ADDRESS_MAINNET=0x...
   ```

7. Restart the dev server. Multi-send and "Send through the PayBook contract" become available on Arc Mainnet.
8. Check the address on https://explorer.arc.io, then make one small real batch send and keep the transaction hash.
