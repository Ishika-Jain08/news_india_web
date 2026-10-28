import type { PageMeta } from '@news-india/shared'

export function paginate<T>(items: T[], page: number, limit: number): { items: T[]; meta: PageMeta } {
  const total = items.length
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit)
  const start = (page - 1) * limit
  return {
    items: items.slice(start, start + limit),
    meta: { page, limit, total, totalPages },
  }
}
