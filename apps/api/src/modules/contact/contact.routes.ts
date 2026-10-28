import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { contactSchema } from '@news-india/shared'
import { sendCreated } from '../../lib/http.js'
import { asyncHandler } from '../../middleware/async-handler.js'
import { parseBody } from '../../middleware/validate.js'
import type { ContactService } from '../../services/contact.service.js'

const contactLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many messages. Try again later.' },
    })
  },
})

export function createContactRouter(contact: ContactService) {
  const router = Router()
  router.post(
    '/',
    contactLimit,
    asyncHandler(async (req, res) => {
      sendCreated(res, await contact.submit(parseBody(contactSchema, req.body)))
    }),
  )
  return router
}
