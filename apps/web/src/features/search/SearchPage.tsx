import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { PageMeta, PublicArticle } from '@news-india/shared'
import { useI18n } from '../../app/providers'
import { Pagination } from '../../components/common/Pagination'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/common/StateMessage'
import { ArticleCard } from '../../components/news/ArticleCard'
import { useAsync } from '../../hooks/useAsync'
import { usePageMeta } from '../../hooks/usePageMeta'
import { api } from '../../services/api'

export function SearchPage() {
  const { lang, t } = useI18n()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const page = Number(params.get('page') || '1')
  const [draft, setDraft] = useState(q)
  usePageMeta(`${t.searchAction} — ${t.brand}`)
  const state = useAsync(() => {
    if (!q.trim()) return Promise.resolve(null)
    return api<{ data: PublicArticle[]; meta: PageMeta }>(`/search?q=${encodeURIComponent(q)}&language=${lang}&page=${page}&limit=8`)
  }, [q, lang, page])
  return (
    <div>
      <h1 className="font-serif text-4xl">{t.searchAction}</h1>
      <form className="mt-4 flex max-w-xl" onSubmit={(event) => { event.preventDefault(); setParams({ q: draft }) }}>
        <input value={draft} onChange={(event) => setDraft(event.target.value)} className="flex-1 rounded-l border border-line px-3 py-2" aria-label={t.searchPlaceholder} />
        <button className="rounded-r bg-crimson px-4 py-2 text-paper" type="submit">{t.searchAction}</button>
      </form>
      {state.status === 'loading' ? <div className="mt-6"><LoadingBlock /></div> : null}
      {state.status === 'error' ? <div className="mt-6"><ErrorBlock message={state.error ?? undefined} onRetry={state.reload} /></div> : null}
      {state.data && state.data.data.length === 0 ? <div className="mt-6"><EmptyBlock>{t.searchEmpty}</EmptyBlock></div> : null}
      {state.data ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{state.data.data.map((article) => <ArticleCard key={article.id} article={article} />)}</div>
          <Pagination meta={state.data.meta} onPage={(next) => setParams({ q, page: String(next) })} />
        </>
      ) : null}
    </div>
  )
}
