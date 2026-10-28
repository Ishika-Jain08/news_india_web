import { useParams, useSearchParams } from 'react-router-dom'
import type { PageMeta, PublicArticle, PublicCategory } from '@news-india/shared'
import { useI18n } from '../../app/providers'
import { Pagination } from '../../components/common/Pagination'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/common/StateMessage'
import { ArticleCard } from '../../components/news/ArticleCard'
import { useAsync } from '../../hooks/useAsync'
import { usePageMeta } from '../../hooks/usePageMeta'
import { api } from '../../services/api'

export function CategoryPage() {
  const { slug = '' } = useParams()
  const { lang, t } = useI18n()
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') || '1')
  const categories = useAsync(() => api<{ data: PublicCategory[] }>(`/categories?language=${lang}`), [lang])
  const list = useAsync(() => api<{ data: PublicArticle[]; meta: PageMeta }>(`/categories/${slug}/articles?language=${lang}&page=${page}&limit=8`), [slug, lang, page])
  const category = categories.data?.data.find((item) => item.slug === slug)
  usePageMeta(`${category?.name ?? t.categories} — ${t.brand}`, category?.description)
  if (list.status === 'loading') return <LoadingBlock />
  if (list.status === 'error' || !list.data) return <ErrorBlock message={list.error ?? undefined} onRetry={list.reload} />
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-crimson">{t.categories}</p>
      <h1 className="font-serif text-4xl">{category?.name ?? slug}</h1>
      <p className="mt-2 max-w-2xl text-muted">{category?.description}</p>
      {list.data.data.length === 0 ? <div className="mt-6"><EmptyBlock /></div> : <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{list.data.data.map((article) => <ArticleCard key={article.id} article={article} />)}</div>}
      <Pagination meta={list.data.meta} onPage={(next) => setParams({ page: String(next) })} />
    </div>
  )
}
