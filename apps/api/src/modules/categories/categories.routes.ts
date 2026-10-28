import { Router } from 'express'
import { categoryCreateSchema, categoryUpdateSchema, idParamSchema, languageQuerySchema, slugParamSchema } from '@news-india/shared'
import { sendCreated, sendData } from '../../lib/http.js'
import { asyncHandler } from '../../middleware/async-handler.js'
import { actor, requireRole, requireUser } from '../../middleware/auth.js'
import { parseBody, parseQuery } from '../../middleware/validate.js'
import type { DataRepository } from '../../repositories/repository.js'
import type { ArticleService } from '../../services/article.service.js'
import type { CategoryService } from '../../services/category.service.js'
import { articleListQuerySchema } from '@news-india/shared'

export function createPublicCategoryRouter(categories: CategoryService, articles: ArticleService) {
  const router = Router()
  router.get(
    '/categories',
    asyncHandler(async (req, res) => {
      const query = parseQuery(languageQuerySchema, req.query)
      sendData(res, await categories.listPublic(query.language))
    }),
  )
  router.get(
    '/categories/:slug/articles',
    asyncHandler(async (req, res) => {
      const params = parseBody(slugParamSchema, req.params)
      const query = parseQuery(articleListQuerySchema, req.query)
      const result = await articles.listPublic({ ...query, category: params.slug })
      sendData(res, result.data, result.meta)
    }),
  )
  return router
}

export function createAdminCategoryRouter(categories: CategoryService, repo: DataRepository) {
  const router = Router()
  router.use(requireUser(repo))
  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      sendData(res, await categories.listAdmin())
    }),
  )
  router.post(
    '/',
    requireRole('admin', 'editor'),
    asyncHandler(async (req, res) => {
      sendCreated(res, await categories.create(actor(req), parseBody(categoryCreateSchema, req.body)))
    }),
  )
  router.patch(
    '/:id',
    requireRole('admin', 'editor'),
    asyncHandler(async (req, res) => {
      const params = parseBody(idParamSchema, req.params)
      sendData(res, await categories.update(actor(req), params.id, parseBody(categoryUpdateSchema, req.body)))
    }),
  )
  router.delete(
    '/:id',
    requireRole('admin'),
    asyncHandler(async (req, res) => {
      const params = parseBody(idParamSchema, req.params)
      await categories.remove(actor(req), params.id)
      res.status(204).end()
    }),
  )
  return router
}
