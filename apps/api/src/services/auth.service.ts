import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { Request } from 'express'
import type { PublicUser } from '@news-india/shared'
import { AppError } from '../lib/errors.js'
import type { DataRepository } from '../repositories/repository.js'
import { addAudit } from './audit.js'

const dummyHashPromise = bcrypt.hash('news-india-dummy-password', 10)

function toPublicUser(user: { id: string; email: string; name: string; nameHi: string; role: PublicUser['role']; active: boolean; createdAt: string; updatedAt: string }): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    nameHi: user.nameHi,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

export function createAuthService(repo: DataRepository) {
  return {
    async login(email: string, password: string, req: Request) {
      const db = await repo.read()
      const user = db.users.find((item) => item.email.toLowerCase() === email.toLowerCase())
      const dummyHash = await dummyHashPromise
      const matches = await bcrypt.compare(password, user?.passwordHash ?? dummyHash)
      if (!user || !user.active || !matches) {
        await repo.update((draft) => {
          addAudit(draft, {
            actorId: user?.id ?? null,
            action: 'auth.login_failed',
            entityType: 'user',
            entityId: user?.id ?? null,
            metadata: { email },
          })
        })
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')
      }
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((error) => (error ? reject(error) : resolve()))
      })
      req.session.userId = user.id
      req.session.csrfToken = randomBytes(32).toString('hex')
      await new Promise<void>((resolve, reject) => {
        req.session.save((error) => (error ? reject(error) : resolve()))
      })
      await repo.update((draft) => {
        addAudit(draft, { actorId: user.id, action: 'auth.login', entityType: 'user', entityId: user.id, metadata: { role: user.role } })
      })
      return { user: toPublicUser(user), csrfToken: req.session.csrfToken }
    },

    async logout(session: Request['session']) {
      const userId = session.userId ?? null
      await new Promise<void>((resolve, reject) => {
        session.destroy((error) => (error ? reject(error) : resolve()))
      })
      if (userId) {
        await repo.update((draft) => {
          addAudit(draft, { actorId: userId, action: 'auth.logout', entityType: 'user', entityId: userId, metadata: {} })
        })
      }
    },

    async me(userId: string | undefined) {
      if (!userId) throw new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue')
      const db = await repo.read()
      const user = db.users.find((item) => item.id === userId && item.active)
      if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue')
      return toPublicUser(user)
    },

    issueCsrf(session: Request['session']) {
      if (!session.csrfToken) session.csrfToken = randomBytes(32).toString('hex')
      return session.csrfToken
    },

    toPublicUser,
  }
}

export type AuthService = ReturnType<typeof createAuthService>
