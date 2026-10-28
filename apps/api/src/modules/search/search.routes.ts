import { Router } from 'express'
import { searchQuerySchema } from '@news-india/shared'
import { sendData } from '../../lib/http.js'
import { asyncHandler } from '../../middleware/async-handler.js'
import { parseQuery } from '../../middleware/validate.js'
import type { ArticleService } from '../../services/article.service.js'

export function createSearchRouter(articles: ArticleService) {
  const router = Router()
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const query = parseQuery(searchQuerySchema, req.query)
      const result = await articles.search(query)
      sendData(res, result.data, result.meta)
    }),
  )
  return router
}
