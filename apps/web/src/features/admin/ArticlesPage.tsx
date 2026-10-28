import { Link, useSearchParams } from 'react-router-dom'
import type { PageMeta } from '@news-india/shared'
import { useI18n } from '../../app/providers'
import { Pagination } from '../../components/common/Pagination'
import { ErrorBlock, LoadingBlock } from '../../components/common/StateMessage'
import { useAsync } from '../../hooks/useAsync'
import { api } from '../../services/api'

interface Row {
  id: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'published'
  coverage: string
  translations: { language: string; title: string }[]
  author: { name: string }
}

export function ArticlesPage({ preset }: { preset?: 'submitted' }) {
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const status = preset ?? params.get('status') ?? ''
  const page = Number(params.get('page') || '1')
  const state = useAsync(() => {
    const query = new URLSearchParams({ page: String(page), limit: '10' })
    if (status) query.set('status', status)
    return api<{ data: Row[]; meta: PageMeta }>(`/admin/articles?${query}`)
  }, [status, page])
  const label = (value: Row['status']) => t[value]
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-4xl">{preset === 'submitted' ? t.review : t.articles}</h1>
        <Link to="/admin/articles/new" className="rounded bg-crimson px-3 py-2 text-sm font-semibold text-paper">{t.newArticle}</Link>
      </div>
      {!preset ? (
        <label className="mt-4 block text-sm">{t.status}
          <select className="ml-2 rounded border border-line bg-card px-2 py-2" value={status} onChange={(event) => setParams(event.target.value ? { status: event.target.value } : {})}>
            <option value="">{t.filterAll}</option>
            {(['draft', 'submitted', 'approved', 'rejected', 'published'] as const).map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </select>
        </label>
      ) : null}
      {state.status === 'loading' ? <div className="mt-6"><LoadingBlock /></div> : null}
      {state.status === 'error' ? <ErrorBlock message={state.error ?? undefined} onRetry={state.reload} /> : null}
      {state.data ? (
        <>
          <div className="mt-4 overflow-auto rounded-xl border border-line bg-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper text-muted"><tr><th className="p-3">{t.title}</th><th className="p-3">{t.status}</th><th className="p-3">{t.coverage}</th><th className="p-3"></th></tr></thead>
              <tbody>
                {state.data.data.map((article) => (
                  <tr key={article.id} className="border-t border-line">
                    <td className="p-3">{article.translations.find((item) => item.language === 'en')?.title ?? article.translations[0]?.title}</td>
                    <td className="p-3">{label(article.status)}</td>
                    <td className="p-3">{article.coverage}</td>
                    <td className="p-3"><Link className="font-semibold text-crimson" to={`/admin/articles/${article.id}`}>{t.open}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={state.data.meta} onPage={(next) => setParams({ ...(status ? { status } : {}), page: String(next) })} />
        </>
      ) : null}
    </div>
  )
}
