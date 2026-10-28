import type { Env } from '../config/env.js'
import { JsonDataRepository } from './json-repository.js'
import type { DataRepository } from './repository.js'

export function createRepository(env: Env): DataRepository {
  if (env.dataProvider !== 'json') {
    throw new Error(
      `DATA_PROVIDER="${env.dataProvider}" is not available in Phase 1. Refusing to select a different repository.`,
    )
  }
  return new JsonDataRepository(env.demoDataFile, env.seedDataFile)
}

export type { DataRepository } from './repository.js'
