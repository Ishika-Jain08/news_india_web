import { Router } from 'express'
import { idParamSchema, userCreateSchema, userRoleSchema, userUpdateSchema } from '@news-india/shared'
import { sendCreated, sendData } from '../../lib/http.js'
import { asyncHandler } from '../../middleware/async-handler.js'
import { actor, requireRole, requireUser } from '../../middleware/auth.js'
import { parseBody } from '../../middleware/validate.js'
import type { DataRepository } from '../../repositories/repository.js'
import type { UserService } from '../../services/user.service.js'

export function createUserRouter(users: UserService, repo: DataRepository) {
  const router = Router()
  router.use(requireUser(repo), requireRole('admin'))
  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      sendData(res, await users.list())
    }),
  )
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      sendCreated(res, await users.create(actor(req), parseBody(userCreateSchema, req.body)))
    }),
  )
  router.patch(
    '/:id/role',
    asyncHandler(async (req, res) => {
      const params = parseBody(idParamSchema, req.params)
      sendData(res, await users.changeRole(actor(req), params.id, parseBody(userRoleSchema, req.body)))
    }),
  )
  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const params = parseBody(idParamSchema, req.params)
      sendData(res, await users.update(actor(req), params.id, parseBody(userUpdateSchema, req.body)))
    }),
  )
  return router
}
