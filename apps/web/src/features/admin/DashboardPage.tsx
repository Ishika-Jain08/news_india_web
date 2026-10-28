import { Link } from 'react-router-dom'
import { useAuth, useI18n } from '../../app/providers'
import { ErrorBlock, LoadingBlock } from '../../components/common/StateMessage'
import { useAsync } from '../../hooks/useAsync'
import { api } from '../../services/api'

interface DashboardData {
  stats: {
    articles: { total: number; published: number; draft: number; submitted: number; approved: number; rejected: number }
    viewsTotal: number
    pendingReview: number
    breakingCount: number
  }
  mediaCount: number
  reviewQueue: { id: string; status: string; translations: { language: string; title: string }[] }[]
}

export function DashboardPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const state = useAsync(() => api<{ data: DashboardData }>('/admin/dashboard'), [user?.id])
  if (state.status === 'loading') return <LoadingBlock />
  if (state.status === 'error' || !state.data) return <ErrorBlock message={state.error ?? undefined} onRetry={state.reload} />
  const data = state.data.data
  const cards = [
    [t.statsPublished, data.stats.articles.published],
    [t.statsDraft, data.stats.articles.draft],
    [t.statsSubmitted, data.stats.articles.submitted],
    [t.statsApproved, data.stats.articles.approved],
    [t.statsRejected, data.stats.articles.rejected],
    [t.statsViews, data.stats.viewsTotal],
  ] as const
  return (
    <div>
      <h1 className="font-serif text-4xl">{t.dashboard}</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-card p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="font-serif text-3xl">{value}</p>
          </div>
        ))}
      </div>
      <section className="mt-8">
        <h2 className="font-serif text-2xl">{t.pending}</h2>
        <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-card">
          {data.reviewQueue.length === 0 ? <li className="p-4 text-muted">{t.empty}</li> : data.reviewQueue.map((article) => (
            <li key={article.id} className="flex items-center justify-between gap-3 p-4">
              <span>{article.translations.find((item) => item.language === 'en')?.title ?? article.translations[0]?.title}</span>
              <Link to={`/admin/articles/${article.id}`} className="text-sm font-semibold text-crimson">{t.open}</Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
