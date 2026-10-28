import { Link } from 'react-router-dom'
import { useI18n } from '../../app/providers'
import { usePageMeta } from '../../hooks/usePageMeta'

export function NotFoundPage() {
  const { lang, t } = useI18n()
  usePageMeta(t.notFoundTitle)
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-crimson">404</p>
      <h1 className="mt-2 font-serif text-4xl">{t.notFoundTitle}</h1>
      <p className="mt-3 text-muted">{t.notFoundBody}</p>
      <Link to={`/${lang}`} className="mt-6 inline-block rounded bg-navy px-4 py-2 text-paper">{t.backHome}</Link>
    </div>
  )
}
