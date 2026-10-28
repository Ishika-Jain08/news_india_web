import { Router } from 'express'
import { loginSchema } from '@news-india/shared'
import type { Env } from '../../config/env.js'
import { sendData } from '../../lib/http.js'
import { asyncHandler } from '../../middleware/async-handler.js'
import { actor, requireUser } from '../../middleware/auth.js'
import { loginRateLimit } from '../../middleware/rate-limit.js'
import { parseBody } from '../../middleware/validate.js'
import type { DataRepository } from '../../repositories/repository.js'
import type { AuthService } from '../../services/auth.service.js'

export function createAuthRouter(auth: AuthService, repo: DataRepository, env: Env) {
  const router = Router()

  router.get(
    '/csrf',
    asyncHandler(async (req, res) => {
      sendData(res, { csrfToken: auth.issueCsrf(req.session) })
    }),
  )

  router.post(
    '/login',
    loginRateLimit(env),
    asyncHandler(async (req, res) => {
      const body = parseBody(loginSchema, req.body)
      sendData(res, await auth.login(body.email, body.password, req))
    }),
  )

  router.post(
    '/logout',
    asyncHandler(async (req, res) => {
      await auth.logout(req.session)
      sendData(res, { loggedOut: true })
    }),
  )

  router.get(
    '/me',
    requireUser(repo),
    asyncHandler(async (req, res) => {
      sendData(res, await auth.me(actor(req).id))
    }),
  )

  return router
}
