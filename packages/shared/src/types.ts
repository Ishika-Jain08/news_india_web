import type { z } from 'zod'
import type {
  articleSchema,
  auditLogSchema,
  breakingNewsSchema,
  categorySchema,
  contactMessageSchema,
  demoDatabaseSchema,
  liveStreamSchema,
  mediaAssetSchema,
  revisionSchema,
  userSchema,
} from './schemas.js'

export type Language = 'en' | 'hi'
export type Role = 'admin' | 'editor' | 'reporter'
export type ArticleStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'published'
export type Coverage = 'local' | 'state' | 'national'

export type User = z.infer<typeof userSchema>
export type Category = z.infer<typeof categorySchema>
export type Article = z.infer<typeof articleSchema>
export type ArticleRevision = z.infer<typeof revisionSchema>
export type MediaAsset = z.infer<typeof mediaAssetSchema>
export type LiveStream = z.infer<typeof liveStreamSchema>
export type BreakingNewsItem = z.infer<typeof breakingNewsSchema>
export type AuditLog = z.infer<typeof auditLogSchema>
export type ContactMessage = z.infer<typeof contactMessageSchema>
export type DemoDatabase = z.infer<typeof demoDatabaseSchema>

export interface PublicUser {
  id: string
  email: string
  name: string
  nameHi: string
  role: Role
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface PageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PublicArticle {
  id: string
  slug: string
  language: Language
  availableLanguages: Language[]
  translationMissing: boolean
  title: string
  summary: string
  body: string
  seoTitle: string
  seoDescription: string
  category: { id: string; slug: string; name: string }
  tags: string[]
  coverage: Coverage
  state?: string
  city?: string
  cityHi?: string
  locality?: string
  author: { id: string; name: string }
  publishedAt?: string
  updatedAt: string
  coverImageUrl?: string
  coverImageAlt: string
  gallery: { url: string; alt: string }[]
  featured: boolean
  breaking: boolean
  sourceName?: string
  sourceUrl?: string
  correctionNote?: string
  correctedAt?: string
  viewCount: number
  demo: true
}

export interface ApiSuccess<T> {
  success: true
  data: T
  meta?: PageMeta
}

export interface ApiFailure {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export interface PublicCategory {
  id: string
  slug: string
  name: string
  description: string
}

export interface PublicLive {
  configured: boolean
  enabled: boolean
  youtubeId: string | null
  title: string
  description: string
}

export interface HomePayload {
  breaking: PublicArticle[]
  featured: PublicArticle[]
  latest: PublicArticle[]
  trending: PublicArticle[]
  top: PublicArticle[]
  local: PublicArticle[]
  state: PublicArticle[]
  national: PublicArticle[]
  categories: PublicCategory[]
  categoryBlocks: { category: PublicCategory; articles: PublicArticle[] }[]
  live: PublicLive
}

export interface PlaceSummary {
  states: { name: string; count: number }[]
  cities: { name: string; state?: string; count: number }[]
}
