import type { NextFunction, Request, Response } from 'express'
import type { PublicUser, Role } from '@news-india/shared'
import { AppError } from '../lib/errors.js'
import type { DataRepository } from '../repositories/repository.js'
import { asyncHandler } from './async-handler.js'

export function requireUser(repo: DataRepository) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const userId = req.session.userId
    if (!userId) throw new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue')
    const db = await repo.read()
    const user = db.users.find((item) => item.id === userId && item.active)
    if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue')
    req.currentUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      nameHi: user.nameHi,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
    next()
  })
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.currentUser) return next(new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue'))
    if (!roles.includes(req.currentUser.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action'))
    }
    next()
  }
}

export function actor(req: Request): PublicUser {
  if (!req.currentUser) throw new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue')
  return req.currentUser
}
