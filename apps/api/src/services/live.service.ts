import type { z } from 'zod'
import { liveUpdateSchema, type Language, type PublicUser } from '@news-india/shared'
import { AppError } from '../lib/errors.js'
import type { DataRepository } from '../repositories/repository.js'
import { addAudit } from './audit.js'
import { parseYoutubeInput } from './youtube.js'

type LiveUpdate = z.infer<typeof liveUpdateSchema>

export function createLiveService(repo: DataRepository) {
  return {
    async get() {
      const db = await repo.read()
      return db.live
    },

    async update(actor: PublicUser, input: LiveUpdate) {
      const parsed = parseYoutubeInput(input.youtubeUrl)
      if (input.enabled && !parsed.youtubeId) {
        throw new AppError(400, 'INVALID_YOUTUBE_URL', 'Add a YouTube URL before enabling the live desk.')
      }
      return repo.update((db) => {
        db.live.enabled = input.enabled
        db.live.youtubeUrl = parsed.youtubeUrl
        db.live.youtubeId = parsed.youtubeId
        if (input.titleEn !== undefined) db.live.titleEn = input.titleEn
        if (input.titleHi !== undefined) db.live.titleHi = input.titleHi
        if (input.descriptionEn !== undefined) db.live.descriptionEn = input.descriptionEn
        if (input.descriptionHi !== undefined) db.live.descriptionHi = input.descriptionHi
        db.live.updatedAt = new Date().toISOString()
        db.live.updatedBy = actor.id
        addAudit(db, {
          actorId: actor.id,
          action: 'live.update',
          entityType: 'live_stream',
          entityId: db.live.id,
          metadata: { enabled: db.live.enabled, youtubeId: db.live.youtubeId },
        })
        return db.live
      })
    },

    publicView(live: { enabled: boolean; youtubeId: string | null; titleEn: string; titleHi: string; descriptionEn: string; descriptionHi: string }, language: Language) {
      const configured = Boolean(live.enabled && live.youtubeId)
      return {
        configured,
        enabled: live.enabled,
        youtubeId: configured ? live.youtubeId : null,
        title: language === 'hi' ? live.titleHi : live.titleEn,
        description: language === 'hi' ? live.descriptionHi : live.descriptionEn,
      }
    },
  }
}

export type LiveService = ReturnType<typeof createLiveService>
