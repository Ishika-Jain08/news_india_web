import { randomUUID } from 'node:crypto'
import type { z } from 'zod'
import { categoryCreateSchema, categoryUpdateSchema, type Language, type PublicUser } from '@news-india/shared'
import { AppError } from '../lib/errors.js'
import { slugify } from '../lib/slug.js'
import type { DataRepository } from '../repositories/repository.js'
import { addAudit } from './audit.js'

type CategoryCreate = z.infer<typeof categoryCreateSchema>
type CategoryUpdate = z.infer<typeof categoryUpdateSchema>

export function createCategoryService(repo: DataRepository) {
  return {
    async listPublic(language: Language) {
      const db = await repo.read()
      return [...db.categories]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((category) => ({
          id: category.id,
          slug: category.slug,
          name: language === 'hi' ? category.nameHi : category.nameEn,
          description: language === 'hi' ? category.descriptionHi : category.descriptionEn,
        }))
    },

    async listAdmin() {
      const db = await repo.read()
      return [...db.categories].sort((a, b) => a.sortOrder - b.sortOrder)
    },

    async create(actor: PublicUser, input: CategoryCreate) {
      return repo.update((db) => {
        const slug = input.slug ?? slugify(input.nameEn)
        if (db.categories.some((category) => category.slug === slug)) {
          throw new AppError(409, 'DUPLICATE_SLUG', 'A category with that slug already exists')
        }
        const timestamp = new Date().toISOString()
        const category = {
          id: randomUUID(),
          slug,
          nameEn: input.nameEn,
          nameHi: input.nameHi,
          descriptionEn: input.descriptionEn,
          descriptionHi: input.descriptionHi,
          sortOrder: input.sortOrder ?? db.categories.length + 1,
          createdAt: timestamp,
          updatedAt: timestamp,
        }
        db.categories.push(category)
        addAudit(db, { actorId: actor.id, action: 'category.create', entityType: 'category', entityId: category.id, metadata: { slug } })
        return category
      })
    },

    async update(actor: PublicUser, id: string, input: CategoryUpdate) {
      return repo.update((db) => {
        const category = db.categories.find((item) => item.id === id)
        if (!category) throw new AppError(404, 'NOT_FOUND', 'Category not found')
        if (input.slug && input.slug !== category.slug && db.categories.some((item) => item.slug === input.slug)) {
          throw new AppError(409, 'DUPLICATE_SLUG', 'A category with that slug already exists')
        }
        if (input.slug) category.slug = input.slug
        if (input.nameEn) category.nameEn = input.nameEn
        if (input.nameHi) category.nameHi = input.nameHi
        if (input.descriptionEn) category.descriptionEn = input.descriptionEn
        if (input.descriptionHi) category.descriptionHi = input.descriptionHi
        if (input.sortOrder !== undefined) category.sortOrder = input.sortOrder
        category.updatedAt = new Date().toISOString()
        addAudit(db, { actorId: actor.id, action: 'category.update', entityType: 'category', entityId: category.id, metadata: { slug: category.slug } })
        return category
      })
    },

    async remove(actor: PublicUser, id: string) {
      await repo.update((db) => {
        const category = db.categories.find((item) => item.id === id)
        if (!category) throw new AppError(404, 'NOT_FOUND', 'Category not found')
        if (db.articles.some((article) => article.categoryId === category.id)) {
          throw new AppError(409, 'CATEGORY_IN_USE', 'Move or delete articles in this category before deleting it')
        }
        db.categories = db.categories.filter((item) => item.id !== category.id)
        addAudit(db, { actorId: actor.id, action: 'category.delete', entityType: 'category', entityId: category.id, metadata: { slug: category.slug } })
      })
    },
  }
}

export type CategoryService = ReturnType<typeof createCategoryService>
