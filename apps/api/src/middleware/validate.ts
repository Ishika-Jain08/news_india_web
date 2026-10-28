import type { z } from 'zod'
import { AppError, zodIssues } from '../lib/errors.js'

export function parseBody<S extends z.ZodTypeAny>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value)
  if (!result.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request', zodIssues(result.error))
  return result.data
}

export function parseQuery<S extends z.ZodTypeAny>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(normalizeQuery(value))
  if (!result.success) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request', zodIssues(result.error))
  return result.data
}

function normalizeQuery(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const output: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    const raw = Array.isArray(item) ? item[0] : item
    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (trimmed !== '') output[key] = trimmed
    } else if (raw !== undefined) {
      output[key] = raw
    }
  }
  return output
}
