import { Link, useParams } from 'react-router-dom'
import type { PublicArticle } from '@news-india/shared'
import { useI18n } from '../../app/providers'
import { NewsImage } from '../../components/common/NewsImage'
import { ArticleCard } from '../../components/news/ArticleCard'
import { ErrorBlock, LoadingBlock } from '../../components/common/StateMessage'
import { useAsync } from '../../hooks/useAsync'
import { usePageMeta } from '../../hooks/usePageMeta'
import { cityLabel, formatDate, stateLabel } from '../../lib/format'
import { api, fileUrl } from '../../services/api'

export function ArticlePage() {
  const { slug = '' } = useParams()
  const { lang, t } = useI18n()
  const state = useAsync(async () => {
    const article = await api<{ data: PublicArticle }>(`/articles/${slug}?language=${lang}`)
    const related = await api<{ data: PublicArticle[] }>(`/articles/${article.data.id}/related?language=${lang}&limit=4`)
    return { article: article.data, related: related.data }
  }, [slug, lang])
  usePageMeta(state.data ? `${state.data.article.title} — ${t.brand}` : t.brand, state.data?.article.seoDescription)
  if (state.status === 'loading') return <LoadingBlock />
  if (state.status === 'error' || !state.data) return <ErrorBlock message={state.error ?? undefined} onRetry={state.reload} />
  const { article, related } = state.data
  const place = [cityLabel(article.city, article.cityHi, lang), stateLabel(article.state, lang)].filter(Boolean).join(', ')
  const missing = article.translationMissing
  return (
    <article>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-crimson">{t.sampleLabel} · {article.category.name}</p>
      <h1 className="mt-2 max-w-4xl font-serif text-4xl leading-tight sm:text-5xl">{article.title}</h1>
      <p className="mt-4 max-w-3xl text-lg text-muted">{article.summary}</p>
      {missing ? <p className="mt-4 rounded border border-gold/40 bg-gold/10 px-3 py-2 text-sm">{article.language === 'en' && lang === 'hi' ? t.translationMissing : t.translationMissingEn}</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
        <span>{article.author.name}</span>
        <span>{place}</span>
        <span>{formatDate(article.publishedAt, lang)}</span>
        <span>{article.viewCount} {t.views}</span>
      </div>
      <div className="no-print mt-4 flex gap-2">
        <button type="button" onClick={() => window.print()} className="rounded border border-line px-3 py-2 text-sm">{t.print}</button>
        <a className="rounded bg-navy px-3 py-2 text-sm text-paper" href={fileUrl(`/articles/${slug}/pdf?language=${article.language}`)}>{t.downloadPdf}</a>
      </div>
      <NewsImage src={article.coverImageUrl} alt={article.coverImageAlt || article.title} className="mt-6 max-h-[520px] w-full rounded-xl object-cover" />
      {article.correctionNote ? (
        <aside className="mt-6 border-l-4 border-gold bg-gold/10 px-4 py-3 text-sm">
          <strong>{t.correction}. </strong>{article.correctionNote}
        </aside>
      ) : null}
      <div className="article-body mt-6 max-w-3xl space-y-4 text-lg leading-8">
        {article.body.split(/\n{2,}/).map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}
      </div>
      {article.sourceName ? <p className="mt-6 text-sm text-muted">{t.source}: {article.sourceName}</p> : null}
      {article.gallery.length > 0 ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {article.gallery.map((image) => <NewsImage key={image.url} src={image.url} alt={image.alt} className="h-56 w-full rounded-lg object-cover" />)}
        </div>
      ) : null}
      <section className="mt-10">
        <h2 className="mb-4 font-serif text-3xl">{t.related}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{related.map((item) => <ArticleCard key={item.id} article={item} />)}</div>
        <Link to={`/${lang}/category/${article.category.slug}`} className="mt-4 inline-block text-sm font-semibold text-crimson">{article.category.name}</Link>
      </section>
    </article>
  )
}
