import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError, zodIssues } from '../lib/errors.js'

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } })
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    res.status(error.status).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    })
    return
  }
  if (typeof error === 'object' && error && 'type' in error && error.type === 'entity.parse.failed') {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Request body must be valid JSON' },
    })
    return
  }
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: zodIssues(error) },
    })
    return
  }
  if (typeof error === 'object' && error && 'name' in error && error.name === 'MulterError') {
    res.status(400).json({
      success: false,
      error: { code: 'UPLOAD_INVALID', message: 'The upload was rejected. Files must be 10 MB or smaller.' },
    })
    return
  }
  console.error(error)
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } })
}
