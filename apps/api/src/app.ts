import { existsSync } from 'node:fs'
import path from 'node:path'
import cors from 'cors'
import express, { Router } from 'express'
import session from 'express-session'
import helmet from 'helmet'
import swaggerUi from 'swagger-ui-express'
import type { Env } from './config/env.js'
import { openApiSpec } from './docs/openapi.js'
import { sendData } from './lib/http.js'
import { asyncHandler } from './middleware/async-handler.js'
import { csrfProtection } from './middleware/csrf.js'
import { errorHandler, notFound } from './middleware/error-handler.js'
import { createAdminArticleRouter, createPublicArticleRouter } from './modules/articles/articles.routes.js'
import { createAuthRouter } from './modules/auth/auth.routes.js'
import { createAdminCategoryRouter, createPublicCategoryRouter } from './modules/categories/categories.routes.js'
import { createContactRouter } from './modules/contact/contact.routes.js'
import { createDashboardRouter } from './modules/dashboard/dashboard.routes.js'
import { createAdminLiveRouter, createPublicLiveRouter } from './modules/live/live.routes.js'
import { createMediaRouter } from './modules/media/media.routes.js'
import { createSearchRouter } from './modules/search/search.routes.js'
import { createUserRouter } from './modules/users/users.routes.js'
import type { DataRepository } from './repositories/repository.js'
import { createArticleService } from './services/article.service.js'
import { createAuthService } from './services/auth.service.js'
import { createCategoryService } from './services/category.service.js'
import { createContactService } from './services/contact.service.js'
import { createDashboardService } from './services/dashboard.service.js'
import { createLiveService } from './services/live.service.js'
import { createMediaService } from './services/media.service.js'
import { LocalFileStorage } from './services/storage.js'
import { createUserService } from './services/user.service.js'

export function createApp(env: Env, repo: DataRepository) {
  const articles = createArticleService(repo)
  const auth = createAuthService(repo)
  const users = createUserService(repo)
  const categories = createCategoryService(repo)
  const live = createLiveService(repo)
  const media = createMediaService(repo, new LocalFileStorage(env.uploadDir))
  const dashboard = createDashboardService(repo)
  const contact = createContactService(repo)

  const app = express()
  app.disable('x-powered-by')
  if (env.nodeEnv === 'production') app.set('trust proxy', 1)
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  const allowedOrigins = new Set([env.webOrigin.replace(/\/$/, '')])
  const renderOrigin = process.env.RENDER_EXTERNAL_URL?.replace(/\/$/, '')
  if (renderOrigin) allowedOrigins.add(renderOrigin)
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true)
        return
      }
      callback(null, false)
    },
    credentials: true,
  }))
  app.use(express.json({ limit: '1mb' }))
  app.use(
    session({
      name: 'ni.sid',
      secret: env.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.nodeEnv === 'production',
        maxAge: 1000 * 60 * 60 * 12,
      },
    }),
  )
  app.use(csrfProtection)

  const health = asyncHandler(async (_req, res) => {
    const db = await repo.read()
    sendData(res, {
      status: 'ok',
      service: 'news-india-api',
      phase: 1,
      dataProvider: env.dataProvider,
      articles: db.articles.length,
      time: new Date().toISOString(),
    })
  })

  app.get('/health', health)
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, { customSiteTitle: 'News India API' }))
  app.get('/api/docs.json', (_req, res) => {
    res.json(openApiSpec)
  })

  const api = Router()
  api.get('/health', health)
  api.use('/auth', createAuthRouter(auth, repo, env))
  api.use(createPublicArticleRouter(articles))
  api.use(createPublicCategoryRouter(categories, articles))
  api.use('/search', createSearchRouter(articles))
  api.use('/live', createPublicLiveRouter(live))
  api.use('/contact', createContactRouter(contact))
  api.use('/admin', createAdminArticleRouter(articles, media, repo))
  api.use('/admin/categories', createAdminCategoryRouter(categories, repo))
  api.use('/admin/users', createUserRouter(users, repo))
  api.use('/admin/live', createAdminLiveRouter(live, repo))
  api.use('/admin/media', createMediaRouter(media, repo))
  api.use('/admin', createDashboardRouter(dashboard, repo, env.nodeEnv))

  app.use('/api/v1', api)
  attachWeb(app, env.staticDir)
  app.use(notFound)
  app.use(errorHandler)
  return app
}

function attachWeb(app: express.Express, staticDir: string | null) {
  if (!staticDir) return
  const indexFile = path.join(staticDir, 'index.html')
  if (!existsSync(indexFile)) {
    console.warn(`Frontend build not found at ${indexFile}. API routes still run.`)
    return
  }
  app.use(express.static(staticDir, { index: false }))
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (req.path === '/health' || req.path === '/api' || req.path.startsWith('/api/')) return next()
    res.sendFile(indexFile, (error) => {
      if (error) next(error)
    })
  })
}
