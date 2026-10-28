import { randomUUID } from 'node:crypto'
import type { z } from 'zod'
import {
  articleCreateSchema,
  articleListQuerySchema,
  articleUpdateSchema,
  languageQuerySchema,
  searchQuerySchema,
  type Article,
  type DemoDatabase,
  type HomePayload,
  type Language,
  type PlaceSummary,
  type PublicArticle,
  type PublicCategory,
  type PublicLive,
  type PublicUser,
} from '@news-india/shared'
import { AppError } from '../lib/errors.js'
import { paginate } from '../lib/pagination.js'
import { slugify } from '../lib/slug.js'
import type { DataRepository } from '../repositories/repository.js'
import { addAudit } from './audit.js'
import { assertCanEditArticle, assertCanViewArticle, assertRole } from './permissions.js'
import { trendingScore } from './trending.js'

type ArticleCreate = z.infer<typeof articleCreateSchema>
type ArticleUpdate = z.infer<typeof articleUpdateSchema>
type ArticleQuery = z.infer<typeof articleListQuerySchema>
type SearchQuery = z.infer<typeof searchQuerySchema>
type LanguageQuery = z.infer<typeof languageQuerySchema>

function nowIso() {
  return new Date().toISOString()
}

function findBySlug(db: DemoDatabase, slug: string) {
  return db.articles.find((article) => article.translations.some((translation) => translation.slug === slug))
}

function requireArticle(db: DemoDatabase, id: string) {
  const article = db.articles.find((item) => item.id === id)
  if (!article) throw new AppError(404, 'NOT_FOUND', 'Article not found')
  return article
}

function requireCategory(db: DemoDatabase, categoryId: string) {
  const category = db.categories.find((item) => item.id === categoryId)
  if (!category) throw new AppError(400, 'VALIDATION_ERROR', 'Category does not exist')
  return category
}

function translationOf(article: Article, language: Language) {
  return article.translations.find((item) => item.language === language) ?? article.translations[0]
}

function assertPlaces(article: Pick<Article, 'coverage' | 'state' | 'city'>) {
  if (article.coverage === 'national') return
  if (!article.state) throw new AppError(400, 'VALIDATION_ERROR', 'State is required for local and state coverage')
  if (article.coverage === 'local' && !article.city) {
    throw new AppError(400, 'VALIDATION_ERROR', 'City is required for local coverage')
  }
}

function assertPublishable(article: Article, db: DemoDatabase) {
  requireCategory(db, article.categoryId)
  assertPlaces(article)
  const complete = article.translations.some(
    (item) => item.title.trim().length >= 3 && item.summary.trim().length >= 10 && item.body.trim().length >= 20 && item.slug,
  )
  if (!complete) {
    throw new AppError(409, 'NOT_PUBLISHABLE', 'Add a title, summary, body, and slug before publishing')
  }
}

function uniqueSlug(db: DemoDatabase, base: string, articleId?: string, reserved?: Set<string>) {
  const root = slugify(base)
  let slug = root
  let n = 2
  const taken = (value: string) =>
    reserved?.has(value) ||
    db.articles.some((article) => article.id !== articleId && article.translations.some((item) => item.slug === value))
  while (taken(slug)) slug = `${root}-${n++}`
  reserved?.add(slug)
  return slug
}

function rememberRevision(db: DemoDatabase, article: Article, editorId: string, action: string) {
  db.revisions.unshift({
    id: randomUUID(),
    articleId: article.id,
    editorId,
    action,
    createdAt: nowIso(),
    snapshot: {
      status: article.status,
      translations: article.translations.map((item) => ({
        language: item.language,
        title: item.title,
        slug: item.slug,
      })),
    },
  })
  db.revisions = db.revisions.slice(0, 500)
}

function syncBreaking(db: DemoDatabase, article: Article, priority?: number) {
  if (!article.breaking) {
    db.breakingNews = db.breakingNews.filter((item) => item.articleId !== article.id)
    return
  }
  const existing = db.breakingNews.find((item) => item.articleId === article.id)
  if (existing) {
    existing.active = true
    if (priority !== undefined) existing.priority = priority
    return
  }
  const next = priority ?? Math.max(0, ...db.breakingNews.map((item) => item.priority)) + 1
  db.breakingNews.push({
    id: randomUUID(),
    articleId: article.id,
    priority: next,
    active: true,
    createdAt: nowIso(),
  })
}

function clearOptional(article: Article, key: 'state' | 'city' | 'cityHi' | 'locality' | 'coverImageUrl' | 'coverImageAltEn' | 'coverImageAltHi' | 'sourceName' | 'sourceUrl' | 'correctionNoteEn' | 'correctionNoteHi' | 'correctedAt' | 'rejectionReason' | 'originalPdfId' | 'publishedAt') {
  delete article[key]
}

function categoryMatches(db: DemoDatabase, article: Article, category: string | undefined) {
  if (!category) return true
  const found = db.categories.find((item) => item.slug === category || item.id === category)
  return Boolean(found && found.id === article.categoryId)
}

function textMatches(article: Article, language: Language, q: string | undefined) {
  if (!q) return true
  const translation = translationOf(article, language)
  const haystack = `${translation?.title ?? ''} ${translation?.summary ?? ''} ${translation?.body ?? ''} ${article.tags.join(' ')}`.toLowerCase()
  return haystack.includes(q.toLowerCase())
}

function matches(db: DemoDatabase, article: Article, query: ArticleQuery) {
  if (!categoryMatches(db, article, query.category)) return false
  if (query.coverage && article.coverage !== query.coverage) return false
  if (query.state && article.state?.toLowerCase() !== query.state.toLowerCase()) return false
  if (query.city && article.city?.toLowerCase() !== query.city.toLowerCase()) return false
  if (query.tag && !article.tags.some((tag) => tag.toLowerCase() === query.tag!.toLowerCase())) return false
  if (query.featured === 'true' && !article.featured) return false
  if (query.featured === 'false' && article.featured) return false
  if (!textMatches(article, query.language, query.q)) return false
  return true
}

function sortArticles(articles: Article[], sort: ArticleQuery['sort'], language: Language) {
  const time = (article: Article) => Date.parse(article.publishedAt ?? article.updatedAt)
  return [...articles].sort((a, b) => {
    if (sort === 'views') return b.viewCount - a.viewCount || a.id.localeCompare(b.id)
    if (sort === 'title') {
      const at = translationOf(a, language)?.title ?? ''
      const bt = translationOf(b, language)?.title ?? ''
      return at.localeCompare(bt, language === 'hi' ? 'hi' : 'en') || a.id.localeCompare(b.id)
    }
    const delta = sort === 'oldest' ? time(a) - time(b) : time(b) - time(a)
    return delta || a.id.localeCompare(b.id)
  })
}

export function toPublicArticle(article: Article, language: Language, db: DemoDatabase): PublicArticle {
  const preferred = article.translations.find((item) => item.language === language)
  const translation = preferred ?? article.translations[0]
  if (!translation) throw new AppError(500, 'INVALID_ARTICLE', 'Article has no translation')
  const category = db.categories.find((item) => item.id === article.categoryId)
  const author = db.users.find((item) => item.id === article.authorId)
  const missing = !preferred
  const categoryName = language === 'hi' ? category?.nameHi ?? 'समाचार' : category?.nameEn ?? 'News'
  const authorName = language === 'hi' ? author?.nameHi ?? 'डेस्क' : author?.name ?? 'Desk'
  const altLanguage = missing ? translation.language : language
  const coverImageAlt = (altLanguage === 'hi' ? article.coverImageAltHi : article.coverImageAltEn) || article.coverImageAltEn || ''
  return {
    id: article.id,
    slug: translation.slug,
    language: translation.language,
    availableLanguages: article.translations.map((item) => item.language),
    translationMissing: missing,
    title: translation.title,
    summary: translation.summary,
    body: translation.body,
    seoTitle: translation.seoTitle || translation.title,
    seoDescription: translation.seoDescription || translation.summary,
    category: { id: category?.id ?? article.categoryId, slug: category?.slug ?? 'news', name: categoryName },
    tags: article.tags,
    coverage: article.coverage,
    ...(article.state ? { state: article.state } : {}),
    ...(article.city ? { city: article.city } : {}),
    ...(article.cityHi ? { cityHi: article.cityHi } : {}),
    ...(article.locality ? { locality: article.locality } : {}),
    author: { id: author?.id ?? article.authorId, name: authorName },
    ...(article.publishedAt ? { publishedAt: article.publishedAt } : {}),
    updatedAt: article.updatedAt,
    ...(article.coverImageUrl ? { coverImageUrl: article.coverImageUrl } : {}),
    coverImageAlt,
    gallery: article.gallery.map((item) => ({
      url: item.url,
      alt: altLanguage === 'hi' ? item.altHi : item.altEn,
    })),
    featured: article.featured,
    breaking: article.breaking,
    ...(article.sourceName ? { sourceName: article.sourceName } : {}),
    ...(article.sourceUrl ? { sourceUrl: article.sourceUrl } : {}),
    ...((altLanguage === 'hi' ? article.correctionNoteHi : article.correctionNoteEn)
      ? { correctionNote: (altLanguage === 'hi' ? article.correctionNoteHi : article.correctionNoteEn) as string }
      : {}),
    ...(article.correctedAt ? { correctedAt: article.correctedAt } : {}),
    viewCount: article.viewCount,
    demo: true,
  }
}

export function toAdminArticle(article: Article, db: DemoDatabase) {
  const author = db.users.find((item) => item.id === article.authorId)
  const category = db.categories.find((item) => item.id === article.categoryId)
  return {
    ...article,
    author: author
      ? { id: author.id, name: author.name, nameHi: author.nameHi, role: author.role }
      : { id: article.authorId, name: 'Unknown', nameHi: 'अज्ञात', role: 'reporter' as const },
    category: category
      ? { id: category.id, slug: category.slug, nameEn: category.nameEn, nameHi: category.nameHi }
      : null,
  }
}

function toPublicCategory(category: DemoDatabase['categories'][number], language: Language): PublicCategory {
  return {
    id: category.id,
    slug: category.slug,
    name: language === 'hi' ? category.nameHi : category.nameEn,
    description: language === 'hi' ? category.descriptionHi : category.descriptionEn,
  }
}

function toPublicLive(db: DemoDatabase, language: Language): PublicLive {
  const live = db.live
  const configured = Boolean(live.enabled && live.youtubeId)
  return {
    configured,
    enabled: live.enabled,
    youtubeId: configured ? live.youtubeId : null,
    title: language === 'hi' ? live.titleHi : live.titleEn,
    description: language === 'hi' ? live.descriptionHi : live.descriptionEn,
  }
}

export function createArticleService(repo: DataRepository) {
  async function listPublic(query: ArticleQuery) {
    const db = await repo.read()
    const filtered = sortArticles(
      db.articles.filter((article) => article.status === 'published' && matches(db, article, query)),
      query.sort,
      query.language,
    )
    const page = paginate(filtered, query.page, query.limit)
    return { data: page.items.map((article) => toPublicArticle(article, query.language, db)), meta: page.meta }
  }

  async function getPublicBySlug(slug: string, language: Language) {
    const existing = await repo.read()
    const found = findBySlug(existing, slug)
    if (!found || found.status !== 'published') throw new AppError(404, 'NOT_FOUND', 'Article not found')
    return repo.update((db) => {
      const article = db.articles.find((item) => item.id === found.id && item.status === 'published')
      if (!article) throw new AppError(404, 'NOT_FOUND', 'Article not found')
      article.viewCount += 1
      return toPublicArticle(article, language, db)
    })
  }

  async function related(id: string, language: Language, limit: number) {
    const db = await repo.read()
    const article = db.articles.find((item) => item.id === id && item.status === 'published')
    if (!article) throw new AppError(404, 'NOT_FOUND', 'Article not found')
    const items = db.articles
      .filter((candidate) => candidate.id !== article.id && candidate.status === 'published')
      .map((candidate) => {
        const sharedTags = candidate.tags.filter((tag) => article.tags.some((own) => own.toLowerCase() === tag.toLowerCase()))
        const score = (candidate.categoryId === article.categoryId ? 3 : 0) + (candidate.coverage === article.coverage ? 1 : 0) + sharedTags.length * 2
        return { candidate, score }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || b.candidate.viewCount - a.candidate.viewCount || a.candidate.id.localeCompare(b.candidate.id))
      .slice(0, limit)
    return items.map((item) => toPublicArticle(item.candidate, language, db))
  }

  function ranked(db: DemoDatabase, language: Language, kind: 'breaking' | 'trending' | 'featured' | 'top', query: LanguageQuery) {
    const published = db.articles.filter((article) => article.status === 'published')
    let ordered = published
    if (kind === 'breaking') {
      ordered = published
        .filter((article) => article.breaking)
        .sort((a, b) => {
          const ap = db.breakingNews.find((item) => item.articleId === a.id && item.active)?.priority ?? 0
          const bp = db.breakingNews.find((item) => item.articleId === b.id && item.active)?.priority ?? 0
          return bp - ap || Date.parse(b.publishedAt ?? b.updatedAt) - Date.parse(a.publishedAt ?? a.updatedAt)
        })
    } else if (kind === 'featured') {
      ordered = published
        .filter((article) => article.featured)
        .sort((a, b) => Date.parse(b.publishedAt ?? b.updatedAt) - Date.parse(a.publishedAt ?? a.updatedAt))
    } else if (kind === 'top') {
      ordered = [...published].sort((a, b) => b.viewCount - a.viewCount || a.id.localeCompare(b.id))
    } else {
      const now = new Date()
      ordered = [...published].sort((a, b) => trendingScore(b, now) - trendingScore(a, now) || Date.parse(b.publishedAt ?? '') - Date.parse(a.publishedAt ?? '') || a.id.localeCompare(b.id))
    }
    const page = paginate(ordered, query.page, query.limit)
    return { data: page.items.map((article) => toPublicArticle(article, language, db)), meta: page.meta }
  }

  async function collection(kind: 'breaking' | 'trending' | 'featured' | 'top', query: LanguageQuery) {
    const db = await repo.read()
    return ranked(db, query.language, kind, query)
  }

  async function search(query: SearchQuery) {
    return listPublic({
      page: query.page,
      limit: query.limit,
      language: query.language,
      sort: 'latest',
      q: query.q,
      ...(query.category ? { category: query.category } : {}),
      ...(query.coverage ? { coverage: query.coverage } : {}),
    })
  }

  async function places(coverage?: Article['coverage']): Promise<PlaceSummary> {
    const db = await repo.read()
    const articles = db.articles.filter((article) => article.status === 'published' && (!coverage || article.coverage === coverage))
    const states = new Map<string, number>()
    const cities = new Map<string, { name: string; state?: string; count: number }>()
    for (const article of articles) {
      if (article.state) states.set(article.state, (states.get(article.state) ?? 0) + 1)
      if (article.city) {
        const key = `${article.state ?? ''}::${article.city}`
        const current = cities.get(key)
        cities.set(key, { name: article.city, ...(article.state ? { state: article.state } : {}), count: (current?.count ?? 0) + 1 })
      }
    }
    return {
      states: [...states.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      cities: [...cities.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    }
  }

  async function home(language: Language): Promise<HomePayload> {
    const db = await repo.read()
    const base = { page: 1, limit: 8, language }
    const pick = (kind: 'breaking' | 'trending' | 'featured' | 'top', limit: number) => ranked(db, language, kind, { ...base, limit }).data
    const categories = [...db.categories].sort((a, b) => a.sortOrder - b.sortOrder).map((category) => toPublicCategory(category, language))
    const categoryBlocks = categories.slice(0, 4).map((category) => ({
      category,
      articles: sortArticles(
        db.articles.filter((article) => article.status === 'published' && article.categoryId === category.id),
        'latest',
        language,
      )
        .slice(0, 3)
        .map((article) => toPublicArticle(article, language, db)),
    }))
    const byCoverage = (coverage: Article['coverage']) =>
      sortArticles(
        db.articles.filter((article) => article.status === 'published' && article.coverage === coverage),
        'latest',
        language,
      )
        .slice(0, 4)
        .map((article) => toPublicArticle(article, language, db))
    return {
      breaking: pick('breaking', 8),
      featured: pick('featured', 5),
      latest: sortArticles(db.articles.filter((article) => article.status === 'published'), 'latest', language).slice(0, 8).map((article) => toPublicArticle(article, language, db)),
      trending: pick('trending', 6),
      top: pick('top', 5),
      local: byCoverage('local'),
      state: byCoverage('state'),
      national: byCoverage('national'),
      categories,
      categoryBlocks,
      live: toPublicLive(db, language),
    }
  }

  async function listAdmin(user: PublicUser, query: ArticleQuery) {
    const db = await repo.read()
    const visible = db.articles.filter((article) => {
      if (user.role === 'reporter' && article.authorId !== user.id) return false
      if (query.status && article.status !== query.status) return false
      return matches(db, article, query)
    })
    const page = paginate(sortArticles(visible, query.sort, query.language), query.page, query.limit)
    return { data: page.items.map((article) => toAdminArticle(article, db)), meta: page.meta }
  }

  async function getAdmin(user: PublicUser, id: string) {
    const db = await repo.read()
    const article = requireArticle(db, id)
    assertCanViewArticle(user, article)
    return {
      article: toAdminArticle(article, db),
      revisions: db.revisions.filter((item) => item.articleId === article.id).slice(0, 20),
    }
  }

  async function create(user: PublicUser, input: ArticleCreate) {
    assertRole(user, ['admin', 'editor', 'reporter'])
    return repo.update((db) => {
      requireCategory(db, input.categoryId)
      const reserved = new Set<string>()
      const translations = input.translations.map((translation) => {
        const slug = uniqueSlug(db, translation.slug || translation.title, undefined, reserved)
        return {
          language: translation.language,
          title: translation.title.trim(),
          summary: translation.summary.trim(),
          body: translation.body.trim(),
          slug,
          ...(translation.seoTitle ? { seoTitle: translation.seoTitle } : {}),
          ...(translation.seoDescription ? { seoDescription: translation.seoDescription } : {}),
        }
      })
      const article: Article = {
        id: randomUUID(),
        status: 'draft',
        coverage: input.coverage,
        ...(input.state ? { state: input.state } : {}),
        ...(input.city ? { city: input.city } : {}),
        ...(input.cityHi ? { cityHi: input.cityHi } : {}),
        ...(input.locality ? { locality: input.locality } : {}),
        categoryId: input.categoryId,
        tags: input.tags.map((tag) => tag.trim()),
        authorId: user.id,
        ...(input.coverImageUrl ? { coverImageUrl: input.coverImageUrl } : {}),
        ...(input.coverImageAltEn ? { coverImageAltEn: input.coverImageAltEn } : {}),
        ...(input.coverImageAltHi ? { coverImageAltHi: input.coverImageAltHi } : {}),
        gallery: input.gallery,
        featured: input.featured,
        breaking: input.breaking,
        trendingBoost: input.trendingBoost,
        ...(input.sourceName ? { sourceName: input.sourceName } : {}),
        ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}),
        viewCount: 0,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        translations,
      }
      assertPlaces(article)
      db.articles.unshift(article)
      syncBreaking(db, article, input.breakingPriority)
      rememberRevision(db, article, user.id, 'create')
      addAudit(db, { actorId: user.id, action: 'article.create', entityType: 'article', entityId: article.id, metadata: { status: article.status } })
      return toAdminArticle(article, db)
    })
  }

  async function update(user: PublicUser, id: string, input: ArticleUpdate) {
    return repo.update((db) => {
      const article = requireArticle(db, id)
      assertCanEditArticle(user, article)
      if (input.categoryId) requireCategory(db, input.categoryId)
      if (input.translations) {
        for (const translation of input.translations) {
          const existing = article.translations.find((item) => item.language === translation.language)
          const reserved = new Set(article.translations.filter((item) => item.language !== translation.language).map((item) => item.slug))
          const slug = uniqueSlug(db, translation.slug || existing?.slug || translation.title, article.id, reserved)
          const next = {
            language: translation.language,
            title: translation.title.trim(),
            summary: translation.summary.trim(),
            body: translation.body.trim(),
            slug,
            ...(translation.seoTitle ? { seoTitle: translation.seoTitle } : {}),
            ...(translation.seoDescription ? { seoDescription: translation.seoDescription } : {}),
          }
          if (existing) Object.assign(existing, next)
          else article.translations.push(next)
        }
        const slugs = article.translations.map((item) => item.slug)
        if (new Set(slugs).size !== slugs.length) throw new AppError(409, 'DUPLICATE_SLUG', 'Each translation needs its own slug')
      }
      if (input.categoryId) article.categoryId = input.categoryId
      if (input.tags) article.tags = input.tags.map((tag) => tag.trim())
      if (input.coverage) article.coverage = input.coverage
      assignText(article, 'state', input.state)
      assignText(article, 'city', input.city)
      assignText(article, 'cityHi', input.cityHi)
      assignText(article, 'locality', input.locality)
      assignText(article, 'coverImageUrl', input.coverImageUrl)
      assignText(article, 'coverImageAltEn', input.coverImageAltEn)
      assignText(article, 'coverImageAltHi', input.coverImageAltHi)
      assignText(article, 'sourceName', input.sourceName)
      assignText(article, 'sourceUrl', input.sourceUrl)
      assignText(article, 'correctionNoteEn', input.correctionNoteEn)
      assignText(article, 'correctionNoteHi', input.correctionNoteHi)
      if (input.gallery) article.gallery = input.gallery
      if (input.featured !== undefined) article.featured = input.featured
      if (input.breaking !== undefined) article.breaking = input.breaking
      if (input.trendingBoost !== undefined) article.trendingBoost = input.trendingBoost
      if (input.correctionNoteEn || input.correctionNoteHi) article.correctedAt = nowIso()
      if (input.correctionNoteEn === null && input.correctionNoteHi === null) clearOptional(article, 'correctedAt')
      assertPlaces(article)
      article.updatedAt = nowIso()
      syncBreaking(db, article, input.breakingPriority)
      rememberRevision(db, article, user.id, 'update')
      addAudit(db, { actorId: user.id, action: 'article.update', entityType: 'article', entityId: article.id, metadata: { status: article.status } })
      return toAdminArticle(article, db)
    })
  }

  async function remove(user: PublicUser, id: string) {
    await repo.update((db) => {
      const article = requireArticle(db, id)
      if (user.role === 'reporter' && (article.authorId !== user.id || (article.status !== 'draft' && article.status !== 'rejected'))) {
        throw new AppError(403, 'FORBIDDEN', 'Reporters can delete only their own drafts and rejected stories')
      }
      if (user.role === 'editor' && article.status === 'published') {
        throw new AppError(409, 'CONFLICT', 'Unpublish the article before deleting it')
      }
      if (user.role === 'editor' && article.status === 'draft' && article.authorId !== user.id) {
        throw new AppError(403, 'FORBIDDEN', "Editors cannot delete another reporter's private draft")
      }
      assertRole(user, ['admin', 'editor', 'reporter'])
      db.articles = db.articles.filter((item) => item.id !== article.id)
      db.revisions = db.revisions.filter((item) => item.articleId !== article.id)
      db.breakingNews = db.breakingNews.filter((item) => item.articleId !== article.id)
      for (const asset of db.media) {
        if (asset.articleId === article.id) delete asset.articleId
      }
      addAudit(db, { actorId: user.id, action: 'article.delete', entityType: 'article', entityId: article.id, metadata: { status: article.status } })
    })
  }

  async function changeStatus(user: PublicUser, id: string, action: 'submit' | 'approve' | 'reject' | 'publish' | 'unpublish', reason?: string) {
    return repo.update((db) => {
      const article = requireArticle(db, id)
      if (action === 'submit') {
        assertRole(user, ['admin', 'editor', 'reporter'])
        if (user.role === 'reporter' && article.authorId !== user.id) {
          throw new AppError(403, 'FORBIDDEN', 'Reporters can submit only their own stories')
        }
        if (article.status !== 'draft' && article.status !== 'rejected') {
          throw new AppError(409, 'INVALID_TRANSITION', 'Only a draft or rejected story can be submitted')
        }
        article.status = 'submitted'
        clearOptional(article, 'rejectionReason')
      } else if (action === 'approve') {
        assertRole(user, ['admin', 'editor'])
        if (article.status !== 'submitted') throw new AppError(409, 'INVALID_TRANSITION', 'Only a submitted story can be approved')
        article.status = 'approved'
      } else if (action === 'reject') {
        assertRole(user, ['admin', 'editor'])
        if (article.status !== 'submitted') throw new AppError(409, 'INVALID_TRANSITION', 'Only a submitted story can be rejected')
        article.status = 'rejected'
        article.rejectionReason = reason ?? 'Rejected'
      } else if (action === 'publish') {
        assertRole(user, ['admin', 'editor'])
        if (article.status !== 'approved') throw new AppError(409, 'INVALID_TRANSITION', 'Only an approved story can be published')
        assertPublishable(article, db)
        article.status = 'published'
        article.publishedAt = nowIso()
      } else {
        assertRole(user, ['admin', 'editor'])
        if (article.status !== 'published') throw new AppError(409, 'INVALID_TRANSITION', 'Only a published story can be unpublished')
        article.status = 'approved'
      }
      article.updatedAt = nowIso()
      syncBreaking(db, article)
      rememberRevision(db, article, user.id, action)
      addAudit(db, {
        actorId: user.id,
        action: `article.${action}`,
        entityType: 'article',
        entityId: article.id,
        metadata: { status: article.status, ...(reason ? { reason } : {}) },
      })
      return toAdminArticle(article, db)
    })
  }

  async function attachOriginalPdf(user: PublicUser, id: string, mediaId: string) {
    return repo.update((db) => {
      const article = requireArticle(db, id)
      assertCanEditArticle(user, article)
      const asset = db.media.find((item) => item.id === mediaId)
      if (!asset || asset.kind !== 'pdf') throw new AppError(404, 'NOT_FOUND', 'PDF document not found')
      article.originalPdfId = mediaId
      asset.articleId = article.id
      article.updatedAt = nowIso()
      rememberRevision(db, article, user.id, 'attach-pdf')
      addAudit(db, { actorId: user.id, action: 'article.attach_pdf', entityType: 'article', entityId: article.id, metadata: { mediaId } })
      return toAdminArticle(article, db)
    })
  }

  async function getStored(idOrSlug: string, mode: 'id' | 'slug') {
    const db = await repo.read()
    const article = mode === 'id' ? db.articles.find((item) => item.id === idOrSlug) : findBySlug(db, idOrSlug)
    if (!article) throw new AppError(404, 'NOT_FOUND', 'Article not found')
    return { article, db }
  }

  return {
    listPublic,
    getPublicBySlug,
    related,
    collection,
    search,
    places,
    home,
    listAdmin,
    getAdmin,
    create,
    update,
    remove,
    changeStatus,
    attachOriginalPdf,
    getStored,
    toPublicLive,
  }
}

function assignText(article: Article, key: 'state' | 'city' | 'cityHi' | 'locality' | 'coverImageUrl' | 'coverImageAltEn' | 'coverImageAltHi' | 'sourceName' | 'sourceUrl' | 'correctionNoteEn' | 'correctionNoteHi', value: string | null | undefined) {
  if (value === undefined) return
  if (value === null || value === '') {
    clearOptional(article, key)
    return
  }
  article[key] = value
}

export type ArticleService = ReturnType<typeof createArticleService>
