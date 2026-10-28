import type { PageMeta } from '@news-india/shared'
import { useI18n } from '../../app/providers'

export function Pagination({ meta, onPage }: { meta: PageMeta; onPage: (page: number) => void }) {
  const { t } = useI18n()
  if (meta.totalPages <= 1) return null
  return (
    <nav className="mt-8 flex items-center justify-between gap-3" aria-label="Pagination">
      <button type="button" className="rounded border border-line px-3 py-2 disabled:opacity-40" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
        {t.previous}
      </button>
      <p className="text-sm text-muted">
        {meta.page} / {meta.totalPages}
      </p>
      <button type="button" className="rounded border border-line px-3 py-2 disabled:opacity-40" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>
        {t.next}
      </button>
    </nav>
  )
}
