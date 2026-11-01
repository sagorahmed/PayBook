# PayBook walkthrough video: script and recording steps

Target length: about 5 to 8 minutes. If you need a shorter cut (2 to 3 minutes), keep scenes 1, 2, 3, 4, 5 (add contact only), 8, 9, 12 and 15, and skip the ones marked (optional).

Mainnet moves real USDC. Use tiny amounts (for example 0.01 USDC) for everything you record on mainnet.

---

## Before you record

Accounts and funds
- Wallet A: your main MetaMask account (the sender). Put a small amount of mainnet USDC in it. USDC is also the gas token on Arc, so one balance covers payments and fees.
- Wallets B, C, D: three other addresses you control (other MetaMask accounts) to use as recipients. Never record other people's addresses.
- For the testnet scene: get test USDC for Wallet A (Arc Studio's built-in "Get test USDC" button).

Browser
- Use a clean browser profile with only MetaMask installed. Zoom 100%. Hide bookmarks. Close other tabs.
- Open https://paybooks.netlify.app in one tab, explorer.arc.io in another, and your Arc Studio project in a third.
- To see the real empty states, clear the app's saved data first: on the app tab, open the browser console, run localStorage.clear(), then reload.

Files to prepare on your desktop
1. `contacts.csv` (for the contacts import scene):

   ```
   name,address,notes,tags,favorite
   Alice,0xYOUR_WALLET_B,Design contractor,Work,yes
   Bob,0xYOUR_WALLET_C,Rent split,Family|Friends,no
   Carol,0xYOUR_WALLET_D,Team lead,Work,no
   ```

2. `payments.csv` (for the bulk payment scene):

   ```
   address,amount,name
   0xYOUR_WALLET_B,0.01,Alice
   0xYOUR_WALLET_C,0.02,Bob
   0xYOUR_WALLET_D,0.03,Carol
   ```

Recording tool: any screen recorder with a microphone (OBS, Loom, QuickTime). Record at 1080p. Do a short test first so audio and the MetaMask popup are captured.

Tip: speak slowly and keep each scene short. You can trim in editing.

---

## Scene 1: Intro (0:00 to 0:20)

Show: the app landing page (before connecting), or a title card.

Say:
"This is PayBook, an address book and batch-payment app on Arc, Circle's L1 where USDC is the gas token. You save the people you pay, send USDC to one person, or pay a whole team in a single transaction. I built it in Arc Studio for the Arc Microgrants hackathon."

## Scene 2: Built in Arc Studio (0:20 to 1:00)

Show, in order:
1. The Arc Studio project with the chat history (your first prompt asking for PayBook).
2. The file tree: `contracts/BatchTransfer.sol`, `src/components`, `src/hooks`.
3. Open `BatchTransfer.sol` and scroll through the functions: `batchTransferERC20`, `batchTransferERC20BestEffort`, `batchTransferNative`.
4. The chat message about the security review and its fixes.
5. The contract deploy card (testnet deploy).

Say:
"I described the app to Arc Studio and it wrote the Solidity contract, ran a security review, fixed what the review found, deployed to testnet, and built the React app. The contract pays up to 200 recipients in one transaction. It has reentrancy protection, array-length checks, no owner, and it never holds funds. I then deployed the same contract to Arc mainnet from my own wallet."

## Scene 3: Landing, network switch, theme (1:00 to 1:25)

Do:
1. Point at the three feature tiles on the landing page.
2. Point at the Mainnet / Testnet switch at the top. Note Mainnet is selected by default.
3. Click the sun/moon button to show dark mode, then switch back.

Say:
"Before connecting, you can see what the app does. There's a network switch: Arc Mainnet is the default, and Arc Testnet is there for trying things with test funds. Dark mode is one click."

## Scene 4: Connect wallet and unlock (1:25 to 2:00)

Do:
1. Click "Connect wallet" and choose MetaMask.
2. If MetaMask shows the "Continue at your own risk" warning, click through it and say the line below.
3. Approve the connection. If asked, approve switching to / adding Arc Mainnet.
4. Show the balance card: shortened address (click to copy), the "Arc Mainnet" chip, and the USDC balance. Point out the small "Mainnet uses real USDC" notice.
5. The "Set up your address book" card appears. Click "Sign to start" and sign the message in MetaMask.

Say:
"I connect MetaMask. MetaMask may warn about the site because it's a brand-new domain; I've filed a false-positive report, and the app only asks for exact-amount approvals. The balance card shows my address and my USDC balance. On Arc, USDC is also the fee token, so one balance covers payments and fees. Next I sign a free message. It's not a transaction. It creates a key that encrypts my contacts on this device, so only my wallet can open them."

## Scene 5: Contacts, add and validation (2:00 to 3:00)

Show the empty state first ("No contacts yet"), then:

Do:
1. Click "Add your first contact".
   - First try an invalid address (type `0x123`) with the nickname "Alice" and click "Save contact". Show the error "That is not a valid wallet address."
   - Fix it with Wallet B's address. Add notes ("Design contractor") and tick the "Work" tag. Save. A toast confirms.
2. Add a second contact "Bob" with Wallet C, tags Family and Friends.
3. Try adding Bob's address again as "Bob 2". Show the duplicate error: Already saved as "Bob".
4. Click the star next to Alice to favorite her. Show she moves to the top.
5. Type "ali" in the search box, then clear it. Click the filter chips: "favorites", "Work", "Family".
6. Click Alice's row to open the detail sheet. Show the address link, tags, notes, and the History area ("No payments to Alice on Arc Mainnet yet").
7. Click Edit, change the notes, and save.
8. (Optional) Add a throwaway contact, open it, click Delete, then confirm "Delete". Show the confirmation text and the toast.

Say:
"Contacts have a nickname, address, notes and tags: Family, Work or Friends. The app validates the address and blocks duplicates, so you can't save the same wallet twice. I can favorite contacts, search by name, address or notes, and filter by tag. Each contact has a detail sheet with edit and delete. Deleting asks for confirmation, and past payments stay in history."

## Scene 6: Groups (3:00 to 3:20)

Do:
1. Click "Manage groups" in the chip row.
2. Click "Create group", name it "Team", tick Alice and Bob, and save.
3. Back in the contacts list, click the "Team" chip to filter by that group.

Say:
"Groups let me bundle contacts, like a team. I'll use this group for one-tap multi-send in a moment."

## Scene 7: CSV import and export (3:20 to 3:45)

Do:
1. Click "Import CSV" and choose `contacts.csv`. Show the toast ("Imported N contacts"; Alice and Bob are skipped as duplicates, Carol is added).
2. Click "Export" and open the downloaded `paybook-contacts.csv` to show the contents.

Say:
"I can import contacts from a CSV. Duplicates and invalid rows are skipped and reported. And I can export everything back to CSV."

## Scene 8: Send to one contact (3:45 to 4:45)

Do:
1. Click the "Send" button on Alice's row (or open the Send tab and choose a contact).
2. Show the selected contact card with the address.
3. Enter an amount: 0.01. Point at "Balance ... Max" (Max keeps 0.05 USDC aside for fees; do not click it on mainnet).
4. (Optional) Type an amount larger than your balance to show the "more than your balance" error, then correct it.
5. Click "Review". On the review sheet, point out: recipient, amount, the network fee estimate in USDC, and the total.
6. Click "Confirm and send" and approve in MetaMask. Show the "Waiting for confirmation on Arc..." state.
7. On the success screen click "View on Arc explorer" and show the transaction (status Success). Save this transaction hash.

Say:
"To send, I pick a contact, enter the amount, and review. The review shows the recipient, total and an estimated network fee, and it checks my balance before anything is signed. Because USDC is also the gas token, it checks the payment plus the fee together. I confirm, the app shows a real confirmation state, then a link to the transaction on the Arc explorer."

Scene 8b (optional): Send through the contract
- On the Send tab, tick "Send through the PayBook contract", review, and show the "Route: PayBook contract" row and the extra approval step.
- Say: "A single payment can also go through the batch contract. It needs a one-time approval for that exact amount."

## Scene 9: Multi-send (4:45 to 5:45)

Do:
1. Open the "Multi-send" tab. Show the empty state.
2. Click the "Team" group chip to add its members, then click "Contacts" and add Carol. Show the list with three recipients.
3. Type different amounts: Alice 0.01, Bob 0.02, Carol 0.03. Show the total and "Your balance" updating in the summary card.
4. Show the split option: type 0.06 into "Split equally" and click "Split". Each row becomes 0.02. (Re-enter different amounts afterwards if you want.)
5. Show a validation: type an invalid amount, point to the red border and the "Enter 1 missing amount" button label. Fix it.
6. Point at the "Skip failed recipients" checkbox and explain it.
7. Click "Review batch". On the review sheet show: the recipient list, total, recipient count, fee estimate, "Approval: 1 extra step (exact amount only)", and Mode.
8. Click "Confirm and send". Approve in MetaMask: first the approval for the exact total, then the batch transaction. Show the "Approve token spending in your wallet..." and "Waiting for confirmation on Arc..." states.
9. On the success screen click "View on Arc explorer". Show the single transaction paying all three recipients.

Say:
"Multi-send is the main feature. I add a group and more contacts, and give each person their own amount, or split a total equally. The summary shows the total and my balance, and the app blocks duplicates, missing amounts and totals above my balance. 'Skip failed recipients' means that if one address can't receive, everyone else still gets paid and the skipped amount stays in my wallet. When I review, the app first asks me to approve the exact total, never an unlimited approval, then sends one transaction through the batch contract that pays everyone. One transaction, three payments."

## Scene 10: Bulk payments from CSV (5:45 to 6:10) (optional)

Do:
1. In Multi-send, click the trash icon to clear all recipients.
2. Click "CSV" and choose `payments.csv`. Show the toast and the recipients with amounts filled in. Addresses that match saved contacts are linked to them.
3. Do not send again unless you want a second transaction.

Say:
"For payroll-style runs I can upload a CSV with address, amount and an optional name. It fills in the whole batch."

## Scene 11: Templates (6:10 to 6:35)

Do:
1. Click "Templates". Under "Save current payments as a template", type "Monthly team payment" and click Save.
2. Clear all recipients, open Templates again, and click "Load" on the template. Show the recipients and amounts come back.

Say:
"If I make the same payment every month, I save it as a template and reload it in one tap."

## Scene 12: History and per-contact history (6:35 to 7:05)

Do:
1. Open the "History" tab. Show the filter chips (all, pending, success, failed).
2. Expand the batch transaction: show each recipient and amount, and the explorer link.
3. Point at the "Success" badge. (If you catch a "Pending" one while recording, point to it.)
4. Open Contacts, open Alice's detail sheet, and show her payment history with status and explorer links.

Say:
"Every payment is recorded with its status: pending, success or failed, and it updates on its own. I can see all payments here, or open a contact to see only what I've paid them."

## Scene 13: Testnet (7:05 to 7:30)

Do:
1. Click "Testnet" in the network switch. Show the chip change to "Arc Testnet".
2. Show that history is empty for this network (each network has its own history) and the balance is the testnet balance.
3. (Optional) Do a quick multi-send with test USDC.
4. Switch back to Mainnet.

Say:
"If someone just wants to try the app, they switch to Testnet and use free test USDC. Each network keeps its own history, so nothing gets mixed up."

## Scene 14: Mobile view and lock (7:30 to 7:50) (optional)

Do:
1. Open the browser's device toolbar (responsive mode) at phone width. Show the tab bar, contacts list and a bottom sheet.
2. Click "Lock" on the balance card to show the unlock prompt again.

Say:
"It works on a phone-sized screen too. And I can lock the app at any time: my contacts stay encrypted until I sign again."

## Scene 15: Outro (7:50 to 8:15)

Show: the mainnet contract page on explorer.arc.io, then the GitHub repo and the live app link.

Say:
"To recap: PayBook was built end to end in Arc Studio, from the contract and its security review to the app. The contract is live on Arc mainnet at this address, and here is a real mainnet transaction paying three people in one go. The code is on GitHub and the app is live at paybooks.netlify.app. Thanks for watching."

---

## Hackathon checklist for the video

- Show the Arc Studio build (Scene 2).
- Show a real Arc mainnet USDC transaction through your contract and app, with the hash on explorer.arc.io (Scenes 8, 9 and 15).
- Mention the contract address: 0xFFD21361D1F35657904032EA0a24CE2dB3893A4b.
- Keep the video public (YouTube or Loom) and put the link in the submission.

## After recording

- Don't show your recovery phrase, private keys, or the `.env` file.
- Blur or crop any balances you don't want public.
- Write down the transaction hashes you create. You need at least one for the submission.
