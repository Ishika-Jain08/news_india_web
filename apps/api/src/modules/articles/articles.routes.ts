import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import {
  articleCreateSchema,
  articleListQuerySchema,
  articleUpdateSchema,
  idParamSchema,
  languageQuerySchema,
  languageSchema,
  MAX_UPLOAD_BYTES,
  rejectArticleSchema,
  slugParamSchema,
} from '@news-india/shared'
import { AppError } from '../../lib/errors.js'
import { sendCreated, sendData } from '../../lib/http.js'
import { asyncHandler } from '../../middleware/async-handler.js'
import { actor, requireUser } from '../../middleware/auth.js'
import { parseBody, parseQuery } from '../../middleware/validate.js'
import type { DataRepository } from '../../repositories/repository.js'
import type { ArticleService } from '../../services/article.service.js'
import type { MediaService } from '../../services/media.service.js'
import { renderArticlePdf } from '../../services/pdf.service.js'
import { assertCanViewArticle } from '../../services/permissions.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } })
const pdfQuerySchema = z.object({ language: languageSchema.default('en') })
const placesQuerySchema = z.object({
  coverage: z.enum(['local', 'state', 'national']).optional(),
})

function pdfName(slug: string, language: string) {
  const ascii = slug.replace(/[^\x20-\x7E]/g, '') || 'article'
  const filename = `news-india-${ascii}-${language}.pdf`
  return `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

export function createPublicArticleRouter(articles: ArticleService) {
  const router = Router()

  router.get(
    '/home',
    asyncHandler(async (req, res) => {
      const query = parseQuery(languageQuerySchema, req.query)
      sendData(res, await articles.home(query.language))
    }),
  )

  router.get(
    '/articles',
    asyncHandler(async (req, res) => {
      const query = parseQuery(articleListQuerySchema, req.query)
      const result = await articles.listPublic(query)
      sendData(res, result.data, result.meta)
    }),
  )

  router.get(
    '/articles/:slug/pdf',
    asyncHandler(async (req, res) => {
      const params = parseBody(slugParamSchema, req.params)
      const query = parseQuery(pdfQuerySchema, req.query)
      const stored = await articles.getStored(params.slug, 'slug')
      if (stored.article.status !== 'published') throw new AppError(404, 'NOT_FOUND', 'Article not found')
      const pdf = await renderArticlePdf(stored.article, query.language)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', pdfName(params.slug, query.language))
      res.status(200).send(pdf)
    }),
  )

  router.get(
    '/articles/:slug',
    asyncHandler(async (req, res) => {
      const params = parseBody(slugParamSchema, req.params)
      const query = parseQuery(languageQuerySchema, req.query)
      sendData(res, await articles.getPublicBySlug(params.slug, query.language))
    }),
  )

  router.get(
    '/articles/:id/related',
    asyncHandler(async (req, res) => {
      const params = parseBody(idParamSchema, req.params)
      const query = parseQuery(languageQuerySchema, req.query)
      sendData(res, await articles.related(params.id, query.language, query.limit))
    }),
  )

  router.get('/news/breaking', collection('breaking'))
  router.get('/news/trending', collection('trending'))
  router.get('/news/featured', collection('featured'))
  router.get('/news/top', collection('top'))

  router.get(
    '/news/places',
    asyncHandler(async (req, res) => {
      const query = parseQuery(placesQuerySchema, req.query)
      sendData(res, await articles.places(query.coverage))
    }),
  )

  function collection(kind: 'breaking' | 'trending' | 'featured' | 'top') {
    return asyncHandler(async (req, res) => {
      const query = parseQuery(languageQuerySchema, req.query)
      const result = await articles.collection(kind, query)
      sendData(res, result.data, result.meta)
    })
  }

  return router
}

export function createAdminArticleRouter(articles: ArticleService, media: MediaService, repo: DataRepository) {
  const router = Router()
  router.use(requireUser(repo))

  router.get(
    '/articles',
    asyncHandler(async (req, res) => {
      const query = parseQuery(articleListQuerySchema, req.query)
      const result = await articles.listAdmin(actor(req), query)
      sendData(res, result.data, result.meta)
    }),
  )

  router.post(
    '/articles',
    asyncHandler(async (req, res) => {
      const body = parseBody(articleCreateSchema, req.body)
      sendCreated(res, await articles.create(actor(req), body))
    }),
  )

  router.get(
    '/articles/:id/pdf',
    asyncHandler(async (req, res) => {
      const params = parseBody(idParamSchema, req.params)
      const query = parseQuery(pdfQuerySchema, req.query)
      const stored = await articles.getStored(params.id, 'id')
      assertCanViewArticle(actor(req), stored.article)
      const pdf = await renderArticlePdf(stored.article, query.language)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', pdfName(stored.article.id, query.language))
      res.status(200).send(pdf)
    }),
  )

  router.get(
    '/articles/:id',
    asyncHandler(async (req, res) => {
      const params = parseBody(idParamSchema, req.params)
      sendData(res, await articles.getAdmin(actor(req), params.id))
    }),
  )

  router.patch(
    '/articles/:id',
    asyncHandler(async (req, res) => {
      const params = parseBody(idParamSchema, req.params)
      const body = parseBody(articleUpdateSchema, req.body)
      sendData(res, await articles.update(actor(req), params.id, body))
    }),
  )

  router.delete(
    '/articles/:id',
    asyncHandler(async (req, res) => {
      const params = parseBody(idParamSchema, req.params)
      await articles.remove(actor(req), params.id)
      res.status(204).end()
    }),
  )

  for (const action of ['submit', 'approve', 'publish', 'unpublish'] as const) {
    router.post(
      `/articles/:id/${action}`,
      asyncHandler(async (req, res) => {
        const params = parseBody(idParamSchema, req.params)
        sendData(res, await articles.changeStatus(actor(req), params.id, action))
      }),
    )
  }

  router.post(
    '/articles/:id/original-pdf',
    upload.single('file'),
    asyncHandler(async (req, res) => {
      const params = parseBody(idParamSchema, req.params)
      const asset = await media.upload(actor(req), req.file, params.id, 'pdf')
      sendCreated(res, await articles.attachOriginalPdf(actor(req), params.id, asset.id))
    }),
  )

  router.post(
    '/articles/:id/reject',
    asyncHandler(async (req, res) => {
      const params = parseBody(idParamSchema, req.params)
      const body = parseBody(rejectArticleSchema, req.body)
      sendData(res, await articles.changeStatus(actor(req), params.id, 'reject', body.reason))
    }),
  )

  return router
}
