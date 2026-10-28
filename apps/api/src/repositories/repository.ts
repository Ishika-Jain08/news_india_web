import type { DemoDatabase } from '@news-india/shared'

export interface DataRepository {
  init(): Promise<void>
  read(): Promise<DemoDatabase>
  update<T>(mutator: (db: DemoDatabase) => T | Promise<T>): Promise<T>
  resetFromSeed(): Promise<void>
}
