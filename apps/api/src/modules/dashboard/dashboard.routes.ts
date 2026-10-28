import { Router } from 'express'
import { z } from 'zod'
import { sendData } from '../../lib/http.js'
import { AppError } from '../../lib/errors.js'
import { asyncHandler } from '../../middleware/async-handler.js'
import { actor, requireRole, requireUser } from '../../middleware/auth.js'
import { parseQuery } from '../../middleware/validate.js'
import type { DataRepository } from '../../repositories/repository.js'
import type { DashboardService } from '../../services/dashboard.service.js'

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export function createDashboardRouter(dashboard: DashboardService, repo: DataRepository, envNode: string) {
  const router = Router()
  router.use(requireUser(repo))

  router.get(
    '/dashboard',
    asyncHandler(async (req, res) => {
      sendData(res, await dashboard.overview(actor(req)))
    }),
  )

  router.get(
    '/audit-logs',
    requireRole('admin', 'editor'),
    asyncHandler(async (req, res) => {
      const query = parseQuery(pageQuery, req.query)
      const result = await dashboard.listAudit(actor(req), query.page, query.limit)
      sendData(res, result.items, result.meta)
    }),
  )

  router.post(
    '/demo/reset',
    requireRole('admin'),
    asyncHandler(async (_req, res) => {
      if (envNode === 'production') {
        throw new AppError(403, 'FORBIDDEN', 'Demo data cannot be reset when NODE_ENV is production')
      }
      await repo.resetFromSeed()
      sendData(res, { reset: true })
    }),
  )

  return router
}
