import { useCallback, useEffect, useState } from 'react'
import { erc20Abi, parseEventLogs, type Address } from 'viem'
import { useAccount, useConfig, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from 'wagmi'
import { getPublicClient } from 'wagmi/actions'
import { Amount, gasTokenToUsdc, usdcToGasToken } from '@/onchain-money'
import { parseOnchainError } from '@/lib/errors'
import { batchAbi, type TokenInfo } from '@/lib/tokens'
import { txChainId } from '@/lib/networks'
import { useNetwork } from './useNetwork'
import type { TxRecord } from '@/lib/types'
import { useVault } from './useVault'

export interface PlanRow {
  contactId?: string
  name: string
  address: Address
  amount: bigint
  amountStr: string
}

export interface Plan {
  token: TokenInfo
  rows: PlanRow[]
  skipFailures: boolean
  /** Route a single-recipient payment through the batch contract instead of a direct transfer. */
  viaContract?: boolean
}

/** A lone recipient is sent as a plain token transfer unless the plan asks for the batch contract. */
export const isDirect = (plan: Plan) => plan.rows.length === 1 && !plan.skipFailures && !plan.viaContract

export const planTotal = (plan: Plan) => plan.rows.reduce((s, r) => s + r.amount, 0n)

/** Balance of a token for the connected wallet, in the token's own (ERC-20) view. */
export function useTokenBalance(token: TokenInfo | undefined) {
  const { address } = useAccount()
  const { chainId: CHAIN_ID } = useNetwork()
  const q = useReadContract({
    address: token?.address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!address && !!token, refetchInterval: 8000 },
  })
  return { balance: q.data, isLoading: q.isLoading, refetch: q.refetch }
}

export interface Estimate {
  /** Network fee in the USDC (6-decimal ERC-20) view. Gas on Arc is paid in USDC. */
  fee: Amount | null
  needsApproval: boolean
  /** True when the batch gas is a per-recipient approximation because approval is not granted yet. */
  approx: boolean
}

const APPROX_BATCH_BASE = 60_000n
const APPROX_PER_RECIPIENT = 60_000n

export function useEstimate() {
  const { address } = useAccount()
  const { chainId: CHAIN_ID, batchAddress: BATCH_ADDRESS } = useNetwork()
  const client = usePublicClient({ chainId: CHAIN_ID })

  return useCallback(
    async (plan: Plan): Promise<Estimate> => {
      if (!address || !client) throw new Error('Wallet not connected')
      const total = planTotal(plan)
      const gasPrice = await client.getGasPrice()
      let gas: bigint
      let needsApproval = false
      let approx = false

      if (isDirect(plan)) {
        const row = plan.rows[0]
        gas = await client.estimateContractGas({
          address: plan.token.address,
          abi: erc20Abi,
          functionName: 'transfer',
          args: [row.address, row.amount],
          account: address,
        })
      } else {
        if (!BATCH_ADDRESS) throw new Error('Batch contract is not configured')
        const allowance = await client.readContract({
          address: plan.token.address,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, BATCH_ADDRESS],
        })
        needsApproval = allowance < total
        const approveGas = needsApproval
          ? await client.estimateContractGas({
              address: plan.token.address,
              abi: erc20Abi,
              functionName: 'approve',
              args: [BATCH_ADDRESS, total],
              account: address,
            })
          : 0n
        let batchGas: bigint
        if (needsApproval) {
          batchGas = APPROX_BATCH_BASE + APPROX_PER_RECIPIENT * BigInt(plan.rows.length)
          approx = true
        } else {
          batchGas = await client.estimateContractGas({
            address: BATCH_ADDRESS,
            abi: batchAbi,
            functionName: plan.skipFailures ? 'batchTransferERC20BestEffort' : 'batchTransferERC20',
            args: [plan.token.address, plan.rows.map((r) => r.address), plan.rows.map((r) => r.amount)],
            account: address,
          })
        }
        gas = approveGas + batchGas
      }

      const native = Amount.fromRaw(gas * gasPrice, 18)
      let fee = gasTokenToUsdc(CHAIN_ID, native, 'trunc')
      // Round up so the fee shown never under-reports by a fraction of a microdollar.
      if (usdcToGasToken(CHAIN_ID, fee).lt(native)) fee = fee.add(Amount.fromRaw(1n, fee.decimals))
      return { fee, needsApproval, approx }
    },
    [address, client, CHAIN_ID, BATCH_ADDRESS],
  )
}

export type Step = 'idle' | 'switching' | 'approving' | 'approval-confirming' | 'sending' | 'confirming' | 'done'

export function useExecute() {
  const { address, chainId } = useAccount()
  const { chainId: CHAIN_ID, batchAddress: BATCH_ADDRESS } = useNetwork()
  const client = usePublicClient({ chainId: CHAIN_ID })
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const { recordTx, setTxStatus } = useVault()

  const [step, setStep] = useState<Step>('idle')
  const [hash, setHash] = useState<Address | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<'success' | 'failed' | null>(null)
  const [skipped, setSkipped] = useState<string[]>([])

  const reset = useCallback(() => {
    setStep('idle')
    setHash(null)
    setError(null)
    setOutcome(null)
    setSkipped([])
  }, [])

  const run = useCallback(
    async (plan: Plan) => {
      if (!address || !client) return
      setError(null)
      setOutcome(null)
      setSkipped([])
      setHash(null)
      try {
        if (chainId !== CHAIN_ID) {
          setStep('switching')
          await switchChainAsync({ chainId: CHAIN_ID })
        }
        const total = planTotal(plan)
        const single = isDirect(plan)
        let txHash: Address

        if (single) {
          setStep('sending')
          txHash = await writeContractAsync({
            address: plan.token.address,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [plan.rows[0].address, plan.rows[0].amount],
            chainId: CHAIN_ID,
          })
        } else {
          if (!BATCH_ADDRESS) throw new Error('Batch contract is not configured')
          const allowance = await client.readContract({
            address: plan.token.address,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [address, BATCH_ADDRESS],
          })
          if (allowance < total) {
            setStep('approving')
            const approveHash = await writeContractAsync({
              address: plan.token.address,
              abi: erc20Abi,
              functionName: 'approve',
              args: [BATCH_ADDRESS, total],
              chainId: CHAIN_ID,
            })
            setStep('approval-confirming')
            const approval = await client.waitForTransactionReceipt({ hash: approveHash })
            if (approval.status !== 'success') throw new Error('Approval reverted')
          }
          setStep('sending')
          txHash = await writeContractAsync({
            address: BATCH_ADDRESS,
            abi: batchAbi,
            functionName: plan.skipFailures ? 'batchTransferERC20BestEffort' : 'batchTransferERC20',
            args: [plan.token.address, plan.rows.map((r) => r.address), plan.rows.map((r) => r.amount)],
            chainId: CHAIN_ID,
          })
        }

        setHash(txHash)
        setStep('confirming')
        const record: TxRecord = {
          hash: txHash,
          kind: plan.rows.length === 1 ? 'send' : 'batch',
          chainId: CHAIN_ID,
          tokenSymbol: plan.token.symbol,
          createdAt: Date.now(),
          status: 'pending',
          total: Amount.fromRaw(total, plan.token.decimals).toString(),
          items: plan.rows.map((r) => ({ contactId: r.contactId, name: r.name, address: r.address, amount: r.amountStr })),
        }
        recordTx(record)

        const receipt = await client.waitForTransactionReceipt({ hash: txHash })
        const failedLogs = parseEventLogs({ abi: batchAbi, logs: receipt.logs, eventName: 'TransferFailed' })
        const skippedAddrs = failedLogs.map((l) => l.args.recipient as string)
        const ok = receipt.status === 'success'
        setTxStatus(txHash, ok ? 'success' : 'failed', skippedAddrs.length ? skippedAddrs : undefined)
        setSkipped(skippedAddrs)
        setOutcome(ok ? 'success' : 'failed')
        setStep('done')
      } catch (e) {
        const msg = parseOnchainError(e)
        setError(msg)
        setStep('idle')
      }
    },
    [address, chainId, client, recordTx, setTxStatus, switchChainAsync, writeContractAsync, CHAIN_ID, BATCH_ADDRESS],
  )

  return { step, hash, error, outcome, skipped, run, reset, busy: step !== 'idle' && step !== 'done' }
}

/** Resolves transactions left pending (for example after a page reload) by reading their receipts. */
export function usePendingWatcher() {
  const config = useConfig()
  const { vault, status, setTxStatus } = useVault()

  useEffect(() => {
    if (status !== 'ready') return
    const pending = vault.history.filter((t) => t.status === 'pending')
    if (pending.length === 0) return
    let cancelled = false
    const check = async () => {
      for (const tx of pending) {
        try {
          // Each payment is checked on the network it was made on.
          const client = getPublicClient(config, { chainId: txChainId(tx) })
          if (!client) continue
          const r = await client.getTransactionReceipt({ hash: tx.hash })
          if (cancelled) return
          const failedLogs = parseEventLogs({ abi: batchAbi, logs: r.logs, eventName: 'TransferFailed' })
          const skipped = failedLogs.map((l) => l.args.recipient as string)
          setTxStatus(tx.hash, r.status === 'success' ? 'success' : 'failed', skipped.length ? skipped : undefined)
        } catch {
          // Receipt not available yet: stays pending.
        }
      }
    }
    void check()
    const id = setInterval(() => void check(), 10_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [vault.history, status, config, setTxStatus])
}
