import { z } from 'zod'
import { ARTICLE_STATUSES, COVERAGE_LEVELS, LANGUAGES, ROLES, SCHEMA_VERSION } from './constants.js'

export const languageSchema = z.enum(LANGUAGES)
export const roleSchema = z.enum(ROLES)
export const articleStatusSchema = z.enum(ARTICLE_STATUSES)
export const coverageSchema = z.enum(COVERAGE_LEVELS)

export const timestampSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/, 'Expected a UTC timestamp')

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9\u0900-\u097F]+(?:-[a-z0-9\u0900-\u097F]+)*$/, 'Use lowercase letters, digits, and hyphens')

const optionalText = (max: number) => z.string().trim().max(max).optional()

export const translationSchema = z.object({
  language: languageSchema,
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(600),
  body: z.string().trim().min(1).max(30000),
  slug: slugSchema,
  seoTitle: optionalText(200),
  seoDescription: optionalText(320),
})

export const galleryItemSchema = z.object({
  url: z.string().url(),
  altEn: z.string().trim().min(1).max(200),
  altHi: z.string().trim().min(1).max(200),
})

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  nameHi: z.string().min(1),
  passwordHash: z.string().min(20),
  role: roleSchema,
  active: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
})

export const categorySchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  nameEn: z.string().min(1),
  nameHi: z.string().min(1),
  descriptionEn: z.string().min(1),
  descriptionHi: z.string().min(1),
  sortOrder: z.number().int(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
})

export const articleSchema = z.object({
  id: z.string().uuid(),
  status: articleStatusSchema,
  coverage: coverageSchema,
  state: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  cityHi: z.string().min(1).optional(),
  locality: z.string().min(1).optional(),
  categoryId: z.string().uuid(),
  tags: z.array(z.string().min(1)).max(12),
  authorId: z.string().uuid(),
  coverImageUrl: z.string().url().optional(),
  coverImageAltEn: z.string().optional(),
  coverImageAltHi: z.string().optional(),
  gallery: z.array(galleryItemSchema).max(8),
  featured: z.boolean(),
  breaking: z.boolean(),
  trendingBoost: z.number().int().min(0).max(500),
  sourceName: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  correctionNoteEn: z.string().optional(),
  correctionNoteHi: z.string().optional(),
  correctedAt: timestampSchema.optional(),
  rejectionReason: z.string().optional(),
  originalPdfId: z.string().uuid().optional(),
  viewCount: z.number().int().min(0),
  publishedAt: timestampSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  translations: z.array(translationSchema).min(1).max(2),
})

export const revisionSchema = z.object({
  id: z.string().uuid(),
  articleId: z.string().uuid(),
  editorId: z.string().uuid().nullable(),
  action: z.string().min(1),
  createdAt: timestampSchema,
  snapshot: z.object({
    status: articleStatusSchema,
    translations: z.array(
      z.object({
        language: languageSchema,
        title: z.string(),
        slug: z.string(),
      }),
    ),
  }),
})

export const mediaAssetSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(['image', 'pdf']),
  source: z.enum(['remote', 'local']),
  filename: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().min(0),
  url: z.string().url().optional(),
  storageKey: z.string().min(1).optional(),
  uploadedBy: z.string().uuid().nullable(),
  articleId: z.string().uuid().optional(),
  createdAt: timestampSchema,
})

export const liveStreamSchema = z.object({
  id: z.string().uuid(),
  enabled: z.boolean(),
  youtubeUrl: z.string().url().nullable(),
  youtubeId: z.string().nullable(),
  titleEn: z.string(),
  titleHi: z.string(),
  descriptionEn: z.string(),
  descriptionHi: z.string(),
  updatedAt: timestampSchema,
  updatedBy: z.string().uuid().optional(),
})

export const breakingNewsSchema = z.object({
  id: z.string().uuid(),
  articleId: z.string().uuid(),
  priority: z.number().int(),
  active: z.boolean(),
  createdAt: timestampSchema,
})

export const auditLogSchema = z.object({
  id: z.string().uuid(),
  actorId: z.string().uuid().nullable(),
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().nullable(),
  // metadata: z.record(z.unknown()),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: timestampSchema,
})

export const contactMessageSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  message: z.string(),
  language: languageSchema,
  createdAt: timestampSchema,
})

export const demoDatabaseSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  users: z.array(userSchema).min(1),
  categories: z.array(categorySchema).min(1),
  articles: z.array(articleSchema).min(1),
  revisions: z.array(revisionSchema),
  media: z.array(mediaAssetSchema),
  live: liveStreamSchema,
  breakingNews: z.array(breakingNewsSchema),
  auditLogs: z.array(auditLogSchema),
  contactMessages: z.array(contactMessageSchema),
})

const translationInputSchema = z.object({
  language: languageSchema,
  title: z.string().trim().min(3).max(200),
  summary: z.string().trim().min(10).max(600),
  body: z.string().trim().min(20).max(30000),
  slug: slugSchema.optional(),
  seoTitle: optionalText(200),
  seoDescription: optionalText(320),
})

function refinePlace(
  value: { coverage?: 'local' | 'state' | 'national'; state?: string | null; city?: string | null },
  ctx: z.RefinementCtx,
  requireCoverage: boolean,
) {
  if (!value.coverage && !requireCoverage) return
  if (value.coverage === 'national') return
  if (!value.state) {
    ctx.addIssue({ code: 'custom', path: ['state'], message: 'State is required for local and state coverage' })
  }
  if (value.coverage === 'local' && !value.city) {
    ctx.addIssue({ code: 'custom', path: ['city'], message: 'City is required for local coverage' })
  }
}

export const articleCreateSchema = z
  .object({
    translations: z.array(translationInputSchema).min(1).max(2),
    categoryId: z.string().uuid(),
    tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
    coverage: coverageSchema,
    state: z.string().trim().min(1).max(80).optional(),
    city: z.string().trim().min(1).max(80).optional(),
    cityHi: z.string().trim().min(1).max(80).optional(),
    locality: z.string().trim().min(1).max(80).optional(),
    coverImageUrl: z.string().url().optional(),
    coverImageAltEn: optionalText(200),
    coverImageAltHi: optionalText(200),
    gallery: z.array(galleryItemSchema).max(8).default([]),
    featured: z.boolean().default(false),
    breaking: z.boolean().default(false),
    breakingPriority: z.number().int().min(0).max(1000).optional(),
    trendingBoost: z.number().int().min(0).max(500).default(0),
    sourceName: optionalText(120),
    sourceUrl: z.string().url().optional(),
  })
  .superRefine((value, ctx) => {
    const languages = value.translations.map((item) => item.language)
    if (new Set(languages).size !== languages.length) {
      ctx.addIssue({ code: 'custom', path: ['translations'], message: 'Each language can be provided only once' })
    }
    refinePlace(value, ctx, true)
  })

export const articleUpdateSchema = z
  .object({
    translations: z.array(translationInputSchema).min(1).max(2).optional(),
    categoryId: z.string().uuid().optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    coverage: coverageSchema.optional(),
    state: z.string().trim().min(1).max(80).nullable().optional(),
    city: z.string().trim().min(1).max(80).nullable().optional(),
    cityHi: z.string().trim().min(1).max(80).nullable().optional(),
    locality: z.string().trim().min(1).max(80).nullable().optional(),
    coverImageUrl: z.string().url().nullable().optional(),
    coverImageAltEn: z.string().trim().max(200).nullable().optional(),
    coverImageAltHi: z.string().trim().max(200).nullable().optional(),
    gallery: z.array(galleryItemSchema).max(8).optional(),
    featured: z.boolean().optional(),
    breaking: z.boolean().optional(),
    breakingPriority: z.number().int().min(0).max(1000).optional(),
    trendingBoost: z.number().int().min(0).max(500).optional(),
    sourceName: z.string().trim().max(120).nullable().optional(),
    sourceUrl: z.string().url().nullable().optional(),
    correctionNoteEn: z.string().trim().max(500).nullable().optional(),
    correctionNoteHi: z.string().trim().max(500).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.translations) {
      const languages = value.translations.map((item) => item.language)
      if (new Set(languages).size !== languages.length) {
        ctx.addIssue({ code: 'custom', path: ['translations'], message: 'Each language can be provided only once' })
      }
    }
    refinePlace(value, ctx, false)
  })

export const rejectArticleSchema = z.object({
  reason: z.string().trim().min(3).max(500),
})

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(200),
})

export const userCreateSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(2).max(80),
  nameHi: z.string().trim().min(2).max(80),
  password: z.string().min(8).max(100),
  role: roleSchema,
})

export const userUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    nameHi: z.string().trim().min(2).max(80).optional(),
    active: z.boolean().optional(),
    password: z.string().min(8).max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field to update' })

export const userRoleSchema = z.object({
  role: roleSchema,
})

export const categoryCreateSchema = z.object({
  slug: slugSchema.optional(),
  nameEn: z.string().trim().min(2).max(80),
  nameHi: z.string().trim().min(2).max(80),
  descriptionEn: z.string().trim().min(2).max(300),
  descriptionHi: z.string().trim().min(2).max(300),
  sortOrder: z.number().int().min(0).max(1000).optional(),
})

export const categoryUpdateSchema = categoryCreateSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'Provide at least one field to update',
})

export const liveUpdateSchema = z.object({
  enabled: z.boolean(),
  youtubeUrl: z.string().trim().max(300).nullable().optional(),
  titleEn: z.string().trim().max(160).optional(),
  titleHi: z.string().trim().max(160).optional(),
  descriptionEn: z.string().trim().max(500).optional(),
  descriptionHi: z.string().trim().max(500).optional(),
})

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  message: z.string().trim().min(10).max(2000),
  language: languageSchema.default('en'),
})

export const articleListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  language: languageSchema.default('en'),
  category: z.string().trim().min(1).max(80).optional(),
  coverage: coverageSchema.optional(),
  state: z.string().trim().min(1).max(80).optional(),
  city: z.string().trim().min(1).max(80).optional(),
  tag: z.string().trim().min(1).max(40).optional(),
  sort: z.enum(['latest', 'oldest', 'views', 'title']).default('latest'),
  featured: z.enum(['true', 'false']).optional(),
  q: z.string().trim().min(1).max(120).optional(),
  status: articleStatusSchema.optional(),
})

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  language: languageSchema.default('en'),
  coverage: coverageSchema.optional(),
  category: z.string().trim().min(1).max(80).optional(),
})

export const languageQuerySchema = z.object({
  language: languageSchema.default('en'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

export const idParamSchema = z.object({
  id: z.string().uuid(),
})

export const slugParamSchema = z.object({
  slug: z.string().trim().min(1).max(140),
})
