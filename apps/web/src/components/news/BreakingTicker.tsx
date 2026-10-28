import { Link } from 'react-router-dom'
import type { PublicArticle } from '@news-india/shared'
import { useI18n } from '../../app/providers'

export function BreakingTicker({ articles }: { articles: PublicArticle[] }) {
  const { lang, t } = useI18n()
  if (articles.length === 0) return null
  const loop = [...articles, ...articles]
  return (
    <div className="flex items-center gap-3 bg-crimson text-paper">
      <span className="shrink-0 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em]">{t.navBreaking}</span>
      <div className="overflow-hidden py-2">
        <div className="ticker-track gap-8 pr-8">
          {loop.map((article, index) => (
            <Link key={`${article.id}-${index}`} to={`/${lang}/article/${article.slug}`} className="whitespace-nowrap text-sm hover:underline">
              {article.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
