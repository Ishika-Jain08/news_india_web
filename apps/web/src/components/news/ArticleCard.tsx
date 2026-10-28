import { Link } from 'react-router-dom'
import type { PublicArticle } from '@news-india/shared'
import { useI18n } from '../../app/providers'
import { cityLabel, formatDate, stateLabel } from '../../lib/format'
import { NewsImage } from '../common/NewsImage'

export function ArticleCard({ article, large = false }: { article: PublicArticle; large?: boolean }) {
  const { lang, t } = useI18n()
  const place = [cityLabel(article.city, article.cityHi, lang), stateLabel(article.state, lang)].filter(Boolean).join(', ')
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-card shadow-card transition hover:-translate-y-0.5">
      <Link to={`/${lang}/article/${article.slug}`} className="flex h-full flex-col">
        <NewsImage src={article.coverImageUrl} alt={article.coverImageAlt || article.title} className={large ? 'h-72 w-full object-cover' : 'h-44 w-full object-cover'} />
        <div className="flex flex-1 flex-col gap-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-crimson">
            {t.sampleLabel} · {article.category.name}
          </p>
          <h3 className={`font-serif leading-tight text-ink ${large ? 'text-3xl' : 'text-xl'}`}>{article.title}</h3>
          <p className="line-clamp-3 text-sm text-muted">{article.summary}</p>
          <p className="mt-auto pt-2 text-xs text-muted">
            {place ? `${place} · ` : ''}
            {formatDate(article.publishedAt, lang)}
          </p>
        </div>
      </Link>
    </article>
  )
}
