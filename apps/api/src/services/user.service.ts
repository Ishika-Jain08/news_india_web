import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { z } from 'zod'
import { userCreateSchema, userRoleSchema, userUpdateSchema, type PublicUser } from '@news-india/shared'
import { AppError } from '../lib/errors.js'
import type { DataRepository } from '../repositories/repository.js'
import { addAudit } from './audit.js'
import { createAuthService } from './auth.service.js'

type UserCreate = z.infer<typeof userCreateSchema>
type UserUpdate = z.infer<typeof userUpdateSchema>
type UserRole = z.infer<typeof userRoleSchema>

export function createUserService(repo: DataRepository) {
  const auth = createAuthService(repo)
  return {
    async list() {
      const db = await repo.read()
      return db.users.map((user) => auth.toPublicUser(user))
    },

    async create(actor: PublicUser, input: UserCreate) {
      const passwordHash = await bcrypt.hash(input.password, 10)
      return repo.update((db) => {
        if (db.users.some((user) => user.email.toLowerCase() === input.email.toLowerCase())) {
          throw new AppError(409, 'DUPLICATE_EMAIL', 'A user with that email already exists')
        }
        const timestamp = new Date().toISOString()
        const user = {
          id: randomUUID(),
          email: input.email.toLowerCase(),
          name: input.name,
          nameHi: input.nameHi,
          passwordHash,
          role: input.role,
          active: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        }
        db.users.push(user)
        addAudit(db, { actorId: actor.id, action: 'user.create', entityType: 'user', entityId: user.id, metadata: { role: user.role } })
        return auth.toPublicUser(user)
      })
    },

    async update(actor: PublicUser, id: string, input: UserUpdate) {
      const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : undefined
      return repo.update((db) => {
        const user = db.users.find((item) => item.id === id)
        if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found')
        if (input.active === false && user.role === 'admin') {
          const otherAdmins = db.users.filter((item) => item.role === 'admin' && item.active && item.id !== user.id)
          if (otherAdmins.length === 0) throw new AppError(409, 'LAST_ADMIN', 'Cannot deactivate the last active admin')
        }
        if (input.name) user.name = input.name
        if (input.nameHi) user.nameHi = input.nameHi
        if (input.active !== undefined) user.active = input.active
        if (passwordHash) user.passwordHash = passwordHash
        user.updatedAt = new Date().toISOString()
        addAudit(db, {
          actorId: actor.id,
          action: 'user.update',
          entityType: 'user',
          entityId: user.id,
          metadata: { active: user.active, passwordChanged: Boolean(passwordHash) },
        })
        return auth.toPublicUser(user)
      })
    },

    async changeRole(actor: PublicUser, id: string, input: UserRole) {
      return repo.update((db) => {
        const user = db.users.find((item) => item.id === id)
        if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found')
        if (user.role === 'admin' && input.role !== 'admin') {
          const otherAdmins = db.users.filter((item) => item.role === 'admin' && item.active && item.id !== user.id)
          if (otherAdmins.length === 0) throw new AppError(409, 'LAST_ADMIN', 'Cannot change the role of the last active admin')
        }
        user.role = input.role
        user.updatedAt = new Date().toISOString()
        addAudit(db, { actorId: actor.id, action: 'user.role', entityType: 'user', entityId: user.id, metadata: { role: user.role } })
        return auth.toPublicUser(user)
      })
    },
  }
}

export type UserService = ReturnType<typeof createUserService>
