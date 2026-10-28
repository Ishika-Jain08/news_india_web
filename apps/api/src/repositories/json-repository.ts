import { access, copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { demoDatabaseSchema, type DemoDatabase } from '@news-india/shared'
import type { DataRepository } from './repository.js'

/**
 * Single-process JSON file store.
 * The in-memory write queue stops overlapping writes in this process.
 * It is not a multi-instance lock and is not a production database.
 */
export class JsonDataRepository implements DataRepository {
  private queue: Promise<void> = Promise.resolve()
  private cache: DemoDatabase | null = null

  constructor(
    private readonly dataFile: string,
    private readonly seedFile: string,
  ) {}

  async init(): Promise<void> {
    await mkdir(path.dirname(this.dataFile), { recursive: true })
    let exists = true
    try {
      await access(this.dataFile)
    } catch {
      exists = false
    }
    if (!exists) {
      try {
        await copyFile(this.seedFile, this.dataFile)
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'unknown error'
        throw new Error(
          `Could not create the demo data file at ${this.dataFile} from seed ${this.seedFile}. ${reason}. Phase 1 will not switch to another data provider.`,
        )
      }
    }
    this.cache = this.parseFile(await readFile(this.dataFile, 'utf8'), this.dataFile)
  }

  async read(): Promise<DemoDatabase> {
    if (!this.cache) throw new Error('JSON repository is not initialized.')
    return structuredClone(this.cache)
  }

  async update<T>(mutator: (db: DemoDatabase) => T | Promise<T>): Promise<T> {
    const run = async () => {
      if (!this.cache) throw new Error('JSON repository is not initialized.')
      const draft = structuredClone(this.cache)
      const result = await mutator(draft)
      const checked = demoDatabaseSchema.parse(draft)
      await this.persist(checked)
      this.cache = checked
      return result
    }
    const pending = this.queue.then(run, run)
    this.queue = pending.then(
      () => undefined,
      () => undefined,
    )
    return pending
  }

  async resetFromSeed(): Promise<void> {
    await this.update(async (draft) => {
      const seed = this.parseFile(await readFile(this.seedFile, 'utf8'), this.seedFile)
      draft.schemaVersion = seed.schemaVersion
      draft.users = seed.users
      draft.categories = seed.categories
      draft.articles = seed.articles
      draft.revisions = seed.revisions
      draft.media = seed.media
      draft.live = seed.live
      draft.breakingNews = seed.breakingNews
      draft.auditLogs = seed.auditLogs
      draft.contactMessages = seed.contactMessages
    })
  }

  private parseFile(raw: string, file: string): DemoDatabase {
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error(
        `Demo data file is not valid JSON: ${file}. Phase 1 will not fall back to another data source. Restore the file or run npm run reset-demo from the repository root, then start the API again.`,
      )
    }
    const result = demoDatabaseSchema.safeParse(parsed)
    if (!result.success) {
      const detail = result.error.issues
        .slice(0, 6)
        .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
        .join('; ')
      throw new Error(
        `Demo data file failed validation: ${file}. ${detail}. Phase 1 will not switch providers. Restore the file or run npm run reset-demo, then start the API again.`,
      )
    }
    return result.data
  }

  private async persist(data: DemoDatabase) {
    const tmp = `${this.dataFile}.tmp`
    await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
    try {
      await rename(tmp, this.dataFile)
    } catch {
      await writeFile(this.dataFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
    }
  }
}
