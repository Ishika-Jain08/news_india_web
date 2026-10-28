import type { ReactNode } from 'react'
import { useI18n } from '../../app/providers'

export function LoadingBlock() {
  const { t } = useI18n()
  return (
    <div className="space-y-3" role="status">
      <div className="h-8 w-48 animate-pulse rounded bg-line" />
      <div className="h-40 animate-pulse rounded bg-line" />
      <p className="text-sm text-muted">{t.loading}</p>
    </div>
  )
}

export function EmptyBlock({ children }: { children?: ReactNode }) {
  const { t } = useI18n()
  return <p className="rounded-lg border border-dashed border-line bg-card px-4 py-8 text-center text-muted">{children ?? t.empty}</p>
}

export function ErrorBlock({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useI18n()
  return (
    <div className="rounded-lg border border-crimson/30 bg-card px-4 py-6" role="alert">
      <p>{message || t.error}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="mt-3 rounded bg-navy px-3 py-2 text-sm text-paper">
          {t.retry}
        </button>
      ) : null}
    </div>
  )
}
