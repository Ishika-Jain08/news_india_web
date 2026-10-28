import type { Article, PublicUser, Role } from '@news-india/shared'
import { AppError } from '../lib/errors.js'

export function assertRole(user: PublicUser, roles: Role[]) {
  if (!roles.includes(user.role)) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action')
  }
}

export function assertCanViewArticle(user: PublicUser, article: Article) {
  if (user.role === 'admin' || user.role === 'editor') return
  if (article.authorId !== user.id) {
    throw new AppError(403, 'FORBIDDEN', 'You can only view your own submissions')
  }
}

export function assertCanEditArticle(user: PublicUser, article: Article) {
  if (user.role === 'admin') return
  if (user.role === 'editor') {
    if (article.status === 'draft' && article.authorId !== user.id) {
      throw new AppError(403, 'FORBIDDEN', "Editors cannot change another reporter's private draft")
    }
    return
  }
  if (article.authorId !== user.id || (article.status !== 'draft' && article.status !== 'rejected')) {
    throw new AppError(403, 'FORBIDDEN', 'Reporters can edit only their own drafts and rejected stories')
  }
}
