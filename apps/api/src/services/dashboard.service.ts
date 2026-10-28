import type { PublicUser } from '@news-india/shared'
import { paginate } from '../lib/pagination.js'
import type { DataRepository } from '../repositories/repository.js'
import { toAdminArticle } from './article.service.js'

function countStatus(articles: { status: string }[], status: string) {
  return articles.filter((article) => article.status === status).length
}

export function createDashboardService(repo: DataRepository) {
  return {
    async overview(user: PublicUser) {
      const db = await repo.read()
      const articles = user.role === 'reporter' ? db.articles.filter((article) => article.authorId === user.id) : db.articles
      const users = {
        total: db.users.length,
        admins: db.users.filter((item) => item.role === 'admin').length,
        editors: db.users.filter((item) => item.role === 'editor').length,
        reporters: db.users.filter((item) => item.role === 'reporter').length,
      }
      const reviewQueue = db.articles
        .filter((article) => article.status === 'submitted' && (user.role !== 'reporter' || article.authorId === user.id))
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .slice(0, 6)
        .map((article) => toAdminArticle(article, db))
      const audit = db.auditLogs
        .filter((entry) => user.role !== 'reporter' || entry.actorId === user.id)
        .slice(0, 8)
      return {
        stats: {
          articles: {
            total: articles.length,
            published: countStatus(articles, 'published'),
            draft: countStatus(articles, 'draft'),
            submitted: countStatus(articles, 'submitted'),
            approved: countStatus(articles, 'approved'),
            rejected: countStatus(articles, 'rejected'),
          },
          coverage: {
            local: articles.filter((article) => article.coverage === 'local').length,
            state: articles.filter((article) => article.coverage === 'state').length,
            national: articles.filter((article) => article.coverage === 'national').length,
          },
          pendingReview: countStatus(articles, 'submitted'),
          breakingCount: db.articles.filter((article) => article.breaking && article.status === 'published').length,
          viewsTotal: articles.reduce((sum, article) => sum + article.viewCount, 0),
        },
        users: user.role === 'reporter' ? undefined : users,
        mediaCount: user.role === 'reporter' ? db.media.filter((item) => item.uploadedBy === user.id).length : db.media.length,
        reviewQueue,
        recentAudit: audit,
      }
    },

    async listAudit(user: PublicUser, page: number, limit: number) {
      const db = await repo.read()
      const entries = user.role === 'reporter' ? db.auditLogs.filter((entry) => entry.actorId === user.id) : db.auditLogs
      return paginate(entries, page, limit)
    },
  }
}

export type DashboardService = ReturnType<typeof createDashboardService>
