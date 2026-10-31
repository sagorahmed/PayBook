import { useEffect, useState } from 'react'
import { CheckCircle2, ExternalLink, XCircle } from 'lucide-react'
import { Amount } from '@/onchain-money'
import { parseOnchainError } from '@/lib/errors'
import { shortAddress } from '@/lib/format'
import { fmt } from '@/lib/tokens'
import { useNetwork } from '@/hooks/useNetwork'
import {
  planTotal,
  useEstimate,
  useExecute,
  useTokenBalance,
  type Estimate,
  type Plan,
  type Step,
} from '@/hooks/useTransfer'
import { Avatar, Notice, Sheet, Spinner } from './ui'

const STEP_COPY: Record<Step, string> = {
  idle: '',
  switching: 'Switching network in your wallet...',
  approving: 'Approve token spending in your wallet...',
  'approval-confirming': 'Confirming approval on Arc...',
  sending: 'Confirm the payment in your wallet...',
  confirming: 'Waiting for confirmation on Arc...',
  done: '',
}

interface Props {
  plan: Plan | null
  onClose: () => void
  onFinished?: () => void
}

export function ConfirmSheet({ plan, onClose, onFinished }: Props) {
  if (!plan) return null
  // Keyed per plan so every review starts with fresh estimate and transaction state.
  return <ConfirmBody key={plan.rows.map((r) => `${r.address}:${r.amountStr}`).join('|') + plan.token.symbol + plan.skipFailures + plan.viaContract} plan={plan} onClose={onClose} onFinished={onFinished} />
}

function ConfirmBody({ plan, onClose, onFinished }: Props & { plan: Plan }) {
  const { tokens, txUrl } = useNetwork()
  const estimate = useEstimate()
  const exec = useExecute()
  const tokenBal = useTokenBalance(plan.token)
  const usdcBal = useTokenBalance(tokens[0])
  const [est, setEst] = useState<Estimate | null>(null)
  const [estError, setEstError] = useState<string | null>(null)
  const [estLoading, setEstLoading] = useState(true)

  useEffect(() => {
    let live = true
    estimate(plan)
      .then((r) => live && setEst(r))
      .catch((e) => live && setEstError(parseOnchainError(e) ?? 'Could not estimate the network fee.'))
      .finally(() => live && setEstLoading(false))
    return () => {
      live = false
    }
  }, [plan, estimate])

  const total = planTotal(plan)
  const decimals = plan.token.decimals
  const totalAmt = Amount.fromRaw(total, decimals)
  const isUsdc = plan.token.symbol === 'USDC'

  // On Arc the fee is paid in USDC, the same pool as USDC payments.
  const issues: string[] = []
  if (tokenBal.balance !== undefined && tokenBal.balance < total) {
    issues.push(`Insufficient ${plan.token.symbol}. You have ${fmt(tokenBal.balance, plan.token)} and need ${fmt(total, plan.token)}.`)
  } else if (est?.fee && usdcBal.balance !== undefined) {
    const need = est.fee.raw + (isUsdc ? total : 0n)
    if (usdcBal.balance < need) {
      issues.push(
        isUsdc
          ? `Not enough USDC to cover the payment plus about ${est.fee.toFixed(4)} USDC in network fees.`
          : `Not enough USDC to pay the network fee of about ${est.fee.toFixed(4)} USDC.`,
      )
    }
  }

  const finished = exec.step === 'done'
  const blocked = issues.length > 0 || estLoading || !!estError

  const close = () => {
    if (exec.busy) return
    const wasDone = finished
    onClose()
    if (wasDone) onFinished?.()
  }

  return (
    <Sheet open onClose={close} title={finished ? (exec.outcome === 'success' ? 'Payment sent' : 'Payment failed') : 'Review payment'}>
      <div className="space-y-4">
        {finished ? (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            {exec.outcome === 'success' ? (
              <CheckCircle2 className="size-12" style={{ color: 'var(--success)' }} />
            ) : (
              <XCircle className="size-12" style={{ color: 'var(--danger)' }} />
            )}
            <p className="display text-2xl font-bold tabular-nums">
              {totalAmt.toString()} {plan.token.symbol}
            </p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {exec.outcome === 'success'
                ? `Confirmed on Arc to ${plan.rows.length} recipient${plan.rows.length === 1 ? '' : 's'}.`
                : 'The transaction reverted. Nothing was sent.'}
            </p>
            {exec.skipped.length > 0 && (
              <Notice tone="warn">
                {exec.skipped.length} recipient{exec.skipped.length === 1 ? ' was' : 's were'} skipped and kept their share with you:{' '}
                {exec.skipped.map(shortAddress).join(', ')}.
              </Notice>
            )}
            {exec.hash && (
              <a href={txUrl(exec.hash)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost mt-2">
                View on Arc explorer <ExternalLink className="size-4" />
              </a>
            )}
          </div>
        ) : (
          <>
            <div className="inner p-4 text-center">
              <p className="label !mb-1">You are sending</p>
              <p className="display text-4xl font-bold tabular-nums">{totalAmt.toString()}</p>
              <p className="text-sm font-medium" style={{ color: 'var(--subtle)' }}>{plan.token.symbol}</p>
            </div>

            <ul className="max-h-52 space-y-1 overflow-y-auto">
              {plan.rows.map((r, i) => (
                <li key={`${r.address}-${i}`} className="flex items-center gap-3 rounded-xl px-1 py-1.5">
                  <Avatar name={r.name} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.name}</p>
                    <p className="mono text-[11px]" style={{ color: 'var(--muted)' }}>{shortAddress(r.address)}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{r.amountStr}</p>
                </li>
              ))}
            </ul>

            <dl className="inner space-y-2 p-3 text-sm">
              <div className="flex justify-between">
                <dt style={{ color: 'var(--muted)' }}>Recipients</dt>
                <dd className="tabular-nums">{plan.rows.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt style={{ color: 'var(--muted)' }}>Network fee{est?.approx ? ' (approx.)' : ''}</dt>
                <dd className="tabular-nums">
                  {estLoading ? <span className="skeleton inline-block h-4 w-16 align-middle" /> : est?.fee ? `~${est.fee.toFixed(4)} USDC` : '--'}
                </dd>
              </div>
              {est?.needsApproval && (
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--muted)' }}>Approval</dt>
                  <dd>1 extra step (exact amount only)</dd>
                </div>
              )}
              {plan.rows.length === 1 && plan.viaContract && (
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--muted)' }}>Route</dt>
                  <dd>PayBook contract</dd>
                </div>
              )}
              {plan.rows.length > 1 && (
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--muted)' }}>Mode</dt>
                  <dd>{plan.skipFailures ? 'Skip failed recipients' : 'All or nothing'}</dd>
                </div>
              )}
            </dl>

            {estError && <Notice tone="error">{estError}</Notice>}
            {issues.map((m) => (
              <Notice key={m} tone="error">{m}</Notice>
            ))}
            {exec.error && <Notice tone="error">{exec.error}</Notice>}
            {exec.busy && (
              <div className="inner flex items-center gap-2 p-3 text-sm" role="status">
                <Spinner /> {STEP_COPY[exec.step]}
              </div>
            )}

            <button className="btn btn-primary w-full" disabled={blocked || exec.busy} onClick={() => void exec.run(plan)}>
              {exec.busy ? 'Working...' : exec.error ? 'Try again' : plan.rows.length === 1 ? 'Confirm and send' : `Confirm and send to ${plan.rows.length}`}
            </button>
          </>
        )}
        {finished && (
          <button className="btn btn-primary w-full" onClick={close}>
            Done
          </button>
        )}
      </div>
    </Sheet>
  )
}
