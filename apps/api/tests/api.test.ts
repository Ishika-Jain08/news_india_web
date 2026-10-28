import { readFile, writeFile } from 'node:fs/promises'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { trendingScore } from '../src/services/trending.js'
import { parseYoutubeInput } from '../src/services/youtube.js'
import { renderTextProbe } from '../src/services/pdf.service.js'
import { accounts, login, makeApp } from './helpers.js'

describe('health, listing, language, and search', () => {
  it('reports health from the JSON repository', async () => {
    const ctx = await makeApp()
    const response = await request(ctx.app).get('/api/v1/health')
    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.dataProvider).toBe('json')
    expect(response.body.data.articles).toBeGreaterThanOrEqual(30)
    const root = await request(ctx.app).get('/health')
    expect(root.status).toBe(200)
    await ctx.close()
  })

  it('lists only published articles and paginates them', async () => {
    const ctx = await makeApp()
    const page = await request(ctx.app).get('/api/v1/articles?limit=5&page=2')
    expect(page.status).toBe(200)
    expect(page.body.meta).toMatchObject({ page: 2, limit: 5 })
    expect(page.body.meta.total).toBeGreaterThanOrEqual(20)
    expect(page.body.data).toHaveLength(5)
    expect(page.body.data.every((article: { demo: boolean }) => article.demo)).toBe(true)
    const titles = JSON.stringify(page.body.data)
    expect(titles).not.toContain('Draft notebook')
    const hidden = await request(ctx.app).get('/api/v1/articles/ward-meeting-notes')
    expect(hidden.status).toBe(404)
    const invalid = await request(ctx.app).get('/api/v1/articles?limit=500')
    expect(invalid.status).toBe(400)
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR')
    await ctx.close()
  })

  it('filters, searches, and serves Hindi and missing translations', async () => {
    const ctx = await makeApp()
    const local = await request(ctx.app).get('/api/v1/articles?coverage=local&category=culture&limit=20')
    expect(local.status).toBe(200)
    expect(local.body.data.length).toBeGreaterThan(0)
    expect(local.body.data.every((article: { coverage: string }) => article.coverage === 'local')).toBe(true)
    const english = await request(ctx.app).get('/api/v1/search?q=Jaipur')
    expect(english.body.data.some((article: { title: string }) => /Jaipur/i.test(article.title))).toBe(true)
    const hindi = await request(ctx.app).get('/api/v1/search?q=' + encodeURIComponent('जयपुर') + '&language=hi')
    expect(hindi.status).toBe(200)
    expect(hindi.body.data.some((article: { title: string }) => article.title.includes('जयपुर'))).toBe(true)
    const detail = await request(ctx.app).get('/api/v1/articles/jaipur-weekend-haat-drill?language=hi')
    expect(detail.status).toBe(200)
    expect(detail.body.data.title).toContain('जयपुर')
    expect(detail.body.data.translationMissing).toBe(false)
    const fallback = await request(ctx.app).get('/api/v1/articles/goa-english-desk-notes?language=hi')
    expect(fallback.status).toBe(200)
    expect(fallback.body.data.translationMissing).toBe(true)
    expect(fallback.body.data.title).toContain('Panaji')
    const missing = await request(ctx.app).get('/api/v1/articles/does-not-exist')
    expect(missing.status).toBe(404)
    const badId = await request(ctx.app).get('/api/v1/articles/not-a-uuid/related')
    expect(badId.status).toBe(400)
    await ctx.close()
  })

  it('ranks trending from repository fields', async () => {
    const now = new Date('2026-10-27T00:00:00.000Z')
    const older = trendingScore({ viewCount: 10, trendingBoost: 0, breaking: false, publishedAt: '2026-10-01T00:00:00.000Z' }, now)
    const newer = trendingScore({ viewCount: 10, trendingBoost: 0, breaking: false, publishedAt: '2026-10-26T00:00:00.000Z' }, now)
    const viewed = trendingScore({ viewCount: 500, trendingBoost: 0, breaking: false, publishedAt: '2026-10-01T00:00:00.000Z' }, now)
    expect(newer).toBeGreaterThan(older)
    expect(viewed).toBeGreaterThan(newer)
    const ctx = await makeApp()
    const trending = await request(ctx.app).get('/api/v1/news/trending?limit=10')
    expect(trending.status).toBe(200)
    expect(trending.body.data.length).toBeGreaterThan(0)
    expect(JSON.stringify(trending.body.data)).not.toContain('Rejected sample')
    await ctx.close()
  })
})

describe('authentication, users, and workflow', () => {
  it('logs in, rejects bad passwords, and enforces admin-only user management', async () => {
    const ctx = await makeApp()
    const bad = await request(ctx.app).post('/api/v1/auth/login').send({ email: accounts.admin.email, password: 'wrong-password' })
    expect(bad.status).toBe(401)
    const { agent, response, csrf } = await login(ctx.app, accounts.reporter.email, accounts.reporter.password)
    expect(response.status).toBe(200)
    expect(response.body.data.user.role).toBe('reporter')
    expect(response.body.data.user.passwordHash).toBeUndefined()
    const me = await agent.get('/api/v1/auth/me')
    expect(me.body.data.email).toBe(accounts.reporter.email)
    const forbidden = await agent.get('/api/v1/admin/users')
    expect(forbidden.status).toBe(403)
    const noToken = await agent.post('/api/v1/admin/articles').send({})
    expect(noToken.status).toBe(403)
    expect(noToken.body.error.code).toBe('CSRF_VALIDATION_FAILED')
    const loggedOut = await agent.post('/api/v1/auth/logout').set('X-CSRF-Token', csrf ?? '')
    expect(loggedOut.status).toBe(200)
    const after = await agent.get('/api/v1/auth/me')
    expect(after.status).toBe(401)
    const guest = await request(ctx.app).get('/api/v1/admin/dashboard')
    expect(guest.status).toBe(401)

    const admin = await login(ctx.app, accounts.admin.email, accounts.admin.password)
    const created = await admin.agent
      .post('/api/v1/admin/users')
      .set('X-CSRF-Token', admin.csrf ?? '')
      .send({
        email: 'desk@newsindia.example',
        name: 'Desk User',
        nameHi: 'डेस्क उपयोगकर्ता',
        password: 'DeskUser@123',
        role: 'reporter',
      })
    expect(created.status).toBe(201)
    const role = await admin.agent
      .patch(`/api/v1/admin/users/${created.body.data.id}/role`)
      .set('X-CSRF-Token', admin.csrf ?? '')
      .send({ role: 'editor' })
    expect(role.status).toBe(200)
    expect(role.body.data.role).toBe('editor')
    const users = await admin.agent.get('/api/v1/admin/users')
    const adminUser = users.body.data.find((user: { email: string }) => user.email === accounts.admin.email)
    const demote = await admin.agent
      .patch(`/api/v1/admin/users/${adminUser.id}/role`)
      .set('X-CSRF-Token', admin.csrf ?? '')
      .send({ role: 'reporter' })
    expect(demote.status).toBe(409)
    await ctx.close()
  })

  it('runs the reporter-to-editor workflow and keeps the edit after a new repository loads the file', async () => {
    const ctx = await makeApp()
    const categories = await request(ctx.app).get('/api/v1/categories')
    const categoryId = categories.body.data.find((category: { slug: string }) => category.slug === 'science').id
    const reporter = await login(ctx.app, accounts.reporter.email, accounts.reporter.password)
    const created = await reporter.agent
      .post('/api/v1/admin/articles')
      .set('X-CSRF-Token', reporter.csrf ?? '')
      .send({
        categoryId,
        coverage: 'national',
        tags: ['workflow'],
        translations: [
          {
            language: 'en',
            title: 'Desk drill on the sample river',
            summary: 'A reporter files a fictional river desk drill for the workflow test.',
            body: 'The sample river drill uses paper boats and a stopwatch. It must stay hidden until an editor publishes it.',
          },
          {
            language: 'hi',
            title: 'नमूना नदी डेस्क अभ्यास',
            summary: 'रिपोर्टर कार्यप्रवाह परीक्षण के लिए एक काल्पनिक नदी अभ्यास जमा करता है।',
            body: 'नमूना नदी अभ्यास कागज़ की नावों और स्टॉपवॉच का उपयोग करता है। संपादक के प्रकाशन तक यह छिपा रहना चाहिए।',
          },
        ],
      })
    expect(created.status).toBe(201)
    const id = created.body.data.id as string
    const slug = created.body.data.translations.find((item: { language: string }) => item.language === 'en').slug as string
    const edited = await reporter.agent
      .patch(`/api/v1/admin/articles/${id}`)
      .set('X-CSRF-Token', reporter.csrf ?? '')
      .send({
        translations: [
          {
            language: 'en',
            title: 'Revised sample river drill',
            summary: 'The reporter revised the fictional river desk drill before review.',
            body: 'The revised sample still uses paper boats. It remains a draft until it is submitted and published.',
          },
        ],
      })
    expect(edited.status).toBe(200)
    expect(edited.body.data.translations.find((item: { language: string }) => item.language === 'en').title).toBe('Revised sample river drill')
    const submitted = await reporter.agent.post(`/api/v1/admin/articles/${id}/submit`).set('X-CSRF-Token', reporter.csrf ?? '')
    expect(submitted.status).toBe(200)
    expect(submitted.body.data.status).toBe('submitted')
    const hidden = await request(ctx.app).get(`/api/v1/articles/${slug}`)
    expect(hidden.status).toBe(404)
    const blocked = await reporter.agent.post(`/api/v1/admin/articles/${id}/publish`).set('X-CSRF-Token', reporter.csrf ?? '')
    expect(blocked.status).toBe(403)

    const editor = await login(ctx.app, accounts.editor.email, accounts.editor.password)
    const approved = await editor.agent.post(`/api/v1/admin/articles/${id}/approve`).set('X-CSRF-Token', editor.csrf ?? '')
    expect(approved.status).toBe(200)
    const published = await editor.agent.post(`/api/v1/admin/articles/${id}/publish`).set('X-CSRF-Token', editor.csrf ?? '')
    expect(published.status).toBe(200)
    const visible = await request(ctx.app).get(`/api/v1/articles/${slug}`)
    expect(visible.status).toBe(200)
    expect(visible.body.data.title).toBe('Revised sample river drill')
    const changed = await editor.agent
      .patch(`/api/v1/admin/articles/${id}`)
      .set('X-CSRF-Token', editor.csrf ?? '')
      .send({
        translations: [
          {
            language: 'en',
            title: 'Published sample river drill edited',
            summary: 'An editor changed the published fictional river drill.',
            body: 'The public API must return this edited sample sentence after the editor saves it.',
          },
        ],
      })
    expect(changed.status).toBe(200)
    const reflected = await request(ctx.app).get(`/api/v1/articles/${slug}`)
    expect(reflected.body.data.title).toBe('Published sample river drill edited')

    const reloadedEnv = ctx.env
    const { createRepository } = await import('../src/repositories/index.js')
    const { createApp } = await import('../src/app.js')
    const nextRepo = createRepository(reloadedEnv)
    await nextRepo.init()
    const nextApp = createApp(reloadedEnv, nextRepo)
    const persisted = await request(nextApp).get(`/api/v1/articles/${slug}`)
    expect(persisted.status).toBe(200)
    expect(persisted.body.data.title).toBe('Published sample river drill edited')
    const raw = await readFile(reloadedEnv.demoDataFile, 'utf8')
    expect(raw).toContain('Published sample river drill edited')
    await ctx.close()
  })
})

describe('uploads, YouTube validation, PDF, and corrupt data', () => {
  it('rejects bad uploads and accepts a PDF', async () => {
    const ctx = await makeApp()
    const editor = await login(ctx.app, accounts.editor.email, accounts.editor.password)
    const text = await editor.agent
      .post('/api/v1/admin/media/upload')
      .set('X-CSRF-Token', editor.csrf ?? '')
      .attach('file', Buffer.from('not a real document'), { filename: 'notes.txt', contentType: 'text/plain' })
    expect(text.status).toBe(400)
    const pdf = await editor.agent
      .post('/api/v1/admin/media/upload')
      .set('X-CSRF-Token', editor.csrf ?? '')
      .attach('file', Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF'), {
        filename: 'desk-note.pdf',
        contentType: 'application/pdf',
      })
    expect(pdf.status).toBe(201)
    expect(pdf.body.data.kind).toBe('pdf')
    const download = await editor.agent.get(`/api/v1/admin/media/${pdf.body.data.id}/file`)
    expect(download.status).toBe(200)
    expect(download.headers['content-type']).toContain('application/pdf')
    const guest = await request(ctx.app).get(`/api/v1/admin/media/${pdf.body.data.id}/file`)
    expect(guest.status).toBe(401)
    await ctx.close()
  })

  it('validates YouTube URLs and renders a Hindi PDF', async () => {
    expect(() => parseYoutubeInput('https://example.com/watch?v=abcdefghijk')).toThrow(/YouTube/)
    expect(parseYoutubeInput('https://youtu.be/abcdeFGHIJK').youtubeId).toBe('abcdeFGHIJK')
    expect(parseYoutubeInput('').youtubeId).toBeNull()
    const ctx = await makeApp()
    const current = await request(ctx.app).get('/api/v1/live/current')
    expect(current.body.data.configured).toBe(false)
    expect(current.body.data.youtubeId).toBeNull()
    const editor = await login(ctx.app, accounts.editor.email, accounts.editor.password)
    const bad = await editor.agent
      .patch('/api/v1/admin/live')
      .set('X-CSRF-Token', editor.csrf ?? '')
      .send({ enabled: true, youtubeUrl: 'https://example.com/live' })
    expect(bad.status).toBe(400)
    const saved = await editor.agent
      .patch('/api/v1/admin/live')
      .set('X-CSRF-Token', editor.csrf ?? '')
      .send({ enabled: true, youtubeUrl: 'https://www.youtube.com/watch?v=abcdeFGHIJK', titleEn: 'Demo embed', titleHi: 'डेमो एम्बेड' })
    expect(saved.status).toBe(200)
    expect(saved.body.data.youtubeId).toBe('abcdeFGHIJK')
    const reporter = await login(ctx.app, accounts.reporter.email, accounts.reporter.password)
    const denied = await reporter.agent
      .patch('/api/v1/admin/live')
      .set('X-CSRF-Token', reporter.csrf ?? '')
      .send({ enabled: false, youtubeUrl: null })
    expect(denied.status).toBe(403)
    const articlePdf = await request(ctx.app).get('/api/v1/articles/jaipur-weekend-haat-drill/pdf?language=hi')
    expect(articlePdf.status).toBe(200)
    expect(articlePdf.headers['content-type']).toContain('application/pdf')
    expect(articlePdf.body.subarray(0, 5).toString()).toBe('%PDF-')
    expect(renderTextProbe('नमस्ते समाचार')).toBeGreaterThan(100)
    await ctx.close()
  }, 60000)

  it('refuses a corrupted demo file instead of switching providers', async () => {
    const ctx = await makeApp()
    await writeFile(ctx.env.demoDataFile, '{', 'utf8')
    const { JsonDataRepository } = await import('../src/repositories/json-repository.js')
    const repo = new JsonDataRepository(ctx.env.demoDataFile, ctx.env.seedDataFile)
    await expect(repo.init()).rejects.toThrow(/reset-demo/)
    await ctx.close()
  })
})
