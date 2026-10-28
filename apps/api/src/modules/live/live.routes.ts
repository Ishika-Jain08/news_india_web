import { Router } from 'express'
import { languageQuerySchema, liveUpdateSchema } from '@news-india/shared'
import { sendData } from '../../lib/http.js'
import { asyncHandler } from '../../middleware/async-handler.js'
import { actor, requireRole, requireUser } from '../../middleware/auth.js'
import { parseBody, parseQuery } from '../../middleware/validate.js'
import type { DataRepository } from '../../repositories/repository.js'
import type { LiveService } from '../../services/live.service.js'

export function createPublicLiveRouter(live: LiveService) {
  const router = Router()
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const query = parseQuery(languageQuerySchema, req.query)
      const current = await live.get()
      sendData(res, { stream: live.publicView(current, query.language) })
    }),
  )
  router.get(
    '/current',
    asyncHandler(async (req, res) => {
      const query = parseQuery(languageQuerySchema, req.query)
      sendData(res, live.publicView(await live.get(), query.language))
    }),
  )
  return router
}

export function createAdminLiveRouter(live: LiveService, repo: DataRepository) {
  const router = Router()
  router.use(requireUser(repo))
  router.get(
    '/',
    requireRole('admin', 'editor'),
    asyncHandler(async (_req, res) => {
      sendData(res, await live.get())
    }),
  )
  router.patch(
    '/',
    requireRole('admin', 'editor'),
    asyncHandler(async (req, res) => {
      sendData(res, await live.update(actor(req), parseBody(liveUpdateSchema, req.body)))
    }),
  )
  return router
}
