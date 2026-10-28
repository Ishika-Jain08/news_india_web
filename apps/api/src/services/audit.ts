import { randomUUID } from 'node:crypto'
import type { DemoDatabase } from '@news-india/shared'

export function addAudit(
  db: DemoDatabase,
  entry: {
    actorId: string | null
    action: string
    entityType: string
    entityId: string | null
    metadata?: Record<string, unknown>
  },
) {
  db.auditLogs.unshift({
    id: randomUUID(),
    actorId: entry.actorId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    metadata: entry.metadata ?? {},
    createdAt: new Date().toISOString(),
  })
  db.auditLogs = db.auditLogs.slice(0, 1000)
}
