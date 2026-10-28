import { useSearchParams } from 'react-router-dom'
import type { PageMeta, PlaceSummary, PublicArticle } from '@news-india/shared'
import { useI18n } from '../../app/providers'
import { Pagination } from '../../components/common/Pagination'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/common/StateMessage'
import { ArticleCard } from '../../components/news/ArticleCard'
import { useAsync } from '../../hooks/useAsync'
import { usePageMeta } from '../../hooks/usePageMeta'
import { stateLabel } from '../../lib/format'
import { api } from '../../services/api'

type Kind = 'local' | 'state' | 'national' | 'trending' | 'top' | 'breaking'

const endpoints: Record<Kind, string> = {
  local: '/articles?coverage=local',
  state: '/articles?coverage=state',
  national: '/articles?coverage=national',
  trending: '/news/trending',
  top: '/news/top',
  breaking: '/news/breaking',
}

export function ListingPage({ kind }: { kind: Kind }) {
  const { lang, t } = useI18n()
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') || '1')
  const place = params.get('state') || ''
  const titles: Record<Kind, string> = { local: t.localNews, state: t.stateNews, national: t.nationalNews, trending: t.trending, top: t.topStories, breaking: t.navBreaking }
  usePageMeta(`${titles[kind]} — ${t.brand}`)
  const places = useAsync(() => api<{ data: PlaceSummary }>(`/news/places?coverage=${kind === 'local' || kind === 'state' || kind === 'national' ? kind : 'national'}`), [kind])
  const list = useAsync(() => {
    const query = new URLSearchParams({ language: lang, page: String(page), limit: '8' })
    if (place) query.set('state', place)
    const path = endpoints[kind]
    const joiner = path.includes('?') ? '&' : '?'
    return api<{ data: PublicArticle[]; meta: PageMeta }>(`${path}${joiner}${query}`)
  }, [kind, lang, page, place])
  return (
    <div>
      <h1 className="font-serif text-4xl">{titles[kind]}</h1>
      {(kind === 'local' || kind === 'state') && places.data ? (
        <label className="mt-4 block text-sm">
          {t.stateLabel}
          <select className="ml-2 rounded border border-line bg-card px-2 py-2" value={place} onChange={(event) => setParams(event.target.value ? { state: event.target.value } : {})}>
            <option value="">{t.placeAll}</option>
            {places.data.data.states.map((item) => <option key={item.name} value={item.name}>{stateLabel(item.name, lang)} ({item.count})</option>)}
          </select>
        </label>
      ) : null}
      {list.status === 'loading' ? <div className="mt-6"><LoadingBlock /></div> : null}
      {list.status === 'error' ? <div className="mt-6"><ErrorBlock message={list.error ?? undefined} onRetry={list.reload} /></div> : null}
      {list.data && list.data.data.length === 0 ? <div className="mt-6"><EmptyBlock>{kind === 'breaking' ? t.breakingEmpty : t.empty}</EmptyBlock></div> : null}
      {list.data ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{list.data.data.map((article) => <ArticleCard key={article.id} article={article} />)}</div>
          <Pagination meta={list.data.meta} onPage={(next) => setParams({ ...(place ? { state: place } : {}), page: String(next) })} />
        </>
      ) : null}
    </div>
  )
}
