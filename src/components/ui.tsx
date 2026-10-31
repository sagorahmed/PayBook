import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Clock, ExternalLink, Loader2, Star, X, XCircle } from 'lucide-react'
import { initials, shortAddress } from '@/lib/format'
import { useNetwork } from '@/hooks/useNetwork'
import type { TokenInfo } from '@/lib/tokens'
import type { TxStatus } from '@/lib/types'

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl"
            style={{
              background: 'var(--surface-strong)',
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow)',
            }}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pb-2 pt-5">
              <h2 className="display text-lg font-semibold">{title}</h2>
              <button className="btn btn-ghost !min-h-[36px] !px-2.5" onClick={onClose} aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 pb-6 pt-2">{children}</div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div
      className="display flex shrink-0 items-center justify-center rounded-full text-sm font-semibold"
      style={{ width: size, height: size, background: 'var(--surface-muted)', border: '1px solid var(--border)', color: 'var(--ink)' }}
    >
      {initials(name)}
    </div>
  )
}

export function FavStar({ active }: { active: boolean }) {
  return <Star className="size-4" style={{ color: active ? 'var(--warn)' : 'var(--subtle)' }} fill={active ? 'currentColor' : 'none'} />
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="inner flex size-14 items-center justify-center" style={{ color: 'var(--muted)' }}>
        {icon}
      </div>
      <div>
        <p className="display text-base font-semibold">{title}</p>
        <p className="mx-auto mt-1 max-w-xs text-pretty text-sm" style={{ color: 'var(--muted)' }}>
          {body}
        </p>
      </div>
      {action}
    </div>
  )
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="skeleton size-10 !rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-1/3" />
            <div className="skeleton h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function StatusBadge({ status }: { status: TxStatus }) {
  const map = {
    pending: { Icon: Clock, label: 'Pending', color: 'var(--warn)' },
    success: { Icon: CheckCircle2, label: 'Success', color: 'var(--success)' },
    failed: { Icon: XCircle, label: 'Failed', color: 'var(--danger)' },
  } as const
  const { Icon, label, color } = map[status]
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      <Icon className="size-3" /> {label}
    </span>
  )
}

export function AddressLink({ address, className }: { address: string; className?: string }) {
  const { addressUrl } = useNetwork()
  return (
    <a
      href={addressUrl(address)}
      target="_blank"
      rel="noopener noreferrer"
      className={`mono inline-flex items-center gap-1 text-xs hover:underline ${className ?? ''}`}
      style={{ color: 'var(--muted)' }}
    >
      {shortAddress(address)} <ExternalLink className="size-3" />
    </a>
  )
}

export function TokenSelect({ value, onChange }: { value: TokenInfo; onChange: (t: TokenInfo) => void }) {
  const { tokens: TOKENS } = useNetwork()
  if (TOKENS.length < 2) return <span className="text-sm font-semibold">{value.symbol}</span>
  return (
    <div className="inline-flex gap-1" role="group" aria-label="Token">
      {TOKENS.map((t) => (
        <button key={t.symbol} type="button" className="chip" data-active={t.symbol === value.symbol} onClick={() => onChange(t)}>
          {t.symbol}
        </button>
      ))}
    </div>
  )
}

export function Notice({ tone, children }: { tone: 'error' | 'warn' | 'info'; children: ReactNode }) {
  const color = tone === 'error' ? 'var(--danger)' : tone === 'warn' ? 'var(--warn)' : 'var(--accent-hover)'
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className="flex items-start gap-2 rounded-2xl p-3 text-sm"
      style={{ color, background: `color-mix(in srgb, ${color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <div className="text-pretty">{children}</div>
    </div>
  )
}

export function Spinner() {
  return <Loader2 className="size-4 animate-spin" />
}
