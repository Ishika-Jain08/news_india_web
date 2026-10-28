import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { MAX_UPLOAD_BYTES, type PublicUser } from '@news-india/shared'
import { AppError } from '../lib/errors.js'
import { paginate } from '../lib/pagination.js'
import type { DataRepository } from '../repositories/repository.js'
import { addAudit } from './audit.js'
import { detectMime, type LocalFileStorage } from './storage.js'

export function createMediaService(repo: DataRepository, storage: LocalFileStorage) {
  return {
    async list(page: number, limit: number) {
      const db = await repo.read()
      const sorted = [...db.media].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      const result = paginate(sorted, page, limit)
      return result
    },

    async upload(
      actor: PublicUser,
      file: { buffer: Buffer; originalname: string } | undefined,
      articleId?: string,
      kind?: 'image' | 'pdf',
    ) {
      if (!file || file.buffer.length === 0) throw new AppError(400, 'UPLOAD_INVALID', 'Choose a file to upload')
      if (file.buffer.length > MAX_UPLOAD_BYTES) throw new AppError(400, 'UPLOAD_INVALID', 'Files must be 10 MB or smaller')
      if (articleId) {
        const existing = await repo.read()
        if (!existing.articles.some((article) => article.id === articleId)) throw new AppError(404, 'NOT_FOUND', 'Article not found')
      }
      const mime = detectMime(file.buffer)
      if (!mime) throw new AppError(400, 'UPLOAD_INVALID', 'Upload a PDF, PNG, JPEG, or WebP file')
      if (kind === 'pdf' && mime !== 'application/pdf') throw new AppError(400, 'UPLOAD_INVALID', 'Original documents must be PDF files')
      if (kind === 'image' && mime === 'application/pdf') throw new AppError(400, 'UPLOAD_INVALID', 'Image uploads cannot be PDF files')
      const id = randomUUID()
      const extension = mime === 'application/pdf' ? '.pdf' : mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg'
      const filename = `${id}${extension}`
      await storage.save(filename, file.buffer)
      return repo.update((db) => {
        const asset = {
          id,
          kind: mime === 'application/pdf' ? 'pdf' as const : 'image' as const,
          source: 'local' as const,
          filename,
          originalName: path.basename(file.originalname).slice(0, 180) || filename,
          mimeType: mime,
          sizeBytes: file.buffer.length,
          storageKey: filename,
          uploadedBy: actor.id,
          ...(articleId ? { articleId } : {}),
          createdAt: new Date().toISOString(),
        }
        db.media.unshift(asset)
        addAudit(db, { actorId: actor.id, action: 'media.upload', entityType: 'media', entityId: asset.id, metadata: { mime, size: asset.sizeBytes } })
        return asset
      })
    },

    async remove(actor: PublicUser, id: string) {
      const db = await repo.read()
      const asset = db.media.find((item) => item.id === id)
      if (!asset) throw new AppError(404, 'NOT_FOUND', 'Media asset not found')
      if (actor.role === 'reporter' && asset.uploadedBy !== actor.id) {
        throw new AppError(403, 'FORBIDDEN', 'Reporters can delete only files they uploaded')
      }
      if (db.articles.some((article) => article.originalPdfId === asset.id)) {
        throw new AppError(409, 'MEDIA_IN_USE', 'Remove this PDF from the article before deleting the file')
      }
      if (asset.storageKey && asset.source === 'local') await storage.remove(asset.storageKey)
      await repo.update((draft) => {
        draft.media = draft.media.filter((item) => item.id !== id)
        addAudit(draft, { actorId: actor.id, action: 'media.delete', entityType: 'media', entityId: id, metadata: {} })
      })
    },

    async open(id: string) {
      const db = await repo.read()
      const asset = db.media.find((item) => item.id === id)
      if (!asset) throw new AppError(404, 'NOT_FOUND', 'Media asset not found')
      if (asset.source === 'remote') {
        if (!asset.url) throw new AppError(404, 'NOT_FOUND', 'Remote media has no URL')
        const url = new URL(asset.url)
        if (url.protocol !== 'https:' || url.hostname !== 'images.unsplash.com') {
          throw new AppError(400, 'REMOTE_MEDIA', 'This remote asset is not available for download through the API')
        }
        return { asset, redirect: url.toString() }
      }
      if (!asset.storageKey) throw new AppError(404, 'NOT_FOUND', 'Stored file is missing')
      const buffer = await storage.read(asset.storageKey)
      return { asset, buffer }
    },
  }
}

export type MediaService = ReturnType<typeof createMediaService>
