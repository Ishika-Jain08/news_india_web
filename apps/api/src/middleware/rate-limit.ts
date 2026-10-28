import rateLimit from 'express-rate-limit'
import type { Env } from '../config/env.js'

export function loginRateLimit(env: Env) {
  return rateLimit({
    windowMs: env.loginWindowMs,
    max: env.loginMaxAttempts,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again later.' },
      })
    },
  })
}
