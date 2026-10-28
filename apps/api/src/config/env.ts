import path from 'node:path'
import dotenv from 'dotenv'
import { z } from 'zod'
import { apiRoot, resolveFromApiRoot } from '../lib/paths.js'

dotenv.config({ path: path.join(apiRoot(), '.env') })

const DEV_SESSION_SECRET = 'dev-only-news-india-session-secret'

const blankToUndefined = (value: unknown) => (value === undefined || value === '' ? undefined : value)

const envSchema = z.object({
  PORT: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(65535).default(4000)),
  NODE_ENV: z.preprocess(blankToUndefined, z.enum(['development', 'test', 'production']).default('development')),
  WEB_ORIGIN: z.preprocess(blankToUndefined, z.string().url().default('http://localhost:5173')),
  SESSION_SECRET: z.preprocess(blankToUndefined, z.string().min(16).optional()),
  DATA_PROVIDER: z.preprocess(blankToUndefined, z.string().default('json')),
  DEMO_DATA_FILE: z.preprocess(blankToUndefined, z.string().min(1).default('data/demo-data.json')),
  DEMO_UPLOAD_DIR: z.preprocess(blankToUndefined, z.string().min(1).default('uploads')),
  STATIC_DIR: z.preprocess(blankToUndefined, z.string().min(1).optional()),
  LOGIN_WINDOW_MS: z.preprocess(blankToUndefined, z.coerce.number().int().positive().default(15 * 60 * 1000)),
  LOGIN_MAX_ATTEMPTS: z.preprocess(blankToUndefined, z.coerce.number().int().positive().default(10)),
})

export interface Env {
  port: number
  nodeEnv: 'development' | 'test' | 'production'
  webOrigin: string
  sessionSecret: string
  dataProvider: 'json'
  demoDataFile: string
  uploadDir: string
  seedDataFile: string
  /** Built frontend directory. Null keeps the API JSON-only, which is what tests use. */
  staticDir: string | null
  loginWindowMs: number
  loginMaxAttempts: number
}

export interface EnvOverrides {
  port?: number
  nodeEnv?: Env['nodeEnv']
  webOrigin?: string
  sessionSecret?: string
  dataProvider?: string
  demoDataFile?: string
  uploadDir?: string
  seedDataFile?: string
  staticDir?: string | null
  loginWindowMs?: number
  loginMaxAttempts?: number
}

function resolveStaticDir(nodeEnv: Env['nodeEnv'], override: string | null | undefined, configured: string | undefined) {
  if (override === null) return null
  if (override) return resolveFromApiRoot(override)
  if (configured) return resolveFromApiRoot(configured)
  if (nodeEnv === 'production') return path.resolve(apiRoot(), '..', 'web', 'dist')
  return null
}

export function loadEnv(overrides: EnvOverrides = {}): Env {
  const parsed = envSchema.parse(process.env)
  const dataProvider = overrides.dataProvider ?? parsed.DATA_PROVIDER
  if (dataProvider !== 'json') {
    throw new Error(
      `DATA_PROVIDER="${dataProvider}" is not available in Phase 1. The only implemented provider is "json". Startup aborted. No other data source was selected.`,
    )
  }
  const nodeEnv = overrides.nodeEnv ?? parsed.NODE_ENV
  const sessionSecret = overrides.sessionSecret ?? parsed.SESSION_SECRET ?? (nodeEnv === 'production' ? '' : DEV_SESSION_SECRET)
  if (sessionSecret.length < 16 || (nodeEnv === 'production' && sessionSecret === DEV_SESSION_SECRET)) {
    throw new Error('SESSION_SECRET must be set to a unique value of at least 16 characters when NODE_ENV is production.')
  }
  return {
    port: overrides.port ?? parsed.PORT,
    nodeEnv,
    webOrigin: overrides.webOrigin ?? parsed.WEB_ORIGIN,
    sessionSecret,
    dataProvider: 'json',
    demoDataFile: resolveFromApiRoot(overrides.demoDataFile ?? parsed.DEMO_DATA_FILE),
    uploadDir: resolveFromApiRoot(overrides.uploadDir ?? parsed.DEMO_UPLOAD_DIR),
    seedDataFile: overrides.seedDataFile
      ? resolveFromApiRoot(overrides.seedDataFile)
      : path.join(apiRoot(), 'data', 'seed-data.json'),
    staticDir: resolveStaticDir(nodeEnv, overrides.staticDir, parsed.STATIC_DIR),
    loginWindowMs: overrides.loginWindowMs ?? parsed.LOGIN_WINDOW_MS,
    loginMaxAttempts: overrides.loginMaxAttempts ?? parsed.LOGIN_MAX_ATTEMPTS,
  }
}
