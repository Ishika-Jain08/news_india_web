import { TRENDING_RULE } from '@news-india/shared'

export { TRENDING_RULE }

export interface RankableArticle {
  viewCount: number
  trendingBoost: number
  breaking: boolean
  publishedAt?: string
}

/** Documented ranking rule. See TRENDING_RULE in the shared package. */
export function trendingScore(article: RankableArticle, now = new Date()): number {
  const published = article.publishedAt ? Date.parse(article.publishedAt) : Number.NaN
  const days = Number.isFinite(published) ? Math.floor((now.getTime() - published) / 86_400_000) : 99
  const recency = Math.max(0, 10 - days) * 8
  const breakingBonus = article.breaking ? 40 : 0
  return article.viewCount + article.trendingBoost + recency + breakingBonus
}
