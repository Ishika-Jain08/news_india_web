import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { HomePayload } from '@news-india/shared'
import { useI18n } from '../../app/providers'
import { BreakingTicker } from '../../components/news/BreakingTicker'
import { ArticleCard } from '../../components/news/ArticleCard'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/common/StateMessage'
import { useAsync } from '../../hooks/useAsync'
import { usePageMeta } from '../../hooks/usePageMeta'
import { api } from '../../services/api'

export function HomePage() {
  const { lang, t } = useI18n()
  usePageMeta(`${t.brand} — ${t.tagline}`, t.demoBanner)
  const state = useAsync(() => api<{ data: HomePayload }>(`/home?language=${lang}`), [lang])
  if (state.status === 'loading') return <LoadingBlock />
  if (state.status === 'error' || !state.data) return <ErrorBlock message={state.error ?? undefined} onRetry={state.reload} />
  const home = state.data.data
  const [lead, ...side] = home.featured.length ? home.featured : home.latest
  return (
    <div className="space-y-10">
      <BreakingTicker articles={home.breaking} />
      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {lead ? <ArticleCard article={lead} large /> : <EmptyBlock />}
        <div className="grid gap-4">
          {side.slice(0, 3).map((article) => <ArticleCard key={article.id} article={article} />)}
        </div>
      </section>
      <Section title={t.latest} href={`/${lang}/national`}>
        <Grid articles={home.latest} />
      </Section>
      <div className="grid gap-8 lg:grid-cols-2">
        <Section title={t.trending} href={`/${lang}/trending`}><Grid articles={home.trending} /></Section>
        <Section title={t.topStories} href={`/${lang}/top`}><Grid articles={home.top} /></Section>
      </div>
      <Section title={t.localNews} href={`/${lang}/local`}><Grid articles={home.local} /></Section>
      <Section title={t.stateNews} href={`/${lang}/state`}><Grid articles={home.state} /></Section>
      <Section title={t.nationalNews} href={`/${lang}/national`}><Grid articles={home.national} /></Section>
      {home.categoryBlocks.map((block) => (
        <Section key={block.category.id} title={block.category.name} href={`/${lang}/category/${block.category.slug}`}>
          <Grid articles={block.articles} />
        </Section>
      ))}
      <section className="rounded-xl border border-line bg-navy p-6 text-paper">
        <p className="text-xs uppercase tracking-[0.18em] text-gold">{t.liveDesk}</p>
        <h2 className="mt-2 font-serif text-3xl">{home.live.title}</h2>
        <p className="mt-2 max-w-2xl text-paper/80">{home.live.configured ? t.configuredStream : t.noStream}</p>
        <Link to={`/${lang}/live`} className="mt-4 inline-block rounded bg-crimson px-4 py-2 text-sm font-semibold">{t.navLive}</Link>
      </section>
    </div>
  )
}

function Section({ title, href, children }: { title: string; href: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between border-b border-crimson pb-2">
        <h2 className="font-serif text-3xl">{title}</h2>
        <Link to={href} className="text-sm font-semibold text-crimson">{title}</Link>
      </div>
      {children}
    </section>
  )
}

function Grid({ articles }: { articles: HomePayload['latest'] }) {
  if (articles.length === 0) return <EmptyBlock />
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{articles.slice(0, 4).map((article) => <ArticleCard key={article.id} article={article} />)}</div>
}
