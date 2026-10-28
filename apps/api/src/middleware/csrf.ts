import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../lib/errors.js'

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS'])

export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (SAFE.has(req.method)) return next()
  if (req.path === '/api/v1/auth/login') return next()
  const header = req.get('x-csrf-token')
  if (!req.session.csrfToken || !header || header !== req.session.csrfToken) {
    return next(new AppError(403, 'CSRF_VALIDATION_FAILED', 'Missing or invalid CSRF token'))
  }
  next()
}
