import { randomUUID } from 'node:crypto'
import type { z } from 'zod'
import { contactSchema } from '@news-india/shared'
import type { DataRepository } from '../repositories/repository.js'
import { addAudit } from './audit.js'

type ContactInput = z.infer<typeof contactSchema>

export function createContactService(repo: DataRepository) {
  return {
    async submit(input: ContactInput) {
      return repo.update((db) => {
        const message = {
          id: randomUUID(),
          name: input.name,
          email: input.email.toLowerCase(),
          message: input.message,
          language: input.language,
          createdAt: new Date().toISOString(),
        }
        db.contactMessages.unshift(message)
        db.contactMessages = db.contactMessages.slice(0, 500)
        addAudit(db, { actorId: null, action: 'contact.create', entityType: 'contact_message', entityId: message.id, metadata: { language: message.language } })
        return { id: message.id }
      })
    },
  }
}

export type ContactService = ReturnType<typeof createContactService>
