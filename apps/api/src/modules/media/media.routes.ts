import { Router } from 'express'
import multer from 'multer'
import { idParamSchema, languageQuerySchema, MAX_UPLOAD_BYTES } from '@news-india/shared'
import { sendCreated, sendData } from '../../lib/http.js'
import { asyncHandler } from '../../middleware/async-handler.js'
import { actor, requireUser } from '../../middleware/auth.js'
import { parseBody, parseQuery } from '../../middleware/validate.js'
import type { DataRepository } from '../../repositories/repository.js'
import type { MediaService } from '../../services/media.service.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } })

export function createMediaRouter(media: MediaService, repo: DataRepository) {
  const router = Router()
  router.use(requireUser(repo))

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const query = parseQuery(languageQuerySchema, req.query)
      const result = await media.list(query.page, query.limit)
      sendData(res, result.items, result.meta)
    }),
  )

  router.post(
    '/upload',
    upload.single('file'),
    asyncHandler(async (req, res) => {
      sendCreated(res, await media.upload(actor(req), req.file))
    }),
  )

  router.get(
    '/:id/file',
    asyncHandler(async (req, res) => {
      const params = parseBody(idParamSchema, req.params)
      const opened = await media.open(params.id)
      if ('redirect' in opened && opened.redirect) {
        res.redirect(opened.redirect)
        return
      }
      if (!('buffer' in opened) || !opened.buffer) return
      res.setHeader('Content-Type', opened.asset.mimeType)
      res.setHeader('Content-Disposition', `attachment; filename="${opened.asset.filename}"`)
      res.status(200).send(opened.buffer)
    }),
  )

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const params = parseBody(idParamSchema, req.params)
      await media.remove(actor(req), params.id)
      res.status(204).end()
    }),
  )

  return router
}
